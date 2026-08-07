import { Router, Request, Response } from "express";
import multer from "multer";
import { AppDataSource } from "../data-source";
import { Document, DocumentCategory } from "../entities/Document";
import { Employee } from "../entities/Employee";
import { authenticate, authorize } from "../middleware/authenticate";
import { logAudit } from "../utils/audit";
import { uploadFile, getSignedFileUrl } from "../utils/storage";
import { extractTextFromImage } from "../utils/ocr";
import { validateOcrFileSize } from "../middleware/validateOcrFileSize";
import { waitUntil } from "@vercel/functions"; // Import Vercel wrapper

const router = Router();

// multer config: store the file in memory (as a Buffer) rather than writing
// to disk — necessary since Vercel's serverless functions have no persistent
// filesystem, same reasoning as everything else we've built for this deployment
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are allowed"));
    }
  },
});

const validCategories: DocumentCategory[] = [
  "cv",
  "certificate",
  "transcript",
  "id_card",
  "birth_cert",
  "marriage_cert",
];

interface UploadBody {
  employee_id?: string;
  category?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

// router.post(
//   "/",
//   authenticate,
//   authorize("HR_ADMIN"),
//   upload.single("file"), // expects the form field to be named "file"
//   async (req: Request, res: Response) => {
//     if (!req.file) {
//       res.status(400).json({ error: "No file was uploaded" });
//       return;
//     }

//     const { employee_id, category, related_entity_type, related_entity_id } =
//       req.body as UploadBody;

//     if (!employee_id || !category) {
//       res.status(400).json({ error: "employee_id and category are required" });
//       return;
//     }

//     if (!validCategories.includes(category as DocumentCategory)) {
//       res.status(400).json({
//         error: `category must be one of: ${validCategories.join(", ")}`,
//       });
//       return;
//     }

//     const employeeRepo = AppDataSource.getRepository(Employee);
//     const documentRepo = AppDataSource.getRepository(Document);

//     const employee = await employeeRepo.findOne({ where: { id: employee_id } });
//     if (!employee) {
//       res.status(404).json({ error: "Employee not found" });
//       return;
//     }

//     // build a unique storage key — includes employee id and a timestamp
//     // to avoid filename collisions if the same file name is uploaded twice
//     const storageKey = `employees/${employee_id}/${Date.now()}-${req.file.originalname}`;

//     await uploadFile({
//       key: storageKey,
//       body: req.file.buffer,
//       contentType: req.file.mimetype,
//     });

//     const document = documentRepo.create({
//       employee,
//       category: category as DocumentCategory,
//       related_entity_type: (related_entity_type as any) ?? null,
//       related_entity_id: related_entity_id ?? null,
//       file_url: storageKey, // we store the KEY, not a public URL — signed URLs are generated on demand
//       ocr_status: "pending",
//     });

//     await documentRepo.save(document);

//     // // run OCR before responding — see if it completes within Vercel's time limit
//     // try {
//     //   const text = await extractTextFromImage(req.file.buffer);
//     //   document.ocr_text = text;
//     //   document.ocr_status = "completed";
//     // } catch (err) {
//     //   console.error("OCR failed:", err);
//     //   document.ocr_status = "failed";
//     // }

//     // await documentRepo.save(document);

//     await logAudit({
//       userId: req.user!.userId,
//       action: "CREATE",
//       entityType: "Document",
//       entityId: document.id,
//       description: `Uploaded ${category} document for ${employee.first_name} ${employee.last_name}`,
//     });

//     res.status(201).json({ document });

//     extractTextFromImage(req.file.buffer)
//       .then(async (text) => {
//         document.ocr_text = text;
//         document.ocr_status = "completed";
//         await documentRepo.save(document);
//       })
//       .catch(async (err) => {
//         console.error("OCR failed:", err);
//         document.ocr_status = "failed";
//         await documentRepo.save(document);
//       });
//   },
// );

// const router = Router();

router.post(
  "/",
  authenticate,
  authorize("HR_ADMIN"),
  upload.single("file"),
  validateOcrFileSize,
  async (req: Request, res: Response) => {
    // 1. Your existing validation check
    if (!req.file) {
      res.status(400).json({ error: "No file was uploaded" });
      return;
    }

    // 2. EXPLICITLY capture the file right here
    // TypeScript now knows 'file' is 100% defined for the rest of this scope
    const file = req.file;

    const { employee_id, category, related_entity_type, related_entity_id } =
      req.body as UploadBody;

    if (!employee_id || !category) {
      res.status(400).json({ error: "employee_id and category are required" });
      return;
    }

    if (!validCategories.includes(category as DocumentCategory)) {
      res.status(400).json({
        error: `category must be one of: ${validCategories.join(", ")}`,
      });
      return;
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const documentRepo = AppDataSource.getRepository(Document);

    const employee = await employeeRepo.findOne({ where: { id: employee_id } });
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    // 3. Use your new 'file' reference safely down here (ERRORS FIXED ✅)
    const storageKey = `employees/${employee_id}/${Date.now()}-${file.originalname}`;

    await uploadFile({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const document = documentRepo.create({
      employee,
      category: category as DocumentCategory,
      related_entity_type: (related_entity_type as any) ?? null,
      related_entity_id: related_entity_id ?? null,
      file_url: storageKey,
      ocr_status: "pending",
    });
    await documentRepo.save(document);

    await logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "Document",
      entityId: document.id,
      description: `Uploaded ${category} document for ${employee.first_name} ${employee.last_name}`,
    });

    res.status(201).json({ document });

    // 4. Pass the verified file buffer to the background task tracker (ERROR FIXED ✅)
    waitUntil(
      extractTextFromImage(file.buffer)
        .then(async (text) => {
          document.ocr_text = text;
          document.ocr_status = "completed";
          await documentRepo.save(document);
          console.log(
            `[OCR SUCCESS] Completed record update for document ${document.id}`,
          );
        })
        .catch(async (err) => {
          console.error(
            "[OCR FAIL] Error processing background OCR task:",
            err,
          );
          document.ocr_status = "failed";
          await documentRepo.save(document);
        }),
    );
  },
);

// GET /documents?employee_id=xxx — list all documents for an employee
router.get("/", authenticate, async (req: Request, res: Response) => {
  const employeeId = req.query.employee_id;

  if (!employeeId || typeof employeeId !== "string") {
    res.status(400).json({ error: "employee_id query parameter is required" });
    return;
  }

  const documentRepo = AppDataSource.getRepository(Document);
  const documents = await documentRepo.find({
    where: { employee: { id: employeeId } },
    order: { uploaded_at: "DESC" },
  });

  res.json({ documents });
});

// GET /documents/:id — returns document metadata PLUS a fresh signed URL to view it
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }

  const documentRepo = AppDataSource.getRepository(Document);
  const document = await documentRepo.findOne({ where: { id } });

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  // generate a fresh, time-limited signed URL — this is the ONLY way to
  // actually view the file, since the bucket itself is private
  const signedUrl = await getSignedFileUrl(document.file_url);

  res.json({ document, signedUrl });
});

export default router;

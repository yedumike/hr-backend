import { Router, Request, Response } from "express";
import multer from "multer";
import { AppDataSource } from "../data-source";
import { Document, DocumentCategory } from "../entities/Document";
import { Employee } from "../entities/Employee";
import { authenticate, authorize } from "../middleware/authenticate";
import { logAudit } from "../utils/audit";
import { uploadFile, getSignedFileUrl } from "../utils/storage";

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

router.post(
  "/",
  authenticate,
  authorize("HR_ADMIN"),
  upload.single("file"), // expects the form field to be named "file"
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file was uploaded" });
      return;
    }

    const { employee_id, category, related_entity_type, related_entity_id } =
      req.body as UploadBody;

    if (!employee_id || !category) {
      res.status(400).json({ error: "employee_id and category are required" });
      return;
    }

    if (!validCategories.includes(category as DocumentCategory)) {
      res
        .status(400)
        .json({
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

    // build a unique storage key — includes employee id and a timestamp
    // to avoid filename collisions if the same file name is uploaded twice
    const storageKey = `employees/${employee_id}/${Date.now()}-${req.file.originalname}`;

    await uploadFile({
      key: storageKey,
      body: req.file.buffer,
      contentType: req.file.mimetype,
    });

    const document = documentRepo.create({
      employee,
      category: category as DocumentCategory,
      related_entity_type: (related_entity_type as any) ?? null,
      related_entity_id: related_entity_id ?? null,
      file_url: storageKey, // we store the KEY, not a public URL — signed URLs are generated on demand
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
  },
);

export default router;

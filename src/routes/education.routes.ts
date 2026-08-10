import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { EducationRecord } from "../entities/EducationRecord";
import { Employee } from "../entities/Employee";
import { authenticate, authorize } from "../middleware/authenticate";
import { logAudit } from "../utils/audit";

const router = Router();

interface CreateEducationBody {
  employee_id?: string;
  institution?: string;
  degree?: string;
  field_of_study?: string;
  year_completed?: number;
}

// CREATE — POST /education
router.post(
  "/",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("education:create"),
  async (req: Request, res: Response) => {
    const { employee_id, institution, degree, field_of_study, year_completed } =
      req.body as CreateEducationBody;

    if (
      !employee_id ||
      !institution ||
      !degree ||
      !field_of_study ||
      !year_completed
    ) {
      res.status(400).json({ error: "Missing required education fields" });
      return;
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const educationRepo = AppDataSource.getRepository(EducationRecord);

    const employee = await employeeRepo.findOne({ where: { id: employee_id } });
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const record = educationRepo.create({
      employee,
      institution,
      degree,
      field_of_study,
      year_completed,
    });

    await educationRepo.save(record);

    await logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "EducationRecord",
      entityId: record.id,
      description: `Added an education record (${degree}, ${institution}) for ${employee.first_name} ${employee.last_name}`,
    });

    res.status(201).json({ educationRecord: record });
  },
);

// LIST — GET /education?employee_id=xxx
// employee_id is required as a query param, since without it there's no
// sensible default (returning every education record for every employee
// isn't useful, and isn't something the frontend would realistically need)
router.get(
  "/",
  authenticate,
  authorize("education:view"),
  async (req: Request, res: Response) => {
    const employeeId = req.query.employee_id;

    if (!employeeId || typeof employeeId !== "string") {
      res
        .status(400)
        .json({ error: "employee_id query parameter is required" });
      return;
    }

    const educationRepo = AppDataSource.getRepository(EducationRecord);
    const records = await educationRepo.find({
      where: { employee: { id: employeeId } },
      order: { year_completed: "DESC" },
    });

    res.json({ educationRecords: records });
  },
);

interface UpdateEducationBody {
  institution?: string;
  degree?: string;
  field_of_study?: string;
  year_completed?: number;
}

// UPDATE — PUT /education/:id
router.put(
  "/:id",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("education:update"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid education record id" });
      return;
    }

    const educationRepo = AppDataSource.getRepository(EducationRecord);
    const record = await educationRepo.findOne({
      where: { id },
      relations: { employee: true },
    });

    if (!record) {
      res.status(404).json({ error: "Education record not found" });
      return;
    }

    const body = req.body as UpdateEducationBody;

    if (body.institution) record.institution = body.institution;
    if (body.degree) record.degree = body.degree;
    if (body.field_of_study) record.field_of_study = body.field_of_study;
    if (body.year_completed) record.year_completed = body.year_completed;

    await educationRepo.save(record);

    await logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "EducationRecord",
      entityId: record.id,
      description: `Updated an education record for ${record.employee.first_name} ${record.employee.last_name}`,
    });

    res.json({ educationRecord: record });
  },
);

// DELETE — DELETE /education/:id
// note: this is a HARD delete, not soft — unlike Employee/Department,
// an incorrect education record has no ongoing operational significance
// once removed, and there's no "reactivate" use case here
router.delete(
  "/:id",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("education:delete"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid education record id" });
      return;
    }

    const educationRepo = AppDataSource.getRepository(EducationRecord);
    const record = await educationRepo.findOne({
      where: { id },
      relations: { employee: true },
    });

    if (!record) {
      res.status(404).json({ error: "Education record not found" });
      return;
    }

    const employeeName = `${record.employee.first_name} ${record.employee.last_name}`;

    await educationRepo.remove(record);

    await logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "EducationRecord",
      entityId: id,
      description: `Removed an education record for ${employeeName}`,
    });

    res.json({ message: "Education record deleted" });
  },
);

export default router;

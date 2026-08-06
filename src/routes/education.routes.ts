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
  authorize("HR_ADMIN"),
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
router.get("/", authenticate, async (req: Request, res: Response) => {
  const employeeId = req.query.employee_id;

  if (!employeeId || typeof employeeId !== "string") {
    res.status(400).json({ error: "employee_id query parameter is required" });
    return;
  }

  const educationRepo = AppDataSource.getRepository(EducationRecord);
  const records = await educationRepo.find({
    where: { employee: { id: employeeId } },
    order: { year_completed: "DESC" },
  });

  res.json({ educationRecords: records });
});

export default router;

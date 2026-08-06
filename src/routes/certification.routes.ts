import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Certification } from "../entities/Certification";
import { Employee } from "../entities/Employee";
import { authenticate, authorize } from "../middleware/authenticate";
import { logAudit } from "../utils/audit";

const router = Router();

interface CreateCertificationBody {
  employee_id?: string;
  name?: string;
  issued_by?: string;
  issue_date?: string;
  expiry_date?: string; // optional — not every certification expires
}

// CREATE — POST /certifications
router.post(
  "/",
  authenticate,
  authorize("HR_ADMIN"),
  async (req: Request, res: Response) => {
    const { employee_id, name, issued_by, issue_date, expiry_date } =
      req.body as CreateCertificationBody;

    if (!employee_id || !name || !issued_by || !issue_date) {
      res.status(400).json({ error: "Missing required certification fields" });
      return;
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const certRepo = AppDataSource.getRepository(Certification);

    const employee = await employeeRepo.findOne({ where: { id: employee_id } });
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const certification = certRepo.create({
      employee,
      name,
      issued_by,
      issue_date,
      expiry_date: expiry_date ?? null,
    });

    await certRepo.save(certification);

    await logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "Certification",
      entityId: certification.id,
      description: `Uploaded certification "${name}" for ${employee.first_name} ${employee.last_name}`,
    });

    res.status(201).json({ certification });
  },
);

// LIST — GET /certifications?employee_id=xxx
router.get("/", authenticate, async (req: Request, res: Response) => {
  const employeeId = req.query.employee_id;

  if (!employeeId || typeof employeeId !== "string") {
    res.status(400).json({ error: "employee_id query parameter is required" });
    return;
  }

  const certRepo = AppDataSource.getRepository(Certification);
  const certifications = await certRepo.find({
    where: { employee: { id: employeeId } },
    order: { issue_date: "DESC" },
  });

  res.json({ certifications });
});

interface UpdateCertificationBody {
  name?: string;
  issued_by?: string;
  issue_date?: string;
  expiry_date?: string;
}

// UPDATE — PUT /certifications/:id
router.put(
  "/:id",
  authenticate,
  authorize("HR_ADMIN"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid certification id" });
      return;
    }

    const certRepo = AppDataSource.getRepository(Certification);
    const certification = await certRepo.findOne({
      where: { id },
      relations: { employee: true },
    });

    if (!certification) {
      res.status(404).json({ error: "Certification not found" });
      return;
    }

    const body = req.body as UpdateCertificationBody;

    if (body.name) certification.name = body.name;
    if (body.issued_by) certification.issued_by = body.issued_by;
    if (body.issue_date) certification.issue_date = body.issue_date;
    if (body.expiry_date) certification.expiry_date = body.expiry_date;

    await certRepo.save(certification);

    await logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "Certification",
      entityId: certification.id,
      description: `Updated certification "${certification.name}" for ${certification.employee.first_name} ${certification.employee.last_name}`,
    });

    res.json({ certification });
  },
);

// DELETE — DELETE /certifications/:id
// hard delete, same reasoning as EducationRecord — no ongoing operational
// significance once removed, no "reactivate" use case
router.delete(
  "/:id",
  authenticate,
  authorize("HR_ADMIN"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid certification id" });
      return;
    }

    const certRepo = AppDataSource.getRepository(Certification);
    const certification = await certRepo.findOne({
      where: { id },
      relations: { employee: true },
    });

    if (!certification) {
      res.status(404).json({ error: "Certification not found" });
      return;
    }

    const employeeName = `${certification.employee.first_name} ${certification.employee.last_name}`;
    const certName = certification.name;

    await certRepo.remove(certification);

    await logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "Certification",
      entityId: id,
      description: `Removed certification "${certName}" for ${employeeName}`,
    });

    res.json({ message: "Certification deleted" });
  },
);

export default router;

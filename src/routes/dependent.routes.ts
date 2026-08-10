import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Dependent } from "../entities/Dependent";
import { Employee } from "../entities/Employee";
import { authenticate, authorize } from "../middleware/authenticate";
import { logAudit } from "../utils/audit";

const router = Router();

interface CreateDependentBody {
  employee_id?: string;
  name?: string;
  relationship?: string;
  date_of_birth?: string;
  contact?: string;
}

router.post(
  "/",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("dependents:create"),
  async (req: Request, res: Response) => {
    const { employee_id, name, relationship, date_of_birth, contact } =
      req.body as CreateDependentBody;

    if (!employee_id || !name || !relationship || !date_of_birth) {
      res.status(400).json({ error: "Missing required dependent fields" });
      return;
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const dependentRepo = AppDataSource.getRepository(Dependent);

    const employee = await employeeRepo.findOne({ where: { id: employee_id } });
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const dependent = dependentRepo.create({
      employee,
      name,
      relationship,
      date_of_birth,
      contact: contact ?? null,
    });

    await dependentRepo.save(dependent);

    await logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "Dependent",
      entityId: dependent.id,
      description: `Added dependent "${name}" (${relationship}) for ${employee.first_name} ${employee.last_name}`,
    });

    res.status(201).json({ dependent });
  },
);

router.get(
  "/",
  authenticate,
  authorize("dependents:view"),
  async (req: Request, res: Response) => {
    const employeeId = req.query.employee_id;

    if (!employeeId || typeof employeeId !== "string") {
      res
        .status(400)
        .json({ error: "employee_id query parameter is required" });
      return;
    }

    const dependentRepo = AppDataSource.getRepository(Dependent);
    const dependents = await dependentRepo.find({
      where: { employee: { id: employeeId } },
      order: { created_at: "DESC" },
    });

    res.json({ dependents });
  },
);

interface UpdateDependentBody {
  name?: string;
  relationship?: string;
  date_of_birth?: string;
  contact?: string;
}

router.put(
  "/:id",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("dependents:update"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid dependent id" });
      return;
    }

    const dependentRepo = AppDataSource.getRepository(Dependent);
    const dependent = await dependentRepo.findOne({
      where: { id },
      relations: { employee: true },
    });

    if (!dependent) {
      res.status(404).json({ error: "Dependent not found" });
      return;
    }

    const body = req.body as UpdateDependentBody;

    if (body.name) dependent.name = body.name;
    if (body.relationship) dependent.relationship = body.relationship;
    if (body.date_of_birth) dependent.date_of_birth = body.date_of_birth;
    if (body.contact) dependent.contact = body.contact;

    await dependentRepo.save(dependent);

    await logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "Dependent",
      entityId: dependent.id,
      description: `Updated dependent "${dependent.name}" for ${dependent.employee.first_name} ${dependent.employee.last_name}`,
    });

    res.json({ dependent });
  },
);

router.delete(
  "/:id",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("dependents:delete"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid dependent id" });
      return;
    }

    const dependentRepo = AppDataSource.getRepository(Dependent);
    const dependent = await dependentRepo.findOne({
      where: { id },
      relations: { employee: true },
    });

    if (!dependent) {
      res.status(404).json({ error: "Dependent not found" });
      return;
    }

    const employeeName = `${dependent.employee.first_name} ${dependent.employee.last_name}`;
    const dependentName = dependent.name;

    await dependentRepo.remove(dependent);

    await logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "Dependent",
      entityId: id,
      description: `Removed dependent "${dependentName}" for ${employeeName}`,
    });

    res.json({ message: "Dependent deleted" });
  },
);

export default router;

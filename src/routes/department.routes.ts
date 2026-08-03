import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Department } from "../entities/Department";
import { authenticate, authorize } from "../middleware/authenticate";
import { Employee } from "../entities/Employee";
import { Not } from "typeorm";

const router = Router();

// only HR_ADMIN can create departments — this shapes org structure,
// shouldn't be something a manager or employee can casually change
router.post(
  "/",
  authenticate,
  authorize("HR_ADMIN"),
  async (req: Request, res: Response) => {
    const { name, description, head_of_department_id } = req.body as {
      name?: string;
      description?: string;
      head_of_department_id?: string;
    };

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: "Department name is required" });
      return;
    }

    const departmentRepo = AppDataSource.getRepository(Department);
    const employeeRepo = AppDataSource.getRepository(Employee);

    const existing = await departmentRepo.findOne({ where: { name } });
    if (existing) {
      res
        .status(409)
        .json({ error: "A department with this name already exists" });
      return;
    }

    // head_of_department is optional — only look it up if provided
    let headOfDepartment: Employee | null = null;
    if (head_of_department_id) {
      headOfDepartment = await employeeRepo.findOne({
        where: { id: head_of_department_id },
      });
      if (!headOfDepartment) {
        res
          .status(404)
          .json({ error: "Specified head of department not found" });
        return;
      }
    }

    const department = departmentRepo.create({
      name,
      description: description ?? null,
      head_of_department: headOfDepartment,
    });

    await departmentRepo.save(department);

    res.status(201).json({ department });
  },
);

// any authenticated user can view the list of departments
// (needed for things like populating a dropdown when creating an employee)
router.get("/", authenticate, async (req: Request, res: Response) => {
  const departmentRepo = AppDataSource.getRepository(Department);

  // req.query values are typed loosely by Express (string | string[] | undefined),
  // same reasoning as req.params — so we compare directly against the string "true"
  // rather than trying to use it as a boolean
  const includeInactive = req.query.includeInactive === "true";

  const departments = await departmentRepo.find({
    where: includeInactive ? {} : { is_active: true },
    relations: { head_of_department: true },
  });

  res.json({ departments });
});

// single department lookup
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: "Invalid department id" });
    return;
  }

  const departmentRepo = AppDataSource.getRepository(Department);
  const department = await departmentRepo.findOne({ where: { id } });

  if (!department) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  res.json({ department });
});

// update — currently just supports renaming
router.put(
  "/:id",
  authenticate,
  authorize("HR_ADMIN"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid department id" });
      return;
    }

    const { name, description, head_of_department_id } = req.body as {
      name?: string;
      description?: string;
      head_of_department_id?: string;
    };

    const departmentRepo = AppDataSource.getRepository(Department);
    const employeeRepo = AppDataSource.getRepository(Employee);

    const department = await departmentRepo.findOne({ where: { id } });
    if (!department) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    if (name) {
      const existing = await departmentRepo.findOne({ where: { name } });
      if (existing && existing.id !== department.id) {
        res
          .status(409)
          .json({ error: "A department with this name already exists" });
        return;
      }
      department.name = name;
    }

    // description can be explicitly cleared by sending an empty string,
    // but only touched at all if the key was actually sent
    if (description !== undefined) {
      department.description = description || null;
    }

    if (head_of_department_id) {
      const headOfDepartment = await employeeRepo.findOne({
        where: { id: head_of_department_id },
      });
      if (!headOfDepartment) {
        res
          .status(404)
          .json({ error: "Specified head of department not found" });
        return;
      }
      department.head_of_department = headOfDepartment;
    }

    await departmentRepo.save(department);

    res.json({ department });
  },
);

// delete — blocked if any employees are still linked to this department
router.delete(
  "/:id",
  authenticate,
  authorize("HR_ADMIN"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid department id" });
      return;
    }

    const departmentRepo = AppDataSource.getRepository(Department);
    const employeeRepo = AppDataSource.getRepository(Employee);

    const department = await departmentRepo.findOne({ where: { id } });
    if (!department) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    // only count employees who are still genuinely active/inactive —
    // a terminated employee historically linked to this department
    // shouldn't block deactivation
    const linkedEmployeeCount = await employeeRepo.count({
      where: { department: { id }, status: Not("terminated") },
    });

    if (linkedEmployeeCount > 0) {
      res.status(409).json({
        error: `Cannot deactivate department — ${linkedEmployeeCount} active employee(s) are still assigned to it. Reassign them first.`,
      });
      return;
    }

    // soft delete — flip the flag, row stays in the DB
    department.is_active = false;
    await departmentRepo.save(department);

    res.json({ message: "Department deactivated", department });
  },
);

export default router;

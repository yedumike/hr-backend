import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Department } from "../entities/Department";
import { authenticate, authorize } from "../middleware/authenticate";
import { Employee } from "../entities/Employee";

const router = Router();

// only HR_ADMIN can create departments — this shapes org structure,
// shouldn't be something a manager or employee can casually change
router.post(
  "/",
  authenticate,
  authorize("HR_ADMIN"),
  async (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: "Department name is required" });
      return;
    }

    const departmentRepo = AppDataSource.getRepository(Department);

    // check for duplicates ourselves first, so we can return a clean error
    // instead of letting the DB's UNIQUE constraint throw an ugly raw error
    const existing = await departmentRepo.findOne({ where: { name } });
    if (existing) {
      res
        .status(409)
        .json({ error: "A department with this name already exists" });
      return;
    }

    const department = departmentRepo.create({ name });
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

    const { name } = req.body as { name?: string };

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: "Department name is required" });
      return;
    }

    const departmentRepo = AppDataSource.getRepository(Department);
    const department = await departmentRepo.findOne({ where: { id } });

    if (!department) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    // check the new name isn't already taken by a DIFFERENT department
    const existing = await departmentRepo.findOne({ where: { name } });
    if (existing && existing.id !== department.id) {
      res
        .status(409)
        .json({ error: "A department with this name already exists" });
      return;
    }

    department.name = name;
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

    // count employees linked to this department before allowing deletion
    const linkedEmployeeCount = await employeeRepo.count({
      where: { department: { id } },
    });

    if (linkedEmployeeCount > 0) {
      res.status(409).json({
        error: `Cannot delete department — ${linkedEmployeeCount} employee(s) are still assigned to it. Reassign them first.`,
      });
      return;
    }

    await departmentRepo.remove(department);

    res.json({ message: "Department deleted" });
  },
);

export default router;

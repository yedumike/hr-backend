import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Department } from "../entities/Department";
import { authenticate, authorize } from "../middleware/authenticate";

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
  const departments = await departmentRepo.find();
  res.json({ departments });
});

export default router;

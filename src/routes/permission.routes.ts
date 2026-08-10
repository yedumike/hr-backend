// src/routes/permission.routes.ts
import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Permission } from "../entities/Permission";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("roles:manage"),
  async (req: Request, res: Response) => {
    const permissionRepo = AppDataSource.getRepository(Permission);
    const permissions = await permissionRepo.find({ order: { name: "ASC" } });
    res.json({ permissions });
  },
);

export default router;

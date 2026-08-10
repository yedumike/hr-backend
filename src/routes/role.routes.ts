import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";
import { User } from "../entities/User";
import { authenticate, authorize } from "../middleware/authenticate";
import { logAudit } from "../utils/audit";

const router = Router();

// CREATE — POST /roles
interface CreateRoleBody {
  name?: string;
  permissionNames?: string[]; // e.g. ["employees:view", "departments:view"]
}

router.post(
  "/",
  authenticate,
  authorize("roles:manage"),
  async (req: Request, res: Response) => {
    const { name, permissionNames } = req.body as CreateRoleBody;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: "Role name is required" });
      return;
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const permissionRepo = AppDataSource.getRepository(Permission);

    const existing = await roleRepo.findOne({ where: { name } });
    if (existing) {
      res.status(409).json({ error: "A role with this name already exists" });
      return;
    }

    // permissions are optional at creation — a role can start with none
    // and have permissions added later via PUT
    let permissions: Permission[] = [];
    if (permissionNames && permissionNames.length > 0) {
      permissions = await permissionRepo.find({
        where: permissionNames.map((n) => ({ name: n })),
      });

      const foundNames = permissions.map((p) => p.name);
      const missing = permissionNames.filter((n) => !foundNames.includes(n));
      if (missing.length > 0) {
        res
          .status(400)
          .json({ error: `Unknown permission(s): ${missing.join(", ")}` });
        return;
      }
    }

    const role = roleRepo.create({ name, permissions });
    await roleRepo.save(role);

    await logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "Role",
      entityId: role.id,
      description: `Created role "${name}" with ${permissions.length} permission(s)`,
    });

    res.status(201).json({ role });
  },
);

// LIST — GET /roles
router.get(
  "/",
  authenticate,
  authorize("roles:manage"),
  async (req: Request, res: Response) => {
    const roleRepo = AppDataSource.getRepository(Role);
    const roles = await roleRepo.find({ relations: { permissions: true } });
    res.json({ roles });
  },
);

// SINGLE — GET /roles/:id
router.get(
  "/:id",
  authenticate,
  authorize("roles:manage"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid role id" });
      return;
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const role = await roleRepo.findOne({
      where: { id },
      relations: { permissions: true },
    });

    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    res.json({ role });
  },
);

// UPDATE — PUT /roles/:id
interface UpdateRoleBody {
  name?: string;
  permissionNames?: string[];
}

router.put(
  "/:id",
  authenticate,
  authorize("roles:manage"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid role id" });
      return;
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const permissionRepo = AppDataSource.getRepository(Permission);

    const role = await roleRepo.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    const { name, permissionNames } = req.body as UpdateRoleBody;

    if (name) {
      const existing = await roleRepo.findOne({ where: { name } });
      if (existing && existing.id !== role.id) {
        res.status(409).json({ error: "A role with this name already exists" });
        return;
      }
      role.name = name;
    }

    if (permissionNames) {
      const permissions = await permissionRepo.find({
        where: permissionNames.map((n) => ({ name: n })),
      });

      const foundNames = permissions.map((p) => p.name);
      const missing = permissionNames.filter((n) => !foundNames.includes(n));
      if (missing.length > 0) {
        res
          .status(400)
          .json({ error: `Unknown permission(s): ${missing.join(", ")}` });
        return;
      }

      role.permissions = permissions;
    }

    // saving this updates permissions_updated_at automatically (@UpdateDateColumn),
    // which is exactly what triggers the staleness check for anyone with this role
    await roleRepo.save(role);

    await logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "Role",
      entityId: role.id,
      description: `Updated role "${role.name}"`,
    });

    res.json({ role });
  },
);

// DELETE — DELETE /roles/:id
router.delete(
  "/:id",
  authenticate,
  authorize("roles:manage"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid role id" });
      return;
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const userRepo = AppDataSource.getRepository(User);

    const role = await roleRepo.findOne({ where: { id } });
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    // block deletion if any users currently have this role — same pattern
    // as blocking department deletion when employees are still assigned
    const usersWithRole = await userRepo.count({ where: { role: { id } } });
    if (usersWithRole > 0) {
      res.status(409).json({
        error: `Cannot delete role — ${usersWithRole} user(s) currently have this role. Reassign them first.`,
      });
      return;
    }

    const roleName = role.name;
    await roleRepo.remove(role);

    await logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "Role",
      entityId: id,
      description: `Deleted role "${roleName}"`,
    });

    res.json({ message: "Role deleted" });
  },
);

// LIST NAMES ONLY — GET /roles/names
// Lightweight, scoped to employees:create_account (not roles:manage) so
// HR_ADMIN can populate a role dropdown without needing full role-management access.
// Must be registered before GET /:id, or Express will match "names" as an :id param.
router.get(
  "/names",
  authenticate,
  authorize("employees:create_account"),
  async (req: Request, res: Response) => {
    const roleRepo = AppDataSource.getRepository(Role);
    const roles = await roleRepo.find({ select: { id: true, name: true } });
    res.json({ roles });
  },
);

export default router;

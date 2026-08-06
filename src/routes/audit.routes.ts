// src/routes/audit.routes.ts
import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { AuditLog } from "../entities/AuditLog";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  const auditLogRepo = AppDataSource.getRepository(AuditLog);

  // support a "limit" query param since the frontend will likely only want
  // the most recent handful (the mockup showed ~7 entries), not the entire history
  const limitParam = req.query.limit;
  const limit =
    typeof limitParam === "string" && !isNaN(Number(limitParam))
      ? Number(limitParam)
      : 20; // sensible default if not specified

  const logs = await auditLogRepo.find({
    relations: { user: true },
    // explicitly whitelist which fields to return — this applies to the
    // main entity AND any relation you list here. Without this, TypeORM
    // returns every column on the related User, including password_hash.
    select: {
      id: true,
      action: true,
      entity_type: true,
      entity_id: true,
      description: true,
      created_at: true,
      user: {
        id: true,
        email: true,
      },
    },
    order: { created_at: "DESC" },
    take: limit,
  });

  res.json({ logs });
});

export default router;

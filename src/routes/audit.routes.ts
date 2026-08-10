// src/routes/audit.routes.ts
import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { AuditLog } from "../entities/AuditLog";
import { authenticate, authorize } from "../middleware/authenticate";
import { Employee } from "../entities/Employee";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("audit_logs:view"),
  async (req: Request, res: Response) => {
    const auditLogRepo = AppDataSource.getRepository(AuditLog);
    const employeeRepo = AppDataSource.getRepository(Employee);
    // support a "limit" query param since the frontend will likely only want
    // the most recent handful (the mockup showed ~7 entries), not the entire history
    const limitParam = req.query.limit;
    const limit =
      typeof limitParam === "string" && !isNaN(Number(limitParam))
        ? Number(limitParam)
        : 20; // sensible default if not specified

    const logs = await auditLogRepo.find({
      relations: { user: true },
      select: {
        id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        description: true,
        created_at: true,
        user: { id: true, email: true },
      },
      order: { created_at: "DESC" },
      take: limit,
    });

    // enrich each log with an actor name — prefer the linked Employee's name
    // if one exists, otherwise fall back to the user's email
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        let actorName = log.user?.email ?? "Unknown user";

        if (log.user) {
          const employee = await employeeRepo.findOne({
            where: { user: { id: log.user.id } },
          });
          if (employee) {
            actorName = `${employee.first_name} ${employee.last_name}`;
          }
        }

        return { ...log, actorName };
      }),
    );

    res.json({ logs: enrichedLogs });
  },
);

export default router;

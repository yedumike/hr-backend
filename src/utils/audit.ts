import { AppDataSource } from "../data-source";
import { AuditLog } from "../entities/AuditLog";
import { User } from "../entities/User";

interface LogAuditParams {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string; // e.g. "Employee", "Department"
  entityId: string;
  description: string; // human-readable, shown directly in the activity feed
}

// small reusable function — call this from any route where something
// worth tracking happens, instead of writing raw AuditLog inserts everywhere
export async function logAudit(params: LogAuditParams): Promise<void> {
  const auditLogRepo = AppDataSource.getRepository(AuditLog);
  const userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOne({ where: { id: params.userId } });

  const log = auditLogRepo.create({
    user,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    description: params.description,
  });

  await auditLogRepo.save(log);
}

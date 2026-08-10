import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JwtPayload } from "../utils/jwt";
import { AppDataSource } from "../data-source";
import { Role } from "../entities/Role";

// Express's Request type doesn't know about a "user" property by default —
// this block adds it globally, so `req.user` is recognized everywhere in the project
// without needing to redeclare it in every file that uses it.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// This runs BEFORE any protected route handler.
// It checks: "does this request have a valid access token cookie?"
// If yes -> attaches the decoded user info to req.user, and lets the request continue (next())
// If no  -> stops the request here with a 401, the route handler never runs
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    // SUPER_ADMIN bypasses the staleness check entirely — always trusted
    if (payload.role !== "SUPER_ADMIN") {
      const roleRepo = AppDataSource.getRepository(Role);
      const role = await roleRepo.findOne({ where: { name: payload.role } });

      if (
        role &&
        role.permissions_updated_at.toISOString() !==
          payload.permissionsSnapshotAt
      ) {
        res.status(401).json({
          error: "Permissions have changed, please refresh your session",
        });
        return;
      }
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// A second, separate middleware — used AFTER authenticate on routes that
// should only be accessible to specific roles.
// Usage example (later): router.get("/admin-only", authenticate, authorize("HR_ADMIN"), handler)
export function authorize(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // SUPER_ADMIN always passes, regardless of permission list
    if (req.user.role === "SUPER_ADMIN") {
      next();
      return;
    }

    const hasPermission = requiredPermissions.every((perm) =>
      req.user!.permissions.includes(perm),
    );

    if (!hasPermission) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}

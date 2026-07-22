import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JwtPayload } from "../utils/jwt";

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
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // req.cookies is populated by the cookie-parser middleware we'll wire up in app.ts
  // we're being explicit about the type here since req.cookies itself is loosely typed
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return; // important: stop execution here, don't call next()
  }

  try {
    // verifyAccessToken throws if the token is expired, tampered with, or invalid
    const payload = verifyAccessToken(token);
    req.user = payload;
    next(); // token is valid — allow the request to proceed to the actual route
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// A second, separate middleware — used AFTER authenticate on routes that
// should only be accessible to specific roles.
// Usage example (later): router.get("/admin-only", authenticate, authorize("HR_ADMIN"), handler)
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // if authenticate didn't run first, req.user won't exist — treat as forbidden
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
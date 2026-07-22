import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  // req.body's shape isn't known to TypeScript by default (it's typed as `any`
  // under the hood), so we cast it here and treat both fields as possibly missing
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const userRepo = AppDataSource.getRepository(User);

  // "relations: ['role']" tells TypeORM to also fetch the linked Role row
  // (otherwise user.role would just be an unpopulated reference)
  const user = await userRepo.findOne({
    where: { email },
    relations: { role: true },
  });

  // deliberately vague error — don't reveal whether the email exists or the
  // password was wrong; that distinction helps attackers enumerate valid accounts
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // bcrypt.compare re-hashes the given password with the same salt stored in
  // user.password_hash, and checks if the result matches
  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // this is the data embedded inside both tokens — kept minimal
  const payload = { userId: user.id, role: user.role.name };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // cross-site cookie settings — required since your frontend will be on a
  // different domain than this API (confirmed earlier)
  const cookieOptions = {
    httpOnly: true, // JS on the frontend can't read this cookie — protects against XSS stealing the token
    secure: true, // only sent over HTTPS — required for sameSite: "none" to work at all
    sameSite: "none" as const, // allows the cookie to be sent across different domains
  };

  res.cookie("access_token", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes — matches the JWT's own expiry
  });

  res.cookie("refresh_token", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    message: "Login successful",
    user: { id: user.id, email: user.email, role: user.role.name },
  });
});

router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.json({ message: "Logged out" });
});

// a simple protected route to prove the whole flow works —
// authenticate runs first; if it succeeds, req.user is populated
router.get("/me", authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
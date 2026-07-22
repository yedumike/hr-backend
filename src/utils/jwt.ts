import jwt from "jsonwebtoken";

// Small helper: reads an env var, and if it's missing, throws immediately.
// Because this function's return type is declared as `string` (not `string | undefined`),
// anything that calls it gets back a guaranteed string — no narrowing tricks needed downstream.
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in .env`);
  }
  return value;
}

const ACCESS_SECRET = getRequiredEnv("JWT_ACCESS_SECRET");
const REFRESH_SECRET = getRequiredEnv("JWT_REFRESH_SECRET");

// what we embed inside the token — kept minimal on purpose
// (never put sensitive data like passwords in a JWT payload — it's decodable by anyone, just not editable without the secret)
export interface JwtPayload {
  userId: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  // short-lived — if stolen, damage window is small
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: JwtPayload): string {
  // long-lived — used only to get a new access token, not for direct API calls
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
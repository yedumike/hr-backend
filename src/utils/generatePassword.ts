import crypto from "crypto";

// generates a random, readable temporary password
// e.g. "Xk9$mQ2pL7"
export function generateTempPassword(): string {
  // crypto.randomBytes gives us cryptographically secure randomness,
  // not just Math.random() (which isn't safe for anything security-related)
  const randomString = crypto
    .randomBytes(6)
    .toString("base64")
    .replace(/[+/=]/g, "");
  return `${randomString}!A1`; // append a symbol + letter + digit to satisfy typical password complexity rules
}

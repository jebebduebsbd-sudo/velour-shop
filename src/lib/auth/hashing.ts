import { createHash, createHmac, randomBytes } from "node:crypto";

import { emailTokenPepper, sessionSecret } from "@/lib/env";

/** Generates a high-entropy opaque token (32 random bytes, base64url). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash of a session token. Only the hash is persisted, so a database leak
 * cannot be replayed as a valid session.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Peppered hash of an email token (verification / password reset). The pepper
 * lives in the environment, so database contents alone cannot forge a token.
 */
export function hashEmailToken(token: string): string {
  return createHmac("sha256", emailTokenPepper()).update(token).digest("hex");
}

/**
 * Keyed, truncated hash of a client IP. Lets us rate-limit and audit by
 * origin without storing raw addresses.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHmac("sha256", sessionSecret())
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

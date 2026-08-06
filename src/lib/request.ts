import { headers } from "next/headers";

import { hashIp } from "@/lib/auth/hashing";
import { serverEnv } from "@/lib/env";

/**
 * Request-level security checks shared by server actions and route handlers.
 */

/**
 * Verifies that a mutating request originated from this site.
 *
 * Combined with SameSite=Lax cookies this gives defense in depth against CSRF:
 * a cross-site form post either won't carry the session cookie, or will fail
 * this Origin check. Requests with no Origin header at all are rejected for
 * mutations, since browsers always send it for cross-origin form submissions.
 */
export async function assertSameOrigin(): Promise<void> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  const allowed = new Set<string>([serverEnv().APP_ORIGIN]);

  // Accept the request's own host so preview deployments and local ports work.
  const host = headerList.get("host");
  if (host) {
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    allowed.add(`${proto}://${host}`);
  }

  if (!origin || !allowed.has(origin)) {
    throw new Error("Cross-origin request rejected");
  }
}

/** Best-effort client IP, hashed for storage. */
export async function clientIpHash(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    null;
  return hashIp(ip);
}

export async function clientUserAgent(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get("user-agent");
}

import { createHmac, randomUUID } from "node:crypto";

import { sessionSecret } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Fixed-window rate limiting backed by the database, so limits hold across
 * server instances without requiring Redis. Subjects are hashed, so raw IPs
 * and identifiers are never stored.
 */
export type RateLimitRule = {
  /** Logical action name, e.g. "auth.login". */
  action: string;
  /** Maximum attempts allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export const RATE_LIMITS = {
  login: { action: "auth.login", limit: 8, windowSeconds: 600 },
  register: { action: "auth.register", limit: 5, windowSeconds: 3600 },
  passwordReset: {
    action: "auth.password_reset",
    limit: 5,
    windowSeconds: 3600,
  },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function bucketKey(rule: RateLimitRule, subject: string): string {
  const digest = createHmac("sha256", sessionSecret())
    .update(`${rule.action}:${subject}`)
    .digest("hex")
    .slice(0, 40);
  return `${rule.action}:${digest}`;
}

/**
 * Consumes one attempt against the rule's window.
 *
 * The count/window update runs as a single atomic upsert so concurrent
 * attempts cannot race past the limit. Database failures fail open (an
 * outage must not lock every user out) while a reached limit still denies.
 */
export async function consumeRateLimit(
  rule: RateLimitRule,
  subject: string,
): Promise<RateLimitResult> {
  const key = bucketKey(rule, subject);
  try {
    const rows = await prisma.$queryRaw<
      { count: number; windowStart: Date }[]
    >`
      INSERT INTO "RateLimitBucket" ("id", "key", "count", "windowStart")
      VALUES (${randomUUID()}, ${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."windowStart"
               < now() - make_interval(secs => ${rule.windowSeconds}::double precision)
          THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "windowStart" = CASE
          WHEN "RateLimitBucket"."windowStart"
               < now() - make_interval(secs => ${rule.windowSeconds}::double precision)
          THEN now()
          ELSE "RateLimitBucket"."windowStart"
        END
      RETURNING "count", "windowStart"
    `;

    const row = rows[0];
    if (!row) {
      return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
    }
    const count = Number(row.count);
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(row.windowStart).getTime()) / 1000,
    );
    return {
      allowed: count <= rule.limit,
      remaining: Math.max(rule.limit - count, 0),
      retryAfterSeconds: Math.max(rule.windowSeconds - elapsedSeconds, 1),
    };
  } catch {
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

export async function resetRateLimit(
  rule: RateLimitRule,
  subject: string,
): Promise<void> {
  try {
    await prisma.rateLimitBucket.deleteMany({
      where: { key: bucketKey(rule, subject) },
    });
  } catch {
    // Non-fatal: the window expires on its own.
  }
}

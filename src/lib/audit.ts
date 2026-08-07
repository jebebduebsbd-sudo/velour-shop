import { prisma } from "@/lib/prisma";

/**
 * Append-only audit log.
 *
 * Audit records must never contain passwords, session tokens, email tokens,
 * API keys, deliverable values, or payment card data. `sanitizeMetadata`
 * enforces that by dropping any key that looks sensitive, so a careless call
 * site cannot leak a secret into the trail.
 */
export const AUDIT_ACTIONS = {
  loginSucceeded: "auth.login.succeeded",
  loginFailed: "auth.login.failed",
  logout: "auth.logout",
  logoutAll: "auth.logout_all",
  registered: "auth.registered",
  emailVerified: "auth.email_verified",
  passwordResetRequested: "auth.password_reset.requested",
  passwordResetCompleted: "auth.password_reset.completed",
  sessionRevoked: "auth.session.revoked",
  accountLocked: "auth.account.locked",
  reauthenticated: "auth.reauthenticated",
  walletTopUp: "wallet.topup.completed",
  walletDebit: "wallet.debit",
  walletRefund: "wallet.refund",
  adminAdjustment: "wallet.admin_adjustment",
  orderCreated: "order.created",
  deliveryReveal: "order.delivery.revealed",
} as const;

export type AuditAction =
  (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

const SENSITIVE_KEY_PATTERN =
  /pass|secret|token|cookie|session|authorization|api[-_]?key|payload|deliverable|code|card|cvv|pan|pepper|mailbox|otp|2fa|recovery/i;

export function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    if (typeof value === "string" || typeof value === "number") {
      safe[key] = value;
    } else if (typeof value === "boolean" || value === null) {
      safe[key] = value;
    }
    // Nested objects are dropped: audit context stays flat and inspectable.
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

export async function recordAuditEvent(event: {
  action: AuditAction;
  userId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
}): Promise<void> {
  const metadata = sanitizeMetadata(event.metadata);
  try {
    await prisma.auditEvent.create({
      data: {
        action: event.action,
        userId: event.userId ?? null,
        targetType: event.targetType,
        targetId: event.targetId,
        metadata: metadata as never,
        ipHash: event.ipHash ?? null,
      },
    });
  } catch {
    // Auditing must never break the user-facing flow; the write is retried by
    // whatever surrounding transaction exists, and failures are non-fatal.
  }
}

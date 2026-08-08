import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import type { DisputeStatus, Role } from "@/generated/prisma/enums";
import { hasRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

/**
 * Disputes. A customer opens at most one dispute per order and exchanges
 * messages with support; staff move it through the resolution states. Every
 * decision is recorded on the timeline and in the audit log.
 */

export type OpenDisputeResult =
  | { ok: true; disputeId: string; reused: boolean }
  | { ok: false; reason: "order_not_found" };

export async function openDispute(input: {
  userId: string;
  orderId: string;
  reason: string;
  message: string;
  ipHash?: string | null;
}): Promise<OpenDisputeResult> {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.userId },
    select: { id: true },
  });
  if (!order) return { ok: false, reason: "order_not_found" };

  const existing = await prisma.dispute.findUnique({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (existing) return { ok: true, disputeId: existing.id, reused: true };

  const dispute = await prisma.dispute.create({
    data: {
      orderId: order.id,
      userId: input.userId,
      reason: input.reason.slice(0, 200),
      status: "OPEN",
      messages: {
        create: {
          authorId: input.userId,
          authorRole: "CUSTOMER",
          body: input.message.slice(0, 2000),
        },
      },
    },
    select: { id: true },
  });

  await recordAuditEvent({
    action: AUDIT_ACTIONS.disputeOpened,
    userId: input.userId,
    targetType: "Dispute",
    targetId: dispute.id,
  });

  return { ok: true, disputeId: dispute.id, reused: false };
}

/** Adds a message. Customers may only post to their own dispute; staff to any. */
export async function addDisputeMessage(input: {
  disputeId: string;
  authorId: string;
  authorRole: Role;
  body: string;
}): Promise<{ ok: boolean }> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: input.disputeId },
    select: { id: true, userId: true, status: true },
  });
  if (!dispute) return { ok: false };

  const isStaff = hasRole(input.authorRole, "SUPPORT");
  if (!isStaff && dispute.userId !== input.authorId) return { ok: false };
  if (dispute.status === "CLOSED") return { ok: false };

  await prisma.disputeMessage.create({
    data: {
      disputeId: dispute.id,
      authorId: input.authorId,
      authorRole: input.authorRole,
      body: input.body.slice(0, 2000),
    },
  });

  // A customer reply on a dispute awaiting their response moves it to review.
  if (!isStaff && dispute.status === "CUSTOMER_RESPONSE_REQUIRED") {
    await prisma.dispute.update({
      where: { id: dispute.id },
      data: { status: "MERCHANT_REVIEW" },
    });
  }
  return { ok: true };
}

const ALLOWED_TRANSITIONS: DisputeStatus[] = [
  "OPEN",
  "CUSTOMER_RESPONSE_REQUIRED",
  "MERCHANT_REVIEW",
  "RESOLVED_CUSTOMER",
  "RESOLVED_MERCHANT",
  "CLOSED",
];

/** Staff-only status transition, recorded in the audit log. */
export async function transitionDispute(input: {
  disputeId: string;
  status: DisputeStatus;
  actorId: string;
  actorRole: Role;
}): Promise<{ ok: boolean }> {
  if (!hasRole(input.actorRole, "SUPPORT")) return { ok: false };
  if (!ALLOWED_TRANSITIONS.includes(input.status)) return { ok: false };

  await prisma.dispute.update({
    where: { id: input.disputeId },
    data: { status: input.status },
  });
  await recordAuditEvent({
    action: AUDIT_ACTIONS.disputeAction,
    userId: input.actorId,
    targetType: "Dispute",
    targetId: input.disputeId,
    metadata: { status: input.status },
  });
  return { ok: true };
}

export async function getUserDisputes(userId: string) {
  return prisma.dispute.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
      order: { select: { productTitle: true } },
    },
  });
}

/** Loads a dispute for a specific user (ownership enforced — no IDOR). */
export async function getUserDispute(userId: string, disputeId: string) {
  return prisma.dispute.findFirst({
    where: { id: disputeId, userId },
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
      order: { select: { productTitle: true, id: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          authorRole: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });
}

import { reverseRewardForOrder } from "@/lib/affiliate/service";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import type { RefundStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { postRefundReversal } from "@/lib/wallet/ledger";

/**
 * Refunds. A refund never edits the original purchase transaction — it posts a
 * compensating (mirror) ledger transaction. Refund total therefore equals the
 * amount paid and can never exceed it.
 *
 * Review policy (per spec): an order whose deliverable has NOT been revealed can
 * be auto-processed; once the code has been revealed it requires manual review.
 * Duplicate requests are idempotent (one refund case per order).
 */

export type RequestRefundResult =
  | { ok: true; refundId: string; status: RefundStatus; autoProcessed: boolean }
  | { ok: false; reason: "order_not_found" | "not_refundable" };

export async function requestRefund(input: {
  userId: string;
  orderId: string;
  reason: string;
  ipHash?: string | null;
}): Promise<RequestRefundResult> {
  // Ownership enforced in the query (no IDOR).
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.userId },
    select: {
      id: true,
      status: true,
      priceMinor: true,
      currency: true,
      firstRevealedAt: true,
      ledgerTxnId: true,
    },
  });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status !== "FULFILLED" || !order.ledgerTxnId) {
    return { ok: false, reason: "not_refundable" };
  }

  const existing = await prisma.refund.findUnique({
    where: { orderId: order.id },
    select: { id: true, status: true },
  });
  if (existing) {
    // Idempotent: a second request returns the existing case, no double-credit.
    return {
      ok: true,
      refundId: existing.id,
      status: existing.status,
      autoProcessed: existing.status === "PROCESSED",
    };
  }

  const revealed = order.firstRevealedAt !== null;
  let refund: { id: string };
  try {
    refund = await prisma.refund.create({
      data: {
        orderId: order.id,
        userId: input.userId,
        amountMinor: order.priceMinor,
        currency: order.currency,
        reason: input.reason.slice(0, 500),
        status: revealed ? "UNDER_REVIEW" : "REQUESTED",
      },
      select: { id: true },
    });
  } catch (error) {
    // Concurrent duplicate request: return the case the winner created.
    if (isUniqueViolation(error)) {
      const winner = await prisma.refund.findUnique({
        where: { orderId: order.id },
        select: { id: true, status: true },
      });
      if (winner) {
        return {
          ok: true,
          refundId: winner.id,
          status: winner.status,
          autoProcessed: winner.status === "PROCESSED",
        };
      }
    }
    throw error;
  }

  await recordAuditEvent({
    action: AUDIT_ACTIONS.refundRequested,
    userId: input.userId,
    targetType: "Refund",
    targetId: refund.id,
    metadata: { revealed, amountMinor: order.priceMinor },
    ipHash: input.ipHash,
  });

  // Unrevealed goods qualify for automated approval.
  if (!revealed) {
    await processRefund({ refundId: refund.id });
    return { ok: true, refundId: refund.id, status: "PROCESSED", autoProcessed: true };
  }

  return { ok: true, refundId: refund.id, status: "UNDER_REVIEW", autoProcessed: false };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Applies an approved refund: posts the compensating ledger transaction, marks
 * the order REFUNDED, restocks an unrevealed unit, and reverses any affiliate
 * reward. Idempotent — the ledger reversal is keyed by order and the refund row
 * only advances to PROCESSED once.
 */
export async function processRefund(input: {
  refundId: string;
  decidedById?: string;
  note?: string;
}): Promise<{ ok: boolean }> {
  const refund = await prisma.refund.findUnique({
    where: { id: input.refundId },
    select: {
      id: true,
      status: true,
      currency: true,
      order: {
        select: {
          id: true,
          ledgerTxnId: true,
          firstRevealedAt: true,
          inventoryUnitId: true,
        },
      },
    },
  });
  if (!refund || refund.status === "PROCESSED") return { ok: false };
  if (!refund.order.ledgerTxnId) return { ok: false };

  const reversal = await postRefundReversal({
    orderId: refund.order.id,
    purchaseTransactionId: refund.order.ledgerTxnId,
    currency: refund.currency,
    description: "Refund",
    metadata: { refundId: refund.id },
  });

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id: refund.id },
      data: {
        status: "PROCESSED",
        ledgerTxnId: reversal?.transactionId,
        decidedById: input.decidedById,
        resolutionNote: input.note,
      },
    });
    await tx.order.update({
      where: { id: refund.order.id },
      data: {
        status: "REFUNDED",
        events: { create: { status: "REFUNDED", note: "Refund processed" } },
      },
    });
    // Restock only if the code was never revealed; a revealed code is consumed.
    if (!refund.order.firstRevealedAt && refund.order.inventoryUnitId) {
      await tx.inventoryUnit.update({
        where: { id: refund.order.inventoryUnitId },
        data: { status: "AVAILABLE", soldAt: null },
      });
    }
  });

  // Reverse any affiliate reward tied to this order (claws back if credited).
  await reverseRewardForOrder(refund.order.id).catch(() => undefined);

  await recordAuditEvent({
    action: AUDIT_ACTIONS.walletRefund,
    userId: input.decidedById ?? null,
    targetType: "Refund",
    targetId: refund.id,
  });

  return { ok: true };
}

/** Staff decision on a manually-reviewed refund. */
export async function decideRefund(input: {
  refundId: string;
  approve: boolean;
  decidedById: string;
  note?: string;
}): Promise<{ ok: boolean }> {
  if (input.approve) {
    return processRefund({
      refundId: input.refundId,
      decidedById: input.decidedById,
      note: input.note,
    });
  }
  await prisma.refund.updateMany({
    where: { id: input.refundId, status: { in: ["REQUESTED", "UNDER_REVIEW"] } },
    data: { status: "REJECTED", decidedById: input.decidedById, resolutionNote: input.note },
  });
  return { ok: true };
}

export type RefundRow = {
  id: string;
  orderId: string;
  productTitle: string;
  amountMinor: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  createdAt: Date;
};

export async function getUserRefunds(userId: string): Promise<RefundRow[]> {
  const refunds = await prisma.refund.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderId: true,
      amountMinor: true,
      currency: true,
      status: true,
      reason: true,
      createdAt: true,
      order: { select: { productTitle: true } },
    },
  });
  return refunds.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    productTitle: r.order.productTitle,
    amountMinor: r.amountMinor,
    currency: r.currency,
    status: r.status,
    reason: r.reason,
    createdAt: r.createdAt,
  }));
}

import { recordConversion } from "@/lib/affiliate/service";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  lockAndReadBalances,
  postPurchaseDebit,
  resolveHouseAccount,
  resolveUserSpendableAccounts,
} from "@/lib/wallet/ledger";

/**
 * Wallet-only checkout for locally stocked authorized codes.
 *
 * Everything happens in one database transaction so it commits atomically:
 *   1. Lock a single AVAILABLE unit with FOR UPDATE SKIP LOCKED (no oversell —
 *      100 concurrent buyers of 1 unit yield exactly one success).
 *   2. Lock the buyer's wallet accounts and verify spendable balance
 *      server-side (never trust a client-supplied price or balance).
 *   3. Post the purchase debit, mark the unit SOLD, create the order FULFILLED.
 * The client idempotency key guarantees one order and one debit per attempt.
 */

export type CheckoutResult =
  | { ok: true; orderId: string; reused: boolean }
  | {
      ok: false;
      reason:
        | "product_unavailable"
        | "out_of_stock"
        | "insufficient_balance"
        | "email_unverified";
    };

export async function checkout(input: {
  userId: string;
  emailVerified: boolean;
  productSlug: string;
  idempotencyKey: string;
  ipHash?: string | null;
}): Promise<CheckoutResult> {
  // Verified email is required before any purchase.
  if (!input.emailVerified) return { ok: false, reason: "email_unverified" };

  // Idempotency: a repeated key returns the original order without re-charging.
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true },
  });
  if (existing) return { ok: true, orderId: existing.id, reused: true };

  const product = await prisma.product.findUnique({
    where: { slug: input.productSlug },
    select: {
      id: true,
      status: true,
      title: true,
      priceMinor: true,
      currency: true,
      delivery: true,
    },
  });
  if (!product || product.status !== "ACTIVE") {
    return { ok: false, reason: "product_unavailable" };
  }

  // Resolve ledger accounts before the transaction: account creation is only
  // race-safe outside a transaction (a P2002 inside would abort it).
  const [{ cashAccountId, promoAccountId }, houseRevenueAccountId] =
    await Promise.all([
      resolveUserSpendableAccounts(input.userId, product.currency),
      resolveHouseAccount("HOUSE_REVENUE", product.currency),
    ]);

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      // 0. Serialize same-key checkouts so duplicates never reserve extra
      //    units or double-charge; different keys/users run concurrently.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkout:${input.idempotencyKey}`}))`;
      const already = await tx.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true },
      });
      if (already) return { orderId: already.id, reused: true };

      // 1. Reserve exactly one available unit. SKIP LOCKED means concurrent
      //    buyers never contend for the same row; a losing buyer sees none.
      const claimed = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "InventoryUnit"
        WHERE "productId" = ${product.id} AND "status" = 'AVAILABLE'
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      const unit = claimed[0];
      if (!unit) throw new OutOfStockError();

      // 2. Server-side balance check under a per-user row lock.
      const spendable = await lockAndReadBalances(
        tx,
        cashAccountId,
        promoAccountId,
      );
      if (spendable.cashMinor + spendable.promoMinor < product.priceMinor) {
        throw new InsufficientBalanceError();
      }

      // 3. Debit wallet, mark unit sold, create the fulfilled order — atomic.
      const debit = await postPurchaseDebit(tx, {
        priceMinor: product.priceMinor,
        currency: product.currency,
        idempotencyKey: `order:${input.idempotencyKey}`,
        description: `Purchase — ${product.title}`,
        cashAccountId,
        promoAccountId,
        houseRevenueAccountId,
        cashMinor: spendable.cashMinor,
        promoMinor: spendable.promoMinor,
        metadata: { productId: product.id },
      });

      await tx.inventoryUnit.update({
        where: { id: unit.id },
        data: { status: "SOLD", soldAt: new Date() },
      });

      const order = await tx.order.create({
        data: {
          userId: input.userId,
          productId: product.id,
          inventoryUnitId: unit.id,
          status: "FULFILLED",
          priceMinor: product.priceMinor,
          currency: product.currency,
          productTitle: product.title,
          ledgerTxnId: debit.transactionId,
          idempotencyKey: input.idempotencyKey,
          events: {
            create: [
              { status: "PAID", note: "Wallet debited" },
              { status: "FULFILLED", note: "Instant code reserved" },
            ],
          },
        },
        select: { id: true },
      });

      return { orderId: order.id, reused: false };
    });

    if (!outcome.reused) {
      await recordAuditEvent({
        action: AUDIT_ACTIONS.walletDebit,
        userId: input.userId,
        targetType: "Order",
        targetId: outcome.orderId,
        metadata: { productId: product.id, amountMinor: product.priceMinor },
        ipHash: input.ipHash,
      });
      await recordAuditEvent({
        action: AUDIT_ACTIONS.orderCreated,
        userId: input.userId,
        targetType: "Order",
        targetId: outcome.orderId,
        metadata: { productId: product.id },
        ipHash: input.ipHash,
      });

      // Referral attribution: records a conversion only for the buyer's first
      // purchase (unique per referred user). Non-fatal — never blocks checkout.
      await recordConversion({
        referredUserId: input.userId,
        orderId: outcome.orderId,
        orderAmountMinor: product.priceMinor,
        currency: product.currency,
      }).catch(() => undefined);
    }

    return { ok: true, orderId: outcome.orderId, reused: outcome.reused };
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return { ok: false, reason: "out_of_stock" };
    }
    if (error instanceof InsufficientBalanceError) {
      return { ok: false, reason: "insufficient_balance" };
    }
    // A concurrent request that won the idempotency race: return that order.
    if (isUniqueViolation(error)) {
      const winner = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true },
      });
      if (winner) return { ok: true, orderId: winner.id, reused: true };
    }
    throw error;
  }
}

class OutOfStockError extends Error {}
class InsufficientBalanceError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

import type { Prisma } from "@/generated/prisma/client";
import type {
  LedgerAccountKind,
  LedgerTxnType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Append-only, double-entry wallet ledger.
 *
 * Invariants enforced here:
 * - Every transaction's postings sum to exactly zero.
 * - Money is integer minor units only; never floating point.
 * - A balance is the signed sum of an account's postings, never a stored
 *   mutable column, so it cannot silently drift.
 * - Spendable balance can never go negative (checked inside the same
 *   transaction that posts the debit, under a row lock).
 */

export const DEFAULT_CURRENCY = "EUR";

type Db = Prisma.TransactionClient | typeof prisma;

export type PostingInput = {
  accountId: string;
  amount: number; // signed minor units
};

function assertBalanced(postings: PostingInput[]): void {
  if (postings.length < 2) {
    throw new Error("A ledger transaction needs at least two postings");
  }
  let sum = 0;
  for (const posting of postings) {
    if (!Number.isSafeInteger(posting.amount)) {
      throw new Error("Posting amounts must be integer minor units");
    }
    sum += posting.amount;
  }
  if (sum !== 0) {
    throw new Error(`Ledger transaction does not balance to zero (sum=${sum})`);
  }
}

/** Finds or creates a ledger account. House accounts have a null userId. */
export async function ensureAccount(
  db: Db,
  kind: LedgerAccountKind,
  userId: string | null,
  currency = DEFAULT_CURRENCY,
): Promise<string> {
  const existing = await db.ledgerAccount.findFirst({
    where: { kind, userId, currency },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.ledgerAccount.create({
    data: { kind, userId, currency },
    select: { id: true },
  });
  return created.id;
}

/**
 * Posts a balanced transaction. When `idempotencyKey` is supplied, a repeated
 * call with the same key is a no-op that returns the original transaction id —
 * this is what makes webhook and checkout retries safe.
 */
export async function postTransaction(
  db: Db,
  input: {
    type: LedgerTxnType;
    description: string;
    currency?: string;
    idempotencyKey?: string;
    metadata?: Prisma.InputJsonValue;
    postings: PostingInput[];
  },
): Promise<{ transactionId: string; applied: boolean }> {
  assertBalanced(input.postings);

  if (input.idempotencyKey) {
    const prior = await db.ledgerTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true },
    });
    if (prior) return { transactionId: prior.id, applied: false };
  }

  try {
    const txn = await db.ledgerTransaction.create({
      data: {
        type: input.type,
        description: input.description,
        currency: input.currency ?? DEFAULT_CURRENCY,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
        postings: {
          create: input.postings.map((posting) => ({
            accountId: posting.accountId,
            amount: posting.amount,
          })),
        },
      },
      select: { id: true },
    });
    return { transactionId: txn.id, applied: true };
  } catch (error) {
    // Concurrent callers racing on the same idempotency key: the loser gets a
    // unique-constraint violation, so return the winner's transaction.
    if (input.idempotencyKey && isUniqueViolation(error)) {
      const winner = await db.ledgerTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true },
      });
      if (winner) return { transactionId: winner.id, applied: false };
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Signed balance of a single account (sum of its postings). */
export async function accountBalance(
  db: Db,
  accountId: string,
): Promise<number> {
  const result = await db.ledgerPosting.aggregate({
    where: { accountId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export type WalletBalance = {
  cashMinor: number;
  promoMinor: number;
  heldMinor: number;
  /** Spendable now = cash + promo (held funds are already reserved). */
  spendableMinor: number;
  currency: string;
};

/** Computes a user's wallet balance from ledger postings. */
export async function getWalletBalance(
  userId: string,
  currency = DEFAULT_CURRENCY,
): Promise<WalletBalance> {
  const accounts = await prisma.ledgerAccount.findMany({
    where: {
      userId,
      currency,
      kind: { in: ["USER_CASH", "USER_PROMO", "USER_HELD"] },
    },
    select: {
      kind: true,
      postings: { select: { amount: true } },
    },
  });

  let cashMinor = 0;
  let promoMinor = 0;
  let heldMinor = 0;
  for (const account of accounts) {
    const sum = account.postings.reduce((total, p) => total + p.amount, 0);
    if (account.kind === "USER_CASH") cashMinor = sum;
    else if (account.kind === "USER_PROMO") promoMinor = sum;
    else if (account.kind === "USER_HELD") heldMinor = sum;
  }

  return {
    cashMinor,
    promoMinor,
    heldMinor,
    spendableMinor: cashMinor + promoMinor,
    currency,
  };
}

/**
 * Credits a user's cash wallet from a completed top-up. Balanced against the
 * house funding account. Idempotent on the provided key.
 */
export async function creditTopUp(input: {
  userId: string;
  amountMinor: number;
  currency?: string;
  idempotencyKey: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ transactionId: string; applied: boolean }> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Top-up amount must be a positive integer minor amount");
  }
  const currency = input.currency ?? DEFAULT_CURRENCY;
  return prisma.$transaction(async (tx) => {
    const userCash = await ensureAccount(tx, "USER_CASH", input.userId, currency);
    const houseFunding = await ensureAccount(tx, "HOUSE_FUNDING", null, currency);
    return postTransaction(tx, {
      type: "TOP_UP",
      description: input.description,
      currency,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
      postings: [
        { accountId: userCash, amount: input.amountMinor },
        { accountId: houseFunding, amount: -input.amountMinor },
      ],
    });
  });
}

/**
 * Credits promotional (non-withdrawable) balance, e.g. an affiliate reward or
 * referral bonus. Balanced against the house promo account.
 */
export async function creditPromo(input: {
  userId: string;
  amountMinor: number;
  currency?: string;
  idempotencyKey: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ transactionId: string; applied: boolean }> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Promo amount must be a positive integer minor amount");
  }
  const currency = input.currency ?? DEFAULT_CURRENCY;
  return prisma.$transaction(async (tx) => {
    const userPromo = await ensureAccount(tx, "USER_PROMO", input.userId, currency);
    const housePromo = await ensureAccount(tx, "HOUSE_PROMO", null, currency);
    return postTransaction(tx, {
      type: "PROMO_CREDIT",
      description: input.description,
      currency,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
      postings: [
        { accountId: userPromo, amount: input.amountMinor },
        { accountId: housePromo, amount: -input.amountMinor },
      ],
    });
  });
}

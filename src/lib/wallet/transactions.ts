import type { LedgerTxnType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Read-side view of a user's own ledger activity. A row is derived from the
 * postings that touch this user's accounts, so the amount shown is the net
 * effect on the user (positive = money in, negative = money out).
 */
export type WalletTransactionRow = {
  id: string;
  type: LedgerTxnType;
  description: string;
  amountMinor: number;
  currency: string;
  createdAt: Date;
};

export const TRANSACTION_FILTERS = {
  all: null,
  deposits: ["TOP_UP"],
  purchases: ["PURCHASE"],
  refunds: ["REFUND"],
  adjustments: ["ADMIN_ADJUSTMENT", "PROMO_CREDIT"],
  chargebacks: ["CHARGEBACK"],
} as const satisfies Record<string, LedgerTxnType[] | null>;

export type TransactionFilter = keyof typeof TRANSACTION_FILTERS;

export function isTransactionFilter(value: string): value is TransactionFilter {
  return value in TRANSACTION_FILTERS;
}

export async function getUserTransactions(
  userId: string,
  options: { filter?: TransactionFilter; page?: number; pageSize?: number } = {},
): Promise<{ rows: WalletTransactionRow[]; total: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 20, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const typeFilter =
    options.filter && TRANSACTION_FILTERS[options.filter]
      ? { type: { in: [...TRANSACTION_FILTERS[options.filter]!] } }
      : {};

  const where = {
    ...typeFilter,
    postings: { some: { account: { userId } } },
  };

  const [transactions, total] = await Promise.all([
    prisma.ledgerTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        description: true,
        currency: true,
        createdAt: true,
        postings: {
          where: { account: { userId } },
          select: { amount: true },
        },
      },
    }),
    prisma.ledgerTransaction.count({ where }),
  ]);

  const rows = transactions.map((txn) => ({
    id: txn.id,
    type: txn.type,
    description: txn.description,
    amountMinor: txn.postings.reduce((sum, p) => sum + p.amount, 0),
    currency: txn.currency,
    createdAt: txn.createdAt,
  }));

  return { rows, total, pageSize };
}

/** Escapes a CSV field per RFC 4180 (guards against CSV injection too). */
function csvField(value: string): string {
  const needsQuoting = /[",\n\r]/.test(value) || /^[=+\-@]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

/** CSV export of the authenticated user's own transactions. */
export async function exportUserTransactionsCsv(
  userId: string,
): Promise<string> {
  const transactions = await prisma.ledgerTransaction.findMany({
    where: { postings: { some: { account: { userId } } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      type: true,
      description: true,
      currency: true,
      createdAt: true,
      postings: {
        where: { account: { userId } },
        select: { amount: true },
      },
    },
  });

  const header = ["Date", "Type", "Description", "Amount", "Currency"];
  const lines = [header.map(csvField).join(",")];
  for (const txn of transactions) {
    const amount = txn.postings.reduce((sum, p) => sum + p.amount, 0);
    lines.push(
      [
        txn.createdAt.toISOString(),
        txn.type,
        txn.description,
        (amount / 100).toFixed(2),
        txn.currency,
      ]
        .map((field) => csvField(String(field)))
        .join(","),
    );
  }
  return lines.join("\r\n");
}

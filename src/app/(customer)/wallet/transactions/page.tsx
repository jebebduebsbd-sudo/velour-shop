import { ArrowDownLeft, ArrowUpRight, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { formatMinor } from "@/lib/format";
import { getWalletBalance } from "@/lib/wallet/ledger";
import {
  getUserTransactions,
  isTransactionFilter,
  TRANSACTION_FILTERS,
  type TransactionFilter,
} from "@/lib/wallet/transactions";

export const metadata: Metadata = {
  title: "Transactions",
  robots: { index: false, follow: false },
};

const FILTER_TABS: { key: TransactionFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposits", label: "Deposits" },
  { key: "purchases", label: "Purchases" },
  { key: "refunds", label: "Refunds" },
  { key: "adjustments", label: "Adjustments" },
  { key: "chargebacks", label: "Chargebacks" },
];

const TYPE_LABEL: Record<string, string> = {
  TOP_UP: "Top-up",
  PURCHASE: "Purchase",
  REFUND: "Refund",
  HOLD: "Hold",
  HOLD_RELEASE: "Hold release",
  CHARGEBACK: "Chargeback",
  ADMIN_ADJUSTMENT: "Adjustment",
  PROMO_CREDIT: "Promotional credit",
};

export default async function TransactionsPage(
  props: PageProps<"/wallet/transactions">,
) {
  const session = await requireSession("/wallet/transactions");
  const params = await props.searchParams;

  const filterParam = typeof params.filter === "string" ? params.filter : "all";
  const filter: TransactionFilter = isTransactionFilter(filterParam)
    ? filterParam
    : "all";
  const page =
    typeof params.page === "string" ? Math.max(Number(params.page) || 1, 1) : 1;

  const [balance, { rows, total, pageSize }] = await Promise.all([
    getWalletBalance(session.user.id),
    getUserTransactions(session.user.id, { filter, page }),
  ]);
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            Wallet
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink">Transactions</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Every top-up, purchase, refund, and adjustment on your wallet.
          </p>
        </div>
        <a
          href="/wallet/transactions/export"
          className={buttonClasses("secondary", "md")}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Spendable balance"
          value={formatMinor(balance.spendableMinor, balance.currency)}
        />
        <SummaryCard
          label="Cash balance"
          value={formatMinor(balance.cashMinor, balance.currency)}
        />
        <SummaryCard
          label="Promotional balance"
          value={formatMinor(balance.promoMinor, balance.currency)}
          hint="Non-withdrawable"
        />
      </div>

      <nav aria-label="Filter transactions" className="-mx-1 overflow-x-auto">
        <ul className="flex gap-2 px-1">
          {FILTER_TABS.map((tab) => {
            const active = tab.key === filter;
            void TRANSACTION_FILTERS[tab.key];
            return (
              <li key={tab.key}>
                <Link
                  href={`/wallet/transactions?filter=${tab.key}`}
                  aria-current={active ? "page" : undefined}
                  className={`inline-block rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors duration-(--duration-base) ${
                    active
                      ? "border-accent/60 bg-accent/15 font-semibold text-lilac"
                      : "border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Panel className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-12 text-center text-sm text-ink-muted">
            No transactions yet.{" "}
            <Link href="/wallet/top-up" className="text-orchid hover:text-lilac">
              Add funds
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const positive = row.amountMinor >= 0;
              return (
                <li
                  key={row.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                      positive
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-line bg-surface-2 text-ink-muted"
                    }`}
                  >
                    {positive ? (
                      <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {row.description}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {row.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}{" "}
                      · <Badge variant="muted">{TYPE_LABEL[row.type] ?? row.type}</Badge>
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      positive ? "text-success" : "text-ink"
                    }`}
                  >
                    {positive ? "+" : "−"}
                    {formatMinor(Math.abs(row.amountMinor), row.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {pageCount > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between text-sm"
        >
          <PageLink
            filter={filter}
            page={page - 1}
            disabled={page <= 1}
            label="Previous"
          />
          <span className="text-ink-faint">
            Page {page} of {pageCount}
          </span>
          <PageLink
            filter={filter}
            page={page + 1}
            disabled={page >= pageCount}
            label="Next"
          />
        </nav>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Panel className="p-5">
      <p className="text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </Panel>
  );
}

function PageLink({
  filter,
  page,
  disabled,
  label,
}: {
  filter: TransactionFilter;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return <span className="text-ink-faint opacity-50">{label}</span>;
  }
  return (
    <Link
      href={`/wallet/transactions?filter=${filter}&page=${page}`}
      className="text-orchid transition-colors hover:text-lilac"
    >
      {label}
    </Link>
  );
}

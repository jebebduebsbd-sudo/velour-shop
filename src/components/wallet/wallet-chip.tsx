import { Plus, Wallet } from "lucide-react";
import Link from "next/link";

import { formatMinor } from "@/lib/format";

/**
 * Header wallet component: restrained outlined wallet mark, a "Balance"
 * label, the formatted amount, and a separate small add-funds button.
 */
export function WalletChip({
  balanceMinor = 0,
  currency = "USD",
  addFundsHref = "/auth/sign-in",
}: {
  balanceMinor?: number;
  currency?: string;
  addFundsHref?: string;
}) {
  return (
    <div className="flex h-10 items-center gap-1 rounded-md border border-line bg-surface-2 p-1">
      <span className="flex items-center gap-2 px-2">
        <Wallet
          className="h-4 w-4 text-orchid"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="leading-tight">
          <span className="block text-[0.6rem] font-medium tracking-wide text-ink-faint uppercase">
            Balance
          </span>
          <span className="block text-xs font-semibold text-ink">
            {formatMinor(balanceMinor, currency)}
          </span>
        </span>
      </span>
      <Link
        href={addFundsHref}
        aria-label="Add funds to wallet"
        className="inline-flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius-md)-4px)] border border-line-strong bg-surface-3 text-ink-muted transition-colors duration-(--duration-base) hover:border-accent/60 hover:text-ink"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

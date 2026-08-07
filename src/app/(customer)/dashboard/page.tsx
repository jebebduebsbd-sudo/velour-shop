import { MailWarning, ShieldCheck, ShoppingBag, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { formatMinor } from "@/lib/format";
import { getWalletBalance } from "@/lib/wallet/ledger";
import { getUserTransactions } from "@/lib/wallet/transactions";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await requireSession();
  const emailVerified = session.user.emailVerifiedAt !== null;
  const [balance, recent] = await Promise.all([
    getWalletBalance(session.user.id).catch(() => null),
    getUserTransactions(session.user.id, { pageSize: 5 }).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <Panel className="border-l-2 border-l-accent p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Customer overview
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink italic">
          Welcome, {session.user.username}.
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your wallet, purchases, and account security in one place.
        </p>
      </Panel>

      {!emailVerified ? (
        <Panel
          className="flex flex-wrap items-center gap-4 border-warning/40 p-5"
          role="status"
        >
          <MailWarning
            className="h-5 w-5 shrink-0 text-warning"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">
              Verify your email address
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Purchases stay disabled until your address is confirmed.
            </p>
          </div>
          <Link
            href="/account/security"
            className={buttonClasses("secondary", "sm")}
          >
            Resend verification
          </Link>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Available balance"
          value={formatMinor(balance?.spendableMinor ?? 0, balance?.currency ?? "EUR")}
          detail={
            balance && balance.promoMinor > 0
              ? `Includes ${formatMinor(balance.promoMinor, balance.currency)} promotional`
              : "Spendable wallet balance"
          }
        />
        <StatCard
          icon={ShoppingBag}
          label="Purchases"
          value="0"
          detail="Completed orders"
        />
        <StatCard
          icon={ShieldCheck}
          label="Account security"
          value={emailVerified ? "Verified" : "Unverified"}
          detail={
            emailVerified
              ? "Email confirmed"
              : "Confirm your email to enable purchases"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
            <Link
              href="/wallet/transactions"
              className="text-xs text-ink-muted transition-colors hover:text-ink"
            >
              View all →
            </Link>
          </div>
          {recent && recent.rows.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {recent.rows.map((row) => {
                const positive = row.amountMinor >= 0;
                return (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink-muted">
                      {row.description}
                    </span>
                    <span
                      className={
                        positive ? "text-success" : "text-ink"
                      }
                    >
                      {positive ? "+" : "−"}
                      {formatMinor(Math.abs(row.amountMinor), row.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <>
              <p className="mt-8 mb-8 text-center text-sm text-ink-muted">
                No activity yet. Top up your wallet or browse the market.
              </p>
              <Link
                href="/wallet/top-up"
                className={buttonClasses("secondary", "sm", "w-full")}
              >
                Add funds
              </Link>
            </>
          )}
        </Panel>
        <Panel className="p-6">
          <h2 className="text-sm font-semibold text-ink">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-faint">Username</dt>
              <dd className="truncate text-ink">{session.user.username}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-faint">Email</dt>
              <dd className="truncate text-ink">{session.user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-faint">Role</dt>
              <dd className="text-ink">{session.user.role}</dd>
            </div>
          </dl>
          <Link
            href="/account/security"
            className={buttonClasses("secondary", "sm", "mt-5 w-full")}
          >
            Security settings
          </Link>
        </Panel>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
    "aria-hidden"?: boolean;
  }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        <Icon
          className="h-4 w-4 text-accent"
          strokeWidth={1.75}
          aria-hidden={true}
        />
        <h2 className="text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
          {label}
        </h2>
      </div>
      <p className="mt-3 text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-faint">{detail}</p>
    </Panel>
  );
}

import { MousePointerClick, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ReferralLink } from "@/components/affiliate/referral-link";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getAffiliateSummary } from "@/lib/affiliate/service";
import { requireSession } from "@/lib/auth/guards";
import { AFFILIATE_CONTENT } from "@/content/affiliate";
import { serverEnv } from "@/lib/env";
import { formatCount, formatMinor } from "@/lib/format";

export const metadata: Metadata = {
  title: "Affiliate dashboard",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "muted" | "danger" }> = {
  PENDING_REFUND_WINDOW: { label: "pending", variant: "warning" },
  AVAILABLE: { label: "available", variant: "success" },
  REVERSED: { label: "reversed", variant: "muted" },
  REJECTED: { label: "rejected", variant: "danger" },
};

export default async function AffiliateDashboardPage() {
  const session = await requireSession("/affiliate/dashboard");
  const summary = await getAffiliateSummary(session.user.id);
  const referralUrl = `${serverEnv().APP_ORIGIN}/r/${summary.code}`;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          {AFFILIATE_CONTENT.eyebrow}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Affiliate dashboard</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Share your link and track rewards. {AFFILIATE_CONTENT.disclosure}
        </p>
      </div>

      <Panel className="p-6">
        <h2 className="text-sm font-semibold text-ink">Your referral link</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Anyone who signs up through this link is attributed to you. Share it
          only where self-promotion is allowed.
        </p>
        <div className="mt-4">
          <ReferralLink url={referralUrl} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MousePointerClick}
          label="Link clicks"
          value={formatCount(summary.clicks)}
        />
        <StatCard
          icon={Users}
          label="Referred signups"
          value={formatCount(summary.referredSignups)}
        />
        <StatCard
          icon={Wallet}
          label="Pending earnings"
          value={formatMinor(summary.pendingMinor, summary.currency)}
          hint="Held during the refund window"
        />
        <StatCard
          icon={Wallet}
          label="Available earnings"
          value={formatMinor(summary.availableMinor, summary.currency)}
          hint="Credited as promo balance"
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Reward timeline</h2>
        </div>
        {summary.timeline.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-muted">
            No rewards yet. Share your link — rewards appear here after a
            referred customer&apos;s first qualifying purchase.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {summary.timeline.map((entry) => {
              const status = STATUS_LABEL[entry.status] ?? {
                label: entry.status.toLowerCase(),
                variant: "muted" as const,
              };
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      Referral reward
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {entry.status === "PENDING_REFUND_WINDOW"
                        ? `Available ${entry.availableAt.toISOString().slice(0, 10)}`
                        : entry.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {formatMinor(entry.rewardMinor, summary.currency)}
                  </span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <p className="text-sm text-ink-muted">
        New to the program?{" "}
        <Link
          href="/affiliate/how-it-works"
          className="text-orchid hover:text-lilac"
        >
          Read how rewards work
        </Link>
        .
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
    "aria-hidden"?: boolean;
  }>;
  label: string;
  value: string;
  hint?: string;
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
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </Panel>
  );
}

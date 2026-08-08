import { RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { formatMinor } from "@/lib/format";
import { getUserRefunds } from "@/lib/orders/refunds";

export const metadata: Metadata = {
  title: "Refunds",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "danger"> = {
  PROCESSED: "success",
  APPROVED: "success",
  REQUESTED: "warning",
  UNDER_REVIEW: "warning",
  REJECTED: "danger",
  FAILED: "danger",
};

export default async function RefundsPage() {
  const session = await requireSession("/refunds");
  const refunds = await getUserRefunds(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Support
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Refunds</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Refunds are credited back to your wallet as compensating ledger
          entries — the original purchase record is never altered.
        </p>
      </div>

      {refunds.length === 0 ? (
        <Panel className="p-12 text-center">
          <RotateCcw className="mx-auto h-8 w-8 text-ink-faint" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-ink">No refunds yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            You can request a refund from an order&apos;s page.
          </p>
          <Link href="/orders" className={buttonClasses("secondary", "sm", "mt-5")}>
            View purchases
          </Link>
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-line">
            {refunds.map((refund) => (
              <li key={refund.id} className="flex items-center gap-4 px-5 py-4">
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/orders/${refund.orderId}`}
                    className="block truncate text-sm font-medium text-ink hover:text-lilac"
                  >
                    {refund.productTitle}
                  </Link>
                  <span className="block truncate text-xs text-ink-faint">
                    {refund.createdAt.toISOString().slice(0, 10)} · {refund.reason}
                  </span>
                </span>
                <span className="text-sm font-semibold text-ink">
                  {formatMinor(refund.amountMinor, refund.currency)}
                </span>
                <Badge variant={STATUS_VARIANT[refund.status] ?? "muted"}>
                  {refund.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

import { MessageSquareWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { getUserDisputes } from "@/lib/orders/disputes";

export const metadata: Metadata = {
  title: "Disputes",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  RESOLVED_CUSTOMER: "success",
  RESOLVED_MERCHANT: "muted",
  CLOSED: "muted",
  OPEN: "warning",
  CUSTOMER_RESPONSE_REQUIRED: "warning",
  MERCHANT_REVIEW: "warning",
};

export default async function DisputesPage() {
  const session = await requireSession("/disputes");
  const disputes = await getUserDisputes(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Support
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Disputes</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Open cases and their status. Every decision is recorded on the case
          timeline.
        </p>
      </div>

      {disputes.length === 0 ? (
        <Panel className="p-12 text-center">
          <MessageSquareWarning
            className="mx-auto h-8 w-8 text-ink-faint"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-semibold text-ink">No disputes</p>
          <p className="mt-1 text-sm text-ink-muted">
            You can open a dispute from an order&apos;s page if something goes
            wrong.
          </p>
          <Link href="/orders" className={buttonClasses("secondary", "sm", "mt-5")}>
            View purchases
          </Link>
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-line">
            {disputes.map((dispute) => (
              <li key={dispute.id}>
                <Link
                  href={`/disputes/${dispute.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-(--duration-base) hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {dispute.order.productTitle}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {dispute.createdAt.toISOString().slice(0, 10)} ·{" "}
                      {dispute.reason}
                    </span>
                  </span>
                  <Badge variant={STATUS_VARIANT[dispute.status] ?? "muted"}>
                    {dispute.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

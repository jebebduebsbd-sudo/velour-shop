import type { Metadata } from "next";

import { decideRefundAction } from "@/app/(admin)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";
import { formatMinor } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin — refunds",
  robots: { index: false },
};

export default async function AdminRefundsPage() {
  const refunds = await prisma.refund.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      amountMinor: true,
      currency: true,
      reason: true,
      createdAt: true,
      order: { select: { productTitle: true, firstRevealedAt: true } },
      user: { select: { username: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Refunds</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Approving posts a compensating ledger entry and reverses any affiliate
          reward. Unrevealed orders are auto-processed on request; revealed ones
          appear here for review.
        </p>
      </div>

      <Panel className="overflow-hidden">
        {refunds.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No refunds.</p>
        ) : (
          <ul className="divide-y divide-line">
            {refunds.map((refund) => {
              const decidable =
                refund.status === "REQUESTED" || refund.status === "UNDER_REVIEW";
              return (
                <li key={refund.id} className="flex flex-wrap items-center gap-4 p-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {refund.order.productTitle} ·{" "}
                      {formatMinor(refund.amountMinor, refund.currency)}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {refund.user.username} ·{" "}
                      {refund.order.firstRevealedAt ? "revealed" : "unrevealed"} ·{" "}
                      {refund.reason}
                    </span>
                  </span>
                  <Badge
                    variant={
                      refund.status === "PROCESSED"
                        ? "success"
                        : refund.status === "REJECTED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {refund.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                  {decidable ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <form
                        action={decideRefundAction}
                        className="flex items-end gap-2"
                      >
                        <input type="hidden" name="refundId" value={refund.id} />
                        <input type="hidden" name="approve" value="true" />
                        <label className="text-xs text-ink-faint">
                          Amount €
                          <input
                            name="amount"
                            placeholder={(refund.amountMinor / 100).toFixed(2)}
                            className="mt-0.5 block h-9 w-20 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
                          />
                        </label>
                        <Button type="submit" variant="primary" size="sm">
                          Approve
                        </Button>
                      </form>
                      <form action={decideRefundAction}>
                        <input type="hidden" name="refundId" value={refund.id} />
                        <input type="hidden" name="approve" value="false" />
                        <Button type="submit" variant="danger" size="sm">
                          Reject
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

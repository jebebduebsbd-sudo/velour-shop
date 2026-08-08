import type { Metadata } from "next";

import { replyDisputeAction, transitionDisputeAction } from "@/app/(admin)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin — disputes",
  robots: { index: false },
};

const STATUSES = [
  "OPEN",
  "CUSTOMER_RESPONSE_REQUIRED",
  "MERCHANT_REVIEW",
  "RESOLVED_CUSTOMER",
  "RESOLVED_MERCHANT",
  "CLOSED",
] as const;

export default async function AdminDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      reason: true,
      order: { select: { productTitle: true } },
      user: { select: { username: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, authorRole: true, body: true, createdAt: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Disputes</h1>
      </div>

      {disputes.length === 0 ? (
        <Panel className="p-8 text-center text-sm text-ink-muted">
          No disputes.
        </Panel>
      ) : (
        <ul className="space-y-4">
          {disputes.map((dispute) => (
            <Panel key={dispute.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    {dispute.order.productTitle}
                  </h2>
                  <p className="text-xs text-ink-faint">
                    {dispute.user.username} · {dispute.reason}
                  </p>
                </div>
                <Badge
                  variant={
                    dispute.status.startsWith("RESOLVED") || dispute.status === "CLOSED"
                      ? "muted"
                      : "warning"
                  }
                >
                  {dispute.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </div>

              <ul className="mt-4 space-y-2">
                {dispute.messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-md border border-line bg-surface-2 px-3 py-2 text-sm"
                  >
                    <span className="text-xs font-semibold text-ink-muted">
                      {message.authorRole === "CUSTOMER" ? "Customer" : "Staff"}
                    </span>
                    <p className="mt-0.5 text-ink">{message.body}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <form action={replyDisputeAction} className="space-y-1.5">
                  <input type="hidden" name="disputeId" value={dispute.id} />
                  <textarea
                    name="body"
                    rows={2}
                    placeholder="Reply to the customer"
                    className="w-full rounded-md border border-line bg-surface-2 px-2 py-1.5 text-sm text-ink"
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    Send reply
                  </Button>
                </form>
                <form action={transitionDisputeAction} className="space-y-1.5">
                  <input type="hidden" name="disputeId" value={dispute.id} />
                  <label className="block text-xs text-ink-faint">
                    Set status
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="status"
                      defaultValue={dispute.status}
                      className="h-9 flex-1 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, " ").toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary" size="sm">
                      Save
                    </Button>
                  </div>
                </form>
              </div>
            </Panel>
          ))}
        </ul>
      )}
    </div>
  );
}

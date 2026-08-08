import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { postDisputeMessageAction } from "@/app/(customer)/orders/refund-dispute-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { getUserDispute } from "@/lib/orders/disputes";

export const metadata: Metadata = {
  title: "Dispute",
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

export default async function DisputeDetailPage(
  props: PageProps<"/disputes/[id]">,
) {
  const session = await requireSession("/disputes");
  const { id } = await props.params;
  const dispute = await getUserDispute(session.user.id, id);
  if (!dispute) notFound();

  const closed = dispute.status === "CLOSED";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-ink-faint">
          <li>
            <Link href="/disputes" className="hover:text-ink">
              Disputes
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="truncate text-ink-muted">
            {dispute.order.productTitle}
          </li>
        </ol>
      </nav>

      <Panel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink">
              {dispute.order.productTitle}
            </h1>
            <p className="mt-1 text-sm text-ink-faint">{dispute.reason}</p>
          </div>
          <Badge variant={STATUS_VARIANT[dispute.status] ?? "muted"}>
            {dispute.status.replace(/_/g, " ").toLowerCase()}
          </Badge>
        </div>

        <ul className="mt-6 space-y-3">
          {dispute.messages.map((message) => {
            const staff = message.authorRole !== "CUSTOMER";
            return (
              <li
                key={message.id}
                className={`rounded-md border p-3 ${
                  staff
                    ? "border-accent/30 bg-accent/5"
                    : "border-line bg-surface-2"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-ink-faint">
                  <span className="font-semibold text-ink-muted">
                    {staff ? "Velour support" : "You"}
                  </span>
                  <span>
                    {message.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink">{message.body}</p>
              </li>
            );
          })}
        </ul>

        {closed ? (
          <p className="mt-6 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink-muted">
            This dispute is closed.
          </p>
        ) : (
          <form action={postDisputeMessageAction} className="mt-6 space-y-2">
            <input type="hidden" name="disputeId" value={dispute.id} />
            <label htmlFor="message" className="block text-xs text-ink-faint">
              Add a message
            </label>
            <textarea
              id="message"
              name="body"
              rows={3}
              required
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
              placeholder="Reply to support"
            />
            <Button type="submit" variant="primary" size="sm">
              Send
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}

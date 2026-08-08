"use client";

import { MessageSquareWarning, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  openDisputeAction,
  requestRefundAction,
} from "@/app/(customer)/orders/refund-dispute-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const REFUND_NOTICE: Record<string, { text: string; ok: boolean }> = {
  processed: { text: "Refund processed — your wallet has been credited.", ok: true },
  review: { text: "Refund requested — it's under manual review.", ok: true },
  invalid: { text: "Please add a short reason for the refund.", ok: false },
  error: { text: "This order can't be refunded.", ok: false },
};

/**
 * Refund and dispute controls for an order. Refund is disabled once a refund
 * case exists; dispute becomes a link once opened.
 */
export function OrderSupportActions({
  orderId,
  refundable,
  refundStatus,
  disputeId,
  notice,
}: {
  orderId: string;
  refundable: boolean;
  refundStatus: string | null;
  disputeId: string | null;
  notice?: string;
}) {
  const [openForm, setOpenForm] = useState<"refund" | "dispute" | null>(null);
  const noticeInfo = notice ? REFUND_NOTICE[notice] : undefined;

  return (
    <div className="mt-6 rounded-md border border-line p-4">
      <h2 className="text-sm font-semibold text-ink">Need help with this order?</h2>

      {noticeInfo ? (
        <p
          role="status"
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            noticeInfo.ok
              ? "border-success/40 bg-success/10 text-success"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {noticeInfo.text}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3">
        {refundStatus ? (
          <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            Refund status:{" "}
            <Badge variant={refundStatus === "PROCESSED" ? "success" : "warning"}>
              {refundStatus.replace(/_/g, " ").toLowerCase()}
            </Badge>
          </span>
        ) : refundable ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setOpenForm(openForm === "refund" ? null : "refund")}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Request refund
          </Button>
        ) : null}

        {disputeId ? (
          <Link
            href={`/disputes/${disputeId}`}
            className="inline-flex items-center gap-2 text-sm text-orchid hover:text-lilac"
          >
            <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
            View dispute
          </Link>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpenForm(openForm === "dispute" ? null : "dispute")}
          >
            <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
            Open a dispute
          </Button>
        )}
      </div>

      {openForm === "refund" ? (
        <form action={requestRefundAction} className="mt-4 space-y-2">
          <input type="hidden" name="orderId" value={orderId} />
          <label htmlFor="refund-reason" className="block text-xs text-ink-faint">
            Why are you requesting a refund?
          </label>
          <textarea
            id="refund-reason"
            name="reason"
            rows={3}
            required
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            placeholder="e.g. the code was already redeemed"
          />
          <p className="text-xs text-ink-faint">
            Unrevealed codes are refunded automatically; revealed codes go to
            manual review.
          </p>
          <Button type="submit" variant="primary" size="sm">
            Submit refund request
          </Button>
        </form>
      ) : null}

      {openForm === "dispute" ? (
        <form action={openDisputeAction} className="mt-4 space-y-2">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="reason" value="Order issue" />
          <label htmlFor="dispute-message" className="block text-xs text-ink-faint">
            Describe the issue for support
          </label>
          <textarea
            id="dispute-message"
            name="message"
            rows={3}
            required
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            placeholder="Explain what happened and what you'd like resolved"
          />
          <Button type="submit" variant="primary" size="sm">
            Open dispute
          </Button>
        </form>
      ) : null}
    </div>
  );
}

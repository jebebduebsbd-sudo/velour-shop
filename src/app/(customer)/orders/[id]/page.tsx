import { CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderSupportActions } from "@/components/orders/order-support-actions";
import { ReviewForm } from "@/components/orders/review-form";
import { RevealDeliverable } from "@/components/orders/reveal-deliverable";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { formatMinor } from "@/lib/format";
import { getUserOrder } from "@/lib/orders/orders";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage(
  props: PageProps<"/orders/[id]">,
) {
  const session = await requireSession("/orders");
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  // Ownership enforced in the query — another user's id resolves to null → 404.
  const order = await getUserOrder(session.user.id, id);
  if (!order) notFound();

  const [existingRefund, existingDispute, existingReview] = await Promise.all([
    prisma.refund.findUnique({
      where: { orderId: order.id },
      select: { id: true, status: true },
    }),
    prisma.dispute.findUnique({
      where: { orderId: order.id },
      select: { id: true },
    }),
    prisma.review.findUnique({
      where: { orderId: order.id },
      select: { id: true, rating: true },
    }),
  ]);
  const notice =
    typeof searchParams.refund === "string" ? searchParams.refund : undefined;
  const reviewNotice =
    typeof searchParams.review === "string" ? searchParams.review : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-ink-faint">
          <li>
            <Link href="/orders" className="hover:text-ink">
              Purchases
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="truncate text-ink-muted">
            {order.productTitle}
          </li>
        </ol>
      </nav>

      <Panel className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              {order.categoryName}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink">
              {order.productTitle}
            </h1>
          </div>
          <Badge variant={order.fulfilled ? "success" : "warning"}>
            {order.status.replace(/_/g, " ").toLowerCase()}
          </Badge>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-ink-faint">Paid</dt>
            <dd className="mt-1 font-semibold text-ink">
              {formatMinor(order.priceMinor, order.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Date</dt>
            <dd className="mt-1 text-ink">
              {order.createdAt.toISOString().slice(0, 10)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Payment</dt>
            <dd className="mt-1 text-ink">Wallet balance</dd>
          </div>
        </dl>

        {order.fulfilled ? (
          <div className="mt-6">
            <p className="mb-3 flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Delivered — reveal your code below.
            </p>
            <RevealDeliverable orderId={order.id} />
          </div>
        ) : (
          <p className="mt-6 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm text-ink-muted">
            This order is not fulfilled yet. The deliverable becomes available
            once fulfillment completes.
          </p>
        )}

        <div className="mt-6 rounded-md border border-line p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            Warranty
          </h2>
          <p className="mt-2 text-sm text-ink-muted">{order.warranty}</p>
          <Link
            href="/buyer-protection"
            className="mt-3 inline-block text-sm text-orchid hover:text-lilac"
          >
            Buyer Protection policy →
          </Link>
        </div>

        <OrderSupportActions
          orderId={order.id}
          refundable={order.status === "FULFILLED"}
          refundStatus={existingRefund?.status ?? null}
          disputeId={existingDispute?.id ?? null}
          notice={notice}
        />

        {order.fulfilled ? (
          <div className="mt-6 rounded-md border border-line p-4">
            <h2 className="text-sm font-semibold text-ink">Leave a review</h2>
            {existingReview ? (
              <p className="mt-2 text-sm text-ink-muted">
                Thanks — you rated this {existingReview.rating}/5. Your verified
                vouch is published on the product page.
              </p>
            ) : reviewNotice === "thanks" ? (
              <p className="mt-2 text-sm text-success">
                Thanks for your review!
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-ink-faint">
                  Only buyers of a fulfilled order can review — your vouch is
                  marked verified.
                </p>
                <ReviewForm orderId={order.id} />
              </>
            )}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

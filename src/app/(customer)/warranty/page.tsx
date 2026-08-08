import { BadgeCheck, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { formatMinor } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Warranty",
  robots: { index: false, follow: false },
};

export default async function WarrantyPage() {
  const session = await requireSession("/warranty");
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id, status: { in: ["FULFILLED", "REFUNDED"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      productTitle: true,
      status: true,
      priceMinor: true,
      currency: true,
      firstRevealedAt: true,
      product: { select: { warranty: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Buyer tools
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Warranty</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Each purchase carries the warranty stated on its listing. If a code
          fails, request a refund or open a dispute from the order — decisions
          are recorded and reviewed.
        </p>
      </div>

      <Panel className="flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm text-ink-muted">
          Read the full{" "}
          <Link href="/buyer-protection" className="text-orchid hover:text-lilac">
            Buyer Protection policy
          </Link>{" "}
          for coverage, refund eligibility, and response windows.
        </p>
      </Panel>

      {orders.length === 0 ? (
        <Panel className="p-12 text-center">
          <BadgeCheck className="mx-auto h-8 w-8 text-ink-faint" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-ink">
            No warrantied purchases yet
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Fulfilled orders and their warranty terms appear here.
          </p>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <Panel key={order.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink">
                    {order.productTitle}
                  </h2>
                  <p className="text-xs text-ink-faint">
                    {formatMinor(order.priceMinor, order.currency)} ·{" "}
                    {order.firstRevealedAt ? "code revealed" : "not yet revealed"}
                  </p>
                </div>
                <Badge variant={order.status === "REFUNDED" ? "muted" : "success"}>
                  {order.status.toLowerCase()}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-ink-muted">{order.product.warranty}</p>
              {order.status === "FULFILLED" ? (
                <Link
                  href={`/orders/${order.id}`}
                  className={buttonClasses("secondary", "sm", "mt-4")}
                >
                  Manage / request warranty
                </Link>
              ) : null}
            </Panel>
          ))}
        </ul>
      )}
    </div>
  );
}

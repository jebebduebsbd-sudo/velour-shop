import { ChevronRight, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PlatformTile } from "@/components/icons/platform-mark";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { formatMinor } from "@/lib/format";
import { getUserOrders } from "@/lib/orders/orders";

export const metadata: Metadata = {
  title: "Purchases",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "danger"> = {
  FULFILLED: "success",
  PAID: "success",
  FUNDS_HELD: "warning",
  FULFILLMENT_PENDING: "warning",
  REFUND_REQUESTED: "warning",
  DISPUTED: "warning",
  REFUNDED: "muted",
  CANCELLED: "muted",
  FAILED: "danger",
};

export default async function OrdersPage() {
  const session = await requireSession("/orders");
  const orders = await getUserOrders(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Orders
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Purchases</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your completed orders and their deliverables.
        </p>
      </div>

      {orders.length === 0 ? (
        <Panel className="p-12 text-center">
          <PackageCheck
            className="mx-auto h-8 w-8 text-ink-faint"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-semibold text-ink">No purchases yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Browse the market to place your first order.
          </p>
          <Link
            href="/market"
            className={buttonClasses("primary", "sm", "mt-5")}
          >
            Open market
          </Link>
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-(--duration-base) hover:bg-surface-2"
                >
                  <PlatformTile slug={order.categoryName.toLowerCase()} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {order.productTitle}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {order.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {formatMinor(order.priceMinor, order.currency)}
                  </span>
                  <Badge variant={STATUS_VARIANT[order.status] ?? "muted"}>
                    {order.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-ink-faint"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

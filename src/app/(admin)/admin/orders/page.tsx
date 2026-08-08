import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";
import { formatMinor } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin — orders",
  robots: { index: false },
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      productTitle: true,
      status: true,
      priceMinor: true,
      currency: true,
      createdAt: true,
      user: { select: { username: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Orders</h1>
        <p className="mt-2 text-sm text-ink-muted">Most recent 100 orders.</p>
      </div>
      <Panel className="overflow-hidden">
        {orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {order.productTitle}
                  </span>
                  <span className="block text-xs text-ink-faint">
                    {order.user.username} ·{" "}
                    {order.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                </span>
                <span className="text-sm font-semibold text-ink">
                  {formatMinor(order.priceMinor, order.currency)}
                </span>
                <Badge variant={order.status === "FULFILLED" ? "success" : "muted"}>
                  {order.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

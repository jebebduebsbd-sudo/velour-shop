import type { Metadata } from "next";
import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";
import { formatMinor } from "@/lib/format";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminOverviewPage() {
  const [
    activeProducts,
    complianceProducts,
    availableUnits,
    orders,
    pendingRefunds,
    openDisputes,
    users,
    revenue,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "COMPLIANCE_REVIEW" } }),
    prisma.inventoryUnit.count({ where: { status: "AVAILABLE" } }),
    prisma.order.count(),
    prisma.refund.count({ where: { status: { in: ["REQUESTED", "UNDER_REVIEW"] } } }),
    prisma.dispute.count({
      where: { status: { notIn: ["CLOSED", "RESOLVED_CUSTOMER", "RESOLVED_MERCHANT"] } },
    }),
    prisma.user.count(),
    prisma.ledgerPosting.aggregate({
      where: { account: { kind: "HOUSE_REVENUE" } },
      _sum: { amount: true },
    }),
  ]);

  const cards = [
    { label: "Active products", value: String(activeProducts) },
    { label: "In compliance review", value: String(complianceProducts), highlight: complianceProducts > 0 },
    { label: "Units available", value: String(availableUnits) },
    { label: "Orders", value: String(orders) },
    { label: "Refunds to review", value: String(pendingRefunds), highlight: pendingRefunds > 0 },
    { label: "Open disputes", value: String(openDisputes), highlight: openDisputes > 0 },
    { label: "Users", value: String(users) },
    { label: "Net revenue", value: formatMinor(revenue._sum.amount ?? 0, "EUR") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Overview</h1>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Panel key={card.label} className="p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
              {card.label}
            </p>
            <p
              className={`mt-2 text-2xl font-bold ${card.highlight ? "text-warning" : "text-ink"}`}
            >
              {card.value}
            </p>
          </Panel>
        ))}
      </div>
      <Panel className="p-6">
        <h2 className="text-sm font-semibold text-ink">Queues needing attention</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/admin/refunds" className="text-orchid hover:text-lilac">
              {pendingRefunds} refund(s) awaiting a decision →
            </Link>
          </li>
          <li>
            <Link href="/admin/disputes" className="text-orchid hover:text-lilac">
              {openDisputes} open dispute(s) →
            </Link>
          </li>
          <li>
            <Link href="/admin/products" className="text-orchid hover:text-lilac">
              {complianceProducts} product(s) in compliance review →
            </Link>
          </li>
        </ul>
      </Panel>
    </div>
  );
}

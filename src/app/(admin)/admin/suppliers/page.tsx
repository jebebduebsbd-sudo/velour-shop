import type { Metadata } from "next";

import { createSupplierAction, verifySupplierAction } from "@/app/(admin)/actions";
import { FeedSyncPanel } from "@/components/admin/feed-sync-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";
import { defaultFeedProvider } from "@/lib/suppliers/registry";

export const metadata: Metadata = {
  title: "Admin — suppliers",
  robots: { index: false },
};

export default async function AdminSuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      region: true,
      transferEvidence: true,
      evidenceVerified: true,
      _count: { select: { products: true } },
    },
  });

  const feedProvider = defaultFeedProvider();
  const feedEnabled = feedProvider.isEnabled();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Suppliers</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Record each inventory source and its documented transfer/resale
          rights. Only suppliers with verified evidence can back active products.
        </p>
      </div>

      <FeedSyncPanel
        enabled={feedEnabled}
        disabledReason={feedEnabled ? "" : feedProvider.disabledReason()}
        suppliers={suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          evidenceVerified: supplier.evidenceVerified,
        }))}
      />

      <Panel className="p-6">
        <h2 className="text-sm font-semibold text-ink">Add a supplier</h2>
        <form
          action={createSupplierAction}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5">
            <label className="block text-xs text-ink-faint">Name</label>
            <input
              name="name"
              required
              className="h-9 w-full rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-ink-faint">Region</label>
            <input
              name="region"
              placeholder="Global"
              className="h-9 w-full rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs text-ink-faint">
              Transfer-right evidence (contract/invoice reference, authorization)
            </label>
            <textarea
              name="transferEvidence"
              rows={2}
              required
              className="w-full rounded-md border border-line bg-surface-2 px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" size="sm">
              Add supplier
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        {suppliers.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            No suppliers yet.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className="flex flex-wrap items-center gap-4 p-5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {supplier.name}
                    {supplier.evidenceVerified ? (
                      <Badge variant="success">verified</Badge>
                    ) : (
                      <Badge variant="warning">unverified</Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    {supplier.region} · {supplier._count.products} product(s)
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    {supplier.transferEvidence}
                  </span>
                </span>
                <form action={verifySupplierAction}>
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <input
                    type="hidden"
                    name="verified"
                    value={supplier.evidenceVerified ? "false" : "true"}
                  />
                  <Button
                    type="submit"
                    variant={supplier.evidenceVerified ? "ghost" : "primary"}
                    size="sm"
                  >
                    {supplier.evidenceVerified ? "Revoke" : "Verify evidence"}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

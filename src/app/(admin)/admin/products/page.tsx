import type { Metadata } from "next";
import Link from "next/link";

import {
  importInventoryAction,
  linkProductSupplierAction,
  setProductStatusAction,
} from "@/app/(admin)/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";
import { formatMinor } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin — products",
  robots: { index: false },
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  ACTIVE: "success",
  COMPLIANCE_REVIEW: "warning",
  DRAFT: "muted",
  ARCHIVED: "muted",
};

export default async function AdminProductsPage() {
  const [products, suppliers] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ status: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        status: true,
        priceMinor: true,
        currency: true,
        supplier: { select: { id: true, name: true, evidenceVerified: true } },
        _count: { select: { units: { where: { status: "AVAILABLE" } } } },
      },
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, evidenceVerified: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink">Products</h1>
          <p className="mt-2 text-sm text-ink-muted">
            A product can only go ACTIVE once linked to a supplier with verified
            transfer-right evidence. Inventory codes are policy-checked and
            encrypted on import.
          </p>
        </div>
        <Link href="/admin/products/new" className={buttonClasses("primary", "md")}>
          New product
        </Link>
      </div>

      <ul className="space-y-4">
        {products.map((product) => (
          <Panel key={product.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">{product.title}</h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {formatMinor(product.priceMinor, product.currency)} ·{" "}
                  {product._count.units} available ·{" "}
                  {product.supplier
                    ? `Supplier: ${product.supplier.name}${product.supplier.evidenceVerified ? " (verified)" : " (unverified)"}`
                    : "No supplier linked"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[product.status] ?? "muted"}>
                  {product.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="text-sm text-accent hover:underline"
                >
                  Edit
                </Link>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <form action={setProductStatusAction} className="space-y-1.5">
                <input type="hidden" name="productId" value={product.id} />
                <label className="block text-xs text-ink-faint">Set status</label>
                <div className="flex gap-2">
                  <select
                    name="status"
                    defaultValue={product.status}
                    className="h-9 flex-1 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="COMPLIANCE_REVIEW">Compliance review</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  <Button type="submit" variant="secondary" size="sm">
                    Save
                  </Button>
                </div>
              </form>

              <form action={linkProductSupplierAction} className="space-y-1.5">
                <input type="hidden" name="productId" value={product.id} />
                <label className="block text-xs text-ink-faint">Link supplier</label>
                <div className="flex gap-2">
                  <select
                    name="supplierId"
                    defaultValue={product.supplier?.id ?? ""}
                    className="h-9 flex-1 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
                  >
                    <option value="">None</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                        {supplier.evidenceVerified ? " ✓" : ""}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary" size="sm">
                    Link
                  </Button>
                </div>
              </form>

              <form action={importInventoryAction} className="space-y-1.5">
                <input type="hidden" name="productId" value={product.id} />
                <label className="block text-xs text-ink-faint">
                  Import codes (one per line)
                </label>
                <textarea
                  name="rawCodes"
                  rows={2}
                  placeholder="ABCD-EFGH-IJKL"
                  className="w-full rounded-md border border-line bg-surface-2 px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Import
                </Button>
              </form>
            </div>
          </Panel>
        ))}
      </ul>
    </div>
  );
}

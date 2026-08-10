import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin — new product",
  robots: { index: false },
};

export default async function NewProductPage() {
  const [categories, suppliers] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, evidenceVerified: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">New product</h1>
        <p className="mt-2 text-sm text-ink-muted">
          List a lawful, transferable digital good — a gift code, key, or
          voucher. New products start as a draft; publishing as active still
          requires a linked supplier with verified transfer-right evidence.
        </p>
      </div>

      <Panel className="p-6">
        <ProductForm
          mode="create"
          categories={categories}
          suppliers={suppliers}
        />
      </Panel>
    </div>
  );
}

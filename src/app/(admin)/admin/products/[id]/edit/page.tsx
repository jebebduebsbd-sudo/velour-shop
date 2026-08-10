import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ProductForm,
  type ProductFormDefaults,
} from "@/components/admin/product-form";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";
import { formatCount } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin — edit product",
  robots: { index: false },
};

export default async function EditProductPage(
  props: PageProps<"/admin/products/[id]/edit">,
) {
  const { id } = await props.params;

  const [product, categories, suppliers] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        deliverable: true,
        categoryId: true,
        priceMinor: true,
        delivery: true,
        status: true,
        warranty: true,
        region: true,
        featured: true,
        supplierId: true,
        _count: { select: { units: { where: { status: "AVAILABLE" } } } },
      },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, evidenceVerified: true },
    }),
  ]);

  if (!product) notFound();

  const defaults: ProductFormDefaults = {
    title: product.title,
    subtitle: product.subtitle ?? "",
    categoryId: product.categoryId,
    price: (product.priceMinor / 100).toFixed(2),
    description: product.description,
    deliverable: product.deliverable,
    warranty: product.warranty,
    region: product.region,
    delivery: product.delivery,
    status: product.status,
    supplierId: product.supplierId ?? "",
    featured: product.featured,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Edit product</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {formatCount(product._count.units)} code(s) in stock. Manage inventory
          and quick status changes from the{" "}
          <Link href="/admin/products" className="text-accent hover:underline">
            products list
          </Link>
          .
        </p>
      </div>

      <Panel className="p-6">
        <ProductForm
          mode="edit"
          productId={product.id}
          categories={categories}
          suppliers={suppliers}
          defaults={defaults}
        />
      </Panel>
    </div>
  );
}

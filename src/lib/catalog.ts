import { prisma } from "@/lib/prisma";

/**
 * Read-side catalog queries backing the storefront. All availability counts
 * come from the database — a product is only "in stock" / "instant delivery"
 * when at least one AVAILABLE inventory unit actually exists.
 */

export type CategorySummary = {
  slug: string;
  name: string;
  blurb: string;
  availableUnits: number;
};

export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  categorySlug: string;
  categoryName: string;
  priceMinor: number;
  currency: string;
  delivery: "INSTANT_CODE" | "MANUAL";
  warranty: string;
  region: string;
  availableUnits: number;
};

export async function getCategorySummaries(): Promise<CategorySummary[]> {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      blurb: true,
      products: {
        where: { status: "ACTIVE" },
        select: {
          _count: { select: { units: { where: { status: "AVAILABLE" } } } },
        },
      },
    },
  });
  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    blurb: category.blurb,
    availableUnits: category.products.reduce(
      (sum, product) => sum + product._count.units,
      0,
    ),
  }));
}

type ProductWithCount = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  priceMinor: number;
  currency: string;
  delivery: "INSTANT_CODE" | "MANUAL";
  warranty: string;
  region: string;
  category: { slug: string; name: string };
  _count: { units: number };
};

function toSummary(product: ProductWithCount): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    categorySlug: product.category.slug,
    categoryName: product.category.name,
    priceMinor: product.priceMinor,
    currency: product.currency,
    delivery: product.delivery,
    warranty: product.warranty,
    region: product.region,
    availableUnits: product._count.units,
  };
}

const productSummarySelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  priceMinor: true,
  currency: true,
  delivery: true,
  warranty: true,
  region: true,
  category: { select: { slug: true, name: true } },
  _count: { select: { units: { where: { status: "AVAILABLE" as const } } } },
} as const;

export async function getFeaturedProducts(
  limit = 6,
): Promise<ProductSummary[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", featured: true },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: productSummarySelect,
  });
  return products.map(toSummary);
}

export async function getLiveInventory(limit = 5): Promise<ProductSummary[]> {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      units: { some: { status: "AVAILABLE" } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: productSummarySelect,
  });
  return products.map(toSummary);
}

export async function getMarketProducts(options: {
  categorySlug?: string;
  query?: string;
}): Promise<ProductSummary[]> {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(options.categorySlug
        ? { category: { slug: options.categorySlug } }
        : {}),
      ...(options.query
        ? { title: { contains: options.query, mode: "insensitive" } }
        : {}),
    },
    orderBy: [{ featured: "desc" }, { title: "asc" }],
    select: productSummarySelect,
  });
  return products.map(toSummary);
}

export type ProductDetail = ProductSummary & {
  description: string;
  deliverable: string;
};

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      ...productSummarySelect,
      status: true,
      description: true,
      deliverable: true,
    },
  });
  if (!product || product.status !== "ACTIVE") return null;
  return {
    ...toSummary(product),
    description: product.description,
    deliverable: product.deliverable,
  };
}

export async function getRelatedProducts(
  categorySlug: string,
  excludeProductId: string,
  limit = 3,
): Promise<ProductSummary[]> {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: excludeProductId },
      category: { slug: categorySlug },
    },
    orderBy: { title: "asc" },
    take: limit,
    select: productSummarySelect,
  });
  return products.map(toSummary);
}

export async function getStorefrontStats(): Promise<{
  availableUnits: number;
  categories: number;
  activeProducts: number;
}> {
  const [availableUnits, categories, activeProducts] = await Promise.all([
    prisma.inventoryUnit.count({ where: { status: "AVAILABLE" } }),
    prisma.category.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
  ]);
  return { availableUnits, categories, activeProducts };
}

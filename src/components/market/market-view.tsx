import { LayoutGrid } from "lucide-react";
import Link from "next/link";

import { PlatformMark } from "@/components/icons/platform-mark";
import { ProductCard } from "@/components/market/product-card";
import { Panel } from "@/components/ui/panel";
import { getCategorySummaries, getMarketProducts } from "@/lib/catalog";
import { formatCount } from "@/lib/format";

/**
 * Shared market listing view: category chip rail plus a product grid.
 * Filtering happens server-side from validated inputs.
 */
export async function MarketView({
  categorySlug,
  query,
}: {
  categorySlug?: string;
  query?: string;
}) {
  let categories, products;
  try {
    [categories, products] = await Promise.all([
      getCategorySummaries(),
      getMarketProducts({ categorySlug, query }),
    ]);
  } catch {
    return (
      <Panel className="p-10 text-center text-sm text-ink-muted" role="status">
        The market is temporarily unavailable. Please refresh in a moment.
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Categories" className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <ul className="scroll-area flex gap-2 overflow-x-auto pb-1">
          <li>
            <CategoryChip
              href="/market"
              label="All"
              active={!categorySlug}
              icon={<LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />}
            />
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <CategoryChip
                href={`/market/${category.slug}`}
                label={`${category.name}${
                  category.availableUnits > 0
                    ? ` (${formatCount(category.availableUnits)})`
                    : ""
                }`}
                active={categorySlug === category.slug}
                icon={
                  <PlatformMark
                    slug={category.slug}
                    className="h-3.5 w-3.5"
                  />
                }
              />
            </li>
          ))}
        </ul>
      </nav>

      {query ? (
        <p className="text-sm text-ink-muted">
          Showing results for{" "}
          <span className="font-semibold text-ink">“{query}”</span> —{" "}
          {formatCount(products.length)}{" "}
          {products.length === 1 ? "match" : "matches"}.{" "}
          <Link href="/market" className="text-orchid hover:text-lilac">
            Clear search
          </Link>
        </p>
      ) : null}

      {products.length === 0 ? (
        <Panel className="p-12 text-center">
          <p className="text-sm font-semibold text-ink">No listings found</p>
          <p className="mt-2 text-sm text-ink-muted">
            {query
              ? "Try a different search term or browse a category instead."
              : "This category has no stocked listings right now — check back soon."}
          </p>
        </Panel>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryChip({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors duration-(--duration-base) ${
        active
          ? "border-accent/60 bg-accent/15 font-semibold text-lilac"
          : "border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      <span className={active ? "text-lilac" : "text-orchid"}>{icon}</span>
      {label}
    </Link>
  );
}

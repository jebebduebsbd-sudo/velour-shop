import { ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

import { PlatformMark } from "@/components/icons/platform-mark";
import { StockBadge } from "@/components/market/stock-badge";
import { Panel } from "@/components/ui/panel";
import type { ProductSummary } from "@/lib/catalog";
import { deliveryLabel } from "@/lib/delivery";
import { formatMinor } from "@/lib/format";

/**
 * Database-driven product card. Artwork is an original abstract gradient
 * with the locally stored platform mark — never hotlinked imagery.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const inStock = product.availableUnits > 0;
  return (
    <Panel className="group relative flex flex-col overflow-hidden transition-colors duration-(--duration-base) hover:border-line-strong">
      <div
        aria-hidden="true"
        className="relative h-28 overflow-hidden border-b border-line bg-linear-to-br from-surface-3 via-surface-2 to-accent-deep/25"
      >
        <PlatformMark
          slug={product.categorySlug}
          className="absolute -right-4 -bottom-6 h-28 w-28 text-orchid/15 transition-transform duration-(--duration-base) group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-overlay px-2.5 py-1 text-xs text-ink-muted backdrop-blur-sm">
          <PlatformMark
            slug={product.categorySlug}
            className="h-3.5 w-3.5 text-orchid"
          />
          {product.categoryName}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-sm leading-snug font-semibold text-ink">
          <Link
            href={`/product/${product.slug}`}
            className="rounded-sm after:absolute after:inset-0"
          >
            {product.title}
          </Link>
        </h3>
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-ink">
            {formatMinor(product.priceMinor, product.currency)}
          </span>
          <StockBadge availableUnits={product.availableUnits} />
        </div>
        <div className="mt-auto space-y-1.5 border-t border-line pt-3 text-xs text-ink-muted">
          <p className="flex items-center gap-1.5">
            <Zap
              className={`h-3.5 w-3.5 ${inStock ? "text-accent" : "text-ink-faint"}`}
              aria-hidden="true"
            />
            {deliveryLabel(product)}
            <span className="text-ink-faint">· {product.region}</span>
          </p>
          <p className="flex items-start gap-1.5">
            <ShieldCheck
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success/80"
              aria-hidden="true"
            />
            <span className="line-clamp-2">{product.warranty}</span>
          </p>
        </div>
      </div>
    </Panel>
  );
}

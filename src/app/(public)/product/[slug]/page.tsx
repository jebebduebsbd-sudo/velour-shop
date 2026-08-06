import {
  ChevronRight,
  PackageCheck,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlatformMark, PlatformTile } from "@/components/icons/platform-mark";
import { ProductCard } from "@/components/market/product-card";
import { StockBadge } from "@/components/market/stock-badge";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { deliveryLabel } from "@/lib/delivery";
import { formatCount, formatMinor } from "@/lib/format";

export async function generateMetadata(
  props: PageProps<"/product/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Product" };
  return { title: product.title, description: product.description };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const related = await getRelatedProducts(
    product.categorySlug,
    product.id,
  ).catch(() => []);
  const inStock = product.availableUnits > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-ink-faint">
          <li>
            <Link href="/market" className="hover:text-ink">
              Market
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li>
            <Link
              href={`/market/${product.categorySlug}`}
              className="hover:text-ink"
            >
              {product.categoryName}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="truncate text-ink-muted">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <Panel className="relative overflow-hidden p-8 sm:p-10">
            <PlatformMark
              slug={product.categorySlug}
              className="absolute -right-8 -bottom-10 h-48 w-48 text-orchid/10"
            />
            <div className="relative flex items-start gap-4">
              <PlatformTile slug={product.categorySlug} size="lg" />
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                  {product.categoryName}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
                  {product.title}
                </h1>
                {product.subtitle ? (
                  <p className="mt-1 text-sm text-ink-muted">
                    {product.subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="relative mt-6 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {product.description}
            </p>
          </Panel>

          <Panel className="p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink uppercase">
              <PackageCheck
                className="h-4 w-4 text-success"
                aria-hidden="true"
              />
              What you receive
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              {product.deliverable}
            </p>
            <p className="mt-3 border-t border-line pt-3 text-xs text-ink-faint">
              Listings never include account credentials, mailbox access, or
              session data — only lawful, transferable codes and keys.
            </p>
          </Panel>

          <Panel className="p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink uppercase">
              <ShieldCheck
                className="h-4 w-4 text-accent"
                aria-hidden="true"
              />
              Buyer protection
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>
                Purchases are paid from your wallet balance — checkout never
                charges a card directly.
              </li>
              <li>{product.warranty}</li>
              <li>
                Disputes follow a structured review with recorded outcomes.
              </li>
            </ul>
            <Link
              href="/buyer-protection"
              className="mt-4 inline-block text-sm text-orchid hover:text-lilac"
            >
              Read the full Buyer Protection policy →
            </Link>
          </Panel>
        </div>

        <aside aria-label="Purchase" className="lg:sticky lg:top-24 lg:self-start">
          <Panel className="p-6">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-3xl font-bold text-ink">
                {formatMinor(product.priceMinor, product.currency)}
              </span>
              <StockBadge availableUnits={product.availableUnits} />
            </div>
            <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-faint">Delivery</dt>
                <dd className="flex items-center gap-1.5 text-ink">
                  <Zap
                    className={`h-3.5 w-3.5 ${inStock ? "text-accent" : "text-ink-faint"}`}
                    aria-hidden="true"
                  />
                  {deliveryLabel(product)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-faint">Region</dt>
                <dd className="text-ink">{product.region}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-faint">Stock</dt>
                <dd className="text-ink">
                  {inStock
                    ? `${formatCount(product.availableUnits)} units`
                    : "None available"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-faint">Payment</dt>
                <dd className="flex items-center gap-1.5 text-ink">
                  <Wallet className="h-3.5 w-3.5 text-orchid" aria-hidden="true" />
                  Wallet balance only
                </dd>
              </div>
            </dl>
            {inStock ? (
              <Link
                href="/auth/sign-in"
                className={buttonClasses("primary", "lg", "mt-6 w-full")}
              >
                Sign in to purchase
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className={buttonClasses("secondary", "lg", "mt-6 w-full")}
              >
                Out of stock
              </button>
            )}
            <p className="mt-3 text-center text-xs text-ink-faint">
              Your wallet balance is checked at checkout — prices are always
              confirmed server-side.
            </p>
          </Panel>
        </aside>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-4 text-xl font-bold text-ink">
            More in {product.categoryName}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <ProductCard product={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

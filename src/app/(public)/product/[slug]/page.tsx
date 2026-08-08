import { ChevronRight, PackageCheck, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";

import { PlatformMark, PlatformTile } from "@/components/icons/platform-mark";
import { ProductCard } from "@/components/market/product-card";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ProductReviewsPanel } from "@/components/reviews/product-reviews";
import { Panel } from "@/components/ui/panel";
import { getActiveSession } from "@/lib/auth/session";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { getProductReviews } from "@/lib/reviews/service";
import { getWalletBalance } from "@/lib/wallet/ledger";

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
  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const [related, reviews] = await Promise.all([
    getRelatedProducts(product.categorySlug, product.id).catch(() => []),
    getProductReviews(product.id).catch(() => ({
      average: null,
      count: 0,
      reviews: [],
    })),
  ]);

  const session = await getActiveSession().catch(() => null);
  let viewer:
    | { state: "guest" }
    | { state: "unverified" }
    | { state: "ready"; balanceMinor: number; currency: string };
  if (!session) {
    viewer = { state: "guest" };
  } else if (session.user.emailVerifiedAt === null) {
    viewer = { state: "unverified" };
  } else {
    const balance = await getWalletBalance(session.user.id).catch(() => null);
    viewer = {
      state: "ready",
      balanceMinor: balance?.spendableMinor ?? 0,
      currency: balance?.currency ?? product.currency,
    };
  }

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
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

          <ProductReviewsPanel data={reviews} />
        </div>

        <aside aria-label="Purchase" className="lg:sticky lg:top-24 lg:self-start">
          <PurchasePanel
            slug={product.slug}
            priceMinor={product.priceMinor}
            currency={product.currency}
            region={product.region}
            delivery={product.delivery}
            availableUnits={product.availableUnits}
            warranty={product.warranty}
            idempotencyKey={randomUUID()}
            viewer={viewer}
            error={error}
          />
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

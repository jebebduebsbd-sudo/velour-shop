import {
  ArrowRight,
  FileCheck2,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { VelourEmblem } from "@/components/brand/logo";
import { PlatformTile } from "@/components/icons/platform-mark";
import { ProductCard } from "@/components/market/product-card";
import { StockBadge } from "@/components/market/stock-badge";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCategorySummaries,
  getFeaturedProducts,
  getLiveInventory,
  getStorefrontStats,
} from "@/lib/catalog";
import { formatCount, formatMinor } from "@/lib/format";
import type { Messages } from "@/lib/i18n/dictionaries";
import { getMessages } from "@/lib/i18n/server";

export default async function HomePage() {
  const { t } = await getMessages();
  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:space-y-20 lg:py-14">
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Hero t={t} />
        <Suspense fallback={<LiveInventorySkeleton />}>
          <LiveInventoryPanel t={t} />
        </Suspense>
      </section>

      <TrustStrip t={t} />

      <section aria-labelledby="categories-heading">
        <SectionHeading
          eyebrow={t.sections.exploreCategories}
          id="categories-heading"
          title={t.sections.choosePlatform}
          link={{ href: "/market", label: t.sections.viewAllCategories }}
        />
        <Suspense fallback={<CategoriesSkeleton />}>
          <CategoriesGrid t={t} />
        </Suspense>
      </section>

      <section aria-labelledby="featured-heading">
        <SectionHeading
          eyebrow={t.sections.featured}
          id="featured-heading"
          title={t.sections.featuredTitle}
          link={{ href: "/market", label: t.sections.viewFullMarket }}
        />
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedGrid />
        </Suspense>
      </section>
    </div>
  );
}

function Hero({ t }: { t: Messages }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface-1 p-8 sm:p-10 lg:p-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-accent-deep/20 blur-3xl" />
        <div className="absolute right-0 -bottom-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <VelourEmblem className="absolute top-1/2 right-4 h-64 w-64 -translate-y-1/2 opacity-[0.06]" />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.05]"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="hero-grid"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M48 0H0v48"
                fill="none"
                stroke="#b78cf7"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-lilac">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-accent"
          />
          {t.hero.welcome}
        </p>
        <h1 className="mt-5 text-4xl leading-[1.05] font-bold tracking-tight text-ink sm:text-5xl xl:text-6xl">
          {t.hero.titleLine1}
          <br />
          <span className="bg-linear-to-r from-orchid via-accent to-lilac bg-clip-text italic text-transparent">
            {t.hero.titleLine2}
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-ink-muted sm:text-lg">
          {t.hero.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/market" className={buttonClasses("primary", "lg")}>
            {t.hero.browseMarket}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/auth/sign-in"
            className={buttonClasses("secondary", "lg")}
          >
            {t.hero.topUp}
          </Link>
        </div>
        <Suspense fallback={<StatsSkeleton />}>
          <HeroStats t={t} />
        </Suspense>
      </div>
    </div>
  );
}

async function HeroStats({ t }: { t: Messages }) {
  let stats;
  try {
    stats = await getStorefrontStats();
  } catch {
    return null;
  }
  const items = [
    { value: formatCount(stats.availableUnits), label: t.hero.unitsInStock },
    { value: formatCount(stats.categories), label: t.hero.categories },
    { value: formatCount(stats.activeProducts), label: t.hero.productsListed },
  ];
  return (
    <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="sr-only">{item.label}</dt>
          <dd className="text-2xl font-bold text-ink">{item.value}</dd>
          <dd className="mt-1 text-xs text-ink-faint">{item.label}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatsSkeleton() {
  return (
    <div className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

async function LiveInventoryPanel({ t }: { t: Messages }) {
  let products;
  try {
    products = await getLiveInventory(5);
  } catch {
    return (
      <Panel className="p-5" role="status">
        <PanelHeading t={t} />
        <p className="py-10 text-center text-sm text-ink-muted">
          The inventory feed is temporarily unavailable. Please refresh in a
          moment.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-5">
      <PanelHeading t={t} />
      {products.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          No stocked listings right now — check back soon.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/product/${product.slug}`}
                className="flex items-center gap-3 rounded-md px-1 py-3 transition-colors duration-(--duration-base) hover:bg-surface-2"
              >
                <PlatformTile slug={product.categorySlug} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {product.title}
                  </span>
                  <span className="block text-xs text-ink-faint">
                    {formatCount(product.availableUnits)} available ·{" "}
                    {product.region}
                  </span>
                </span>
                <span className="text-sm font-semibold text-ink">
                  {formatMinor(product.priceMinor, product.currency)}
                </span>
                <StockBadge availableUnits={product.availableUnits} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-faint">
        Live stock from the Velour catalog. Purchases use wallet balance only.
      </p>
    </Panel>
  );
}

function PanelHeading({ t }: { t: Messages }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink uppercase">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full bg-success"
        />
        {t.sections.liveInventory}
      </h2>
      <Link
        href="/market"
        className="text-xs text-ink-muted transition-colors hover:text-ink"
      >
        {t.sections.viewAll} →
      </Link>
    </div>
  );
}

function LiveInventorySkeleton() {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="mt-5 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TrustStrip({ t }: { t: Messages }) {
  const TRUST_ITEMS = [
    { icon: ShieldCheck, title: t.trust.secureTitle, detail: t.trust.secureDetail },
    { icon: Zap, title: t.trust.fastTitle, detail: t.trust.fastDetail },
    { icon: FileCheck2, title: t.trust.verifiedTitle, detail: t.trust.verifiedDetail },
    { icon: Wallet, title: t.trust.balanceTitle, detail: t.trust.balanceDetail },
  ] as const;
  return (
    <section aria-label="Why buy on Velour">
      <Panel className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {TRUST_ITEMS.map((item) => (
          <div key={item.title} className="flex items-start gap-3 p-5">
            <item.icon
              className="mt-0.5 h-5 w-5 shrink-0 text-accent"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 text-xs text-ink-muted">{item.detail}</p>
            </div>
          </div>
        ))}
      </Panel>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  id,
  title,
  link,
}: {
  eyebrow: string;
  id: string;
  title: string;
  link: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          {eyebrow}
        </p>
        <h2 id={id} className="mt-1 text-2xl font-bold text-ink">
          {title}
        </h2>
      </div>
      <Link
        href={link.href}
        className="shrink-0 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        {link.label} →
      </Link>
    </div>
  );
}

async function CategoriesGrid({ t }: { t: Messages }) {
  let categories;
  try {
    categories = await getCategorySummaries();
  } catch {
    return (
      <Panel className="p-8 text-center text-sm text-ink-muted" role="status">
        Categories are temporarily unavailable. Please refresh in a moment.
      </Panel>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            href={`/market/${category.slug}`}
            className="glass-panel flex h-full flex-col items-center gap-3 rounded-lg p-5 text-center transition-colors duration-(--duration-base) hover:border-line-strong"
          >
            <PlatformTile slug={category.slug} size="lg" />
            <span className="text-sm font-semibold text-ink">
              {category.name}
            </span>
            <span
              className={`text-xs ${
                category.availableUnits > 0 ? "text-ink-muted" : "text-ink-faint"
              }`}
            >
              {category.availableUnits > 0
                ? `${formatCount(category.availableUnits)} ${t.sections.available}`
                : t.sections.outOfStock}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="h-36" />
      ))}
    </div>
  );
}

async function FeaturedGrid() {
  let products;
  try {
    products = await getFeaturedProducts(6);
  } catch {
    return (
      <Panel className="p-8 text-center text-sm text-ink-muted" role="status">
        Featured products are temporarily unavailable. Please refresh in a
        moment.
      </Panel>
    );
  }
  if (products.length === 0) {
    return (
      <Panel className="p-8 text-center text-sm text-ink-muted">
        No featured products yet — browse the full market instead.
      </Panel>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-64" />
      ))}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MarketView } from "@/components/market/market-view";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_DEFS, isCategorySlug } from "@/lib/categories";

export async function generateMetadata(
  props: PageProps<"/market/[category]">,
): Promise<Metadata> {
  const { category } = await props.params;
  const def = CATEGORY_DEFS.find((d) => d.slug === category);
  if (!def) return { title: "Market" };
  return {
    title: `${def.name} — Market`,
    description: `Browse ${def.name} listings on Velour: ${def.blurb}.`,
  };
}

export default async function MarketCategoryPage(
  props: PageProps<"/market/[category]">,
) {
  const { category } = await props.params;
  if (!isCategorySlug(category)) notFound();
  const def = CATEGORY_DEFS.find((d) => d.slug === category)!;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Velour market
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">{def.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">{def.blurb}.</p>
      </header>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <MarketView categorySlug={category} />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import { MarketView } from "@/components/market/market-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Market",
  description:
    "Browse the full Velour catalog of lawful digital goods: gift codes, wallet codes, vouchers, and official keys.",
};

const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export default async function MarketPage(props: PageProps<"/market">) {
  const rawParams = await props.searchParams;
  const parsed = searchSchema.safeParse({
    q: typeof rawParams.q === "string" ? rawParams.q : undefined,
  });
  const query = parsed.success ? parsed.data.q : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Velour market
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Browse the market</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Every listing states exactly what you receive. Stock counts are live
          — a listing only shows instant delivery when units are actually
          available.
        </p>
      </header>
      <Suspense fallback={<MarketSkeleton />}>
        <MarketView query={query} />
      </Suspense>
    </div>
  );
}

function MarketSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

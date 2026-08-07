import type { ReactNode } from "react";
import { connection } from "next/server";
import { fetchCatalog, type CatalogEntry } from "@/lib/salta7";

const price = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

const count = new Intl.NumberFormat("en-US");

export default async function Page() {
  // Render per request: stock changes constantly, and the API base is read from
  // the environment at runtime rather than baked in at build time.
  await connection();
  const { entries, error } = await fetchCatalog();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-12">
        <p className="text-sm font-medium tracking-[0.2em] text-indigo-400 uppercase">
          Velour
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Products
        </h1>
        <p className="mt-4 max-w-2xl text-neutral-400">
          Fresh Discord accounts, tokens and Nitro. Stock counts below are live.
        </p>
      </header>

      {error ? (
        <Notice title="The store is unavailable right now">
          We couldn&apos;t load the catalog ({error}). It usually means the store
          is briefly in maintenance — refresh in a minute.
        </Notice>
      ) : entries.length === 0 ? (
        <Notice title="No products listed yet">
          Nothing is on sale at the moment. New products show up here as soon as
          they&apos;re added to the store.
        </Notice>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <ProductCard key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </main>
  );
}

function ProductCard({ entry }: { entry: CatalogEntry }) {
  const soldOut = entry.stock === 0;
  // Descriptions arrive as one bullet-separated line, e.g. "Fresh • Verified".
  const features = entry.description
    .split("•")
    .map((feature) => feature.trim())
    .filter(Boolean);

  return (
    <li
      className={`flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 transition hover:border-neutral-700 ${
        soldOut ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold">{entry.title}</h2>
        <StockBadge stock={entry.stock} />
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight">
        {price.format(entry.price)}
        <span className="ml-1 text-sm font-normal text-neutral-500">each</span>
      </p>

      {features.length > 0 && (
        <ul className="mt-5 space-y-1.5 text-sm text-neutral-400">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      )}

      <dl className="mt-5 space-y-1 text-xs text-neutral-500">
        <div className="flex gap-2">
          <dt className="text-neutral-400">Format</dt>
          <dd className="font-mono break-all">{entry.format}</dd>
        </div>
        {entry.details && (
          <div className="flex gap-2">
            <dt className="text-neutral-400">Details</dt>
            <dd>{entry.details}</dd>
          </div>
        )}
      </dl>

      {entry.warranty && (
        <details className="group mt-5 text-xs text-neutral-500">
          <summary className="cursor-pointer text-neutral-400 hover:text-neutral-200">
            Warranty
          </summary>
          <p className="mt-2 leading-relaxed">{entry.warranty}</p>
        </details>
      )}
    </li>
  );
}

function StockBadge({ stock }: { stock: number | null }) {
  if (stock === null) {
    return <Badge className="bg-neutral-800 text-neutral-400">stock n/a</Badge>;
  }
  if (stock === 0) {
    return <Badge className="bg-red-500/10 text-red-400">sold out</Badge>;
  }
  return (
    <Badge className="bg-emerald-500/10 text-emerald-400">
      {count.format(stock)} in stock
    </Badge>
  );
}

function Badge({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

function Notice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-neutral-400">{children}</p>
    </div>
  );
}

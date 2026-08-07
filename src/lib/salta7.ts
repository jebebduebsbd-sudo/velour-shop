/**
 * Client for the Salta7 store API — the supplier behind the Velour catalog.
 *
 * Listing products only needs the public `/prices` and `/stock` endpoints, so
 * the storefront works without any credentials. `SALTA7_API_TOKEN` is only
 * required once we start calling authenticated endpoints such as `/buy`.
 */

const DEFAULT_API_BASE = "https://salta7-store.ngrok.app";

/** A product exactly as `/prices` returns it. */
export type Salta7Product = {
  id: number;
  /** Slug — this is what `/stock` and `/buy` call `account`. */
  product: string;
  title: string;
  price: number;
  description: string;
  warranty: string;
  details: string;
  format: string;
  admin_only?: boolean;
};

/** A product plus its live stock count (`null` when the count is unavailable). */
export type CatalogEntry = Salta7Product & { stock: number | null };

export type Catalog = {
  entries: CatalogEntry[];
  /** Set when the catalog could not be loaded, so the page can say why. */
  error: string | null;
};

function apiBase(): string {
  return (process.env.SALTA7_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    headers: {
      accept: "application/json",
      // Free ngrok tunnels answer anything browser-shaped with an HTML
      // interstitial; this header opts out so we keep getting JSON.
      "ngrok-skip-browser-warning": "true",
    },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

/** Every product on sale. Admin-only products are dropped — they aren't ours to show. */
export async function fetchProducts(): Promise<Salta7Product[]> {
  const products = await apiGet<Salta7Product[]>("/prices");
  if (!Array.isArray(products)) {
    throw new Error("/prices did not return a list of products");
  }
  return products.filter((product) => !product.admin_only);
}

/** Units available for one product slug. */
export async function fetchStock(slug: string): Promise<number> {
  const value = await apiGet<unknown>(
    `/stock?account=${encodeURIComponent(slug)}`,
  );
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`/stock returned a non-numeric value for "${slug}"`);
  }
  return value;
}

/**
 * The catalog to put on the storefront: every product with its live stock.
 *
 * Never throws. The upstream store goes into maintenance from time to time, and
 * a shop that renders "we can't reach the store" beats one that 500s.
 */
export async function fetchCatalog(): Promise<Catalog> {
  let products: Salta7Product[];
  try {
    products = await fetchProducts();
  } catch (error) {
    return { entries: [], error: messageOf(error) };
  }

  // One request per product, all in flight together. A failed stock lookup
  // shouldn't hide an otherwise sellable product, so it degrades to null.
  const stocks = await Promise.all(
    products.map((product) =>
      fetchStock(product.product).catch(() => null),
    ),
  );

  return {
    entries: products.map((product, index) => ({
      ...product,
      stock: stocks[index],
    })),
    error: null,
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

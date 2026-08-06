import type { CategorySlug } from "@/lib/categories";

/** A single account listing as shown on the VELOUR storefront. */
export interface Listing {
  itemId: string;
  title: string;
  description: string;
  priceCents: number;
  category: CategorySlug;
  origin: string | null;
  guarantee: boolean;
  publishedAt: number | null;
  /** true when sourced from the live LZT Market feed, false for demo data. */
  live: boolean;
}

export interface ListingResult {
  listings: Listing[];
  /** "live" when served from LZT, "mock" for the built-in demo feed. */
  source: "live" | "mock";
  totalItems: number;
  /** Present only when the live feed failed and we fell back to demo data. */
  error?: string;
}

/** Minimal shape of an item in an LZT Market category-search response. */
export interface LztItem {
  item_id?: number;
  title?: string;
  title_en?: string;
  description?: string;
  description_en?: string;
  price?: number;
  category_id?: number;
  item_origin?: string;
  guarantee?: { durationPhrase?: string } | boolean | null;
  published_date?: number;
}

export interface LztListResponse {
  items?: LztItem[];
  totalItems?: number;
  totalItemsPrice?: number;
  hasNextPage?: boolean;
  perPage?: number;
  page?: number;
}

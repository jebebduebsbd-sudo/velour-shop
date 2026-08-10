/**
 * Provider-neutral supplier catalogue feed.
 *
 * A feed is strictly READ-ONLY and server-only: Velour pulls a supplier's
 * listings over HTTPS using a token held in the environment. It never pushes
 * data, never signs in as a buyer, and never accepts account credentials —
 * listings that describe account access are dropped by the eligibility filter
 * before anything reaches the database (see `eligibility.ts`).
 *
 * Adapters are disabled by default and must fail closed: no token, no feed.
 */

/** One normalized listing from a supplier feed. */
export type FeedListing = {
  /** Stable supplier-side identifier. Makes repeated syncs idempotent. */
  externalId: string;
  /** Supplier-declared product type, e.g. "gift_card", "activation_key". */
  kind: string;
  title: string;
  description?: string;
  /** Prose statement of what the buyer receives — never the code itself. */
  deliverable?: string;
  /** Price in integer minor units. Never floating point. */
  priceMinor: number;
  currency: string;
  region?: string;
  warranty?: string;
  /** Category slug this listing belongs to, matched against Velour's own. */
  category?: string;
  /**
   * The supplier's explicit assertion that the goods are transferable and
   * authorized for resale. Required to be `true` before anything is listed.
   */
  transferable?: boolean;
  /** Deliverable codes shipped with the listing, if the feed includes them. */
  codes?: string[];
};

/** A listing the adapter could not turn into a `FeedListing`. */
export type MalformedListing = {
  /** Supplier-side reference, or a positional marker. Never a payload. */
  ref: string;
  reason: string;
};

export type FeedResult =
  | { ok: true; listings: FeedListing[]; malformed: MalformedListing[] }
  | { ok: false; reason: string };

export type FeedHealth = {
  healthy: boolean;
  detail: string;
};

export interface SupplierFeedProvider {
  readonly id: string;
  readonly displayName: string;
  /** True only when the feature flag is on AND the feed is fully configured. */
  isEnabled(): boolean;
  /** Operator-facing explanation of why the feed is not usable right now. */
  disabledReason(): string;
  fetchListings(): Promise<FeedResult>;
  healthCheck(): Promise<FeedHealth>;
}

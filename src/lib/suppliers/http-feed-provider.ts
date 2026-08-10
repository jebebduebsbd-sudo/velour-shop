import { z } from "zod";

import type {
  FeedHealth,
  FeedListing,
  FeedResult,
  MalformedListing,
  SupplierFeedProvider,
} from "@/lib/suppliers/feed";

/**
 * Generic HTTPS catalogue feed authenticated with a supplier API token.
 *
 * The token lives in `SUPPLIER_API_TOKEN` (server environment only) and is
 * never written to the database, the audit log, an error message, or the
 * client. The adapter is disabled unless `SUPPLIER_SYNC_ENABLED` is "true"
 * AND both a token and a feed URL are present.
 *
 * Transport rules, all of which fail closed:
 *   - HTTPS only (plaintext is allowed for localhost in development only, so
 *     the token is never sent in the clear),
 *   - redirects are refused outright, so the token cannot be replayed to a
 *     host the operator did not configure,
 *   - responses are bounded in time, size, and item count.
 *
 * The response shape is deliberately tolerant — supplier panels differ — but
 * every field is validated, and prices must arrive as integer minor units or
 * as a decimal *string* so no money ever passes through a float.
 */
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_LISTINGS = 500;

const rawListingSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    external_id: z.union([z.string(), z.number()]).optional(),
    externalId: z.union([z.string(), z.number()]).optional(),
    sku: z.union([z.string(), z.number()]).optional(),

    kind: z.string().optional(),
    type: z.string().optional(),
    product_type: z.string().optional(),

    title: z.string().optional(),
    name: z.string().optional(),

    description: z.string().optional(),
    deliverable: z.string().optional(),
    warranty: z.string().optional(),
    region: z.string().optional(),
    category: z.string().optional(),

    price_minor: z.number().int().optional(),
    priceMinor: z.number().int().optional(),
    price: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional(),

    transferable: z.boolean().optional(),
    codes: z.array(z.string()).optional(),
  })
  .passthrough();

const feedSchema = z.union([
  z.array(rawListingSchema),
  z.object({ items: z.array(rawListingSchema) }),
  z.object({ data: z.array(rawListingSchema) }),
  z.object({ products: z.array(rawListingSchema) }),
  z.object({ listings: z.array(rawListingSchema) }),
]);

type RawListing = z.infer<typeof rawListingSchema>;

/**
 * Converts a decimal *string* ("12.99") to integer minor units using string
 * arithmetic. JSON numbers are refused for prices so a binary float can never
 * become a price.
 */
export function minorFromDecimalString(value: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  if (!Number.isSafeInteger(whole)) return null;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return whole * 100 + Number(fraction);
}

function firstString(...values: (string | number | undefined)[]): string | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

/** Maps one raw feed row onto a `FeedListing`, or explains why it cannot. */
export function normalizeListing(
  raw: RawListing,
  index: number,
): { ok: true; listing: FeedListing } | { ok: false; malformed: MalformedListing } {
  const externalId = firstString(raw.external_id, raw.externalId, raw.id, raw.sku);
  const ref = externalId ?? `#${index}`;

  if (!externalId) {
    return { ok: false, malformed: { ref, reason: "missing id/sku" } };
  }

  const title = firstString(raw.title, raw.name);
  if (!title) {
    return { ok: false, malformed: { ref, reason: "missing title/name" } };
  }

  const kind = firstString(raw.kind, raw.type, raw.product_type);
  if (!kind) {
    return { ok: false, malformed: { ref, reason: "missing kind/type" } };
  }

  let priceMinor: number | null = null;
  if (typeof raw.price_minor === "number") priceMinor = raw.price_minor;
  else if (typeof raw.priceMinor === "number") priceMinor = raw.priceMinor;
  else if (typeof raw.price === "string") priceMinor = minorFromDecimalString(raw.price);
  else if (typeof raw.price === "number") {
    return {
      ok: false,
      malformed: {
        ref,
        reason:
          'numeric "price" refused — send integer "price_minor" or a decimal string',
      },
    };
  }
  if (priceMinor === null) {
    return { ok: false, malformed: { ref, reason: "missing or unparsable price" } };
  }

  return {
    ok: true,
    listing: {
      externalId,
      kind,
      title,
      description: raw.description?.trim() || undefined,
      deliverable: raw.deliverable?.trim() || undefined,
      warranty: raw.warranty?.trim() || undefined,
      region: raw.region?.trim() || undefined,
      category: raw.category?.trim().toLowerCase() || undefined,
      priceMinor,
      currency: (raw.currency ?? "EUR").trim().toUpperCase(),
      transferable: raw.transferable,
      codes: raw.codes,
    },
  };
}

export class HttpSupplierFeedProvider implements SupplierFeedProvider {
  readonly id = "http";
  readonly displayName = "Supplier catalogue feed";

  private token(): string | undefined {
    return process.env.SUPPLIER_API_TOKEN || undefined;
  }

  private rawUrl(): string | undefined {
    return process.env.SUPPLIER_FEED_URL || undefined;
  }

  private flagEnabled(): boolean {
    return process.env.SUPPLIER_SYNC_ENABLED === "true";
  }

  /** Parsed feed URL, or null when absent, unparsable, or plaintext. */
  private url(): URL | null {
    const raw = this.rawUrl();
    if (!raw) return null;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return null;
    }
    if (parsed.protocol === "https:") return parsed;
    // Plaintext is tolerated only for a local development feed: the token must
    // never cross a network unencrypted.
    const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (
      parsed.protocol === "http:" &&
      local &&
      process.env.NODE_ENV !== "production"
    ) {
      return parsed;
    }
    return null;
  }

  isEnabled(): boolean {
    return this.flagEnabled() && !!this.token() && !!this.url();
  }

  disabledReason(): string {
    if (!this.flagEnabled()) {
      return 'Supplier sync is off. Set SUPPLIER_SYNC_ENABLED="true" once the feed is configured.';
    }
    if (!this.token()) {
      return "SUPPLIER_API_TOKEN is not set. Add it to the server environment — never paste it into the app, a prompt, or the repository.";
    }
    if (!this.rawUrl()) return "SUPPLIER_FEED_URL is not set.";
    return "SUPPLIER_FEED_URL must be an https:// URL (http:// is allowed only for localhost in development).";
  }

  /**
   * Auth header. Defaults to `Authorization: Bearer <token>`; panels that use
   * a custom header can name it in SUPPLIER_AUTH_HEADER (e.g. "X-Api-Key"),
   * in which case the token is sent as that header's raw value.
   */
  private authHeader(token: string): Record<string, string> {
    const header = process.env.SUPPLIER_AUTH_HEADER?.trim();
    if (header && header.toLowerCase() !== "authorization") {
      return { [header]: token };
    }
    return { authorization: `Bearer ${token}` };
  }

  async fetchListings(): Promise<FeedResult> {
    const token = this.token();
    const url = this.url();
    if (!this.isEnabled() || !token || !url) {
      return { ok: false, reason: this.disabledReason() };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let body: string;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json", ...this.authHeader(token) },
        signal: controller.signal,
        // Never follow a redirect: it could replay the token to another host.
        redirect: "error",
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          reason: `supplier rejected the API token (HTTP ${response.status})`,
        };
      }
      if (!response.ok) {
        return { ok: false, reason: `feed returned HTTP ${response.status}` };
      }

      const declared = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
        return { ok: false, reason: "feed response too large" };
      }

      body = await response.text();
      if (body.length > MAX_RESPONSE_BYTES) {
        return { ok: false, reason: "feed response too large" };
      }
    } catch (error) {
      // Deliberately generic: the URL may embed a token in its query string,
      // and fetch errors can echo the request target.
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        reason: aborted ? "feed request timed out" : "feed request failed",
      };
    } finally {
      clearTimeout(timeout);
    }

    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return { ok: false, reason: "feed response was not valid JSON" };
    }

    const parsed = feedSchema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        reason:
          "feed response did not match the expected shape (array, or an object with items/data/products/listings)",
      };
    }

    const rows = Array.isArray(parsed.data)
      ? parsed.data
      : "items" in parsed.data
        ? parsed.data.items
        : "data" in parsed.data
          ? parsed.data.data
          : "products" in parsed.data
            ? parsed.data.products
            : parsed.data.listings;

    const listings: FeedListing[] = [];
    const malformed: MalformedListing[] = [];
    for (const [index, row] of rows.slice(0, MAX_LISTINGS).entries()) {
      const normalized = normalizeListing(row, index);
      if (normalized.ok) listings.push(normalized.listing);
      else malformed.push(normalized.malformed);
    }
    if (rows.length > MAX_LISTINGS) {
      malformed.push({
        ref: "(feed)",
        reason: `feed returned ${rows.length} rows; only the first ${MAX_LISTINGS} were read`,
      });
    }

    return { ok: true, listings, malformed };
  }

  async healthCheck(): Promise<FeedHealth> {
    if (!this.isEnabled()) {
      return { healthy: false, detail: this.disabledReason() };
    }
    const result = await this.fetchListings();
    return result.ok
      ? {
          healthy: true,
          detail: `Feed reachable — ${result.listings.length} listing(s) readable.`,
        }
      : { healthy: false, detail: result.reason };
  }
}

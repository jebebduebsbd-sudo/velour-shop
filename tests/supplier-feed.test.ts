import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkListingEligibility } from "@/lib/suppliers/eligibility";
import type { FeedListing } from "@/lib/suppliers/feed";
import {
  HttpSupplierFeedProvider,
  minorFromDecimalString,
  normalizeListing,
} from "@/lib/suppliers/http-feed-provider";

/**
 * Supplier feed: the adapter stays disabled without flag + token + HTTPS URL,
 * and the eligibility filter admits transferable codes only — never account
 * access, however the listing is dressed up.
 */
function listing(overrides: Partial<FeedListing> = {}): FeedListing {
  return {
    externalId: "SKU-1",
    kind: "gift_card",
    title: "Steam Wallet Code 20 EUR",
    description: "Official wallet top-up code, credited to your Steam account.",
    deliverable: "One Steam wallet code worth €20.",
    priceMinor: 2000,
    currency: "EUR",
    transferable: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("SUPPLIER_SYNC_ENABLED", "true");
  vi.stubEnv("SUPPLIER_API_TOKEN", "test-supplier-token");
  vi.stubEnv("SUPPLIER_FEED_URL", "https://supplier.example/api/catalogue");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("supplier feed enable gating", () => {
  it("is disabled without the flag", () => {
    vi.stubEnv("SUPPLIER_SYNC_ENABLED", "false");
    expect(new HttpSupplierFeedProvider().isEnabled()).toBe(false);
  });

  it("is disabled without a token even with the flag on", () => {
    vi.stubEnv("SUPPLIER_API_TOKEN", "");
    const provider = new HttpSupplierFeedProvider();
    expect(provider.isEnabled()).toBe(false);
    expect(provider.disabledReason()).toMatch(/SUPPLIER_API_TOKEN/);
  });

  it("refuses a plaintext http feed URL so the token is never sent in clear", () => {
    vi.stubEnv("SUPPLIER_FEED_URL", "http://supplier.example/api/catalogue");
    expect(new HttpSupplierFeedProvider().isEnabled()).toBe(false);
  });

  it("allows http only for a local development feed", () => {
    vi.stubEnv("SUPPLIER_FEED_URL", "http://localhost:4000/catalogue");
    expect(new HttpSupplierFeedProvider().isEnabled()).toBe(true);
  });

  it("fails closed when disabled instead of fetching", async () => {
    vi.stubEnv("SUPPLIER_SYNC_ENABLED", "false");
    const result = await new HttpSupplierFeedProvider().fetchListings();
    expect(result.ok).toBe(false);
  });

  it("never puts the token in the disabled reason", () => {
    vi.stubEnv("SUPPLIER_FEED_URL", "");
    const reason = new HttpSupplierFeedProvider().disabledReason();
    expect(reason).not.toContain("test-supplier-token");
  });
});

describe("feed listing normalization", () => {
  it("accepts integer minor prices and maps common field aliases", () => {
    const result = normalizeListing(
      {
        sku: "ABC-9",
        name: "Roblox Gift Card 800 Robux",
        type: "gift_card",
        price_minor: 999,
        currency: "eur",
        transferable: true,
      },
      0,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.listing).toMatchObject({
      externalId: "ABC-9",
      title: "Roblox Gift Card 800 Robux",
      kind: "gift_card",
      priceMinor: 999,
      currency: "EUR",
    });
  });

  it("parses decimal string prices exactly, without floating point", () => {
    expect(minorFromDecimalString("12.99")).toBe(1299);
    expect(minorFromDecimalString("0.07")).toBe(7);
    expect(minorFromDecimalString("8")).toBe(800);
    expect(minorFromDecimalString("8,5")).toBe(850);
    expect(minorFromDecimalString("-3.00")).toBeNull();
    expect(minorFromDecimalString("1.005")).toBeNull();
  });

  it("refuses a JSON float price rather than rounding it", () => {
    const result = normalizeListing(
      { id: "X", name: "Card", kind: "gift_card", price: 12.99 },
      0,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.malformed.reason).toMatch(/price_minor/);
  });

  it("reports rows missing an id, title, or kind", () => {
    for (const row of [
      { name: "No id", kind: "gift_card", price_minor: 100 },
      { id: "A", kind: "gift_card", price_minor: 100 },
      { id: "B", name: "No kind", price_minor: 100 },
    ]) {
      expect(normalizeListing(row, 0).ok).toBe(false);
    }
  });
});

describe("feed transport", () => {
  function stubFetch(
    response: { status?: number; body: unknown; headers?: Record<string, string> },
    capture?: (url: string, init: RequestInit) => void,
  ) {
    vi.stubGlobal("fetch", async (url: URL | string, init: RequestInit) => {
      capture?.(String(url), init);
      return new Response(
        typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body),
        { status: response.status ?? 200, headers: response.headers },
      );
    });
  }

  it("sends the token as a bearer header and refuses redirects", async () => {
    let seen: RequestInit | undefined;
    stubFetch({ body: { items: [] } }, (_url, init) => {
      seen = init;
    });
    await new HttpSupplierFeedProvider().fetchListings();
    const headers = seen?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer test-supplier-token");
    expect(seen?.redirect).toBe("error");
  });

  it("sends a custom auth header when one is configured", async () => {
    vi.stubEnv("SUPPLIER_AUTH_HEADER", "X-Api-Key");
    let seen: RequestInit | undefined;
    stubFetch({ body: [] }, (_url, init) => {
      seen = init;
    });
    await new HttpSupplierFeedProvider().fetchListings();
    const headers = seen?.headers as Record<string, string>;
    expect(headers["X-Api-Key"]).toBe("test-supplier-token");
    expect(headers.authorization).toBeUndefined();
  });

  it("reads a bare array and each supported envelope key", async () => {
    const row = {
      id: "S1",
      name: "Steam Wallet Code",
      kind: "gift_card",
      price_minor: 2000,
      transferable: true,
    };
    for (const body of [
      [row],
      { items: [row] },
      { data: [row] },
      { products: [row] },
      { listings: [row] },
    ]) {
      stubFetch({ body });
      const result = await new HttpSupplierFeedProvider().fetchListings();
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].externalId).toBe("S1");
    }
  });

  it("keeps unknown supplier fields from breaking the parse", async () => {
    stubFetch({
      body: {
        items: [
          {
            id: "S2",
            name: "Voucher",
            kind: "voucher",
            price: "5.50",
            transferable: true,
            supplier_specific_field: { nested: true },
          },
        ],
      },
    });
    const result = await new HttpSupplierFeedProvider().fetchListings();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.listings[0].priceMinor).toBe(550);
  });

  it("reports a rejected token without leaking it", async () => {
    stubFetch({ status: 401, body: { error: "unauthorized" } });
    const result = await new HttpSupplierFeedProvider().fetchListings();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/token/);
    expect(result.reason).not.toContain("test-supplier-token");
  });

  it("fails closed on a non-JSON or unexpected-shape response", async () => {
    stubFetch({ body: "<html>maintenance</html>" });
    expect((await new HttpSupplierFeedProvider().fetchListings()).ok).toBe(false);

    stubFetch({ body: { unexpected: "shape" } });
    expect((await new HttpSupplierFeedProvider().fetchListings()).ok).toBe(false);
  });

  it("reports malformed rows instead of dropping them silently", async () => {
    stubFetch({
      body: { items: [{ name: "no id", kind: "gift_card", price_minor: 100 }] },
    });
    const result = await new HttpSupplierFeedProvider().fetchListings();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.listings).toHaveLength(0);
    expect(result.malformed).toHaveLength(1);
  });

  it("refuses an oversized response", async () => {
    stubFetch({
      body: { items: [] },
      headers: { "content-length": String(9_000_000) },
    });
    const result = await new HttpSupplierFeedProvider().fetchListings();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/too large/);
  });
});

describe("listing eligibility", () => {
  it("accepts a transferable gift card", () => {
    expect(checkListingEligibility(listing())).toEqual({ ok: true });
  });

  it("accepts keys, vouchers and top-up codes", () => {
    for (const kind of [
      "activation_key",
      "game key",
      "voucher",
      "top-up_code",
      "SUBSCRIPTION_VOUCHER",
    ]) {
      expect(checkListingEligibility(listing({ kind })).ok).toBe(true);
    }
  });

  it("rejects an account-selling kind", () => {
    for (const kind of ["account", "shared_account", "combo", "cookies"]) {
      expect(checkListingEligibility(listing({ kind })).ok).toBe(false);
    }
  });

  it("rejects account access dressed as a gift card kind", () => {
    const result = checkListingEligibility(
      listing({ title: "Netflix Premium Account 1 Month" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/account access/);
  });

  it("rejects credential signals hiding in the listing text", () => {
    for (const description of [
      "Delivered as email:password, works worldwide",
      "Includes the 2FA recovery codes",
      "Cookie/session token delivery, use the checker first",
      "Full access private account, warranty 30 days",
    ]) {
      expect(checkListingEligibility(listing({ description })).ok).toBe(false);
    }
  });

  it("does not trip on ordinary gift-card wording about an account", () => {
    expect(
      checkListingEligibility(
        listing({
          description: "Redeem in your account to top up your wallet balance.",
        }),
      ).ok,
    ).toBe(true);
  });

  it("requires the supplier to assert transfer rights", () => {
    const result = checkListingEligibility(listing({ transferable: undefined }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/transfer rights/);
    expect(checkListingEligibility(listing({ transferable: false })).ok).toBe(
      false,
    );
  });

  it("rejects a listing whose codes are credential-shaped", () => {
    const result = checkListingEligibility(
      listing({ codes: ["VALID-CODE-1111", "victim@example.com:hunter2"] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/payload policy/);
  });

  it("accepts a listing whose codes are all lawful", () => {
    expect(
      checkListingEligibility(
        listing({ codes: ["VELOUR-AAAA-BBBB", "VELOUR-CCCC-DDDD"] }),
      ).ok,
    ).toBe(true);
  });

  it("never echoes a rejected code in the reason", () => {
    const result = checkListingEligibility(
      listing({ codes: ["victim@example.com:hunter2"] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).not.toContain("hunter2");
    expect(result.reason).not.toContain("victim@example.com");
  });

  it("rejects non-EUR currency and nonsensical prices", () => {
    expect(checkListingEligibility(listing({ currency: "USD" })).ok).toBe(false);
    expect(checkListingEligibility(listing({ priceMinor: 0 })).ok).toBe(false);
    expect(checkListingEligibility(listing({ priceMinor: 12.5 })).ok).toBe(false);
    expect(checkListingEligibility(listing({ priceMinor: 5_000_000 })).ok).toBe(
      false,
    );
  });

  it("rejects listings missing an id or title", () => {
    expect(checkListingEligibility(listing({ externalId: "" })).ok).toBe(false);
    expect(checkListingEligibility(listing({ title: "" })).ok).toBe(false);
  });
});

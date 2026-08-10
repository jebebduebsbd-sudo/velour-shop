import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decryptDeliverable } from "@/lib/crypto/deliverable";
import type { FeedListing, FeedResult, SupplierFeedProvider } from "@/lib/suppliers/feed";

import { cleanupTestUsers, testDb } from "./db";

/**
 * Supplier catalogue sync against real PostgreSQL: eligible listings become
 * compliance-review products with encrypted units, credential-shaped listings
 * never reach the database, and repeat syncs update instead of duplicating.
 */
const PREFIX = "vtest-feedsync-";
const MASTER_KEY = Buffer.alloc(32, 9).toString("base64");
const CATEGORY_SLUG = `${PREFIX}cat`;

let sync: typeof import("@/lib/suppliers/sync");
let admin: typeof import("@/lib/admin/service");
let supplierId = "";
let actorId = "";

/** Feed adapter stub: enabled, returning exactly what a test hands it. */
function stubProvider(
  listings: FeedListing[],
  malformed: { ref: string; reason: string }[] = [],
): SupplierFeedProvider {
  return {
    id: "stub",
    displayName: "Stub feed",
    isEnabled: () => true,
    disabledReason: () => "",
    fetchListings: async (): Promise<FeedResult> => ({
      ok: true,
      listings,
      malformed,
    }),
    healthCheck: async () => ({ healthy: true, detail: "stub" }),
  };
}

function listing(overrides: Partial<FeedListing> = {}): FeedListing {
  return {
    externalId: `sku-${Math.random().toString(36).slice(2, 10)}`,
    kind: "gift_card",
    title: `${PREFIX}Wallet Code 20 EUR`,
    description: "Official wallet top-up code.",
    deliverable: "One wallet code worth €20.",
    priceMinor: 2000,
    currency: "EUR",
    category: CATEGORY_SLUG,
    transferable: true,
    ...overrides,
  };
}

beforeAll(async () => {
  process.env.DELIVERY_MASTER_KEY_B64 = MASTER_KEY;
  sync = await import("@/lib/suppliers/sync");
  admin = await import("@/lib/admin/service");

  await testDb.category.upsert({
    where: { slug: CATEGORY_SLUG },
    update: {},
    create: {
      slug: CATEGORY_SLUG,
      name: "FeedCat",
      blurb: "b",
      sortOrder: 970,
    },
  });
  const supplier = await testDb.supplier.create({
    data: {
      name: `${PREFIX}supplier`,
      transferEvidence: "distribution agreement #42",
    },
    select: { id: true },
  });
  supplierId = supplier.id;

  const actor = await testDb.user.create({
    data: {
      email: `${PREFIX}actor@velour.test`,
      username: `${PREFIX}actor`,
      passwordHash: "scrypt$1$1$1$AA==$AA==",
    },
    select: { id: true },
  });
  actorId = actor.id;
});

afterAll(async () => {
  await testDb.inventoryUnit.deleteMany({
    where: { product: { supplierId } },
  });
  await testDb.product.deleteMany({ where: { supplierId } });
  await testDb.supplier.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await testDb.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await cleanupTestUsers(PREFIX);
  await testDb.$disconnect();
});

describe("supplier catalogue sync", () => {
  it("imports an eligible listing as a compliance-review product with encrypted units", async () => {
    const item = listing({ codes: ["VELOUR-FEED-AAAA-0001"] });
    const result = await sync.syncSupplierFeed({
      supplierId,
      actorId,
      provider: stubProvider([item]),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.created).toBe(1);
    expect(result.summary.unitsImported).toBe(1);

    const product = await testDb.product.findUnique({
      where: { supplierId_externalId: { supplierId, externalId: item.externalId } },
      select: {
        id: true,
        status: true,
        priceMinor: true,
        delivery: true,
        units: { select: { payloadCiphertext: true, status: true } },
      },
    });
    expect(product).not.toBeNull();
    // Never auto-published: the storefront only shows ACTIVE products.
    expect(product!.status).toBe("COMPLIANCE_REVIEW");
    expect(product!.priceMinor).toBe(2000);
    expect(product!.delivery).toBe("INSTANT_CODE");
    expect(product!.units).toHaveLength(1);

    const stored = Buffer.from(product!.units[0].payloadCiphertext);
    expect(stored.toString("utf8")).not.toContain("VELOUR-FEED-AAAA-0001");
    expect(decryptDeliverable(stored, MASTER_KEY)).toBe("VELOUR-FEED-AAAA-0001");
  });

  it("refuses to activate a synced product until supplier evidence is verified", async () => {
    const item = listing();
    await sync.syncSupplierFeed({
      supplierId,
      actorId,
      provider: stubProvider([item]),
    });
    const product = await testDb.product.findUnique({
      where: { supplierId_externalId: { supplierId, externalId: item.externalId } },
      select: { id: true },
    });

    const blocked = await admin.setProductStatus({
      productId: product!.id,
      status: "ACTIVE",
      actorId,
    });
    expect(blocked.ok).toBe(false);
  });

  it("keeps account-credential listings out of the database entirely", async () => {
    const before = await testDb.product.count({ where: { supplierId } });
    const rejects = [
      listing({ kind: "account", title: `${PREFIX}Netflix Premium` }),
      listing({ title: `${PREFIX}Spotify Account 1 Year` }),
      listing({
        description: "Delivered as email:password with the 2FA recovery codes",
      }),
      listing({ transferable: false }),
      listing({ codes: ["victim@example.com:hunter2"] }),
    ];

    const result = await sync.syncSupplierFeed({
      supplierId,
      actorId,
      provider: stubProvider(rejects),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.created).toBe(0);
    expect(result.summary.rejected).toHaveLength(rejects.length);
    expect(await testDb.product.count({ where: { supplierId } })).toBe(before);
    // Reasons are operator-readable and never echo a payload.
    for (const rejection of result.summary.rejected) {
      expect(rejection.reason.length).toBeGreaterThan(0);
      expect(rejection.reason).not.toContain("hunter2");
    }
  });

  it("is idempotent: a second sync updates the product instead of duplicating it", async () => {
    const item = listing({ codes: ["VELOUR-FEED-BBBB-0002"] });
    const first = await sync.syncSupplierFeed({
      supplierId,
      actorId,
      provider: stubProvider([item]),
    });
    expect(first.ok && first.summary.created).toBe(1);

    const second = await sync.syncSupplierFeed({
      supplierId,
      actorId,
      // Same external id, new price, same code.
      provider: stubProvider([{ ...item, priceMinor: 2500 }]),
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.summary.created).toBe(0);
    expect(second.summary.updated).toBe(1);
    // The already-stocked code is skipped, not duplicated.
    expect(second.summary.unitsImported).toBe(0);
    expect(second.summary.unitsSkipped).toBe(1);

    const matches = await testDb.product.findMany({
      where: { supplierId, externalId: item.externalId },
      select: { priceMinor: true, units: { select: { id: true } } },
    });
    expect(matches).toHaveLength(1);
    expect(matches[0].priceMinor).toBe(2500);
    expect(matches[0].units).toHaveLength(1);
  });

  it("rejects a listing whose category matches nothing rather than mis-filing it", async () => {
    const result = await sync.syncSupplierFeed({
      supplierId,
      actorId,
      provider: stubProvider([listing({ category: "no-such-category" })]),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.created).toBe(0);
    expect(result.summary.rejected[0].reason).toMatch(/category/);
  });

  it("fails closed when the feed adapter is not configured", async () => {
    const disabled: SupplierFeedProvider = {
      id: "off",
      displayName: "Off",
      isEnabled: () => false,
      disabledReason: () => "SUPPLIER_API_TOKEN is not set.",
      fetchListings: async () => ({ ok: false, reason: "disabled" }),
      healthCheck: async () => ({ healthy: false, detail: "disabled" }),
    };
    const result = await sync.syncSupplierFeed({
      supplierId,
      actorId,
      provider: disabled,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/SUPPLIER_API_TOKEN/);
  });
});

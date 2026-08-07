import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import { cleanupTestUsers, testDb } from "./db";

/**
 * Affiliate reward integrity against real PostgreSQL:
 * - no reward for a click or signup alone;
 * - a reward only on the referred user's first qualifying purchase;
 * - at most one reward per referred user (idempotent);
 * - self-referral is not rewarded;
 * - maturation credits promotional balance exactly once;
 * - a reversed conversion is not credited.
 */
const PREFIX = "vtest-aff-";
const MASTER_KEY = Buffer.alloc(32, 5).toString("base64");

let affiliate: typeof import("@/lib/affiliate/service");
let checkoutMod: typeof import("@/lib/orders/checkout");
let ledger: typeof import("@/lib/wallet/ledger");
let categoryId = "";

async function makeUser(
  suffix: string,
  opts: { referredById?: string } = {},
): Promise<string> {
  const user = await testDb.user.create({
    data: {
      email: `${PREFIX}${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 7)}@velour.test`,
      username: `${PREFIX}${suffix}-${Math.random().toString(36).slice(2, 9)}`,
      passwordHash: "scrypt$1$1$1$AA==$AA==",
      emailVerifiedAt: new Date(),
      referredById: opts.referredById ?? null,
    },
    select: { id: true },
  });
  return user.id;
}

async function makeProduct(priceMinor: number) {
  const slug = `${PREFIX}prod-${Math.random().toString(36).slice(2, 9)}`;
  const product = await testDb.product.create({
    data: {
      slug,
      title: `Aff product ${slug}`,
      description: "d",
      deliverable: "code",
      categoryId,
      priceMinor,
      currency: "EUR",
      warranty: "w",
      status: "ACTIVE",
    },
    select: { slug: true, id: true },
  });
  const code = `AFF-${slug}`;
  await testDb.inventoryUnit.create({
    data: {
      productId: product.id,
      status: "AVAILABLE",
      payloadCiphertext: new Uint8Array(encryptDeliverable(code, MASTER_KEY)),
      payloadFingerprint: fingerprintDeliverable(code, MASTER_KEY),
    },
  });
  return product.slug;
}

async function fund(userId: string, amountMinor: number) {
  await ledger.creditTopUp({
    userId,
    amountMinor,
    idempotencyKey: `fund:${userId}:${Math.random()}`,
    description: "Test funding",
  });
}

beforeAll(async () => {
  process.env.DELIVERY_MASTER_KEY_B64 = MASTER_KEY;
  affiliate = await import("@/lib/affiliate/service");
  checkoutMod = await import("@/lib/orders/checkout");
  ledger = await import("@/lib/wallet/ledger");
  const category = await testDb.category.upsert({
    where: { slug: `${PREFIX}cat` },
    update: {},
    create: { slug: `${PREFIX}cat`, name: "AffCat", blurb: "b", sortOrder: 990 },
    select: { id: true },
  });
  categoryId = category.id;
});

afterAll(async () => {
  // Conversions/clicks/profiles cascade from users; clear catalog after.
  await cleanupTestUsers(PREFIX);
  await testDb.inventoryUnit.deleteMany({
    where: { product: { slug: { startsWith: PREFIX } } },
  });
  await testDb.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await testDb.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await testDb.$disconnect();
});

describe("referral code + clicks", () => {
  it("issues a stable code and records clicks (no reward from a click)", async () => {
    const affiliateUserId = await makeUser("aff1");
    const profile = await affiliate.getOrCreateAffiliateProfile(affiliateUserId);
    expect(profile.code).toMatch(/^[A-Z0-9]{8}$/);
    // Idempotent
    const again = await affiliate.getOrCreateAffiliateProfile(affiliateUserId);
    expect(again.code).toBe(profile.code);

    await affiliate.recordClick(profile.id);
    await affiliate.recordClick(profile.id);
    const summary = await affiliate.getAffiliateSummary(affiliateUserId);
    expect(summary.clicks).toBe(2);
    // No purchase yet → no earnings.
    expect(summary.pendingMinor).toBe(0);
    expect(summary.availableMinor).toBe(0);
  });
});

describe("conversion on first qualifying purchase", () => {
  it("rewards the referrer after the referred user's first purchase, held pending", async () => {
    const affiliateUserId = await makeUser("ref");
    const profile = await affiliate.getOrCreateAffiliateProfile(affiliateUserId);
    const buyerId = await makeUser("buyer", { referredById: profile.id });
    await fund(buyerId, 10000);
    const slug = await makeProduct(5000);

    const result = await checkoutMod.checkout({
      userId: buyerId,
      emailVerified: true,
      productSlug: slug,
      idempotencyKey: `aff:${buyerId}`,
    });
    expect(result.ok).toBe(true);

    const summary = await affiliate.getAffiliateSummary(affiliateUserId);
    // 10% of €50.00 = €5.00, held pending the refund window.
    expect(summary.pendingMinor).toBe(500);
    expect(summary.availableMinor).toBe(0);
    expect(summary.qualifiedConversions).toBe(1);

    // Referred friend received the welcome promo bonus immediately.
    const buyerBalance = await ledger.getWalletBalance(buyerId);
    expect(buyerBalance.promoMinor).toBe(affiliate.FRIEND_BONUS_MINOR);
  });

  it("does not create a second reward for the same referred user", async () => {
    const affiliateUserId = await makeUser("ref2");
    const profile = await affiliate.getOrCreateAffiliateProfile(affiliateUserId);
    const buyerId = await makeUser("buyer2", { referredById: profile.id });
    await fund(buyerId, 20000);
    const slug1 = await makeProduct(3000);
    const slug2 = await makeProduct(4000);

    await checkoutMod.checkout({
      userId: buyerId,
      emailVerified: true,
      productSlug: slug1,
      idempotencyKey: `aff2a:${buyerId}`,
    });
    await checkoutMod.checkout({
      userId: buyerId,
      emailVerified: true,
      productSlug: slug2,
      idempotencyKey: `aff2b:${buyerId}`,
    });

    const conversions = await testDb.affiliateConversion.count({
      where: { profileId: profile.id },
    });
    expect(conversions).toBe(1);
  });

  it("does not reward a self-referral", async () => {
    // A user whose referredById points at their OWN affiliate profile.
    const userId = await makeUser("selfa");
    const profile = await affiliate.getOrCreateAffiliateProfile(userId);
    await testDb.user.update({
      where: { id: userId },
      data: { referredById: profile.id },
    });
    await fund(userId, 10000);
    const slug = await makeProduct(2000);

    await checkoutMod.checkout({
      userId,
      emailVerified: true,
      productSlug: slug,
      idempotencyKey: `self:${userId}`,
    });

    const conversions = await testDb.affiliateConversion.count({
      where: { profileId: profile.id },
    });
    expect(conversions).toBe(0);
    const summary = await affiliate.getAffiliateSummary(userId);
    expect(summary.pendingMinor).toBe(0);
  });
});

describe("reward maturation", () => {
  it("credits promotional balance once when the window elapses", async () => {
    const affiliateUserId = await makeUser("mature");
    const profile = await affiliate.getOrCreateAffiliateProfile(affiliateUserId);
    const buyerId = await makeUser("buyer3", { referredById: profile.id });
    await fund(buyerId, 10000);
    const slug = await makeProduct(5000);
    await checkoutMod.checkout({
      userId: buyerId,
      emailVerified: true,
      productSlug: slug,
      idempotencyKey: `mature:${buyerId}`,
    });

    // Nothing is due yet (window in the future).
    expect(await affiliate.matureDueRewards(new Date())).toBe(0);

    // Advance past the window.
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const credited = await affiliate.matureDueRewards(future);
    expect(credited).toBeGreaterThanOrEqual(1);

    const balance = await ledger.getWalletBalance(affiliateUserId);
    expect(balance.promoMinor).toBe(500);

    // Running maturation again must not double-credit.
    await affiliate.matureDueRewards(future);
    const after = await ledger.getWalletBalance(affiliateUserId);
    expect(after.promoMinor).toBe(500);

    const summary = await affiliate.getAffiliateSummary(affiliateUserId);
    expect(summary.availableMinor).toBe(500);
    expect(summary.pendingMinor).toBe(0);
  });

  it("does not credit a reversed conversion", async () => {
    const affiliateUserId = await makeUser("rev");
    const profile = await affiliate.getOrCreateAffiliateProfile(affiliateUserId);
    const buyerId = await makeUser("buyer4", { referredById: profile.id });
    await fund(buyerId, 10000);
    const slug = await makeProduct(5000);
    const order = await checkoutMod.checkout({
      userId: buyerId,
      emailVerified: true,
      productSlug: slug,
      idempotencyKey: `rev:${buyerId}`,
    });
    if (!order.ok) throw new Error("checkout failed");

    await affiliate.reverseRewardForOrder(order.orderId);

    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await affiliate.matureDueRewards(future);
    const balance = await ledger.getWalletBalance(affiliateUserId);
    expect(balance.promoMinor).toBe(0);
  });
});

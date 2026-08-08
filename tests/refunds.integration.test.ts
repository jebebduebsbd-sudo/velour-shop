import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import { cleanupTestUsers, testDb } from "./db";

/**
 * Refund integrity against real PostgreSQL: compensating (never destructive)
 * ledger entries, idempotent requests, revealed-vs-unrevealed review routing,
 * balance restoration, restock rules, IDOR protection, and affiliate reward
 * reversal.
 */
const PREFIX = "vtest-refund-";
const MASTER_KEY = Buffer.alloc(32, 3).toString("base64");

let checkoutMod: typeof import("@/lib/orders/checkout");
let refunds: typeof import("@/lib/orders/refunds");
let orders: typeof import("@/lib/orders/orders");
let ledger: typeof import("@/lib/wallet/ledger");
let affiliate: typeof import("@/lib/affiliate/service");
let categoryId = "";

async function makeUser(suffix: string, opts: { referredById?: string } = {}) {
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

async function makeProduct(priceMinor: number, units = 3) {
  const slug = `${PREFIX}prod-${Math.random().toString(36).slice(2, 9)}`;
  const product = await testDb.product.create({
    data: {
      slug,
      title: `Refund product ${slug}`,
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
  for (let i = 0; i < units; i += 1) {
    const code = `RF-${slug}-${i}`;
    await testDb.inventoryUnit.create({
      data: {
        productId: product.id,
        status: "AVAILABLE",
        payloadCiphertext: new Uint8Array(encryptDeliverable(code, MASTER_KEY)),
        payloadFingerprint: fingerprintDeliverable(code, MASTER_KEY),
      },
    });
  }
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

async function buy(userId: string, slug: string, key: string) {
  const result = await checkoutMod.checkout({
    userId,
    emailVerified: true,
    productSlug: slug,
    idempotencyKey: key,
  });
  if (!result.ok) throw new Error(`checkout failed: ${JSON.stringify(result)}`);
  return result.orderId;
}

beforeAll(async () => {
  process.env.DELIVERY_MASTER_KEY_B64 = MASTER_KEY;
  checkoutMod = await import("@/lib/orders/checkout");
  refunds = await import("@/lib/orders/refunds");
  orders = await import("@/lib/orders/orders");
  ledger = await import("@/lib/wallet/ledger");
  affiliate = await import("@/lib/affiliate/service");
  const category = await testDb.category.upsert({
    where: { slug: `${PREFIX}cat` },
    update: {},
    create: { slug: `${PREFIX}cat`, name: "RefCat", blurb: "b", sortOrder: 980 },
    select: { id: true },
  });
  categoryId = category.id;
});

afterAll(async () => {
  await cleanupTestUsers(PREFIX);
  await testDb.inventoryUnit.deleteMany({
    where: { product: { slug: { startsWith: PREFIX } } },
  });
  await testDb.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await testDb.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await testDb.$disconnect();
});

describe("refund of an unrevealed order", () => {
  it("auto-processes, restores the exact balance, and restocks the unit", async () => {
    const userId = await makeUser("auto");
    await fund(userId, 10000);
    const slug = await makeProduct(2500, 1);
    const orderId = await buy(userId, slug, `auto:${userId}`);

    const before = await ledger.getWalletBalance(userId);
    expect(before.cashMinor).toBe(7500);

    const result = await refunds.requestRefund({
      userId,
      orderId,
      reason: "changed my mind",
    });
    expect(result).toMatchObject({ ok: true, autoProcessed: true, status: "PROCESSED" });

    const after = await ledger.getWalletBalance(userId);
    expect(after.cashMinor).toBe(10000); // fully restored

    const order = await testDb.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    expect(order!.status).toBe("REFUNDED");

    // Unrevealed unit is restocked.
    const available = await testDb.inventoryUnit.count({
      where: { product: { slug }, status: "AVAILABLE" },
    });
    expect(available).toBe(1);
  });

  it("keeps every ledger transaction summing to zero after the refund", async () => {
    const userId = await makeUser("zero");
    await fund(userId, 5000);
    const slug = await makeProduct(1500, 1);
    const orderId = await buy(userId, slug, `zero:${userId}`);
    await refunds.requestRefund({ userId, orderId, reason: "test" });

    const grouped = await testDb.ledgerPosting.groupBy({
      by: ["transactionId"],
      _sum: { amount: true },
    });
    for (const group of grouped) expect(group._sum.amount).toBe(0);
  });
});

describe("refund of a revealed order", () => {
  it("goes to manual review and does not credit until approved", async () => {
    const userId = await makeUser("manual");
    await fund(userId, 10000);
    const slug = await makeProduct(3000, 1);
    const orderId = await buy(userId, slug, `manual:${userId}`);

    // Reveal the deliverable (marks firstRevealedAt).
    const reveal = await orders.revealDeliverable({
      userId,
      orderId,
      reauthFresh: true,
    });
    expect(reveal.ok).toBe(true);

    const result = await refunds.requestRefund({
      userId,
      orderId,
      reason: "code invalid",
    });
    expect(result).toMatchObject({ ok: true, autoProcessed: false, status: "UNDER_REVIEW" });

    // Not credited yet.
    const mid = await ledger.getWalletBalance(userId);
    expect(mid.cashMinor).toBe(7000);

    // A staff approval processes it.
    const staffId = await makeUser("staff");
    const refund = await testDb.refund.findUnique({
      where: { orderId },
      select: { id: true },
    });
    await refunds.decideRefund({
      refundId: refund!.id,
      approve: true,
      decidedById: staffId,
    });

    const after = await ledger.getWalletBalance(userId);
    expect(after.cashMinor).toBe(10000);

    // Revealed code is NOT restocked.
    const available = await testDb.inventoryUnit.count({
      where: { product: { slug }, status: "AVAILABLE" },
    });
    expect(available).toBe(0);
  });
});

describe("refund idempotency and access", () => {
  it("is idempotent: repeated requests never double-credit", async () => {
    const userId = await makeUser("idem");
    await fund(userId, 10000);
    const slug = await makeProduct(2000, 1);
    const orderId = await buy(userId, slug, `idem:${userId}`);

    await Promise.all([
      refunds.requestRefund({ userId, orderId, reason: "a" }),
      refunds.requestRefund({ userId, orderId, reason: "b" }),
      refunds.requestRefund({ userId, orderId, reason: "c" }),
    ]);
    await refunds.requestRefund({ userId, orderId, reason: "d" });

    const refundCount = await testDb.refund.count({ where: { orderId } });
    expect(refundCount).toBe(1);
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(10000); // exactly one refund credit
  });

  it("does not let a user refund another user's order", async () => {
    const owner = await makeUser("owner");
    const attacker = await makeUser("attacker");
    await fund(owner, 5000);
    const slug = await makeProduct(1000, 1);
    const orderId = await buy(owner, slug, `owner:${owner}`);

    const result = await refunds.requestRefund({
      userId: attacker,
      orderId,
      reason: "not mine",
    });
    expect(result).toEqual({ ok: false, reason: "order_not_found" });
    const order = await testDb.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    expect(order!.status).toBe("FULFILLED");
  });
});

describe("refund reverses affiliate reward", () => {
  it("reverses a pending reward when the qualifying order is refunded", async () => {
    const affiliateUserId = await makeUser("aff");
    const profile = await affiliate.getOrCreateAffiliateProfile(affiliateUserId);
    const buyerId = await makeUser("buyer", { referredById: profile.id });
    await fund(buyerId, 10000);
    const slug = await makeProduct(5000, 1);
    const orderId = await buy(buyerId, slug, `affbuy:${buyerId}`);

    // Reward is pending.
    let summary = await affiliate.getAffiliateSummary(affiliateUserId);
    expect(summary.pendingMinor).toBe(500);

    await refunds.requestRefund({ userId: buyerId, orderId, reason: "refund" });

    summary = await affiliate.getAffiliateSummary(affiliateUserId);
    expect(summary.pendingMinor).toBe(0);
    const conversion = await testDb.affiliateConversion.findUnique({
      where: { orderId },
      select: { status: true },
    });
    expect(conversion!.status).toBe("REVERSED");
  });

  it("claws back an already-credited reward on refund", async () => {
    const affiliateUserId = await makeUser("aff2");
    const profile = await affiliate.getOrCreateAffiliateProfile(affiliateUserId);
    const buyerId = await makeUser("buyer2", { referredById: profile.id });
    await fund(buyerId, 10000);
    const slug = await makeProduct(5000, 1);
    const orderId = await buy(buyerId, slug, `affbuy2:${buyerId}`);

    // Mature the reward so it's credited as promo.
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await affiliate.matureDueRewards(future);
    let balance = await ledger.getWalletBalance(affiliateUserId);
    expect(balance.promoMinor).toBe(500);

    // Refund the qualifying order → reward clawed back.
    await refunds.requestRefund({ userId: buyerId, orderId, reason: "refund" });
    balance = await ledger.getWalletBalance(affiliateUserId);
    expect(balance.promoMinor).toBe(0);
  });
});

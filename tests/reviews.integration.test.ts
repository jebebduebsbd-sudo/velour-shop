import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import { cleanupTestUsers, testDb } from "./db";

/**
 * Verified Vouches: reviews are gated to a fulfilled order owned by the
 * reviewer, one per order, and only published reviews appear publicly.
 */
const PREFIX = "vtest-review-";
const MASTER_KEY = Buffer.alloc(32, 8).toString("base64");

let checkoutMod: typeof import("@/lib/orders/checkout");
let reviews: typeof import("@/lib/reviews/service");
let ledger: typeof import("@/lib/wallet/ledger");
let categoryId = "";

async function makeUser(suffix: string) {
  const user = await testDb.user.create({
    data: {
      email: `${PREFIX}${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 7)}@velour.test`,
      username: `${PREFIX}${suffix}-${Math.random().toString(36).slice(2, 9)}`,
      passwordHash: "scrypt$1$1$1$AA==$AA==",
      emailVerifiedAt: new Date(),
    },
    select: { id: true },
  });
  return user.id;
}

async function makeProductAndBuy(userId: string, key: string) {
  const slug = `${PREFIX}prod-${Math.random().toString(36).slice(2, 9)}`;
  const product = await testDb.product.create({
    data: {
      slug,
      title: `Review product ${slug}`,
      description: "d",
      deliverable: "code",
      categoryId,
      priceMinor: 1000,
      currency: "EUR",
      warranty: "w",
      status: "ACTIVE",
    },
    select: { id: true, slug: true },
  });
  await testDb.inventoryUnit.create({
    data: {
      productId: product.id,
      status: "AVAILABLE",
      payloadCiphertext: new Uint8Array(encryptDeliverable(`RV-${slug}`, MASTER_KEY)),
      payloadFingerprint: fingerprintDeliverable(`RV-${slug}`, MASTER_KEY),
    },
  });
  await ledger.creditTopUp({
    userId,
    amountMinor: 5000,
    idempotencyKey: `fund:${userId}:${Math.random()}`,
    description: "fund",
  });
  const result = await checkoutMod.checkout({
    userId,
    emailVerified: true,
    productSlug: product.slug,
    idempotencyKey: key,
  });
  if (!result.ok) throw new Error("checkout failed");
  return { orderId: result.orderId, productId: product.id };
}

beforeAll(async () => {
  process.env.DELIVERY_MASTER_KEY_B64 = MASTER_KEY;
  checkoutMod = await import("@/lib/orders/checkout");
  reviews = await import("@/lib/reviews/service");
  ledger = await import("@/lib/wallet/ledger");
  const category = await testDb.category.upsert({
    where: { slug: `${PREFIX}cat` },
    update: {},
    create: { slug: `${PREFIX}cat`, name: "RevCat", blurb: "b", sortOrder: 950 },
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

describe("submitting reviews", () => {
  it("lets the buyer of a fulfilled order review once, and shows the average", async () => {
    const userId = await makeUser("buyer");
    const { orderId, productId } = await makeProductAndBuy(userId, `r:${userId}`);

    const ok = await reviews.submitReview({
      userId,
      orderId,
      rating: 5,
      body: "Worked instantly, great.",
    });
    expect(ok.ok).toBe(true);

    // One per order.
    const dupe = await reviews.submitReview({
      userId,
      orderId,
      rating: 1,
      body: "changed my mind",
    });
    expect(dupe).toEqual({ ok: false, reason: "already_reviewed" });

    const product = await reviews.getProductReviews(productId);
    expect(product.count).toBe(1);
    expect(product.average).toBe(5);
    // Author is minimized (not the full username).
    expect(product.reviews[0]!.author).not.toContain("@");
  });

  it("rejects a review from a non-owner (no IDOR, no order-less review)", async () => {
    const owner = await makeUser("owner");
    const stranger = await makeUser("stranger");
    const { orderId } = await makeProductAndBuy(owner, `r2:${owner}`);

    const result = await reviews.submitReview({
      userId: stranger,
      orderId,
      rating: 5,
      body: "not my order",
    });
    expect(result).toEqual({ ok: false, reason: "order_not_found" });
  });

  it("clamps the rating to 1..5", async () => {
    const userId = await makeUser("clamp");
    const { orderId, productId } = await makeProductAndBuy(userId, `r3:${userId}`);
    await reviews.submitReview({ userId, orderId, rating: 99, body: "great!!" });
    const product = await reviews.getProductReviews(productId);
    expect(product.reviews[0]!.rating).toBe(5);
  });

  it("hides moderated reviews from the public average and list", async () => {
    const userId = await makeUser("mod");
    const { orderId, productId } = await makeProductAndBuy(userId, `r4:${userId}`);
    const created = await reviews.submitReview({
      userId,
      orderId,
      rating: 4,
      body: "good but personal data leaked",
    });
    if (!created.ok) throw new Error("submit failed");

    await reviews.setReviewStatus({ reviewId: created.reviewId, status: "HIDDEN" });
    const product = await reviews.getProductReviews(productId);
    expect(product.count).toBe(0);
    expect(product.average).toBeNull();
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import { cleanupTestUsers, testDb } from "./db";

/**
 * Partial refunds and admin wallet adjustments — both must post balanced
 * ledger entries (never mutate balances) and never exceed/underflow.
 */
const PREFIX = "vtest-partadj-";
const MASTER_KEY = Buffer.alloc(32, 11).toString("base64");

let checkoutMod: typeof import("@/lib/orders/checkout");
let refunds: typeof import("@/lib/orders/refunds");
let ordersMod: typeof import("@/lib/orders/orders");
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

async function makeProductAndBuy(userId: string, priceMinor: number, key: string) {
  const slug = `${PREFIX}prod-${Math.random().toString(36).slice(2, 9)}`;
  const product = await testDb.product.create({
    data: {
      slug,
      title: `Part product ${slug}`,
      description: "d",
      deliverable: "code",
      categoryId,
      priceMinor,
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
      payloadCiphertext: new Uint8Array(encryptDeliverable(`PA-${slug}`, MASTER_KEY)),
      payloadFingerprint: fingerprintDeliverable(`PA-${slug}`, MASTER_KEY),
    },
  });
  await ledger.creditTopUp({
    userId,
    amountMinor: 20000,
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
  return result.orderId;
}

beforeAll(async () => {
  process.env.DELIVERY_MASTER_KEY_B64 = MASTER_KEY;
  checkoutMod = await import("@/lib/orders/checkout");
  refunds = await import("@/lib/orders/refunds");
  ordersMod = await import("@/lib/orders/orders");
  ledger = await import("@/lib/wallet/ledger");
  const category = await testDb.category.upsert({
    where: { slug: `${PREFIX}cat` },
    update: {},
    create: { slug: `${PREFIX}cat`, name: "PartCat", blurb: "b", sortOrder: 930 },
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

describe("partial refunds", () => {
  it("refunds a partial amount, keeps the order fulfilled, and stays zero-sum", async () => {
    const userId = await makeUser("partial");
    const orderId = await makeProductAndBuy(userId, 5000, `pr:${userId}`);
    const staff = await makeUser("staff");

    // Reveal the code so the refund routes to manual review (not auto-processed),
    // letting the admin set a partial amount.
    const reveal = await ordersMod.revealDeliverable({
      userId,
      orderId,
      reauthFresh: true,
    });
    expect(reveal.ok).toBe(true);

    const requested = await refunds.requestRefund({
      userId,
      orderId,
      reason: "partial issue",
    });
    expect(requested).toMatchObject({ ok: true, autoProcessed: false });

    // Balance after purchase: 20000 - 5000 = 15000 (no auto-refund).
    let balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(15000);

    // Admin approves a €20.00 partial refund on a €50.00 order.
    const refund = await testDb.refund.findUnique({
      where: { orderId },
      select: { id: true },
    });
    await refunds.decideRefund({
      refundId: refund!.id,
      approve: true,
      decidedById: staff,
      amountMinor: 2000,
    });

    balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(17000); // 15000 + 2000

    const order = await testDb.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    // Partial refund keeps the order FULFILLED.
    expect(order!.status).toBe("FULFILLED");

    // Ledger integrity.
    const grouped = await testDb.ledgerPosting.groupBy({
      by: ["transactionId"],
      _sum: { amount: true },
    });
    for (const g of grouped) expect(g._sum.amount).toBe(0);
  });

  it("caps a refund at the amount paid", async () => {
    const userId = await makeUser("cap");
    const orderId = await makeProductAndBuy(userId, 3000, `cap:${userId}`);
    const staff = await makeUser("staff2");
    await ordersMod.revealDeliverable({ userId, orderId, reauthFresh: true });
    const requested = await refunds.requestRefund({ userId, orderId, reason: "x" });
    if (!requested.ok) throw new Error("request failed");
    const refund = await testDb.refund.findUnique({
      where: { orderId },
      select: { id: true },
    });
    // Ask for way more than paid; must cap at 3000.
    await refunds.decideRefund({
      refundId: refund!.id,
      approve: true,
      decidedById: staff,
      amountMinor: 999999,
    });
    const stored = await testDb.refund.findUnique({
      where: { orderId },
      select: { amountMinor: true, status: true },
    });
    expect(stored!.amountMinor).toBe(3000);
    expect(stored!.status).toBe("PROCESSED");
  });
});

describe("admin wallet adjustments", () => {
  it("credits and debits via balanced ledger entries", async () => {
    const userId = await makeUser("adj");
    await ledger.creditTopUp({
      userId,
      amountMinor: 1000,
      idempotencyKey: `fund:${userId}`,
      description: "fund",
    });

    const credit = await ledger.postAdminAdjustment({
      userId,
      amountMinor: 500,
      reason: "goodwill",
    });
    expect(credit.ok).toBe(true);
    let balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(1500);

    const debit = await ledger.postAdminAdjustment({
      userId,
      amountMinor: -300,
      reason: "correction",
    });
    expect(debit.ok).toBe(true);
    balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(1200);
  });

  it("refuses a debit that would make the balance negative", async () => {
    const userId = await makeUser("neg");
    await ledger.creditTopUp({
      userId,
      amountMinor: 200,
      idempotencyKey: `fund:${userId}`,
      description: "fund",
    });
    const result = await ledger.postAdminAdjustment({
      userId,
      amountMinor: -500,
      reason: "too much",
    });
    expect(result.ok).toBe(false);
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(200);
  });

  it("rejects a zero adjustment", async () => {
    const userId = await makeUser("zero");
    const result = await ledger.postAdminAdjustment({
      userId,
      amountMinor: 0,
      reason: "noop",
    });
    expect(result.ok).toBe(false);
  });
});

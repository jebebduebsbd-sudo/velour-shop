import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import { cleanupTestUsers, testDb } from "./db";

/**
 * Wallet-only checkout: oversell protection, idempotency, balance enforcement,
 * and cross-user isolation — all against real PostgreSQL so the row-locking
 * behavior is genuinely exercised.
 */
const PREFIX = "vtest-checkout-";
const MASTER_KEY =
  process.env.DELIVERY_MASTER_KEY_B64 ??
  Buffer.alloc(32, 7).toString("base64");

let checkoutMod: typeof import("@/lib/orders/checkout");
let ledger: typeof import("@/lib/wallet/ledger");
let ordersMod: typeof import("@/lib/orders/orders");

let categoryId = "";

async function makeUser(suffix: string, opts: { verified?: boolean } = {}) {
  const user = await testDb.user.create({
    data: {
      email: `${PREFIX}${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 7)}@velour.test`,
      username: `${PREFIX}${suffix}-${Math.random().toString(36).slice(2, 9)}`,
      passwordHash: "scrypt$1$1$1$AA==$AA==",
      emailVerifiedAt: opts.verified === false ? null : new Date(),
    },
    select: { id: true },
  });
  return user.id;
}

async function makeProduct(opts: {
  priceMinor: number;
  units: number;
  slug?: string;
}) {
  const slug = opts.slug ?? `${PREFIX}prod-${Math.random().toString(36).slice(2, 9)}`;
  const product = await testDb.product.create({
    data: {
      slug,
      title: `Test product ${slug}`,
      description: "d",
      deliverable: "One test code",
      categoryId,
      priceMinor: opts.priceMinor,
      currency: "EUR",
      warranty: "Test warranty",
      status: "ACTIVE",
    },
    select: { id: true, slug: true },
  });
  for (let i = 0; i < opts.units; i += 1) {
    const code = `TEST-${slug}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    await testDb.inventoryUnit.create({
      data: {
        productId: product.id,
        status: "AVAILABLE",
        payloadCiphertext: new Uint8Array(encryptDeliverable(code, MASTER_KEY)),
        payloadFingerprint: fingerprintDeliverable(code, MASTER_KEY),
      },
    });
  }
  return product;
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
  checkoutMod = await import("@/lib/orders/checkout");
  ledger = await import("@/lib/wallet/ledger");
  ordersMod = await import("@/lib/orders/orders");
  const category = await testDb.category.upsert({
    where: { slug: `${PREFIX}cat` },
    update: {},
    create: { slug: `${PREFIX}cat`, name: "TestCat", blurb: "b", sortOrder: 999 },
    select: { id: true },
  });
  categoryId = category.id;
});

afterAll(async () => {
  // Users first (cascades their orders), then units, then products/category.
  await cleanupTestUsers(PREFIX);
  await testDb.inventoryUnit.deleteMany({
    where: { product: { slug: { startsWith: PREFIX } } },
  });
  await testDb.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await testDb.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await testDb.$disconnect();
});

describe("oversell protection", () => {
  it("sells exactly one unit under 100 concurrent purchase attempts", async () => {
    const product = await makeProduct({ priceMinor: 100, units: 1 });
    // 100 separate, well-funded buyers race for the single unit.
    const buyers = await Promise.all(
      Array.from({ length: 100 }, (_, i) => makeUser(`race${i}`)),
    );
    await Promise.all(buyers.map((id) => fund(id, 1000)));

    const results = await Promise.all(
      buyers.map((userId) =>
        checkoutMod.checkout({
          userId,
          emailVerified: true,
          productSlug: product.slug,
          idempotencyKey: `race:${userId}:${product.slug}`,
        }),
      ),
    );

    const successes = results.filter((r) => r.ok);
    expect(successes).toHaveLength(1);

    const soldCount = await testDb.inventoryUnit.count({
      where: { productId: product.id, status: "SOLD" },
    });
    expect(soldCount).toBe(1);
    const availableCount = await testDb.inventoryUnit.count({
      where: { productId: product.id, status: "AVAILABLE" },
    });
    expect(availableCount).toBe(0);
  });
});

describe("idempotency", () => {
  it("creates one order and one debit for a repeated idempotency key", async () => {
    const userId = await makeUser("idem");
    await fund(userId, 10000);
    const product = await makeProduct({ priceMinor: 2500, units: 5 });
    const key = `idem:${userId}:${product.slug}`;

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        checkoutMod.checkout({
          userId,
          emailVerified: true,
          productSlug: product.slug,
          idempotencyKey: key,
        }),
      ),
    );
    const okResults = results.filter(
      (r): r is { ok: true; orderId: string; reused: boolean } => r.ok,
    );
    expect(okResults.length).toBe(8);
    const uniqueOrders = new Set(okResults.map((r) => r.orderId));
    expect(uniqueOrders.size).toBe(1);

    const orderCount = await testDb.order.count({
      where: { idempotencyKey: key },
    });
    expect(orderCount).toBe(1);

    // Exactly one unit consumed and balance debited exactly once.
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(10000 - 2500);
  });
});

describe("balance enforcement", () => {
  it("rejects a purchase when the wallet balance is insufficient", async () => {
    const userId = await makeUser("poor");
    await fund(userId, 100); // only €1.00
    const product = await makeProduct({ priceMinor: 5000, units: 3 });

    const result = await checkoutMod.checkout({
      userId,
      emailVerified: true,
      productSlug: product.slug,
      idempotencyKey: `poor:${userId}`,
    });
    expect(result).toEqual({ ok: false, reason: "insufficient_balance" });

    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(100); // unchanged
    const sold = await testDb.inventoryUnit.count({
      where: { productId: product.id, status: "SOLD" },
    });
    expect(sold).toBe(0);
  });

  it("never lets a wallet go negative even with concurrent buys", async () => {
    const userId = await makeUser("exact");
    await fund(userId, 5000); // enough for exactly two €25 items
    const product = await makeProduct({ priceMinor: 2500, units: 10 });

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        checkoutMod.checkout({
          userId,
          emailVerified: true,
          productSlug: product.slug,
          idempotencyKey: `exact:${userId}:${i}`,
        }),
      ),
    );
    const successes = results.filter((r) => r.ok);
    expect(successes).toHaveLength(2); // only two affordable

    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(0);
    expect(balance.cashMinor).toBeGreaterThanOrEqual(0);
  });
});

describe("email verification gate", () => {
  it("blocks checkout for an unverified email", async () => {
    const userId = await makeUser("unverified", { verified: false });
    await fund(userId, 10000);
    const product = await makeProduct({ priceMinor: 1000, units: 2 });
    const result = await checkoutMod.checkout({
      userId,
      emailVerified: false,
      productSlug: product.slug,
      idempotencyKey: `unv:${userId}`,
    });
    expect(result).toEqual({ ok: false, reason: "email_unverified" });
  });
});

describe("order access and delivery gating", () => {
  it("does not let user B read user A's order (no IDOR)", async () => {
    const userA = await makeUser("owner");
    const userB = await makeUser("other");
    await fund(userA, 5000);
    const product = await makeProduct({ priceMinor: 1000, units: 2 });
    const result = await checkoutMod.checkout({
      userId: userA,
      emailVerified: true,
      productSlug: product.slug,
      idempotencyKey: `idor:${userA}`,
    });
    if (!result.ok) throw new Error("checkout failed");

    expect(await ordersMod.getUserOrder(userA, result.orderId)).not.toBeNull();
    // User B requesting A's order id must get nothing.
    expect(await ordersMod.getUserOrder(userB, result.orderId)).toBeNull();

    const revealByB = await ordersMod.revealDeliverable({
      userId: userB,
      orderId: result.orderId,
      reauthFresh: true,
    });
    expect(revealByB).toEqual({ ok: false, reason: "not_found" });
  });

  it("requires step-up reauth before revealing, then returns the code", async () => {
    const userId = await makeUser("reveal");
    await fund(userId, 5000);
    const product = await makeProduct({ priceMinor: 1000, units: 2 });
    const result = await checkoutMod.checkout({
      userId,
      emailVerified: true,
      productSlug: product.slug,
      idempotencyKey: `reveal:${userId}`,
    });
    if (!result.ok) throw new Error("checkout failed");

    const withoutReauth = await ordersMod.revealDeliverable({
      userId,
      orderId: result.orderId,
      reauthFresh: false,
    });
    expect(withoutReauth).toEqual({ ok: false, reason: "reauth_required" });

    const withReauth = await ordersMod.revealDeliverable({
      userId,
      orderId: result.orderId,
      reauthFresh: true,
    });
    expect(withReauth.ok).toBe(true);
    if (withReauth.ok) {
      expect(withReauth.value).toContain("TEST-");
    }
  });
});

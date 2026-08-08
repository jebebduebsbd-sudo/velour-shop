import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import { cleanupTestUsers, testDb } from "./db";

/**
 * Recent-purchase notifications must be real (from fulfilled orders) and
 * privacy-safe (no username, email, amount, or order id in the output).
 */
const PREFIX = "vtest-recent-";
const MASTER_KEY = Buffer.alloc(32, 2).toString("base64");
const UNIQUE_USERNAME = `${PREFIX}shopper-SECRETNAME`;
const UNIQUE_EMAIL = `${PREFIX}secret-email@velour.test`;

let checkoutMod: typeof import("@/lib/orders/checkout");
let ledger: typeof import("@/lib/wallet/ledger");
let recent: typeof import("@/lib/trust/recent-purchases");
let categoryId = "";

beforeAll(async () => {
  process.env.DELIVERY_MASTER_KEY_B64 = MASTER_KEY;
  checkoutMod = await import("@/lib/orders/checkout");
  ledger = await import("@/lib/wallet/ledger");
  recent = await import("@/lib/trust/recent-purchases");
  const category = await testDb.category.upsert({
    where: { slug: `${PREFIX}cat` },
    update: {},
    create: { slug: `${PREFIX}cat`, name: "RecentCat", blurb: "b", sortOrder: 940 },
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

describe("recent public purchases", () => {
  it("reflects a real fulfilled order without leaking PII", async () => {
    const user = await testDb.user.create({
      data: {
        email: UNIQUE_EMAIL,
        username: UNIQUE_USERNAME,
        passwordHash: "scrypt$1$1$1$AA==$AA==",
        emailVerifiedAt: new Date(),
      },
      select: { id: true },
    });
    const product = await testDb.product.create({
      data: {
        slug: `${PREFIX}prod`,
        title: "Recent Test Voucher",
        description: "d",
        deliverable: "code",
        categoryId,
        priceMinor: 1234,
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
        payloadCiphertext: new Uint8Array(encryptDeliverable("RC-1", MASTER_KEY)),
        payloadFingerprint: fingerprintDeliverable("RC-1", MASTER_KEY),
      },
    });
    await ledger.creditTopUp({
      userId: user.id,
      amountMinor: 5000,
      idempotencyKey: `fund:${user.id}`,
      description: "fund",
    });
    const order = await checkoutMod.checkout({
      userId: user.id,
      emailVerified: true,
      productSlug: product.slug,
      idempotencyKey: `recent:${user.id}`,
    });
    if (!order.ok) throw new Error("checkout failed");

    const items = await recent.getRecentPublicPurchases(20);
    const mine = items.find((i) => i.productTitle === "Recent Test Voucher");
    expect(mine).toBeTruthy();

    // Privacy: no username, email, amount, or full order id anywhere in output.
    const serialized = JSON.stringify(items);
    expect(serialized).not.toContain("SECRETNAME");
    expect(serialized).not.toContain(UNIQUE_EMAIL);
    expect(serialized).not.toContain("12.34");
    expect(serialized).not.toContain("1234");
    if (order.ok) expect(serialized).not.toContain(order.orderId);
  });
});

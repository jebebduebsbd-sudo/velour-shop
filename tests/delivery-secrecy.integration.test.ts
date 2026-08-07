import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import { cleanupTestUsers, testDb } from "./db";

/**
 * The deliverable value must never be written to the audit trail. This buys a
 * unit whose plaintext is a known unique marker, reveals it, then asserts the
 * marker is absent from every audit event recorded for the user.
 */
const PREFIX = "vtest-secrecy-";
const MASTER_KEY =
  process.env.DELIVERY_MASTER_KEY_B64 ??
  Buffer.alloc(32, 9).toString("base64");
const MARKER = "SUPERSECRET-DELIVERABLE-MARKER-XYZ";

let checkoutMod: typeof import("@/lib/orders/checkout");
let ledger: typeof import("@/lib/wallet/ledger");
let ordersMod: typeof import("@/lib/orders/orders");

beforeAll(async () => {
  process.env.DELIVERY_MASTER_KEY_B64 = MASTER_KEY;
  checkoutMod = await import("@/lib/orders/checkout");
  ledger = await import("@/lib/wallet/ledger");
  ordersMod = await import("@/lib/orders/orders");
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

describe("deliverable secrecy", () => {
  it("is absent from all audit events after a reveal", async () => {
    const category = await testDb.category.upsert({
      where: { slug: `${PREFIX}cat` },
      update: {},
      create: { slug: `${PREFIX}cat`, name: "SecrecyCat", blurb: "b", sortOrder: 998 },
      select: { id: true },
    });
    const product = await testDb.product.create({
      data: {
        slug: `${PREFIX}prod-${Math.random().toString(36).slice(2, 8)}`,
        title: "Secrecy product",
        description: "d",
        deliverable: "One test code",
        categoryId: category.id,
        priceMinor: 500,
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
        payloadCiphertext: new Uint8Array(encryptDeliverable(MARKER, MASTER_KEY)),
        payloadFingerprint: fingerprintDeliverable(MARKER, MASTER_KEY),
      },
    });

    const user = await testDb.user.create({
      data: {
        email: `${PREFIX}${Date.now()}@velour.test`,
        username: `${PREFIX}${Math.random().toString(36).slice(2, 9)}`,
        passwordHash: "scrypt$1$1$1$AA==$AA==",
        emailVerifiedAt: new Date(),
      },
      select: { id: true },
    });
    await ledger.creditTopUp({
      userId: user.id,
      amountMinor: 5000,
      idempotencyKey: `fund:${user.id}`,
      description: "Test funding",
    });

    const result = await checkoutMod.checkout({
      userId: user.id,
      emailVerified: true,
      productSlug: product.slug,
      idempotencyKey: `secrecy:${user.id}`,
    });
    if (!result.ok) throw new Error("checkout failed");

    const reveal = await ordersMod.revealDeliverable({
      userId: user.id,
      orderId: result.orderId,
      reauthFresh: true,
    });
    expect(reveal.ok).toBe(true);
    if (reveal.ok) expect(reveal.value).toBe(MARKER);

    // The marker must not appear anywhere in this user's audit events.
    const events = await testDb.auditEvent.findMany({
      where: { userId: user.id },
      select: { action: true, metadata: true, targetType: true, targetId: true },
    });
    expect(events.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(MARKER);
    // A reveal event was recorded (the fact of the reveal, not the value).
    expect(events.some((e) => e.action === "order.delivery.revealed")).toBe(true);
  });
});

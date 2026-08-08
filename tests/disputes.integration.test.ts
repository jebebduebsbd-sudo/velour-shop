import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import { cleanupTestUsers, testDb } from "./db";

/**
 * Dispute flow: open (one per order), owner-only messaging, staff-only
 * transitions, and cross-user access protection.
 */
const PREFIX = "vtest-dispute-";
const MASTER_KEY = Buffer.alloc(32, 4).toString("base64");

let checkoutMod: typeof import("@/lib/orders/checkout");
let disputes: typeof import("@/lib/orders/disputes");
let ledger: typeof import("@/lib/wallet/ledger");
let categoryId = "";

async function makeUser(suffix: string, role: "CUSTOMER" | "SUPPORT" = "CUSTOMER") {
  const user = await testDb.user.create({
    data: {
      email: `${PREFIX}${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 7)}@velour.test`,
      username: `${PREFIX}${suffix}-${Math.random().toString(36).slice(2, 9)}`,
      passwordHash: "scrypt$1$1$1$AA==$AA==",
      emailVerifiedAt: new Date(),
      role,
    },
    select: { id: true, role: true },
  });
  return user;
}

async function makeProductAndBuy(userId: string, key: string) {
  const slug = `${PREFIX}prod-${Math.random().toString(36).slice(2, 9)}`;
  const product = await testDb.product.create({
    data: {
      slug,
      title: `Dispute product ${slug}`,
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
  const code = `DP-${slug}`;
  await testDb.inventoryUnit.create({
    data: {
      productId: product.id,
      status: "AVAILABLE",
      payloadCiphertext: new Uint8Array(encryptDeliverable(code, MASTER_KEY)),
      payloadFingerprint: fingerprintDeliverable(code, MASTER_KEY),
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
  return result.orderId;
}

beforeAll(async () => {
  process.env.DELIVERY_MASTER_KEY_B64 = MASTER_KEY;
  checkoutMod = await import("@/lib/orders/checkout");
  disputes = await import("@/lib/orders/disputes");
  ledger = await import("@/lib/wallet/ledger");
  const category = await testDb.category.upsert({
    where: { slug: `${PREFIX}cat` },
    update: {},
    create: { slug: `${PREFIX}cat`, name: "DisCat", blurb: "b", sortOrder: 970 },
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

describe("opening disputes", () => {
  it("opens one dispute per order (idempotent) with the first message", async () => {
    const user = await makeUser("opener");
    const orderId = await makeProductAndBuy(user.id, `d:${user.id}`);

    const first = await disputes.openDispute({
      userId: user.id,
      orderId,
      reason: "Not working",
      message: "The code didn't work",
    });
    expect(first.ok).toBe(true);

    const second = await disputes.openDispute({
      userId: user.id,
      orderId,
      reason: "again",
      message: "second attempt",
    });
    expect(second).toMatchObject({ ok: true, reused: true });

    const count = await testDb.dispute.count({ where: { orderId } });
    expect(count).toBe(1);
  });

  it("does not open a dispute on someone else's order", async () => {
    const owner = await makeUser("owner");
    const attacker = await makeUser("attacker");
    const orderId = await makeProductAndBuy(owner.id, `d2:${owner.id}`);
    const result = await disputes.openDispute({
      userId: attacker.id,
      orderId,
      reason: "x",
      message: "not mine",
    });
    expect(result).toEqual({ ok: false, reason: "order_not_found" });
  });
});

describe("messaging and access", () => {
  it("blocks a non-owner customer from messaging, allows the owner and staff", async () => {
    const owner = await makeUser("mowner");
    const stranger = await makeUser("stranger");
    const staff = await makeUser("staff", "SUPPORT");
    const orderId = await makeProductAndBuy(owner.id, `d3:${owner.id}`);
    const opened = await disputes.openDispute({
      userId: owner.id,
      orderId,
      reason: "issue",
      message: "hello",
    });
    if (!opened.ok) throw new Error("open failed");

    const stranger_attempt = await disputes.addDisputeMessage({
      disputeId: opened.disputeId,
      authorId: stranger.id,
      authorRole: "CUSTOMER",
      body: "let me in",
    });
    expect(stranger_attempt.ok).toBe(false);

    const owner_msg = await disputes.addDisputeMessage({
      disputeId: opened.disputeId,
      authorId: owner.id,
      authorRole: "CUSTOMER",
      body: "any update?",
    });
    expect(owner_msg.ok).toBe(true);

    const staff_msg = await disputes.addDisputeMessage({
      disputeId: opened.disputeId,
      authorId: staff.id,
      authorRole: "SUPPORT",
      body: "looking into it",
    });
    expect(staff_msg.ok).toBe(true);

    // Stranger cannot even load the dispute.
    expect(await disputes.getUserDispute(stranger.id, opened.disputeId)).toBeNull();
    const forOwner = await disputes.getUserDispute(owner.id, opened.disputeId);
    expect(forOwner!.messages.length).toBe(3);
  });
});

describe("staff transitions", () => {
  it("lets staff resolve and blocks customers from transitioning", async () => {
    const owner = await makeUser("towner");
    const staff = await makeUser("tstaff", "SUPPORT");
    const orderId = await makeProductAndBuy(owner.id, `d4:${owner.id}`);
    const opened = await disputes.openDispute({
      userId: owner.id,
      orderId,
      reason: "issue",
      message: "hello",
    });
    if (!opened.ok) throw new Error("open failed");

    const byCustomer = await disputes.transitionDispute({
      disputeId: opened.disputeId,
      status: "RESOLVED_CUSTOMER",
      actorId: owner.id,
      actorRole: "CUSTOMER",
    });
    expect(byCustomer.ok).toBe(false);

    const byStaff = await disputes.transitionDispute({
      disputeId: opened.disputeId,
      status: "RESOLVED_CUSTOMER",
      actorId: staff.id,
      actorRole: "SUPPORT",
    });
    expect(byStaff.ok).toBe(true);

    const dispute = await testDb.dispute.findUnique({
      where: { id: opened.disputeId },
      select: { status: true },
    });
    expect(dispute!.status).toBe("RESOLVED_CUSTOMER");
  });
});

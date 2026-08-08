import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cleanupTestUsers, testDb } from "./db";

/**
 * Admin operations against real PostgreSQL: the compliance gate on product
 * activation, policy-checked encrypted inventory import, and user role/lock.
 */
const PREFIX = "vtest-admin-";
const MASTER_KEY = Buffer.alloc(32, 6).toString("base64");

let admin: typeof import("@/lib/admin/service");
let categoryId = "";

async function makeUser(suffix: string) {
  const user = await testDb.user.create({
    data: {
      email: `${PREFIX}${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 7)}@velour.test`,
      username: `${PREFIX}${suffix}-${Math.random().toString(36).slice(2, 9)}`,
      passwordHash: "scrypt$1$1$1$AA==$AA==",
    },
    select: { id: true },
  });
  return user.id;
}

async function makeProduct(status: "DRAFT" | "COMPLIANCE_REVIEW" = "COMPLIANCE_REVIEW") {
  const slug = `${PREFIX}prod-${Math.random().toString(36).slice(2, 9)}`;
  return testDb.product.create({
    data: {
      slug,
      title: `Admin product ${slug}`,
      description: "d",
      deliverable: "code",
      categoryId,
      priceMinor: 1000,
      currency: "EUR",
      warranty: "w",
      status,
    },
    select: { id: true, slug: true },
  });
}

beforeAll(async () => {
  process.env.DELIVERY_MASTER_KEY_B64 = MASTER_KEY;
  admin = await import("@/lib/admin/service");
  const category = await testDb.category.upsert({
    where: { slug: `${PREFIX}cat` },
    update: {},
    create: { slug: `${PREFIX}cat`, name: "AdminCat", blurb: "b", sortOrder: 960 },
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
  await testDb.supplier.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await testDb.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await testDb.$disconnect();
});

describe("product activation compliance gate", () => {
  it("refuses to activate without a verified supplier, allows it after verification", async () => {
    const actorId = await makeUser("actor");
    const product = await makeProduct("COMPLIANCE_REVIEW");

    // No supplier → cannot activate.
    const blocked = await admin.setProductStatus({
      productId: product.id,
      status: "ACTIVE",
      actorId,
    });
    expect(blocked.ok).toBe(false);

    // Link an unverified supplier → still blocked.
    const supplier = await testDb.supplier.create({
      data: { name: `${PREFIX}sup-${Math.random()}`, transferEvidence: "invoice #1" },
      select: { id: true },
    });
    await testDb.product.update({
      where: { id: product.id },
      data: { supplierId: supplier.id },
    });
    const stillBlocked = await admin.setProductStatus({
      productId: product.id,
      status: "ACTIVE",
      actorId,
    });
    expect(stillBlocked.ok).toBe(false);

    // Verify evidence → activation allowed.
    await admin.verifySupplierEvidence({
      supplierId: supplier.id,
      verified: true,
      actorId,
    });
    const allowed = await admin.setProductStatus({
      productId: product.id,
      status: "ACTIVE",
      actorId,
    });
    expect(allowed.ok).toBe(true);
    const updated = await testDb.product.findUnique({
      where: { id: product.id },
      select: { status: true },
    });
    expect(updated!.status).toBe("ACTIVE");
  });

  it("always allows non-active status changes", async () => {
    const actorId = await makeUser("actor2");
    const product = await makeProduct("DRAFT");
    const result = await admin.setProductStatus({
      productId: product.id,
      status: "ARCHIVED",
      actorId,
    });
    expect(result.ok).toBe(true);
  });
});

describe("inventory import", () => {
  it("imports lawful codes (encrypted) and rejects credential-shaped lines", async () => {
    const actorId = await makeUser("importer");
    const product = await makeProduct("COMPLIANCE_REVIEW");

    const result = await admin.importInventory({
      productId: product.id,
      actorId,
      rawCodes: [
        "GOOD-CODE-0001",
        "GOOD-CODE-0002",
        "victim@example.com:password123", // rejected
        "password: hunter2", // rejected
      ].join("\n"),
    });
    if (!result.ok) throw new Error("import failed");
    expect(result.imported).toBe(2);
    expect(result.rejected.length).toBe(2);

    const units = await testDb.inventoryUnit.findMany({
      where: { productId: product.id },
      select: { payloadCiphertext: true },
    });
    expect(units.length).toBe(2);
    // Stored payloads are ciphertext, not the plaintext codes.
    for (const unit of units) {
      const text = Buffer.from(unit.payloadCiphertext).toString("utf8");
      expect(text).not.toContain("GOOD-CODE");
    }

    // Rejected lines are redacted in the result (no full plaintext leak).
    const serialized = JSON.stringify(result.rejected);
    expect(serialized).not.toContain("password123");
    expect(serialized).not.toContain("hunter2");
  });

  it("skips duplicate codes by fingerprint", async () => {
    const actorId = await makeUser("dupe");
    const product = await makeProduct("COMPLIANCE_REVIEW");
    const first = await admin.importInventory({
      productId: product.id,
      actorId,
      rawCodes: "DUP-CODE-1",
    });
    const second = await admin.importInventory({
      productId: product.id,
      actorId,
      rawCodes: "DUP-CODE-1",
    });
    expect(first.ok && first.imported).toBe(1);
    expect(second.ok && second.imported).toBe(0);
  });
});

describe("user role and lock", () => {
  it("changes role and toggles lock, recording audit events", async () => {
    const actorId = await makeUser("adminactor");
    const target = await makeUser("target");

    await admin.setUserRole({ userId: target, role: "SUPPORT", actorId });
    let user = await testDb.user.findUnique({
      where: { id: target },
      select: { role: true, lockedUntil: true },
    });
    expect(user!.role).toBe("SUPPORT");

    await admin.setUserLock({
      userId: target,
      lockedUntil: new Date(Date.now() + 1000 * 60),
      actorId,
    });
    user = await testDb.user.findUnique({
      where: { id: target },
      select: { role: true, lockedUntil: true },
    });
    expect(user!.lockedUntil).not.toBeNull();

    const auditCount = await testDb.auditEvent.count({
      where: { targetId: target, action: { startsWith: "admin." } },
    });
    expect(auditCount).toBeGreaterThanOrEqual(1);
  });
});

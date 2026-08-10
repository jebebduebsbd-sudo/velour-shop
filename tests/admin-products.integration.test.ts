import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ProductInput } from "@/lib/admin/service";

import { cleanupTestUsers, testDb } from "./db";

/**
 * Admin product create/edit against real PostgreSQL: the ACTIVE compliance
 * gate, slug generation/uniqueness, EUR pricing, and audit trail.
 */
const PREFIX = "vtest-adminprod-";

let admin: typeof import("@/lib/admin/service");
let categoryId = "";
let verifiedSupplierId = "";
let unverifiedSupplierId = "";
let actorId = "";

function baseInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    title: `${PREFIX}Steam Wallet Code EUR 20`,
    subtitle: "Redeem on your own account",
    description: "An official Steam Wallet code worth twenty euros.",
    deliverable: "One unused €20 Steam Wallet code, delivered as text.",
    categoryId,
    priceMinor: 2000,
    delivery: "INSTANT_CODE",
    region: "Global",
    warranty: "Report an invalid code within 48 hours for a replacement.",
    featured: false,
    status: "DRAFT",
    ...overrides,
  };
}

beforeAll(async () => {
  admin = await import("@/lib/admin/service");
  const category = await testDb.category.upsert({
    where: { slug: `${PREFIX}cat` },
    update: {},
    create: { slug: `${PREFIX}cat`, name: "AdminProdCat", blurb: "b", sortOrder: 980 },
    select: { id: true },
  });
  categoryId = category.id;

  const [verified, unverified] = await Promise.all([
    testDb.supplier.create({
      data: {
        name: `${PREFIX}verified`,
        transferEvidence: "agreement #1",
        evidenceVerified: true,
      },
      select: { id: true },
    }),
    testDb.supplier.create({
      data: { name: `${PREFIX}unverified`, transferEvidence: "pending" },
      select: { id: true },
    }),
  ]);
  verifiedSupplierId = verified.id;
  unverifiedSupplierId = unverified.id;

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
  const products = await testDb.product.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = products.map((p) => p.id);
  await testDb.auditEvent.deleteMany({
    where: { targetType: "Product", targetId: { in: ids } },
  });
  await testDb.inventoryUnit.deleteMany({ where: { productId: { in: ids } } });
  await testDb.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await testDb.supplier.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await testDb.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await cleanupTestUsers(PREFIX);
  await testDb.$disconnect();
});

describe("createProduct", () => {
  it("creates a draft with a generated slug and EUR currency", async () => {
    const result = await admin.createProduct({ ...baseInput(), actorId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slug).toContain("steam-wallet-code");

    const product = await testDb.product.findUnique({
      where: { id: result.productId },
      select: { status: true, currency: true, priceMinor: true, featured: true },
    });
    expect(product).toMatchObject({
      status: "DRAFT",
      currency: "EUR",
      priceMinor: 2000,
      featured: false,
    });
  });

  it("gives same-titled products distinct slugs", async () => {
    const a = await admin.createProduct({
      ...baseInput({ title: `${PREFIX}Duplicate Title Code` }),
      actorId,
    });
    const b = await admin.createProduct({
      ...baseInput({ title: `${PREFIX}Duplicate Title Code` }),
      actorId,
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.slug).not.toBe(b.slug);
  });

  it("refuses ACTIVE without a verified supplier", async () => {
    const noSupplier = await admin.createProduct({
      ...baseInput({ status: "ACTIVE" }),
      actorId,
    });
    expect(noSupplier.ok).toBe(false);
    if (noSupplier.ok) return;
    expect(noSupplier.field).toBe("status");

    const unverified = await admin.createProduct({
      ...baseInput({ status: "ACTIVE", supplierId: unverifiedSupplierId }),
      actorId,
    });
    expect(unverified.ok).toBe(false);
  });

  it("allows ACTIVE with a verified supplier", async () => {
    const result = await admin.createProduct({
      ...baseInput({ status: "ACTIVE", supplierId: verifiedSupplierId }),
      actorId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const product = await testDb.product.findUnique({
      where: { id: result.productId },
      select: { status: true, supplierId: true },
    });
    expect(product).toMatchObject({
      status: "ACTIVE",
      supplierId: verifiedSupplierId,
    });
  });

  it("rejects an unknown category", async () => {
    const result = await admin.createProduct({
      ...baseInput({ categoryId: "does-not-exist" }),
      actorId,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe("categoryId");
  });

  it("records an audit event", async () => {
    const result = await admin.createProduct({
      ...baseInput({ title: `${PREFIX}Audited Code` }),
      actorId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const event = await testDb.auditEvent.findFirst({
      where: {
        action: "admin.product.created",
        targetType: "Product",
        targetId: result.productId,
      },
    });
    expect(event).not.toBeNull();
  });
});

describe("updateProduct", () => {
  it("edits fields and preserves the slug", async () => {
    const created = await admin.createProduct({
      ...baseInput({ title: `${PREFIX}Editable Code` }),
      actorId,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await admin.updateProduct({
      ...baseInput({ title: `${PREFIX}Editable Code Renamed`, priceMinor: 3499 }),
      productId: created.productId,
      actorId,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    // Slug is stable across a rename so a live product keeps its URL.
    expect(updated.slug).toBe(created.slug);

    const product = await testDb.product.findUnique({
      where: { id: created.productId },
      select: { title: true, priceMinor: true },
    });
    expect(product).toMatchObject({
      title: `${PREFIX}Editable Code Renamed`,
      priceMinor: 3499,
    });
  });

  it("enforces the activation gate on update", async () => {
    const created = await admin.createProduct({
      ...baseInput({ title: `${PREFIX}Gate On Update` }),
      actorId,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const blocked = await admin.updateProduct({
      ...baseInput({ title: `${PREFIX}Gate On Update`, status: "ACTIVE" }),
      productId: created.productId,
      actorId,
    });
    expect(blocked.ok).toBe(false);

    const allowed = await admin.updateProduct({
      ...baseInput({
        title: `${PREFIX}Gate On Update`,
        status: "ACTIVE",
        supplierId: verifiedSupplierId,
      }),
      productId: created.productId,
      actorId,
    });
    expect(allowed.ok).toBe(true);
  });

  it("returns not found for a missing product", async () => {
    const result = await admin.updateProduct({
      ...baseInput(),
      productId: "nope",
      actorId,
    });
    expect(result.ok).toBe(false);
  });
});

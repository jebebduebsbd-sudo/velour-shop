import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import type { DeliveryType, ProductStatus } from "@/generated/prisma/enums";
import { serverEnv } from "@/lib/env";
import { checkDeliverablePayload } from "@/lib/inventory/payload-policy";
import { prisma } from "@/lib/prisma";

/**
 * Admin operations. Every mutating call here is only reachable behind an
 * ADMIN-gated route (see requireRole) and records an audit event.
 */

export type SetProductStatusResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Changes a product's status. Activating requires a linked supplier whose
 * transfer-right evidence has been verified — the compliance gate.
 */
export async function setProductStatus(input: {
  productId: string;
  status: ProductStatus;
  actorId: string;
}): Promise<SetProductStatusResult> {
  if (input.status === "ACTIVE") {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { supplier: { select: { evidenceVerified: true } } },
    });
    if (!product) return { ok: false, reason: "product not found" };
    if (!product.supplier?.evidenceVerified) {
      return {
        ok: false,
        reason:
          "Cannot activate: link a supplier with verified transfer-right evidence first.",
      };
    }
  }

  await prisma.product.update({
    where: { id: input.productId },
    data: { status: input.status },
  });
  await recordAuditEvent({
    action: AUDIT_ACTIONS.adminProductStatus,
    userId: input.actorId,
    targetType: "Product",
    targetId: input.productId,
    metadata: { status: input.status },
  });
  return { ok: true };
}

/** The fields an admin can set when creating or editing a product. */
export type ProductInput = {
  title: string;
  subtitle?: string | null;
  description: string;
  deliverable: string;
  categoryId: string;
  /** Price in integer minor units (EUR cents). Never floating point. */
  priceMinor: number;
  delivery: DeliveryType;
  region: string;
  warranty: string;
  featured: boolean;
  status: ProductStatus;
  supplierId?: string | null;
};

export type SaveProductResult =
  | { ok: true; productId: string; slug: string }
  | { ok: false; reason: string; field?: keyof ProductInput };

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** A product slug that is free, or already belongs to `productId`. */
async function availableProductSlug(
  base: string,
  productId: string | null,
): Promise<string> {
  const candidate = base.length > 0 ? base : "product";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const slug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === productId) return slug;
  }
  return `${candidate}-${Date.now()}`;
}

/**
 * The compliance gate, shared by create/update and setProductStatus: a product
 * may only be ACTIVE when linked to a supplier whose transfer-right evidence
 * has been verified.
 */
async function activationBlocked(
  supplierId: string | null | undefined,
): Promise<boolean> {
  if (!supplierId) return true;
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { evidenceVerified: true },
  });
  return !supplier?.evidenceVerified;
}

const ACTIVATION_MESSAGE =
  "Cannot set ACTIVE without a linked supplier whose transfer-right evidence is verified. Save as draft or compliance review first.";

async function validateProductInput(
  input: ProductInput,
): Promise<{ ok: true } | { ok: false; reason: string; field?: keyof ProductInput }> {
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) {
    return { ok: false, reason: "Choose a valid category.", field: "categoryId" };
  }
  if (!Number.isSafeInteger(input.priceMinor) || input.priceMinor <= 0) {
    return { ok: false, reason: "Enter a price greater than zero.", field: "priceMinor" };
  }
  if (input.supplierId) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: input.supplierId },
      select: { id: true },
    });
    if (!supplier) {
      return { ok: false, reason: "Linked supplier not found.", field: "supplierId" };
    }
  }
  if (input.status === "ACTIVE" && (await activationBlocked(input.supplierId))) {
    return { ok: false, reason: ACTIVATION_MESSAGE, field: "status" };
  }
  return { ok: true };
}

/**
 * Creates a catalog product. Currency is always EUR (matching the wallet).
 * Activation is gated on a verified supplier; anything else can be created as
 * a draft or in compliance review and activated later.
 */
export async function createProduct(
  input: ProductInput & { actorId: string },
): Promise<SaveProductResult> {
  const valid = await validateProductInput(input);
  if (!valid.ok) return valid;

  const slug = await availableProductSlug(slugifyTitle(input.title), null);
  const product = await prisma.product.create({
    data: {
      slug,
      title: input.title,
      subtitle: input.subtitle || null,
      description: input.description,
      deliverable: input.deliverable,
      categoryId: input.categoryId,
      priceMinor: input.priceMinor,
      currency: "EUR",
      delivery: input.delivery,
      status: input.status,
      warranty: input.warranty,
      region: input.region,
      featured: input.featured,
      supplierId: input.supplierId || null,
    },
    select: { id: true, slug: true },
  });

  await recordAuditEvent({
    action: AUDIT_ACTIONS.adminProductCreated,
    userId: input.actorId,
    targetType: "Product",
    targetId: product.id,
    metadata: {
      status: input.status,
      priceMinor: input.priceMinor,
      categoryId: input.categoryId,
    },
  });

  return { ok: true, productId: product.id, slug: product.slug };
}

/**
 * Updates an existing product. The slug is preserved so a live product keeps
 * its URL; the activation gate is re-checked against the incoming supplier.
 */
export async function updateProduct(
  input: ProductInput & { productId: string; actorId: string },
): Promise<SaveProductResult> {
  const existing = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, slug: true },
  });
  if (!existing) return { ok: false, reason: "Product not found." };

  const valid = await validateProductInput(input);
  if (!valid.ok) return valid;

  await prisma.product.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      subtitle: input.subtitle || null,
      description: input.description,
      deliverable: input.deliverable,
      categoryId: input.categoryId,
      priceMinor: input.priceMinor,
      delivery: input.delivery,
      status: input.status,
      warranty: input.warranty,
      region: input.region,
      featured: input.featured,
      supplierId: input.supplierId || null,
    },
  });

  await recordAuditEvent({
    action: AUDIT_ACTIONS.adminProductUpdated,
    userId: input.actorId,
    targetType: "Product",
    targetId: existing.id,
    metadata: {
      status: input.status,
      priceMinor: input.priceMinor,
      categoryId: input.categoryId,
    },
  });

  return { ok: true, productId: existing.id, slug: existing.slug };
}

export async function verifySupplierEvidence(input: {
  supplierId: string;
  verified: boolean;
  actorId: string;
  note?: string;
}): Promise<void> {
  await prisma.supplier.update({
    where: { id: input.supplierId },
    data: { evidenceVerified: input.verified, complianceNote: input.note },
  });
  await recordAuditEvent({
    action: AUDIT_ACTIONS.adminSupplierEvidence,
    userId: input.actorId,
    targetType: "Supplier",
    targetId: input.supplierId,
    metadata: { verified: input.verified },
  });
}

export type ImportInventoryResult =
  | { ok: true; imported: number; rejected: { line: string; reason: string }[] }
  | { ok: false; reason: string };

/**
 * Imports one-per-line deliverable codes for a product. Each line is checked
 * by the payload policy (rejecting anything credential-shaped), then encrypted
 * at rest. Duplicate codes (by fingerprint) are skipped. The plaintext is never
 * logged and never returned.
 */
export async function importInventory(input: {
  productId: string;
  rawCodes: string;
  actorId: string;
}): Promise<ImportInventoryResult> {
  const masterKey = serverEnv().DELIVERY_MASTER_KEY_B64;
  if (!masterKey) return { ok: false, reason: "encryption key not configured" };

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) return { ok: false, reason: "product not found" };

  const lines = input.rawCodes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let imported = 0;
  const rejected: { line: string; reason: string }[] = [];

  for (const line of lines) {
    const check = checkDeliverablePayload(line);
    if (!check.ok) {
      // Record only a redacted marker, never the payload itself.
      rejected.push({ line: redact(line), reason: check.reason });
      continue;
    }
    try {
      await prisma.inventoryUnit.create({
        data: {
          productId: product.id,
          status: "AVAILABLE",
          payloadCiphertext: new Uint8Array(encryptDeliverable(line, masterKey)),
          payloadFingerprint: fingerprintDeliverable(line, masterKey),
        },
      });
      imported += 1;
    } catch {
      // Duplicate fingerprint or write error: skip without leaking the value.
      rejected.push({ line: redact(line), reason: "duplicate or write error" });
    }
  }

  await recordAuditEvent({
    action: AUDIT_ACTIONS.inventoryImport,
    userId: input.actorId,
    targetType: "Product",
    targetId: product.id,
    metadata: { imported, rejected: rejected.length },
  });

  return { ok: true, imported, rejected };
}

function redact(line: string): string {
  if (line.length <= 4) return "****";
  return `${line.slice(0, 2)}…${line.slice(-2)}`;
}

export async function setUserLock(input: {
  userId: string;
  lockedUntil: Date | null;
  actorId: string;
}): Promise<void> {
  await prisma.user.update({
    where: { id: input.userId },
    data: { lockedUntil: input.lockedUntil },
  });
  await recordAuditEvent({
    action: input.lockedUntil
      ? AUDIT_ACTIONS.adminUserLock
      : AUDIT_ACTIONS.adminUserUnlock,
    userId: input.actorId,
    targetType: "User",
    targetId: input.userId,
  });
}

export async function setUserRole(input: {
  userId: string;
  role: "CUSTOMER" | "SUPPORT" | "ADMIN";
  actorId: string;
}): Promise<void> {
  await prisma.user.update({
    where: { id: input.userId },
    data: { role: input.role },
  });
  await recordAuditEvent({
    action: AUDIT_ACTIONS.permissionChange,
    userId: input.actorId,
    targetType: "User",
    targetId: input.userId,
    metadata: { role: input.role },
  });
}

import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import type { ProductStatus } from "@/generated/prisma/enums";
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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  importInventory,
  setProductStatus,
  setUserLock,
  setUserRole,
  verifySupplierEvidence,
} from "@/lib/admin/service";
import { requireRole } from "@/lib/auth/guards";
import { decideRefund } from "@/lib/orders/refunds";
import { transitionDispute } from "@/lib/orders/disputes";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/request";

/** Every admin action re-checks ADMIN and same-origin server-side. */
async function guard() {
  await assertSameOrigin();
  return requireRole("ADMIN");
}

export async function setProductStatusAction(formData: FormData): Promise<void> {
  const session = await guard();
  const productId = String(formData.get("productId") ?? "");
  const status = String(formData.get("status") ?? "");
  const parsed = z
    .enum(["DRAFT", "COMPLIANCE_REVIEW", "ACTIVE", "ARCHIVED"])
    .safeParse(status);
  if (productId && parsed.success) {
    await setProductStatus({ productId, status: parsed.data, actorId: session.user.id });
  }
  revalidatePath("/admin/products");
}

export async function createSupplierAction(formData: FormData): Promise<void> {
  const session = await guard();
  const schema = z.object({
    name: z.string().trim().min(2).max(120),
    transferEvidence: z.string().trim().min(5).max(2000),
    region: z.string().trim().max(60).optional(),
  });
  const parsed = schema.safeParse({
    name: formData.get("name"),
    transferEvidence: formData.get("transferEvidence"),
    region: formData.get("region") || undefined,
  });
  if (parsed.success) {
    await prisma.supplier.create({
      data: {
        name: parsed.data.name,
        transferEvidence: parsed.data.transferEvidence,
        region: parsed.data.region ?? "Global",
      },
    });
    void session;
  }
  revalidatePath("/admin/suppliers");
}

export async function verifySupplierAction(formData: FormData): Promise<void> {
  const session = await guard();
  const supplierId = String(formData.get("supplierId") ?? "");
  const verified = String(formData.get("verified") ?? "") === "true";
  if (supplierId) {
    await verifySupplierEvidence({
      supplierId,
      verified,
      actorId: session.user.id,
    });
  }
  revalidatePath("/admin/suppliers");
}

export async function linkProductSupplierAction(
  formData: FormData,
): Promise<void> {
  await guard();
  const productId = String(formData.get("productId") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "");
  if (productId) {
    await prisma.product.update({
      where: { id: productId },
      data: { supplierId: supplierId || null },
    });
  }
  revalidatePath("/admin/products");
}

export async function importInventoryAction(formData: FormData): Promise<void> {
  const session = await guard();
  const productId = String(formData.get("productId") ?? "");
  const rawCodes = String(formData.get("rawCodes") ?? "");
  if (productId && rawCodes.trim()) {
    await importInventory({ productId, rawCodes, actorId: session.user.id });
  }
  revalidatePath("/admin/products");
}

export async function decideRefundAction(formData: FormData): Promise<void> {
  const session = await guard();
  const refundId = String(formData.get("refundId") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  const note = String(formData.get("note") ?? "") || undefined;
  if (refundId) {
    await decideRefund({ refundId, approve, decidedById: session.user.id, note });
  }
  revalidatePath("/admin/refunds");
}

export async function transitionDisputeAction(
  formData: FormData,
): Promise<void> {
  const session = await guard();
  const disputeId = String(formData.get("disputeId") ?? "");
  const status = String(formData.get("status") ?? "");
  const parsed = z
    .enum([
      "OPEN",
      "CUSTOMER_RESPONSE_REQUIRED",
      "MERCHANT_REVIEW",
      "RESOLVED_CUSTOMER",
      "RESOLVED_MERCHANT",
      "CLOSED",
    ])
    .safeParse(status);
  if (disputeId && parsed.success) {
    await transitionDispute({
      disputeId,
      status: parsed.data,
      actorId: session.user.id,
      actorRole: session.user.role,
    });
  }
  revalidatePath("/admin/disputes");
}

export async function replyDisputeAction(formData: FormData): Promise<void> {
  const session = await guard();
  const disputeId = String(formData.get("disputeId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (disputeId && body) {
    const { addDisputeMessage } = await import("@/lib/orders/disputes");
    await addDisputeMessage({
      disputeId,
      authorId: session.user.id,
      authorRole: session.user.role,
      body,
    });
  }
  revalidatePath("/admin/disputes");
}

export async function setUserLockAction(formData: FormData): Promise<void> {
  const session = await guard();
  const userId = String(formData.get("userId") ?? "");
  const lock = String(formData.get("lock") ?? "") === "true";
  if (userId && userId !== session.user.id) {
    await setUserLock({
      userId,
      lockedUntil: lock ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      actorId: session.user.id,
    });
  }
  revalidatePath("/admin/users");
}

export async function setUserRoleAction(formData: FormData): Promise<void> {
  const session = await guard();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const parsed = z.enum(["CUSTOMER", "SUPPORT", "ADMIN"]).safeParse(role);
  // An admin cannot change their own role (prevents self-lockout / escalation loops).
  if (userId && userId !== session.user.id && parsed.success) {
    await setUserRole({ userId, role: parsed.data, actorId: session.user.id });
  }
  revalidatePath("/admin/users");
}

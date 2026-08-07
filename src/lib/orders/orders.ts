import type { OrderStatus } from "@/generated/prisma/enums";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { decryptDeliverable } from "@/lib/crypto/deliverable";
import { serverEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type OrderSummary = {
  id: string;
  productTitle: string;
  productSlug: string;
  categoryName: string;
  status: OrderStatus;
  priceMinor: number;
  currency: string;
  createdAt: Date;
};

export async function getUserOrders(userId: string): Promise<OrderSummary[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      productTitle: true,
      status: true,
      priceMinor: true,
      currency: true,
      createdAt: true,
      product: { select: { slug: true, category: { select: { name: true } } } },
    },
  });
  return orders.map((order) => ({
    id: order.id,
    productTitle: order.productTitle,
    productSlug: order.product.slug,
    categoryName: order.product.category.name,
    status: order.status,
    priceMinor: order.priceMinor,
    currency: order.currency,
    createdAt: order.createdAt,
  }));
}

export type OrderDetail = OrderSummary & {
  deliverable: string;
  warranty: string;
  fulfilled: boolean;
};

/**
 * Loads an order for a specific user. Ownership is enforced in the query
 * (userId in the WHERE), so one user can never read another's order (no IDOR).
 */
export async function getUserOrder(
  userId: string,
  orderId: string,
): Promise<OrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      productTitle: true,
      status: true,
      priceMinor: true,
      currency: true,
      createdAt: true,
      product: {
        select: {
          slug: true,
          deliverable: true,
          warranty: true,
          category: { select: { name: true } },
        },
      },
    },
  });
  if (!order) return null;
  return {
    id: order.id,
    productTitle: order.productTitle,
    productSlug: order.product.slug,
    categoryName: order.product.category.name,
    status: order.status,
    priceMinor: order.priceMinor,
    currency: order.currency,
    createdAt: order.createdAt,
    deliverable: order.product.deliverable,
    warranty: order.product.warranty,
    fulfilled: order.status === "FULFILLED",
  };
}

export type RevealResult =
  | { ok: true; value: string }
  | { ok: false; reason: "not_found" | "not_fulfilled" | "reauth_required" };

/**
 * Reveals an order's deliverable. Gated on: authenticated owner, order
 * FULFILLED, and a fresh password confirmation (step-up). The decrypted value
 * is returned to the caller only — never logged, never persisted, and the
 * calling route sets Cache-Control: no-store.
 */
export async function revealDeliverable(input: {
  userId: string;
  orderId: string;
  reauthFresh: boolean;
  ipHash?: string | null;
}): Promise<RevealResult> {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.userId },
    select: {
      id: true,
      status: true,
      firstRevealedAt: true,
      inventoryUnit: { select: { payloadCiphertext: true } },
    },
  });
  if (!order || !order.inventoryUnit) return { ok: false, reason: "not_found" };
  if (order.status !== "FULFILLED") {
    return { ok: false, reason: "not_fulfilled" };
  }
  if (!input.reauthFresh) return { ok: false, reason: "reauth_required" };

  const masterKey = serverEnv().DELIVERY_MASTER_KEY_B64;
  if (!masterKey) return { ok: false, reason: "not_found" };

  const value = decryptDeliverable(
    Buffer.from(order.inventoryUnit.payloadCiphertext),
    masterKey,
  );

  if (!order.firstRevealedAt) {
    await prisma.order.update({
      where: { id: order.id },
      data: { firstRevealedAt: new Date() },
    });
  }

  // Audit records the reveal event only — never the deliverable value.
  await recordAuditEvent({
    action: AUDIT_ACTIONS.deliveryReveal,
    userId: input.userId,
    targetType: "Order",
    targetId: order.id,
    ipHash: input.ipHash,
  });

  return { ok: true, value };
}

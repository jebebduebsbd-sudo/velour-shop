"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createProduct,
  importInventory,
  setProductStatus,
  setUserLock,
  setUserRole,
  updateProduct,
  verifySupplierEvidence,
  type ProductInput,
} from "@/lib/admin/service";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/auth/guards";
import { parseMinorFromDecimal } from "@/lib/format";
import { decideRefund } from "@/lib/orders/refunds";
import { transitionDispute } from "@/lib/orders/disputes";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/request";
import { syncSupplierFeed } from "@/lib/suppliers/sync";

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

export type FeedSyncState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      message: string;
      rejected: { ref: string; reason: string }[];
      supplierVerified: boolean;
    };

/**
 * Pulls the configured supplier feed into the catalogue. Synced products land
 * in COMPLIANCE_REVIEW — this never publishes anything on its own.
 */
export async function syncSupplierFeedAction(
  _previous: FeedSyncState,
  formData: FormData,
): Promise<FeedSyncState> {
  const session = await guard();
  const supplierId = String(formData.get("supplierId") ?? "");
  if (!supplierId) {
    return { status: "error", message: "Choose a supplier to sync into." };
  }

  const result = await syncSupplierFeed({
    supplierId,
    actorId: session.user.id,
  });
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/products");

  if (!result.ok) return { status: "error", message: result.reason };

  const { summary } = result;
  return {
    status: "ok",
    message: `Read ${summary.fetched} listing(s): ${summary.created} added, ${summary.updated} updated, ${summary.rejected.length} rejected. Codes: ${summary.unitsImported} stocked, ${summary.unitsSkipped} skipped.`,
    rejected: summary.rejected.slice(0, 25),
    supplierVerified: summary.supplierVerified,
  };
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

export type ProductFieldErrors = Record<string, string>;

export type ProductFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  fieldErrors?: ProductFieldErrors;
};

const productFormSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  subtitle: z.string().trim().max(120).optional(),
  categoryId: z.string().trim().min(1, "Choose a category"),
  price: z
    .string()
    .trim()
    .regex(/^\d+(?:[.,]\d{1,2})?$/, "Enter a price like 9.99"),
  description: z
    .string()
    .trim()
    .min(10, "Add a short description")
    .max(2000),
  deliverable: z
    .string()
    .trim()
    .min(5, "State exactly what the buyer receives")
    .max(500),
  warranty: z.string().trim().min(5, "Add a warranty statement").max(500),
  region: z.string().trim().max(60).optional(),
  delivery: z.enum(["INSTANT_CODE", "MANUAL"]),
  status: z.enum(["DRAFT", "COMPLIANCE_REVIEW", "ACTIVE", "ARCHIVED"]),
  supplierId: z.string().trim().optional(),
});

/** Turns the product form into a validated ProductInput or per-field errors. */
function readProductForm(
  formData: FormData,
):
  | { ok: true; input: ProductInput }
  | { ok: false; fieldErrors: ProductFieldErrors } {
  const parsed = productFormSchema.safeParse({
    title: formData.get("title") ?? "",
    subtitle: (formData.get("subtitle") as string) || undefined,
    categoryId: formData.get("categoryId") ?? "",
    price: formData.get("price") ?? "",
    description: formData.get("description") ?? "",
    deliverable: formData.get("deliverable") ?? "",
    warranty: formData.get("warranty") ?? "",
    region: (formData.get("region") as string) || undefined,
    delivery: formData.get("delivery") ?? "",
    status: formData.get("status") ?? "",
    supplierId: (formData.get("supplierId") as string) || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: ProductFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const priceMinor = parseMinorFromDecimal(parsed.data.price);
  if (priceMinor === null || priceMinor <= 0) {
    return { ok: false, fieldErrors: { price: "Enter a price greater than zero." } };
  }

  return {
    ok: true,
    input: {
      title: parsed.data.title,
      subtitle: parsed.data.subtitle ?? null,
      description: parsed.data.description,
      deliverable: parsed.data.deliverable,
      categoryId: parsed.data.categoryId,
      priceMinor,
      delivery: parsed.data.delivery,
      region: parsed.data.region?.length ? parsed.data.region : "Global",
      warranty: parsed.data.warranty,
      featured: formData.get("featured") === "on",
      status: parsed.data.status,
      supplierId: parsed.data.supplierId?.length ? parsed.data.supplierId : null,
    },
  };
}

/** Maps a service-layer field name onto the form field that renders it. */
function fieldErrorFrom(result: {
  field?: keyof ProductInput;
  reason: string;
}): ProductFieldErrors | undefined {
  if (!result.field) return undefined;
  const key = result.field === "priceMinor" ? "price" : result.field;
  return { [key]: result.reason };
}

export async function createProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await guard();
  const read = readProductForm(formData);
  if (!read.ok) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: read.fieldErrors,
    };
  }

  const result = await createProduct({ ...read.input, actorId: session.user.id });
  if (!result.ok) {
    return {
      status: "error",
      message: result.reason,
      fieldErrors: fieldErrorFrom(result),
    };
  }

  revalidatePath("/admin/products");
  revalidatePath("/market");
  revalidatePath("/");
  // Land on the editor for the new product so codes/stock can be added next.
  redirect(`/admin/products/${result.productId}/edit`);
}

export async function updateProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await guard();
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { status: "error", message: "Missing product id." };

  const read = readProductForm(formData);
  if (!read.ok) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: read.fieldErrors,
    };
  }

  const result = await updateProduct({
    ...read.input,
    productId,
    actorId: session.user.id,
  });
  if (!result.ok) {
    return {
      status: "error",
      message: result.reason,
      fieldErrors: fieldErrorFrom(result),
    };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/market");
  revalidatePath("/");
  revalidatePath(`/product/${result.slug}`);
  return { status: "ok", message: "Changes saved." };
}

export async function decideRefundAction(formData: FormData): Promise<void> {
  const session = await guard();
  const refundId = String(formData.get("refundId") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  const note = String(formData.get("note") ?? "") || undefined;
  // Optional partial amount in euros → minor units.
  const euros = Number.parseFloat(String(formData.get("amount") ?? ""));
  const amountMinor =
    Number.isFinite(euros) && euros > 0 ? Math.round(euros * 100) : undefined;
  if (refundId) {
    await decideRefund({
      refundId,
      approve,
      decidedById: session.user.id,
      note,
      amountMinor,
    });
  }
  revalidatePath("/admin/refunds");
}

export async function adjustWalletAction(formData: FormData): Promise<void> {
  const session = await guard();
  const schema = z.object({
    userId: z.string().min(1).max(60),
    // Signed euros; converted to integer minor units.
    euros: z
      .string()
      .trim()
      .regex(/^-?\d+(\.\d{1,2})?$/, "Enter an amount like 5 or -2.50"),
    reason: z.string().trim().min(3, "A reason is required").max(200),
  });
  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    euros: formData.get("euros"),
    reason: formData.get("reason"),
  });
  if (parsed.success) {
    const amountMinor = Math.round(Number.parseFloat(parsed.data.euros) * 100);
    const { postAdminAdjustment } = await import("@/lib/wallet/ledger");
    const result = await postAdminAdjustment({
      userId: parsed.data.userId,
      amountMinor,
      reason: parsed.data.reason,
      metadata: { by: session.user.id },
    });
    if (result.ok) {
      await recordAuditEvent({
        action: AUDIT_ACTIONS.adminAdjustment,
        userId: session.user.id,
        targetType: "User",
        targetId: parsed.data.userId,
        metadata: { amountMinor, reason: parsed.data.reason },
      });
    }
  }
  revalidatePath("/admin/users");
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

export async function setReviewStatusAction(formData: FormData): Promise<void> {
  await guard();
  const reviewId = String(formData.get("reviewId") ?? "");
  const status = String(formData.get("status") ?? "");
  const parsed = z.enum(["PUBLISHED", "HIDDEN"]).safeParse(status);
  if (reviewId && parsed.success) {
    const { setReviewStatus } = await import("@/lib/reviews/service");
    await setReviewStatus({ reviewId, status: parsed.data });
  }
  revalidatePath("/admin/reviews");
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

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth/guards";
import { openDispute } from "@/lib/orders/disputes";
import { requestRefund } from "@/lib/orders/refunds";
import { assertSameOrigin, clientIpHash } from "@/lib/request";

const refundSchema = z.object({
  orderId: z.string().min(1).max(60),
  reason: z.string().trim().min(5, "Tell us what went wrong").max(500),
});

export async function requestRefundAction(formData: FormData): Promise<void> {
  const parsed = refundSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    const orderId = String(formData.get("orderId") ?? "");
    redirect(`/orders/${orderId}?refund=invalid`);
  }

  await assertSameOrigin();
  const session = await requireSession("/orders");
  const result = await requestRefund({
    userId: session.user.id,
    orderId: parsed.data.orderId,
    reason: parsed.data.reason,
    ipHash: await clientIpHash(),
  });
  if (!result.ok) {
    redirect(`/orders/${parsed.data.orderId}?refund=error`);
  }
  redirect(`/orders/${parsed.data.orderId}?refund=${result.autoProcessed ? "processed" : "review"}`);
}

const disputeSchema = z.object({
  orderId: z.string().min(1).max(60),
  reason: z.string().trim().min(3).max(200),
  message: z.string().trim().min(5, "Describe the issue").max(2000),
});

export async function openDisputeAction(formData: FormData): Promise<void> {
  const parsed = disputeSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    const orderId = String(formData.get("orderId") ?? "");
    redirect(`/orders/${orderId}?dispute=invalid`);
  }

  await assertSameOrigin();
  const session = await requireSession("/orders");
  const result = await openDispute({
    userId: session.user.id,
    orderId: parsed.data.orderId,
    reason: parsed.data.reason,
    message: parsed.data.message,
    ipHash: await clientIpHash(),
  });
  if (!result.ok) redirect(`/orders/${parsed.data.orderId}?dispute=error`);
  redirect(`/disputes/${result.disputeId}`);
}

const messageSchema = z.object({
  disputeId: z.string().min(1).max(60),
  body: z.string().trim().min(1, "Write a message").max(2000),
});

export async function postDisputeMessageAction(
  formData: FormData,
): Promise<void> {
  const parsed = messageSchema.safeParse({
    disputeId: formData.get("disputeId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const disputeId = String(formData.get("disputeId") ?? "");
    redirect(`/disputes/${disputeId}?message=invalid`);
  }

  await assertSameOrigin();
  const session = await requireSession("/disputes");
  const { addDisputeMessage } = await import("@/lib/orders/disputes");
  await addDisputeMessage({
    disputeId: parsed.data.disputeId,
    authorId: session.user.id,
    authorRole: session.user.role,
    body: parsed.data.body,
  });
  redirect(`/disputes/${parsed.data.disputeId}`);
}

const reviewSchema = z.object({
  orderId: z.string().min(1).max(60),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(3, "Add a short review").max(2000),
});

export async function submitReviewAction(formData: FormData): Promise<void> {
  const parsed = reviewSchema.safeParse({
    orderId: formData.get("orderId"),
    rating: formData.get("rating"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const orderId = String(formData.get("orderId") ?? "");
    redirect(`/orders/${orderId}?review=invalid`);
  }

  await assertSameOrigin();
  const session = await requireSession("/orders");
  const { submitReview } = await import("@/lib/reviews/service");
  const result = await submitReview({
    userId: session.user.id,
    orderId: parsed.data.orderId,
    rating: parsed.data.rating,
    body: parsed.data.body,
  });
  redirect(
    `/orders/${parsed.data.orderId}?review=${result.ok ? "thanks" : result.reason}`,
  );
}

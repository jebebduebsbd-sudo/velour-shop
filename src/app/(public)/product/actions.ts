"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getActiveSession } from "@/lib/auth/session";
import { checkout } from "@/lib/orders/checkout";
import { clientIpHash } from "@/lib/request";
import { assertSameOrigin } from "@/lib/request";

const buySchema = z.object({
  slug: z.string().min(1).max(160),
  // Stable per-render key so a double submit yields one order + one debit.
  idempotencyKey: z.string().min(8).max(80),
});

/**
 * Purchases a product with wallet balance. All trust is server-side: the price,
 * the balance, and product status are looked up here, never taken from the
 * client. On success the user lands on the private order page.
 */
export async function buyProductAction(formData: FormData): Promise<void> {
  const parsed = buySchema.safeParse({
    slug: formData.get("slug"),
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) redirect("/market");

  await assertSameOrigin();
  const session = await getActiveSession();
  if (!session) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/product/${parsed.data.slug}`)}`);
  }

  const result = await checkout({
    userId: session.user.id,
    emailVerified: session.user.emailVerifiedAt !== null,
    productSlug: parsed.data.slug,
    idempotencyKey: parsed.data.idempotencyKey,
    ipHash: await clientIpHash(),
  });

  if (result.ok) {
    redirect(`/orders/${result.orderId}`);
  }

  // Normalized, non-sensitive failure reasons surfaced via query param.
  redirect(`/product/${parsed.data.slug}?error=${result.reason}`);
}

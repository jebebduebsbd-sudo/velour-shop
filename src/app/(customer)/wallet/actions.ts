"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth/guards";
import { serverEnv } from "@/lib/env";
import {
  MAX_TOPUP_MINOR,
  MIN_TOPUP_MINOR,
  startTopUp,
} from "@/lib/payments/topup-service";
import { assertSameOrigin } from "@/lib/request";

export type TopUpFormState = {
  status: "idle" | "error";
  message?: string;
};

const topUpSchema = z.object({
  amountMinor: z.coerce
    .number()
    .int("Enter a whole amount")
    .min(MIN_TOPUP_MINOR, "Amount is below the minimum")
    .max(MAX_TOPUP_MINOR, "Amount is above the maximum"),
  providerId: z.string().min(1).max(40),
});

export async function startTopUpAction(
  _prev: TopUpFormState,
  formData: FormData,
): Promise<TopUpFormState> {
  const parsed = topUpSchema.safeParse({
    amountMinor: formData.get("amountMinor"),
    providerId: formData.get("providerId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid top-up request.",
    };
  }

  let redirectUrl: string;
  try {
    await assertSameOrigin();
    const session = await requireSession("/wallet/top-up");
    const result = await startTopUp({
      userId: session.user.id,
      providerId: parsed.data.providerId,
      amountMinor: parsed.data.amountMinor,
      currency: "EUR",
      returnUrl: `${serverEnv().APP_ORIGIN}/wallet/transactions`,
    });
    if (!result.ok) {
      return {
        status: "error",
        message:
          "That payment method is unavailable right now. Please choose another.",
      };
    }
    redirectUrl = result.redirectUrl;
  } catch {
    return {
      status: "error",
      message: "Something went wrong. Please try again.",
    };
  }
  redirect(redirectUrl);
}

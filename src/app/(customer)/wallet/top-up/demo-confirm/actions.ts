"use server";

import { randomBytes } from "node:crypto";

import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/guards";
import { paymentWebhookSecret, serverEnv } from "@/lib/env";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import { completeTopUpFromWebhook } from "@/lib/payments/topup-service";
import { assertSameOrigin } from "@/lib/request";

/**
 * Development-only: emulates the payment provider's server-to-server callback.
 *
 * It builds a signed webhook body and hands it to the same webhook processor a
 * real provider callback would hit. Crediting therefore flows through the
 * verified-webhook path, never from the page render — exactly the property the
 * "no credit from redirect" test protects.
 */
export async function simulateProviderCallbackAction(
  formData: FormData,
): Promise<void> {
  await assertSameOrigin();
  await requireSession("/wallet/top-up");
  if (serverEnv().NODE_ENV === "production") {
    redirect("/wallet/transactions");
  }

  const ref = String(formData.get("ref") ?? "");
  const amountMinor = Number.parseInt(String(formData.get("amount") ?? "0"), 10);
  if (!ref || !Number.isFinite(amountMinor) || amountMinor <= 0) {
    redirect("/wallet/top-up");
  }

  const body = JSON.stringify({
    externalId: `evt_${randomBytes(9).toString("hex")}`,
    providerReference: ref,
    eventType: "topup.status",
    status: "paid",
    amountMinor,
    currency: "EUR",
  });
  const signature = MockPaymentProvider.signBody(body, paymentWebhookSecret());

  await completeTopUpFromWebhook({
    providerId: "mock",
    rawBody: body,
    signature,
  });

  redirect("/wallet/transactions?topup=complete");
}

import { createHmac, timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env";
import type {
  FeeEstimate,
  PaymentProvider,
  ProviderHealth,
  TopUpRequest,
  TopUpSession,
  WebhookVerification,
} from "@/lib/payments/provider";

/**
 * NOWPayments crypto top-up provider (server-only).
 *
 * Implemented against NOWPayments' public API: an invoice is created via
 * `POST /v1/invoice`, and the wallet is credited only from a verified IPN
 * callback whose `x-nowpayments-sig` header is an HMAC-SHA512 of the
 * key-sorted JSON body signed with the IPN secret.
 *
 * The provider is enabled ONLY when its feature flag is set AND both the API
 * key and IPN secret are present in the environment. Otherwise it is disabled
 * and every action fails closed. No credentials are ever hardcoded.
 */
const API_BASE = "https://api.nowpayments.io/v1";
const REQUEST_TIMEOUT_MS = 10_000;

export class NowPaymentsProvider implements PaymentProvider {
  readonly id = "nowpayments";
  readonly displayName = "Crypto (NOWPayments)";
  readonly description = "Pay with crypto; wallet credited after confirmation.";
  readonly kind = "crypto" as const;

  private apiKey(): string | undefined {
    return process.env.NOWPAYMENTS_API_KEY;
  }
  private ipnSecret(): string | undefined {
    return process.env.NOWPAYMENTS_IPN_SECRET;
  }

  isEnabled(): boolean {
    return (
      process.env.PAYMENT_NOWPAYMENTS_ENABLED === "true" &&
      !!this.apiKey() &&
      !!this.ipnSecret()
    );
  }

  supportsCurrency(currency: string): boolean {
    return currency === "EUR";
  }

  minimumMinor(): number {
    return 1000; // €10 — crypto rails have meaningful minimums/fees
  }

  estimatedArrival(): string {
    return "After blockchain confirmation";
  }

  getFeeEstimate(amountMinor: number): FeeEstimate {
    // Network/processor fees are charged to the payer by NOWPayments, not added
    // to the wallet credit, so nothing extra is shown here.
    return { feeMinor: 0, totalChargedMinor: amountMinor };
  }

  async createTopUp(request: TopUpRequest): Promise<TopUpSession> {
    const apiKey = this.apiKey();
    if (!this.isEnabled() || !apiKey) {
      throw new Error("NOWPayments is not configured");
    }
    const providerReference = `nowp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const origin = serverEnv().APP_ORIGIN;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE}/invoice`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          price_amount: request.amountMinor / 100,
          price_currency: request.currency.toLowerCase(),
          order_id: providerReference,
          order_description: "Velour wallet top-up",
          ipn_callback_url: `${origin}/api/webhooks/payment/nowpayments`,
          success_url: request.returnUrl,
          cancel_url: request.returnUrl,
        }),
      });
      if (!response.ok) {
        throw new Error(`NOWPayments invoice failed (HTTP ${response.status})`);
      }
      const data = (await response.json()) as { invoice_url?: string };
      if (!data.invoice_url) throw new Error("NOWPayments returned no invoice URL");
      return {
        providerReference,
        redirectUrl: data.invoice_url,
        feeMinor: 0,
        status: "pending",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async verifyWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<WebhookVerification> {
    const secret = this.ipnSecret();
    if (!secret) return { ok: false, reason: "not configured" };
    if (!signature) return { ok: false, reason: "missing signature" };

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return { ok: false, reason: "invalid json" };
    }

    // NOWPayments signs the key-sorted JSON of the body with HMAC-SHA512.
    const expected = createHmac("sha512", secret)
      .update(sortedStringify(payload))
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "bad signature" };
    }

    const status = String(payload.payment_status ?? "");
    const providerReference = String(payload.order_id ?? "");
    const priceAmount = Number(payload.price_amount ?? 0);
    const currency = String(payload.price_currency ?? "EUR").toUpperCase();
    const externalId = String(payload.payment_id ?? payload.id ?? providerReference);
    if (!providerReference || !externalId) {
      return { ok: false, reason: "missing fields" };
    }

    return {
      ok: true,
      externalId,
      providerReference,
      eventType: `payment.${status}`,
      completed: status === "finished",
      amountMinor: Math.round(priceAmount * 100),
      currency,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.isEnabled()) {
      return { healthy: false, detail: "Disabled (flag off or secrets missing)" };
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(`${API_BASE}/status`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      return response.ok
        ? { healthy: true, detail: "NOWPayments API reachable" }
        : { healthy: false, detail: `NOWPayments API HTTP ${response.status}` };
    } catch {
      return { healthy: false, detail: "NOWPayments API unreachable" };
    }
  }
}

/** Deterministic, recursively key-sorted JSON — matches NOWPayments' signing. */
export function sortedStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(sortedStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map(
        (k) =>
          `${JSON.stringify(k)}:${sortedStringify((value as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

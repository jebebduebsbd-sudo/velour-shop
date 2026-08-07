import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { paymentWebhookSecret } from "@/lib/env";
import type {
  FeeEstimate,
  PaymentProvider,
  ProviderHealth,
  TopUpRequest,
  TopUpSession,
  WebhookVerification,
} from "@/lib/payments/provider";

/**
 * Development payment provider. It never touches a real payment network:
 * createTopUp returns a local confirmation page, and a "paid" event is only
 * accepted through the signed webhook. It exists so the entire wallet flow —
 * including strict webhook-only crediting — is exercisable without secrets.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = "mock";
  readonly displayName = "Demo checkout";
  readonly description = "Local test payments — no real charge is made.";
  readonly kind = "card" as const;

  isEnabled(): boolean {
    // Available anywhere except production.
    return process.env.NODE_ENV !== "production";
  }

  supportsCurrency(): boolean {
    return true;
  }

  minimumMinor(): number {
    return 100;
  }

  estimatedArrival(): string {
    return "Instant (demo)";
  }

  getFeeEstimate(amountMinor: number): FeeEstimate {
    // Flat demo fee so the fee-disclosure UI has something to show.
    const feeMinor = Math.round(amountMinor * 0.015);
    return { feeMinor, totalChargedMinor: amountMinor + feeMinor };
  }

  async createTopUp(request: TopUpRequest): Promise<TopUpSession> {
    const providerReference = `mock_${randomBytes(9).toString("hex")}`;
    const { feeMinor } = this.getFeeEstimate(request.amountMinor);
    // The "redirect" is a local confirmation page that triggers a signed
    // webhook to this app — mirroring a real hosted-checkout round trip.
    const redirectUrl = `/wallet/top-up/demo-confirm?ref=${providerReference}&amount=${request.amountMinor}`;
    return {
      providerReference,
      redirectUrl,
      feeMinor,
      status: "pending",
    };
  }

  async verifyWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<WebhookVerification> {
    if (!signature) return { ok: false, reason: "missing signature" };
    const expected = createHmac("sha256", paymentWebhookSecret())
      .update(rawBody)
      .digest("hex");
    const provided = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      provided.length !== expectedBuffer.length ||
      !timingSafeEqual(provided, expectedBuffer)
    ) {
      return { ok: false, reason: "bad signature" };
    }

    let payload: {
      externalId?: string;
      providerReference?: string;
      eventType?: string;
      status?: string;
      amountMinor?: number;
      currency?: string;
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { ok: false, reason: "invalid json" };
    }

    if (
      !payload.externalId ||
      !payload.providerReference ||
      typeof payload.amountMinor !== "number"
    ) {
      return { ok: false, reason: "missing fields" };
    }

    return {
      ok: true,
      externalId: payload.externalId,
      providerReference: payload.providerReference,
      eventType: payload.eventType ?? "topup.status",
      completed: payload.status === "paid",
      amountMinor: payload.amountMinor,
      currency: payload.currency ?? "EUR",
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return { healthy: true, detail: "Mock provider ready" };
  }

  /** Test/dev helper: signs a webhook body the way the provider would. */
  static signBody(rawBody: string, secret: string): string {
    return createHmac("sha256", secret).update(rawBody).digest("hex");
  }
}

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { paymentWebhookSecret } from "@/lib/env";
import { estimateFeeMinor } from "@/lib/payments/fees";
import type {
  FeeEstimate,
  PaymentProvider,
  ProviderHealth,
  TopUpRequest,
  TopUpSession,
  WebhookVerification,
} from "@/lib/payments/provider";

type MockConfig = {
  id: string;
  displayName: string;
  description: string;
  kind: PaymentProvider["kind"];
};

/**
 * Development payment provider. It never touches a real payment network:
 * createTopUp returns a local confirmation page, and a "paid" event is only
 * accepted through the signed webhook. It exists so the entire wallet flow —
 * including strict webhook-only crediting and the per-rail fee — is exercisable
 * without secrets. Configurable so we can present both a card and a crypto
 * demo method with their respective fees.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly kind: PaymentProvider["kind"];

  constructor(config?: Partial<MockConfig>) {
    this.id = config?.id ?? "mock";
    this.displayName = config?.displayName ?? "Demo card checkout";
    this.description =
      config?.description ?? "Local test card payment — no real charge is made.";
    this.kind = config?.kind ?? "card";
  }

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
    const feeMinor = estimateFeeMinor(amountMinor, this.kind);
    return { feeMinor, totalChargedMinor: amountMinor + feeMinor };
  }

  async createTopUp(request: TopUpRequest): Promise<TopUpSession> {
    const providerReference = `${this.id}_${randomBytes(9).toString("hex")}`;
    const { feeMinor } = this.getFeeEstimate(request.amountMinor);
    // The "redirect" is a local confirmation page that triggers a signed
    // webhook to this app — mirroring a real hosted-checkout round trip.
    const redirectUrl = `/wallet/top-up/demo-confirm?ref=${providerReference}&amount=${request.amountMinor}&provider=${this.id}`;
    return { providerReference, redirectUrl, feeMinor, status: "pending" };
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

/** Dev-only crypto demo method, so both fee tiers are visible end to end. */
export class MockCryptoProvider extends MockPaymentProvider {
  constructor() {
    super({
      id: "mock-crypto",
      displayName: "Demo crypto checkout",
      description: "Local test crypto payment — no real charge is made.",
      kind: "crypto",
    });
  }
}

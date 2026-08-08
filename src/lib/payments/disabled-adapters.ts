import { estimateFeeMinor } from "@/lib/payments/fees";
import type {
  FeeEstimate,
  PaymentProvider,
  ProviderHealth,
  TopUpSession,
  WebhookVerification,
} from "@/lib/payments/provider";

/**
 * Scaffolding for the real payment providers named in the product spec.
 *
 * These are intentionally NOT wired to live payment networks. Each is enabled
 * only when its feature flag is "true" AND the required secrets are present,
 * and every action fails closed with a clear message until then. Wiring the
 * live protocol details requires each provider's official integration docs and
 * approved merchant credentials, which must come from server-side secrets —
 * never invented field names, never a token pasted into a prompt.
 */

const notConfigured = (name: string): Promise<never> =>
  Promise.reject(
    new Error(
      `${name} is not configured. It stays disabled until merchant onboarding, official API docs, and secrets are in place.`,
    ),
  );

abstract class DisabledProvider implements PaymentProvider {
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly kind: "card" | "crypto" | "voucher";
  protected abstract flagEnabled(): boolean;

  isEnabled(): boolean {
    // A real provider is usable only when its flag is on AND it is actually
    // configured. Until the live adapter is implemented, configured() is false.
    return this.flagEnabled() && this.configured();
  }

  /** Real credential/config presence check. Always false for now. */
  protected configured(): boolean {
    return false;
  }

  supportsCurrency(currency: string): boolean {
    return currency === "EUR";
  }

  minimumMinor(): number {
    return 500;
  }

  estimatedArrival(): string {
    return "Pending provider onboarding";
  }

  getFeeEstimate(amountMinor: number): FeeEstimate {
    const feeMinor = estimateFeeMinor(amountMinor, this.kind);
    return { feeMinor, totalChargedMinor: amountMinor + feeMinor };
  }

  createTopUp(): Promise<TopUpSession> {
    return notConfigured(this.displayName);
  }

  async verifyWebhook(): Promise<WebhookVerification> {
    return { ok: false, reason: `${this.id} disabled` };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      healthy: false,
      detail: `${this.displayName} disabled (awaiting onboarding + secrets)`,
    };
  }
}

/** DSK Bank virtual POS (hosted card checkout). Disabled until onboarded. */
export class DskVirtualPosProvider extends DisabledProvider {
  readonly id = "dsk";
  readonly displayName = "Card (DSK Bank)";
  readonly description = "Visa / Mastercard via DSK hosted checkout.";
  readonly kind = "card" as const;
  protected flagEnabled(): boolean {
    return process.env.PAYMENT_DSK_ENABLED === "true";
  }
}

/** OVGC vouchers. Kept disabled pending onboarding and acceptable-use review. */
export class OvgcProvider extends DisabledProvider {
  readonly id = "ovgc";
  readonly displayName = "Voucher (OVGC)";
  readonly description = "Prepaid voucher funding (not yet available).";
  readonly kind = "voucher" as const;
  protected flagEnabled(): boolean {
    return process.env.PAYMENT_OVGC_ENABLED === "true";
  }
}

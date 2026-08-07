/**
 * Provider-neutral payment interface.
 *
 * Providers fund the wallet only — they never charge for a product directly.
 * Wallet credit is created exclusively by a verified server-to-server webhook
 * (see verifyWebhook), never from a browser redirect / success page.
 */

export type TopUpRequest = {
  userId: string;
  amountMinor: number;
  currency: string;
  /** Absolute URL the provider returns the user to (informational only). */
  returnUrl: string;
};

export type TopUpSession = {
  /** Provider-side reference (invoice/session id). Not a secret. */
  providerReference: string;
  /** URL to send the user to in order to pay. */
  redirectUrl: string;
  /** Fee the user will be charged on top of the credited amount. */
  feeMinor: number;
  /** Free-form status the provider reports for this session. */
  status: "pending";
};

export type WebhookVerification =
  | {
      ok: true;
      /** Stable provider event id, used for idempotent processing. */
      externalId: string;
      providerReference: string;
      eventType: string;
      /** Present when the event marks a top-up as paid. */
      completed: boolean;
      amountMinor: number;
      currency: string;
    }
  | { ok: false; reason: string };

export type FeeEstimate = {
  feeMinor: number;
  /** Total the user is charged = amount credited + fee. */
  totalChargedMinor: number;
};

export type ProviderHealth = {
  healthy: boolean;
  detail: string;
};

export interface PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  /** Payment rail, used to pick an icon and grouping in the UI. */
  readonly kind: "card" | "crypto" | "voucher";
  /** Whether this provider is currently enabled AND configured. */
  isEnabled(): boolean;
  supportsCurrency(currency: string): boolean;
  getFeeEstimate(amountMinor: number, currency: string): FeeEstimate;
  minimumMinor(currency: string): number;
  estimatedArrival(): string;
  createTopUp(request: TopUpRequest): Promise<TopUpSession>;
  verifyWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<WebhookVerification>;
  healthCheck(): Promise<ProviderHealth>;
}

export type PublicProviderInfo = {
  id: string;
  displayName: string;
  description: string;
  kind: PaymentProvider["kind"];
  minimumMinor: number;
  estimatedArrival: string;
};

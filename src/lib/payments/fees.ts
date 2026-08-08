import type { PaymentProvider } from "@/lib/payments/provider";

/**
 * Per-rail fee rates applied on top of the wallet credit (the customer is
 * charged amount + fee). Centralized so the UI preview and every provider agree.
 */
export const FEE_RATE_BY_KIND: Record<PaymentProvider["kind"], number> = {
  card: 0.1, // 10%
  crypto: 0.015, // 1.5%
  voucher: 0.02, // 2%
};

export function feeRate(kind: PaymentProvider["kind"]): number {
  return FEE_RATE_BY_KIND[kind] ?? 0;
}

export function estimateFeeMinor(
  amountMinor: number,
  kind: PaymentProvider["kind"],
): number {
  return Math.round(amountMinor * feeRate(kind));
}

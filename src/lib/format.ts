/**
 * Formats an integer minor-unit amount (e.g. cents) as a currency string.
 * Money is always stored and computed in integer minor units.
 */
export function formatMinor(amountMinor: number, currency = "USD"): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("Amount must be an integer in minor units");
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

export function formatCount(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}

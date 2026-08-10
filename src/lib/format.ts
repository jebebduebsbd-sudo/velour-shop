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

/**
 * Parses a human-typed major-unit amount ("12", "12.5", "12,99") into integer
 * minor units using string arithmetic, so a price never passes through a
 * binary float. Returns null for anything that is not a non-negative amount
 * with at most two decimal places.
 */
export function parseMinorFromDecimal(input: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  if (!Number.isSafeInteger(whole)) return null;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const minor = whole * 100 + Number(fraction);
  return Number.isSafeInteger(minor) ? minor : null;
}

import "server-only";

/**
 * LZT Market API configuration. The access token is a SECRET and is only ever
 * read on the server. Create an API client at
 * https://lolz.live/account/api/client-add and mint a token with the `market`
 * scope at https://lolz.live/account/api/get-token, then expose it to the app
 * as the LZT_MARKET_TOKEN environment variable (see the Secrets panel in
 * Cursor / your host's secret manager). Never commit the token or send it to
 * the browser.
 */
export const LZT_BASE_URL =
  process.env.LZT_MARKET_BASE_URL?.replace(/\/$/, "") ||
  "https://prod-api.lzt.market";

export function getLztToken(): string | null {
  const token = process.env.LZT_MARKET_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}

export function isLztConfigured(): boolean {
  return getLztToken() !== null;
}

/**
 * Currency the storefront requests prices in. LZT supports a `currency` query
 * parameter; we normalize everything to USD cents downstream.
 */
export const LZT_CURRENCY = process.env.LZT_MARKET_CURRENCY?.trim() || "usd";

/** Seconds to cache a category listing response (matches the 60s feed refresh). */
export const LZT_REVALIDATE_SECONDS = 60;

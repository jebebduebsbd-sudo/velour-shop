import { checkDeliverablePayload } from "@/lib/inventory/payload-policy";
import type { FeedListing } from "@/lib/suppliers/feed";

/**
 * Eligibility filter for supplier feed listings.
 *
 * Velour lists lawful, transferable digital goods: gift codes, activation
 * keys, vouchers, prepaid/top-up codes. A supplier feed is an untrusted
 * source, so every listing must earn its place through an allowlist rather
 * than dodge a denylist:
 *
 *   1. the supplier-declared kind must be one Velour sells,
 *   2. the listing must not describe account access,
 *   3. the supplier must explicitly assert transfer/resale rights,
 *   4. the price must be integer minor units in the catalogue currency,
 *   5. every shipped code must pass the inventory payload policy.
 *
 * Anything else is rejected with a reason the admin can read. Rejection is
 * always the default: an unrecognised kind fails, and a missing
 * transferability assertion fails.
 */
export type EligibilityResult = { ok: true } | { ok: false; reason: string };

/** Catalogue currency. The wallet and every product price are EUR. */
const CATALOG_CURRENCY = "EUR";

/** €10,000 — a sanity ceiling; anything above is a feed error, not a product. */
const MAX_PRICE_MINOR = 1_000_000;

/** Supplier-declared kinds Velour is allowed to list. */
const ALLOWED_KINDS = new Set([
  "gift_card",
  "gift_code",
  "gift_link",
  "activation_key",
  "product_key",
  "game_key",
  "software_key",
  "voucher",
  "prepaid_voucher",
  "subscription_voucher",
  "prepaid_code",
  "top_up_code",
  "wallet_code",
]);

/**
 * Terms that name an account being handed over rather than a transferable
 * code. Applied to the declared kind and the title — the fields that say what
 * is actually being sold.
 */
const ACCOUNT_OFFER =
  /\b(accounts?|acc|logins?|combos?|profiles?|cookies?|sessions?|subscriptions? ?(?:sharing|shared))\b/i;

/**
 * Harder credential signals, applied to free text. Deliberately narrower than
 * ACCOUNT_OFFER: prose like "credited to your account" is normal for a gift
 * card, but none of these belong in a listing for a transferable code.
 */
const CREDENTIAL_SIGNALS =
  /\b(passwords?|passwd|credentials?|cookie|session ?token|stealer|checkers?|combo ?list|imap|smtp|mail ?access|email ?access|inbox ?access|2fa|totp|authenticator|recovery ?codes?|backup ?codes?|shared ?account|private ?account|full ?access|hacked|cracked|phished|brute ?forced|leaked|dumps?)\b/i;

function normalizeKind(kind: string): string {
  return kind.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Decides whether a feed listing may become a Velour product. The listing's
 * codes are checked but never returned, logged, or included in any reason.
 */
export function checkListingEligibility(
  listing: FeedListing,
): EligibilityResult {
  const externalId = listing.externalId?.trim() ?? "";
  if (externalId.length === 0) return { ok: false, reason: "missing external id" };
  if (externalId.length > 128) return { ok: false, reason: "external id too long" };

  const title = listing.title?.trim() ?? "";
  if (title.length < 2) return { ok: false, reason: "missing title" };
  if (title.length > 200) return { ok: false, reason: "title too long" };

  const kind = normalizeKind(listing.kind ?? "");
  if (kind.length === 0) {
    return { ok: false, reason: "missing product kind" };
  }
  if (!ALLOWED_KINDS.has(kind)) {
    return {
      ok: false,
      reason: `kind "${kind}" is not a transferable code type Velour lists`,
    };
  }

  if (ACCOUNT_OFFER.test(kind) || ACCOUNT_OFFER.test(title)) {
    return {
      ok: false,
      reason: "listing offers account access, not a transferable code",
    };
  }

  const freeText = [listing.description, listing.deliverable, listing.warranty]
    .filter((value): value is string => typeof value === "string")
    .join("\n");
  const signal = CREDENTIAL_SIGNALS.exec(freeText);
  if (signal) {
    return {
      ok: false,
      reason: `listing text mentions "${signal[0].toLowerCase()}", which indicates account credentials`,
    };
  }

  if (listing.transferable !== true) {
    return {
      ok: false,
      reason:
        'supplier did not assert transfer rights (feed must set "transferable": true)',
    };
  }

  const currency = (listing.currency ?? "").trim().toUpperCase();
  if (currency !== CATALOG_CURRENCY) {
    return {
      ok: false,
      reason: `currency ${currency || "(missing)"} is not ${CATALOG_CURRENCY}`,
    };
  }

  if (!Number.isSafeInteger(listing.priceMinor) || listing.priceMinor <= 0) {
    return { ok: false, reason: "price must be a positive integer minor amount" };
  }
  if (listing.priceMinor > MAX_PRICE_MINOR) {
    return { ok: false, reason: "price above the sanity ceiling" };
  }

  // Any credential-shaped code disqualifies the whole listing: a feed that
  // mixes credentials into its codes is not a source we import selectively.
  const codes = listing.codes ?? [];
  for (const code of codes) {
    const check = checkDeliverablePayload(code);
    if (!check.ok) {
      return {
        ok: false,
        reason: `rejected by inventory payload policy (${check.reason})`,
      };
    }
  }

  return { ok: true };
}

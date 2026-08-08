/**
 * Inventory payload policy.
 *
 * Velour only stocks lawful, transferable codes/keys/vouchers. This gate
 * rejects anything that looks like account credentials, mailbox access,
 * cookies, tokens, or 2FA/recovery data before it can ever be encrypted and
 * stored — a defense-in-depth complement to the schema having no credential
 * fields at all.
 */
export type PayloadCheck =
  | { ok: true }
  | { ok: false; reason: string };

const RULES: { test: RegExp; reason: string }[] = [
  {
    test: /:\/\/[^\s]*@|[^\s]+:[^\s]+@[^\s]+/,
    reason: "looks like credentials embedded in a URL/authority",
  },
  {
    // email:password or user:pass pairs
    test: /[^\s:]+@[^\s:]+\.[^\s:]+\s*:\s*\S+/,
    reason: "looks like an email:password pair",
  },
  {
    test: /\b(pass(word)?|passwd|pwd)\b\s*[:=]/i,
    reason: "contains a password field",
  },
  {
    test: /\b(login|username|user)\b\s*[:=][^]*\b(pass|pwd)\b\s*[:=]/i,
    reason: "looks like an account login pair",
  },
  {
    test: /otpauth:\/\/|\b2fa\b|\btwo[-\s]?factor\b|\btotp\b|authenticator/i,
    reason: "looks like 2FA / authenticator data",
  },
  {
    test: /\brecovery\s*(code|key)s?\b|\bbackup\s*codes?\b/i,
    reason: "looks like recovery/backup codes",
  },
  {
    test: /\bcookie\b|sessionid|__Secure-|_session=|session[_-]?token/i,
    reason: "looks like a cookie / session token",
  },
  {
    // Cookie-jar / Netscape cookie exports and JSON cookie arrays
    test: /"domain"\s*:\s*"|# Netscape HTTP Cookie File/i,
    reason: "looks like an exported cookie jar",
  },
  {
    test: /-----BEGIN [A-Z ]+-----/,
    reason: "looks like an exported key/certificate file",
  },
];

export function checkDeliverablePayload(raw: string): PayloadCheck {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, reason: "empty payload" };
  if (value.length > 4000) return { ok: false, reason: "payload too large" };
  // Multi-line blobs are characteristic of credential/cookie dumps, not codes.
  if (value.split(/\r?\n/).filter((line) => line.trim()).length > 3) {
    return { ok: false, reason: "multi-line blob is not a single deliverable code" };
  }
  for (const rule of RULES) {
    if (rule.test.test(value)) return { ok: false, reason: rule.reason };
  }
  return { ok: true };
}

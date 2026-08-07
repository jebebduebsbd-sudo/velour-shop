import { cookies } from "next/headers";

import { isProduction } from "@/lib/env";

/**
 * Referral attribution cookie. Set when a visitor arrives via a referral link
 * (/r/<code>) and read once at registration to attribute the new account.
 */
export const REFERRAL_COOKIE = "velour_ref";
const REFERRAL_TTL_DAYS = 30;

export async function setReferralCookie(code: string): Promise<void> {
  const store = await cookies();
  store.set(REFERRAL_COOKIE, code.toUpperCase(), {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: REFERRAL_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function readReferralCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFERRAL_COOKIE)?.value ?? null;
}

export async function clearReferralCookie(): Promise<void> {
  const store = await cookies();
  store.delete(REFERRAL_COOKIE);
}

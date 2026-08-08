"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

/**
 * Sets the UI locale cookie. Called from the language switcher. Only accepts a
 * known locale; the cookie is not httpOnly since it only affects presentation.
 */
export async function setLocaleAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "");
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
}

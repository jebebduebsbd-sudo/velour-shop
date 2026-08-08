export const LOCALES = ["en", "bg"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "velour_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  bg: "Български",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

import { Globe } from "lucide-react";

import { setLocaleAction } from "@/app/actions/locale";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";

/**
 * Language switcher. Each locale is a tiny form that sets the cookie and
 * re-renders — no client JS required, works with the server-resolved locale.
 */
export function LanguageSwitcher({ current }: { current: Locale }) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-line bg-surface-2 p-0.5">
      <Globe
        className="ml-1 h-3.5 w-3.5 text-ink-faint"
        aria-hidden="true"
      />
      {LOCALES.map((locale) => (
        <form action={setLocaleAction} key={locale}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            aria-current={current === locale ? "true" : undefined}
            aria-label={`Switch to ${LOCALE_LABELS[locale]}`}
            className={`rounded-[calc(var(--radius-sm)-2px)] px-2 py-1 text-xs font-medium transition-colors duration-(--duration-base) ${
              current === locale
                ? "bg-surface-3 text-ink"
                : "text-ink-faint hover:text-ink"
            }`}
          >
            {locale.toUpperCase()}
          </button>
        </form>
      ))}
    </div>
  );
}

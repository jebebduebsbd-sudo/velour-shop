import Link from "next/link";

import { VelourEmblem } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

const FOOTER_LINKS = [
  { href: "/market", label: "Market" },
  { href: "/trust", label: "Trust Center" },
  { href: "/buyer-protection", label: "Buyer protection" },
  { href: "/status", label: "Status" },
] as const;

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refund policy" },
  { href: "/acceptable-use", label: "Acceptable use" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter({
  tagline = "Premium digital goods with documented, lawful inventory.",
  disclaimer = "Demo catalog preview — policy pages are informational and not legal advice.",
  locale = DEFAULT_LOCALE,
}: {
  tagline?: string;
  disclaimer?: string;
  locale?: Locale;
}) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <VelourEmblem className="h-6 w-6" />
          <span className="text-sm font-bold tracking-[0.22em] text-ink">
            VELOUR
          </span>
          <span className="hidden text-sm text-ink-faint sm:inline">
            · {tagline}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <nav aria-label="Footer" className="flex items-center gap-4">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-ink-muted transition-colors duration-(--duration-base) hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher current={locale} />
        </div>
      </div>
      <div className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-ink-faint">
            © {new Date().getFullYear()} Velour · velour.shop · {disclaimer}
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-ink-faint transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

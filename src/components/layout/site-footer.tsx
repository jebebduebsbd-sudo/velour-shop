import Link from "next/link";

import { VelourEmblem } from "@/components/brand/logo";

const FOOTER_LINKS = [
  { href: "/market", label: "Market" },
  { href: "/buyer-protection", label: "Buyer protection" },
  { href: "/auth/sign-in", label: "Sign in" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <VelourEmblem className="h-6 w-6" />
          <span className="text-sm font-bold tracking-[0.22em] text-ink">
            VELOUR
          </span>
          <span className="hidden text-sm text-ink-faint sm:inline">
            · Premium digital goods with documented, lawful inventory.
          </span>
        </div>
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
      </div>
      <div className="border-t border-line/60">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-ink-faint sm:px-6">
          © {new Date().getFullYear()} Velour · velour.shop · Demo catalog
          preview — policy pages are informational and not legal advice.
        </p>
      </div>
    </footer>
  );
}

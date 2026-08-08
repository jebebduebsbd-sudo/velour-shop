import { LayoutDashboard, Search } from "lucide-react";
import Link from "next/link";

import { VelourLogo } from "@/components/brand/logo";
import {
  CategoryCombobox,
  type ComboboxCategory,
} from "@/components/category/category-combobox";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { buttonClasses } from "@/components/ui/button";
import { WalletChip } from "@/components/wallet/wallet-chip";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";

export function SiteHeader({
  categories,
  totalUnits,
  username,
  locale,
  t,
}: {
  categories: ComboboxCategory[];
  totalUnits: number;
  username?: string | null;
  locale: Locale;
  t: Messages;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-overlay backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Velour home"
          className="shrink-0 rounded-md"
        >
          <VelourLogo />
        </Link>

        <div className="hidden lg:block">
          <NavLinks
            labels={{
              market: t.nav.market,
              earn: t.nav.earn,
              buyerProtection: t.nav.buyerProtection,
            }}
          />
        </div>

        <div className="flex-1" />

        <form
          role="search"
          action="/market"
          className="relative hidden xl:block"
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            aria-label={t.nav.searchPlaceholder}
            placeholder={t.nav.searchPlaceholder}
            autoComplete="off"
            className="h-10 w-56 rounded-md border border-line bg-surface-2 pr-3 pl-9 text-sm text-ink placeholder:text-ink-faint transition-colors duration-(--duration-base) hover:border-line-strong focus:border-accent focus:outline-none"
          />
        </form>

        <div className="hidden lg:block">
          <CategoryCombobox
            categories={categories}
            totalUnits={totalUnits}
            label={t.nav.browseCategories}
          />
        </div>

        <div className="hidden lg:block">
          <LanguageSwitcher current={locale} />
        </div>

        <WalletChip
          addFundsHref={username ? "/wallet/top-up" : "/auth/sign-in"}
        />

        <div className="hidden items-center gap-2 lg:flex">
          {username ? (
            <Link
              href="/dashboard"
              className={buttonClasses("secondary", "md")}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              {username}
            </Link>
          ) : (
            <>
              <Link
                href="/auth/sign-in"
                className={buttonClasses("secondary", "md")}
              >
                {t.nav.signIn}
              </Link>
              <Link
                href="/auth/sign-up"
                className={buttonClasses("primary", "md")}
              >
                {t.nav.signUp}
              </Link>
            </>
          )}
        </div>

        <MobileNav categories={categories} signedIn={Boolean(username)} />
      </div>
    </header>
  );
}

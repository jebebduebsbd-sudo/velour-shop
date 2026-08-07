import Link from "next/link";

import { VelourLogo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WalletChip } from "@/components/wallet/wallet-chip";
import { requireSession } from "@/lib/auth/guards";
import { getWalletBalance } from "@/lib/wallet/ledger";

// Authenticated pages always render per-request and are never cached.
export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const balance = await getWalletBalance(session.user.id).catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-accent px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-overlay backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="Velour home" className="shrink-0">
            <VelourLogo />
          </Link>
          <div className="flex-1" />
          <WalletChip
            balanceMinor={balance?.spendableMinor ?? 0}
            currency={balance?.currency ?? "EUR"}
            addFundsHref="/wallet/top-up"
          />
          <span className="hidden text-sm text-ink-muted sm:inline">
            {session.user.username}
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <aside
          aria-label="Sidebar"
          className="hidden w-56 shrink-0 lg:block"
        >
          <div className="sticky top-24">
            <SidebarNav />
          </div>
        </aside>
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

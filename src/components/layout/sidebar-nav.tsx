"use client";

import {
  BadgeCheck,
  BookmarkCheck,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquareWarning,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShieldHalf,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
  Wallet,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/(public)/auth/actions";

/**
 * Customer sidebar. Only genuinely implemented destinations appear here —
 * no withdrawals, transfers, auto-buy, giveaways, referrals, or reseller
 * entries, since none of those exist in this product.
 */
const SECTIONS = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/market", label: "Market", icon: Store },
      { href: "/orders", label: "Purchases", icon: ShoppingBag },
    ],
  },
  {
    label: "Earn",
    items: [
      { href: "/affiliate/dashboard", label: "Affiliate", icon: Sparkles },
    ],
  },
  {
    label: "Buyer tools",
    items: [
      { href: "/saved", label: "Saved searches", icon: BookmarkCheck },
      { href: "/warranty", label: "Warranty", icon: BadgeCheck },
    ],
  },
  {
    label: "Wallet",
    items: [
      { href: "/wallet/transactions", label: "Transactions", icon: Receipt },
      { href: "/wallet/top-up", label: "Add funds", icon: Plus },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/refunds", label: "Refunds", icon: RotateCcw },
      { href: "/disputes", label: "Disputes", icon: MessageSquareWarning },
      { href: "/support", label: "Tickets", icon: LifeBuoy },
      {
        href: "/buyer-protection",
        label: "Buyer protection",
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/account", label: "Profile", icon: UserRound },
      { href: "/account/security", label: "Security", icon: ShieldCheck },
    ],
  },
] as const;

const ALL_HREFS = SECTIONS.flatMap((section) =>
  section.items.map((item) => item.href),
);

/**
 * Resolves the single active entry by longest prefix match, so a nested route
 * such as /account/security highlights "Security" without also lighting up
 * its parent "Profile" (/account).
 */
function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}

export function SidebarNav({ showAdmin = false }: { showAdmin?: boolean }) {
  const pathname = usePathname();
  const current = activeHref(pathname);

  return (
    <nav aria-label="Account" className="space-y-6">
      {showAdmin ? (
        <Link
          href="/admin"
          className="flex items-center gap-2.5 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold text-lilac transition-colors duration-(--duration-base) hover:bg-accent/15"
        >
          <ShieldHalf className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          Admin panel
        </Link>
      ) : null}
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 pb-2 text-[0.65rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = current === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-(--duration-base) ${
                      active
                        ? "border border-accent/40 bg-accent/10 font-semibold text-ink"
                        : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <item.icon
                      className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <form action={signOutAction} className="border-t border-line pt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink-muted transition-colors duration-(--duration-base) hover:bg-surface-2 hover:text-ink"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          Sign out
        </button>
      </form>
    </nav>
  );
}

export function WalletSidebarSummary() {
  return (
    <Link
      href="/wallet/top-up"
      className="flex items-center gap-2.5 rounded-md border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink-muted transition-colors duration-(--duration-base) hover:border-accent/50 hover:text-ink"
    >
      <Wallet className="h-4 w-4 text-orchid" strokeWidth={1.75} aria-hidden="true" />
      Add funds
    </Link>
  );
}

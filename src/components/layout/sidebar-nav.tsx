"use client";

import {
  BadgeCheck,
  BookmarkCheck,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Receipt,
  ShieldCheck,
  ShoppingBag,
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

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 pb-2 text-[0.65rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/market" &&
                  pathname.startsWith(`${item.href}/`));
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

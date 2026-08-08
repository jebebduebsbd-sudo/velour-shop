"use client";

import {
  ClipboardList,
  LayoutDashboard,
  MessageSquareWarning,
  Package,
  RotateCcw,
  ScrollText,
  ShoppingBag,
  Star,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/suppliers", label: "Suppliers", icon: Truck, exact: false },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw, exact: false },
  { href: "/admin/disputes", label: "Disputes", icon: MessageSquareWarning, exact: false },
  { href: "/admin/reviews", label: "Reviews", icon: Star, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/providers", label: "Providers", icon: ClipboardList, exact: false },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-0.5">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-(--duration-base) ${
              active
                ? "border border-accent/40 bg-accent/10 font-semibold text-ink"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <link.icon
              className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

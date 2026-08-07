"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/market", label: "Market" },
  { href: "/affiliate", label: "Earn with Velour" },
  { href: "/buyer-protection", label: "Buyer protection" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-md px-3 py-2 text-sm transition-colors duration-(--duration-base) ${
              active
                ? "font-semibold text-ink after:absolute after:inset-x-3 after:-bottom-[calc(0.5rem+1px)] after:h-0.5 after:rounded-full after:bg-accent"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

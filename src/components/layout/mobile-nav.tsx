"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PlatformMark } from "@/components/icons/platform-mark";
import type { ComboboxCategory } from "@/components/category/category-combobox";

/**
 * Mobile navigation disclosure. Closes on Escape, on outside click, and on
 * route change; focus returns to the toggle when closed with Escape.
 */
export function MobileNav({
  categories,
  signedIn = false,
}: {
  categories: ComboboxCategory[];
  signedIn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close the panel when navigation changes the route (state derived from
  // props during render, per React guidance — no effect needed).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-muted hover:text-ink"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div
          id="mobile-nav-panel"
          className="glass-panel absolute inset-x-4 top-[calc(100%+0.5rem)] z-50 rounded-lg p-3"
        >
          <nav aria-label="Mobile" className="space-y-1">
            <MobileLink href="/market" label="Market" pathname={pathname} />
            <MobileLink
              href="/buyer-protection"
              label="Buyer protection"
              pathname={pathname}
            />
            {signedIn ? (
              <MobileLink
                href="/dashboard"
                label="Dashboard"
                pathname={pathname}
              />
            ) : (
              <>
                <MobileLink
                  href="/auth/sign-in"
                  label="Sign in"
                  pathname={pathname}
                />
                <MobileLink
                  href="/auth/sign-up"
                  label="Sign up"
                  pathname={pathname}
                />
              </>
            )}
          </nav>
          <p className="px-2 pt-3 pb-1 text-[0.65rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Categories
          </p>
          <ul className="scroll-area grid max-h-64 grid-cols-2 gap-1 overflow-y-auto">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/market/${category.slug}`}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-orchid">
                    <PlatformMark slug={category.slug} className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{category.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MobileLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block rounded-md px-2 py-2 text-sm ${
        active
          ? "bg-surface-3 font-semibold text-ink"
          : "text-ink-muted hover:bg-surface-3 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

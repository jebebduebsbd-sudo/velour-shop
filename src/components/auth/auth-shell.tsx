import Link from "next/link";

import { VelourEmblem } from "@/components/brand/logo";
import { PlatformTile } from "@/components/icons/platform-mark";
import { Panel } from "@/components/ui/panel";

const SHOWCASE = [
  { slug: "fortnite", name: "Fortnite", note: "Gift codes" },
  { slug: "valorant", name: "Valorant", note: "VP cards" },
  { slug: "steam", name: "Steam", note: "Wallet codes" },
  { slug: "discord", name: "Discord", note: "Nitro gifts" },
] as const;

/**
 * Split-panel authentication layout: Velour branding on the left,
 * the form on the right; single panel on mobile.
 */
export function AuthShell({
  headline,
  children,
}: {
  headline: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-4xl items-center px-4 py-12 sm:px-6 lg:py-20">
      <Panel className="grid w-full grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="relative hidden flex-col justify-between border-r border-line bg-surface-2 p-8 md:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent-deep/20 blur-3xl"
          />
          <Link
            href="/"
            aria-label="Velour home"
            className="relative inline-flex items-center gap-2.5"
          >
            <VelourEmblem className="h-7 w-7" />
            <span className="text-base font-bold tracking-[0.22em] text-ink">
              VELOUR
            </span>
          </Link>
          <div className="relative">
            <p className="text-3xl leading-tight font-bold tracking-tight text-ink italic">
              {headline}
            </p>
            <ul className="mt-8 space-y-3">
              {SHOWCASE.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/market/${item.slug}`}
                    className="flex items-center gap-3 rounded-md border border-line bg-surface-1 px-3 py-2.5 transition-colors duration-(--duration-base) hover:border-line-strong"
                  >
                    <PlatformTile slug={item.slug} size="sm" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-ink">
                        {item.name}
                      </span>
                      <span className="block text-xs text-ink-faint">
                        {item.note}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-ink-faint">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-ink-faint">
            Lawful digital goods only. Documented inventory.
          </p>
        </div>
        <div className="p-6 sm:p-10">{children}</div>
      </Panel>
    </div>
  );
}

export function AuthTabs({ active }: { active: "sign-in" | "sign-up" }) {
  return (
    <div
      role="navigation"
      aria-label="Authentication pages"
      className="grid grid-cols-2 rounded-md border border-line bg-surface-2 p-1"
    >
      <AuthTab
        href="/auth/sign-in"
        label="Sign in"
        active={active === "sign-in"}
      />
      <AuthTab
        href="/auth/sign-up"
        label="Sign up"
        active={active === "sign-up"}
      />
    </div>
  );
}

function AuthTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-[calc(var(--radius-md)-4px)] px-3 py-2 text-center text-sm transition-colors duration-(--duration-base) ${
        active
          ? "bg-surface-3 font-semibold text-ink"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

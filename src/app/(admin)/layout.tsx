import Link from "next/link";

import { VelourLogo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireRole } from "@/lib/auth/guards";

// Admin is always per-request and never cached.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // ADMIN-only; a signed-in non-admin gets a 404 (route not confirmed).
  await requireRole("ADMIN");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-overlay backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="Velour home" className="shrink-0">
            <VelourLogo />
          </Link>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-lilac">
            Admin
          </span>
          <div className="flex-1" />
          <Link
            href="/dashboard"
            className="text-sm text-ink-muted hover:text-ink"
          >
            Exit to app
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-20">
            <AdminNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

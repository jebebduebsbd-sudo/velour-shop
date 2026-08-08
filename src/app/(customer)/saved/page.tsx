import { BookmarkCheck, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  createSavedSearchAction,
  deleteSavedSearchAction,
} from "@/app/(customer)/support/actions";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { CATEGORY_DEFS } from "@/lib/categories";
import { getUserSavedSearches } from "@/lib/support/saved-searches";

export const metadata: Metadata = {
  title: "Saved searches",
  robots: { index: false, follow: false },
};

export default async function SavedSearchesPage() {
  const session = await requireSession("/saved");
  const searches = await getUserSavedSearches(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Buyer tools
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Saved searches</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Save a category and keyword to jump back into the market quickly.
        </p>
      </div>

      <Panel className="p-6">
        <h2 className="text-sm font-semibold text-ink">Save a search</h2>
        <form
          action={createSavedSearchAction}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          <div className="space-y-1.5">
            <label className="block text-xs text-ink-faint">Label</label>
            <input
              name="label"
              required
              placeholder="e.g. Steam codes"
              className="h-9 w-full rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-ink-faint">Category</label>
            <select
              name="categorySlug"
              className="h-9 w-full rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
            >
              <option value="">Any</option>
              {CATEGORY_DEFS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-ink-faint">Keyword</label>
            <input
              name="query"
              placeholder="optional"
              className="h-9 w-full rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" variant="primary" size="sm">
              Save search
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        {searches.length === 0 ? (
          <p className="flex flex-col items-center gap-2 p-10 text-center text-sm text-ink-muted">
            <BookmarkCheck className="h-8 w-8 text-ink-faint" aria-hidden="true" />
            No saved searches yet.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {searches.map((search) => (
              <li key={search.id} className="flex items-center gap-4 px-5 py-4">
                <Link
                  href={search.href}
                  className="min-w-0 flex-1"
                >
                  <span className="block text-sm font-medium text-ink hover:text-lilac">
                    {search.label}
                  </span>
                  <span className="block text-xs text-ink-faint">
                    {search.categorySlug ?? "All categories"}
                    {search.query ? ` · “${search.query}”` : ""}
                  </span>
                </Link>
                <form action={deleteSavedSearchAction}>
                  <input type="hidden" name="id" value={search.id} />
                  <Button type="submit" variant="ghost" size="sm" aria-label="Delete">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

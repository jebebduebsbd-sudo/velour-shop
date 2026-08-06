import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { ComboboxCategory } from "@/components/category/category-combobox";
import { getCategorySummaries } from "@/lib/catalog";
import { CATEGORY_DEFS } from "@/lib/categories";

// Storefront data (stock counts, live inventory) is read per-request.
export const dynamic = "force-dynamic";

async function getHeaderData(): Promise<{
  categories: ComboboxCategory[];
  totalUnits: number;
}> {
  try {
    const summaries = await getCategorySummaries();
    return {
      categories: summaries,
      totalUnits: summaries.reduce((sum, c) => sum + c.availableUnits, 0),
    };
  } catch {
    // Header must stay usable even if the catalog read fails.
    return {
      categories: CATEGORY_DEFS.map((def) => ({
        slug: def.slug,
        name: def.name,
        availableUnits: 0,
      })),
      totalUnits: 0,
    };
  }
}

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { categories, totalUnits } = await getHeaderData();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-accent px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>
      <SiteHeader categories={categories} totalUnits={totalUnits} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

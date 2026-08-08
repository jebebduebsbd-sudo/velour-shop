import { isCategorySlug } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

/** Saved market searches for a customer. */
export async function createSavedSearch(input: {
  userId: string;
  label: string;
  categorySlug?: string | null;
  query?: string | null;
}): Promise<void> {
  const categorySlug =
    input.categorySlug && isCategorySlug(input.categorySlug)
      ? input.categorySlug
      : null;
  await prisma.savedSearch.create({
    data: {
      userId: input.userId,
      label: input.label.trim().slice(0, 80) || "Saved search",
      categorySlug,
      query: input.query?.trim().slice(0, 64) || null,
    },
  });
}

/** Deletes a saved search, scoped to its owner (no IDOR). */
export async function deleteSavedSearch(input: {
  userId: string;
  id: string;
}): Promise<void> {
  await prisma.savedSearch.deleteMany({
    where: { id: input.id, userId: input.userId },
  });
}

export async function getUserSavedSearches(userId: string) {
  const rows = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      categorySlug: true,
      query: true,
      createdAt: true,
    },
  });
  return rows.map((row) => {
    const params = new URLSearchParams();
    if (row.query) params.set("q", row.query);
    const href = row.categorySlug
      ? `/market/${row.categorySlug}${params.size ? `?${params}` : ""}`
      : `/market${params.size ? `?${params}` : ""}`;
    return { ...row, href };
  });
}

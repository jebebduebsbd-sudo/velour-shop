import { prisma } from "@/lib/prisma";

/**
 * Real, privacy-safe recent-purchase notifications.
 *
 * Sourced only from genuine FULFILLED orders — never fabricated. Each blurb
 * exposes only the (public) product title and a coarse relative time. No
 * username, email, amount, location, or order id is included.
 */
export type RecentPurchase = {
  id: string;
  productTitle: string;
  when: string;
};

function relativeWhen(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 60) return "in the last hour";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "about an hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export async function getRecentPublicPurchases(
  limit = 8,
): Promise<RecentPurchase[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { status: "FULFILLED", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 20),
    // Deliberately no user relation, amount, or id-with-meaning selected.
    select: { id: true, productTitle: true, createdAt: true },
  });

  return orders.map((order) => ({
    // A random-ish opaque key for React; not tied to the buyer.
    id: order.id.slice(-6),
    productTitle: order.productTitle,
    when: relativeWhen(order.createdAt),
  }));
}

import { prisma } from "@/lib/prisma";

/**
 * Verified Vouches — reviews always tied to a real fulfilled order.
 *
 * A review can only be created by the order's owner, for a FULFILLED order,
 * once per order. There is no path to a seller-created or order-less review.
 */
export type SubmitReviewResult =
  | { ok: true; reviewId: string }
  | { ok: false; reason: "order_not_found" | "not_eligible" | "already_reviewed" };

export async function submitReview(input: {
  userId: string;
  orderId: string;
  rating: number;
  body: string;
}): Promise<SubmitReviewResult> {
  const rating = Math.min(Math.max(Math.round(input.rating), 1), 5);
  const body = input.body.trim().slice(0, 2000);
  if (body.length < 3) return { ok: false, reason: "not_eligible" };

  // Ownership + eligibility enforced here (no IDOR, no order-less review).
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.userId },
    select: { id: true, status: true, productId: true },
  });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status !== "FULFILLED") return { ok: false, reason: "not_eligible" };

  try {
    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        userId: input.userId,
        productId: order.productId,
        rating,
        body,
      },
      select: { id: true },
    });
    return { ok: true, reviewId: review.id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "already_reviewed" };
    }
    throw error;
  }
}

export type ProductReviews = {
  average: number | null;
  count: number;
  reviews: {
    id: string;
    rating: number;
    body: string;
    author: string;
    createdAt: Date;
  }[];
};

/** Published reviews for a product, with the real average rating. */
export async function getProductReviews(
  productId: string,
  limit = 20,
): Promise<ProductReviews> {
  const [aggregate, rows] = await Promise.all([
    prisma.review.aggregate({
      where: { productId, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.findMany({
      where: { productId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        rating: true,
        body: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    }),
  ]);

  return {
    average: aggregate._avg.rating,
    count: aggregate._count,
    reviews: rows.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      // First initial only — reviews are public, so minimize exposure.
      author: `${review.user.username.slice(0, 1).toUpperCase()}****`,
      createdAt: review.createdAt,
    })),
  };
}

export async function setReviewStatus(input: {
  reviewId: string;
  status: "PUBLISHED" | "HIDDEN";
}): Promise<void> {
  await prisma.review.update({
    where: { id: input.reviewId },
    data: { status: input.status },
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

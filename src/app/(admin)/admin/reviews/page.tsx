import type { Metadata } from "next";

import { setReviewStatusAction } from "@/app/(admin)/actions";
import { Stars } from "@/components/reviews/stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin — reviews",
  robots: { index: false },
};

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      rating: true,
      body: true,
      status: true,
      createdAt: true,
      product: { select: { title: true } },
      user: { select: { username: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Reviews</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Every review is tied to a fulfilled order. Moderation can only hide a
          review for policy reasons — the rating and text are never rewritten.
        </p>
      </div>

      <Panel className="overflow-hidden">
        {reviews.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No reviews yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-wrap items-start gap-4 p-5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <Stars rating={review.rating} className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium text-ink">
                      {review.product.title}
                    </span>
                    <Badge variant={review.status === "PUBLISHED" ? "success" : "muted"}>
                      {review.status.toLowerCase()}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-xs text-ink-faint">
                    {review.user.username} ·{" "}
                    {review.createdAt.toISOString().slice(0, 10)}
                  </span>
                  <p className="mt-1 text-sm text-ink-muted">{review.body}</p>
                </span>
                <form action={setReviewStatusAction}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={review.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED"}
                  />
                  <Button
                    type="submit"
                    variant={review.status === "PUBLISHED" ? "danger" : "secondary"}
                    size="sm"
                  >
                    {review.status === "PUBLISHED" ? "Hide" : "Publish"}
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

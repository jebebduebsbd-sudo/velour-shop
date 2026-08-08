import { BadgeCheck } from "lucide-react";

import { Stars } from "@/components/reviews/stars";
import { Panel } from "@/components/ui/panel";
import type { ProductReviews } from "@/lib/reviews/service";

/**
 * Verified Vouches panel for a product page. Shows only real, order-backed
 * reviews and an honest "no verified reviews yet" state when there are none.
 */
export function ProductReviewsPanel({ data }: { data: ProductReviews }) {
  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink uppercase">
          <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
          Verified vouches
        </h2>
        {data.count > 0 && data.average !== null ? (
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <Stars rating={data.average} />
            {data.average.toFixed(1)} · {data.count}
          </span>
        ) : null}
      </div>

      {data.count === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          No verified reviews yet. Reviews can only be left by customers who
          purchased and received this product.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {data.reviews.map((review) => (
            <li key={review.id} className="border-b border-line pb-4 last:border-0">
              <div className="flex items-center justify-between">
                <Stars rating={review.rating} className="h-3.5 w-3.5" />
                <span className="text-xs text-ink-faint">
                  {review.author} · {review.createdAt.toISOString().slice(0, 10)}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-muted">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

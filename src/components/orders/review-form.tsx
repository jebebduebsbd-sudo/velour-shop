"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { submitReviewAction } from "@/app/(customer)/orders/refund-dispute-actions";
import { Button } from "@/components/ui/button";

/** Review form shown on a fulfilled order the buyer hasn't reviewed yet. */
export function ReviewForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(5);

  return (
    <form action={submitReviewAction} className="mt-3 space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className="rounded-sm p-0.5"
          >
            <Star
              className={`h-6 w-6 ${n <= rating ? "fill-warning text-warning" : "text-line-strong"}`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <textarea
        name="body"
        rows={3}
        required
        placeholder="How was the product and delivery?"
        className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
      />
      <Button type="submit" variant="primary" size="sm">
        Submit review
      </Button>
    </form>
  );
}

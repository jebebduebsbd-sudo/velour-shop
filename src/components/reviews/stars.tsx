import { Star } from "lucide-react";

/** Read-only star rating display (rounded to the nearest whole star). */
export function Stars({
  rating,
  className = "h-4 w-4",
}: {
  rating: number;
  className?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${className} ${n <= rounded ? "fill-warning text-warning" : "text-line-strong"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

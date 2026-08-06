import { PLATFORM_MARKS } from "./platform-marks.generated";

/**
 * Renders a locally stored platform mark (documented in
 * public/assets/manifest.json) inside a subtle tinted tile. Marks inherit
 * currentColor so callers control the tint — no per-icon glow.
 */
export function PlatformMark({
  slug,
  className = "h-5 w-5",
}: {
  slug: string;
  className?: string;
}) {
  const mark = PLATFORM_MARKS[slug];
  if (!mark) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d={mark.path} />
    </svg>
  );
}

export function PlatformTile({
  slug,
  size = "md",
}: {
  slug: string;
  size?: "sm" | "md" | "lg";
}) {
  const tile =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const mark =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-line bg-surface-3 text-orchid ${tile}`}
    >
      <PlatformMark slug={slug} className={mark} />
    </span>
  );
}

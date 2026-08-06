import type { ReactNode } from "react";

type BadgeVariant = "success" | "muted" | "accent" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  success: "border-success/30 bg-success/10 text-success",
  muted: "border-line bg-surface-2 text-ink-muted",
  accent: "border-accent/40 bg-accent/10 text-lilac",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

export function Badge({
  variant = "muted",
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

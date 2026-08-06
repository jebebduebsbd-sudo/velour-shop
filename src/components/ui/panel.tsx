import type { HTMLAttributes } from "react";

/** Standard elevated dark surface used across the storefront. */
export function Panel({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass-panel rounded-lg ${className}`} {...props} />;
}

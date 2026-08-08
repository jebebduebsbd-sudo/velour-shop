"use client";

import { BadgeCheck, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import type { RecentPurchase } from "@/lib/trust/recent-purchases";

const DISMISS_KEY = "velour_hide_recent";
const ROTATE_MS = 6000;

// Reads the per-session opt-out flag as an external store, so there's no
// setState-in-effect and hydration stays consistent (server snapshot = false).
const noopSubscribe = () => () => {};
function useDismissedFlag(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => sessionStorage.getItem(DISMISS_KEY) === "1",
    () => false,
  );
}

/**
 * Rotating, dismissible recent-purchase notification. Renders only real events
 * passed from the server; shows nothing when there are none. Respects
 * prefers-reduced-motion (no entrance animation) and a per-session opt-out.
 */
export function RecentPurchaseToast({ items }: { items: RecentPurchase[] }) {
  const [index, setIndex] = useState(0);
  const [dismissedLocal, setDismissedLocal] = useState(false);
  const hidden = useDismissedFlag() || dismissedLocal;

  useEffect(() => {
    if (hidden || items.length <= 1) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [hidden, items.length]);

  if (hidden || items.length === 0) return null;
  const item = items[index % items.length]!;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-30 hidden max-w-xs sm:block"
    >
      <div className="glass-panel flex items-start gap-3 rounded-lg p-3 pr-2 shadow-panel">
        <BadgeCheck
          className="mt-0.5 h-5 w-5 shrink-0 text-success"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">
            A verified customer purchased{" "}
            <span className="font-medium">“{item.productTitle}”</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {item.when} · verified order
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss notifications"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, "1");
            setDismissedLocal(true);
          }}
          className="rounded-sm p-1 text-ink-faint transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

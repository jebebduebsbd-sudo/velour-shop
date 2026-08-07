"use client";

import { Check, Copy, Eye, KeyRound, Lock } from "lucide-react";
import { useActionState, useState } from "react";

import {
  revealDeliverableAction,
  type RevealState,
} from "@/app/(customer)/orders/actions";
import { Button } from "@/components/ui/button";

const initialState: RevealState = { status: "idle" };

/**
 * The deliverable stays masked until the owner confirms their password
 * (step-up). This masked-by-default design means a screen recording naturally
 * shows the code hidden unless it is deliberately revealed.
 */
export function RevealDeliverable({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(
    revealDeliverableAction,
    initialState,
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const revealed = state.status === "revealed";

  async function copy() {
    if (state.status !== "revealed") return;
    try {
      await navigator.clipboard.writeText(state.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; the value is selectable on screen.
    }
  }

  return (
    <div className="rounded-md border border-line bg-surface-2 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <KeyRound className="h-4 w-4 text-orchid" aria-hidden="true" />
        Your deliverable
      </div>

      <div className="mt-3 flex items-center gap-2">
        <code
          className="flex-1 truncate rounded-md border border-line bg-background px-3 py-2 font-mono text-sm text-ink"
          aria-live="polite"
        >
          {revealed ? state.value : "•••• •••• •••• ••••"}
        </code>
        {revealed ? (
          <Button type="button" variant="secondary" size="sm" onClick={copy}>
            {copied ? (
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        ) : null}
      </div>

      {!revealed && !showPrompt ? (
        <div className="mt-3">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowPrompt(true)}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Reveal code
          </Button>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
            <Lock className="h-3 w-3" aria-hidden="true" />
            You&apos;ll confirm your password. The code is stored encrypted and
            never appears in logs or emails.
          </p>
        </div>
      ) : null}

      {!revealed && showPrompt ? (
        <form action={formAction} className="mt-3 space-y-2">
          <input type="hidden" name="orderId" value={orderId} />
          <label htmlFor="reveal-password" className="sr-only">
            Confirm your password
          </label>
          <input
            id="reveal-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Confirm your password"
            className="h-10 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          {state.status === "error" ? (
            <p role="alert" className="text-xs text-danger">
              {state.message}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending}
            className="w-full"
          >
            {pending ? "Verifying…" : "Confirm and reveal"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

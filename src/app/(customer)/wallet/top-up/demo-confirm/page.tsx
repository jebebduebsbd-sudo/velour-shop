import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { simulateProviderCallbackAction } from "@/app/(customer)/wallet/top-up/demo-confirm/actions";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { serverEnv } from "@/lib/env";
import { formatMinor } from "@/lib/format";

export const metadata: Metadata = {
  title: "Confirm demo top-up",
  robots: { index: false, follow: false },
};

/**
 * Stand-in for a provider's hosted checkout page (development only). It does
 * NOT credit the wallet on load — pressing the button fires a signed webhook
 * to the app, which is the only path that can create a credit. This makes the
 * "no credit from the browser redirect alone" rule visible and testable.
 */
export default async function DemoConfirmPage(
  props: PageProps<"/wallet/top-up/demo-confirm">,
) {
  await requireSession("/wallet/top-up");
  if (serverEnv().NODE_ENV === "production") {
    return (
      <Panel className="p-8 text-center text-sm text-ink-muted">
        The demo checkout is not available in production.
      </Panel>
    );
  }

  const params = await props.searchParams;
  const ref = typeof params.ref === "string" ? params.ref : "";
  const amountMinor =
    typeof params.amount === "string" ? Number.parseInt(params.amount, 10) : 0;

  return (
    <div className="mx-auto max-w-lg">
      <Panel className="p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Demo checkout
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          Confirm your test payment
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          This simulates a payment provider. No real charge is made. Your wallet
          is credited only when the signed provider callback is received — not
          by returning to this page.
        </p>

        <dl className="mt-6 space-y-3 border-y border-line py-5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-faint">Amount</dt>
            <dd className="font-semibold text-ink">
              {formatMinor(Number.isFinite(amountMinor) ? amountMinor : 0, "EUR")}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-faint">Reference</dt>
            <dd className="font-mono text-xs text-ink-muted">{ref || "—"}</dd>
          </div>
        </dl>

        <form action={simulateProviderCallbackAction} className="mt-6">
          <input type="hidden" name="ref" value={ref} />
          <input type="hidden" name="amount" value={amountMinor} />
          <button
            type="submit"
            className={buttonClasses("primary", "lg", "w-full")}
          >
            <CircleCheck className="h-4 w-4" aria-hidden="true" />
            Simulate successful payment
          </button>
        </form>
        <Link
          href="/wallet/top-up"
          className="mt-3 block text-center text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Cancel
        </Link>
      </Panel>
    </div>
  );
}

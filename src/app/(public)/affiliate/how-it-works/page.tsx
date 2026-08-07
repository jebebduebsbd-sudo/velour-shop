import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { AFFILIATE_CONTENT } from "@/content/affiliate";

export const metadata: Metadata = {
  title: "Affiliate — how it works",
  description: AFFILIATE_CONTENT.intro,
};

const REWARD_STATES = [
  {
    state: "Pending refund window",
    detail:
      "A referred customer completed a qualifying purchase. The reward is held while the order can still be refunded.",
  },
  {
    state: "Available",
    detail:
      "The refund window passed. The reward is credited to your wallet as promotional balance.",
  },
  {
    state: "Reversed",
    detail:
      "The qualifying order was refunded or charged back, so the reward was removed.",
  },
  {
    state: "Rejected",
    detail: "The referral did not pass fraud review and is not eligible.",
  },
] as const;

export default function AffiliateHowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          {AFFILIATE_CONTENT.eyebrow}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">How it works</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {AFFILIATE_CONTENT.intro}
        </p>
      </header>

      <Panel className="p-6">
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          The flow
        </h2>
        <ol className="mt-4 space-y-4">
          {AFFILIATE_CONTENT.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-sm font-semibold text-lilac">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Reward states
        </h2>
        <dl className="mt-4 space-y-3">
          {REWARD_STATES.map((item) => (
            <div key={item.state} className="border-b border-line pb-3 last:border-0">
              <dt className="text-sm font-semibold text-ink">{item.state}</dt>
              <dd className="mt-1 text-sm text-ink-muted">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Rules
        </h2>
        <ul className="mt-4 space-y-2.5">
          {AFFILIATE_CONTENT.rules.map((rule) => (
            <li key={rule} className="flex gap-3 text-sm text-ink-muted">
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              {rule}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-ink-faint">
          {AFFILIATE_CONTENT.disclosure}
        </p>
      </Panel>

      <div>
        <Link href="/affiliate/dashboard" className={buttonClasses("primary", "md")}>
          Go to your affiliate dashboard
        </Link>
      </div>
    </div>
  );
}

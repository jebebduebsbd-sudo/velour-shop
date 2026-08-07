import { ArrowRight, Gift, LineChart, Share2, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { AFFILIATE_CONTENT } from "@/content/affiliate";

export const metadata: Metadata = {
  title: "Earn with Velour",
  description: AFFILIATE_CONTENT.intro,
};

const BENEFIT_ICONS = [LineChart, Gift, Wallet, Share2] as const;

export default function AffiliatePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
      <Panel className="relative overflow-hidden border-l-2 border-l-accent p-8 sm:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-accent-deep/20 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            {AFFILIATE_CONTENT.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {AFFILIATE_CONTENT.headline}
          </h1>
          <p className="mt-4 text-base text-ink-muted sm:text-lg">
            {AFFILIATE_CONTENT.intro}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/affiliate/dashboard"
              className={buttonClasses("primary", "lg")}
            >
              Start earning
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/affiliate/how-it-works"
              className={buttonClasses("secondary", "lg")}
            >
              How it works
            </Link>
          </div>
          <p className="mt-6 text-xs text-ink-faint">
            {AFFILIATE_CONTENT.disclosure}
          </p>
        </div>
      </Panel>

      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="mb-6 text-2xl font-bold text-ink">
          Three steps
        </h2>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {AFFILIATE_CONTENT.steps.map((step, index) => (
            <li key={step.title}>
              <Panel className="h-full p-6">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-sm font-semibold text-lilac">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-ink-muted">{step.detail}</p>
              </Panel>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="benefits-heading">
        <h2 id="benefits-heading" className="mb-6 text-2xl font-bold text-ink">
          What you get
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AFFILIATE_CONTENT.benefits.map((benefit, index) => {
            const Icon = BENEFIT_ICONS[index % BENEFIT_ICONS.length];
            return (
              <li key={benefit.title}>
                <Panel className="h-full p-5">
                  <Icon
                    className="h-5 w-5 text-accent"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <h3 className="mt-3 text-sm font-semibold text-ink">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    {benefit.detail}
                  </p>
                </Panel>
              </li>
            );
          })}
        </ul>
      </section>

      <Panel className="p-6 sm:p-8">
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Program rules
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
      </Panel>
    </div>
  );
}

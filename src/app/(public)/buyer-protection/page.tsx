import {
  FileCheck2,
  LifeBuoy,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { BUYER_PROTECTION } from "@/content/buyer-protection";

export const metadata: Metadata = {
  title: "Buyer Protection",
  description: BUYER_PROTECTION.intro,
};

const QUICK_FACT_ICONS = [ShieldCheck, Wallet, FileCheck2, LifeBuoy] as const;

export default function BuyerProtectionPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <Panel className="relative overflow-hidden border-l-2 border-l-accent p-8 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent-deep/15 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              Policy center
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink italic sm:text-5xl">
              {BUYER_PROTECTION.title}
            </h1>
            <p className="mt-4 text-sm text-ink-muted sm:text-base">
              {BUYER_PROTECTION.intro}
            </p>
            <p className="mt-3 text-xs text-ink-faint">
              Last updated {BUYER_PROTECTION.updated}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/market" className={buttonClasses("secondary", "md")}>
              Open market
            </Link>
            <Link
              href="/auth/sign-in"
              className={buttonClasses("primary", "md")}
            >
              Sign in
            </Link>
          </div>
        </div>
      </Panel>

      <Panel className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {BUYER_PROTECTION.quickFacts.map((fact, index) => {
          const Icon = QUICK_FACT_ICONS[index % QUICK_FACT_ICONS.length];
          return (
            <div key={fact.title} className="flex items-start gap-3 p-5">
              <Icon
                className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  {fact.title}
                </h2>
                <p className="mt-1 text-xs text-ink-muted">{fact.detail}</p>
              </div>
            </div>
          );
        })}
      </Panel>

      <nav aria-label="Policy sections">
        <ul className="flex flex-wrap gap-2">
          {BUYER_PROTECTION.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-block rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs text-ink-muted transition-colors duration-(--duration-base) hover:border-line-strong hover:text-ink"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        {BUYER_PROTECTION.sections.map((section, sectionIndex) => (
          <Panel
            key={section.id}
            id={section.id}
            className="scroll-mt-24 p-6"
            role="region"
            aria-labelledby={`${section.id}-title`}
          >
            <h2
              id={`${section.id}-title`}
              className="text-base font-semibold text-ink"
            >
              {section.title}
            </h2>
            <p className="mt-1 text-xs text-ink-faint">{section.summary}</p>
            <ol className="mt-4 space-y-3">
              {section.clauses.map((clause, clauseIndex) => (
                <li key={clauseIndex} className="flex gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-orchid"
                  >
                    {sectionIndex + 1}.{clauseIndex + 1}
                  </span>
                  <span className="text-ink-muted">{clause}</span>
                </li>
              ))}
            </ol>
          </Panel>
        ))}
      </div>

      <p className="text-xs text-ink-faint">
        This page describes how Velour operates and is provided for
        transparency. It is not legal advice.
      </p>
    </div>
  );
}

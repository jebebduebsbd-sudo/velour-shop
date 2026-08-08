import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { TRUST_CENTER } from "@/content/trust-center";

export const metadata: Metadata = {
  title: "Trust Center",
  description: TRUST_CENTER.intro,
};

export default function TrustCenterPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <Panel className="relative overflow-hidden border-l-2 border-l-accent p-8 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent-deep/15 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {TRUST_CENTER.title}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink italic sm:text-5xl">
            {TRUST_CENTER.title}
          </h1>
          <p className="mt-4 text-sm text-ink-muted sm:text-base">
            {TRUST_CENTER.intro}
          </p>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TRUST_CENTER.sections.map((section) => (
          <Panel key={section.id} className="flex flex-col p-6">
            <h2 className="text-sm font-semibold text-ink">{section.title}</h2>
            <p className="mt-2 flex-1 text-sm text-ink-muted">{section.body}</p>
            {section.href ? (
              <Link
                href={section.href}
                className="mt-4 text-sm text-orchid transition-colors hover:text-lilac"
              >
                {section.linkLabel ?? "Learn more"} →
              </Link>
            ) : null}
          </Panel>
        ))}
      </div>
    </div>
  );
}

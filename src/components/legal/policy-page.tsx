import type { ReactNode } from "react";

import { Panel } from "@/components/ui/panel";

/** Shared layout for simple policy / information pages. */
export function PolicyPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-ink">{title}</h1>
      {updated ? (
        <p className="mt-2 text-xs text-ink-faint">Last updated {updated}</p>
      ) : null}
      <Panel className="mt-6 space-y-4 p-6 text-sm leading-relaxed text-ink-muted [&_a]:text-orchid [&_a:hover]:text-lilac [&_h2]:mt-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-ink [&_strong]:text-ink">
        {children}
      </Panel>
      <p className="mt-4 text-xs text-ink-faint">
        This page describes how Velour operates and is provided for transparency.
        It is not legal advice.
      </p>
    </div>
  );
}

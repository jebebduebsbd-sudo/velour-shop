import {
  BadgeCheck,
  Gavel,
  Hash,
  LifeBuoy,
  MessagesSquare,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  COMMUNITY,
  COMMUNITY_RELATED_LINKS,
} from "@/content/community";
import { communityInvites } from "@/lib/community/invites";

export const metadata: Metadata = {
  title: "Community",
  description: COMMUNITY.shortDescription,
};

const QUICK_FACT_ICONS = [
  MessagesSquare,
  Users,
  ShieldAlert,
  BadgeCheck,
] as const;

export default function CommunityPage() {
  const invites = communityInvites();

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <Panel className="relative overflow-hidden border-l-2 border-l-accent p-8 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent-deep/15 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              <Users className="h-4 w-4" aria-hidden="true" />
              Community
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink italic sm:text-5xl">
              {COMMUNITY.title}
            </h1>
            <p className="mt-3 text-sm text-ink sm:text-base">
              {COMMUNITY.tagline}
            </p>
            <p className="mt-4 text-sm text-ink-muted">{COMMUNITY.intro}</p>
            <p className="mt-3 text-xs text-ink-faint">
              Last updated {COMMUNITY.updated}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {invites.length > 0 ? (
              invites.map((invite, index) => (
                <a
                  key={invite.id}
                  href={invite.url}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                  className={buttonClasses(
                    index === 0 ? "primary" : "secondary",
                    "md",
                  )}
                >
                  Join on {invite.label}
                </a>
              ))
            ) : (
              <p className="max-w-xs text-xs text-ink-faint">
                Invite links are published here once a space goes live. Until
                then, treat any &ldquo;Velour community&rdquo; invite you find
                elsewhere as unverified.
              </p>
            )}
            <Link href="/contact" className={buttonClasses("secondary", "md")}>
              Contact support
            </Link>
          </div>
        </div>
      </Panel>

      <Panel className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {COMMUNITY.quickFacts.map((fact, index) => {
          const Icon = QUICK_FACT_ICONS[index % QUICK_FACT_ICONS.length];
          return (
            <div key={fact.title} className="flex items-start gap-3 p-5">
              <Icon
                className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <div>
                <h2 className="text-sm font-semibold text-ink">{fact.title}</h2>
                <p className="mt-1 text-xs text-ink-muted">{fact.detail}</p>
              </div>
            </div>
          );
        })}
      </Panel>

      <nav aria-label="Community sections">
        <ul className="flex flex-wrap gap-2">
          {COMMUNITY.sections.map((section) => (
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
        {COMMUNITY.sections.map((section, sectionIndex) => (
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
              {section.points.map((point, pointIndex) => (
                <li key={pointIndex} className="flex gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-orchid"
                  >
                    {sectionIndex + 1}.{pointIndex + 1}
                  </span>
                  <span className="text-ink-muted">{point}</span>
                </li>
              ))}
            </ol>
          </Panel>
        ))}
      </div>

      <Panel
        id="spaces"
        className="scroll-mt-24 p-6"
        role="region"
        aria-labelledby="spaces-title"
      >
        <h2
          id="spaces-title"
          className="flex items-center gap-2 text-base font-semibold text-ink"
        >
          <Hash className="h-4 w-4 text-accent" aria-hidden="true" />
          Where conversations happen
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          Each space has one job, so answers stay findable.
        </p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {COMMUNITY.spaces.map((space) => (
            <li
              key={space.id}
              className="rounded-md border border-line bg-surface-2 p-4"
            >
              <p className="font-mono text-sm text-lilac">#{space.name}</p>
              <p className="mt-1 text-sm text-ink">{space.purpose}</p>
              <p className="mt-1 text-xs text-ink-muted">{space.belongs}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          id="rules"
          className="scroll-mt-24 p-6"
          role="region"
          aria-labelledby="rules-title"
        >
          <h2
            id="rules-title"
            className="flex items-center gap-2 text-base font-semibold text-ink"
          >
            <Gavel className="h-4 w-4 text-accent" aria-hidden="true" />
            The rules in full
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            Posting anywhere in the community is taken as acceptance of these.
          </p>
          <ol className="mt-4 space-y-3">
            {COMMUNITY.rules.map((rule, index) => (
              <li key={rule.id} className="flex gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-orchid"
                >
                  R{index + 1}
                </span>
                <span>
                  <span className="font-medium text-ink">{rule.title}.</span>{" "}
                  <span className="text-ink-muted">{rule.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          id="roles"
          className="scroll-mt-24 p-6"
          role="region"
          aria-labelledby="roles-title"
        >
          <h2
            id="roles-title"
            className="flex items-center gap-2 text-base font-semibold text-ink"
          >
            <BadgeCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            Roles
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            Roles describe standing in the conversation — none of them grant
            access to accounts, wallets, or delivered codes.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {COMMUNITY.roles.map((role) => (
              <li key={role.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-ink">{role.name}</p>
                <p className="mt-1 text-xs text-ink-faint">{role.earned}</p>
                <p className="mt-1 text-sm text-ink-muted">{role.unlocks}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        id="faq"
        className="scroll-mt-24 p-6"
        role="region"
        aria-labelledby="faq-title"
      >
        <h2
          id="faq-title"
          className="flex items-center gap-2 text-base font-semibold text-ink"
        >
          <LifeBuoy className="h-4 w-4 text-accent" aria-hidden="true" />
          Questions people actually ask
        </h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          {COMMUNITY.faq.map((entry) => (
            <div key={entry.id}>
              <dt className="text-sm font-medium text-ink">{entry.question}</dt>
              <dd className="mt-1 text-sm text-ink-muted">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel className="flex flex-wrap items-center gap-x-4 gap-y-2 p-5">
        <span className="text-xs font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Read next
        </span>
        {COMMUNITY_RELATED_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-orchid transition-colors hover:text-lilac"
          >
            {link.label}
          </Link>
        ))}
      </Panel>

      <p className="text-xs text-ink-faint">
        These guidelines describe how the Velour community is run and are
        provided for transparency. They are not legal advice, and they do not
        replace the Terms, the Acceptable Use policy, or Buyer Protection.
      </p>
    </div>
  );
}

import type { Metadata } from "next";

import {
  ChangePasswordForm,
  ResendVerificationForm,
  RevokeSessionsForm,
} from "@/components/account/security-forms";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Security",
  robots: { index: false, follow: false },
};

export default async function SecurityPage() {
  const session = await requireSession("/account/security");
  const emailVerified = session.user.emailVerifiedAt !== null;

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      lastSeenAt: true,
      userAgentBrief: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Security</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Manage your password, email verification, and active sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <h2 className="text-sm font-semibold text-ink">Email address</h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="truncate text-sm text-ink-muted">
              {session.user.email}
            </span>
            {emailVerified ? (
              <Badge variant="success">Verified</Badge>
            ) : (
              <Badge variant="warning">Unverified</Badge>
            )}
          </div>
          {!emailVerified ? (
            <div className="mt-5">
              <ResendVerificationForm />
            </div>
          ) : (
            <p className="mt-5 text-xs text-ink-faint">
              Your address is confirmed. Purchases are enabled.
            </p>
          )}
        </Panel>

        <Panel className="p-6">
          <h2 className="text-sm font-semibold text-ink">Change password</h2>
          <p className="mt-1 text-xs text-ink-faint">
            Updating your password signs out every other session.
          </p>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        </Panel>
      </div>

      <Panel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Active sessions</h2>
            <p className="mt-1 text-xs text-ink-faint">
              {sessions.length}{" "}
              {sessions.length === 1 ? "session" : "sessions"} currently signed
              in. Session tokens are stored only as hashes.
            </p>
          </div>
          <RevokeSessionsForm />
        </div>
        <ul className="mt-5 divide-y divide-line">
          {sessions.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">
                  {item.userAgentBrief ?? "Unknown device"}
                </span>
                <span className="block text-xs text-ink-faint">
                  Started {item.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </span>
              {item.id === session.sessionId ? (
                <Badge variant="accent">This device</Badge>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

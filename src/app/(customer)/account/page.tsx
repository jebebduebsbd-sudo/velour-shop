import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await requireSession("/account");
  const emailVerified = session.user.emailVerifiedAt !== null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Profile</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your account details on Velour.
        </p>
      </div>

      <Panel className="p-6">
        <dl className="divide-y divide-line text-sm">
          <Row label="Username" value={session.user.username} />
          <Row label="Email" value={session.user.email} />
          <Row
            label="Email status"
            value={
              emailVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="warning">Unverified</Badge>
              )
            }
          />
          <Row label="Role" value={session.user.role} />
        </dl>
        <Link
          href="/account/security"
          className={buttonClasses("secondary", "md", "mt-6")}
        >
          Security settings
        </Link>
      </Panel>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="truncate text-ink">{value}</dd>
    </div>
  );
}

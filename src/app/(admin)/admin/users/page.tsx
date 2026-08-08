import type { Metadata } from "next";

import {
  adjustWalletAction,
  setUserLockAction,
  setUserRoleAction,
} from "@/app/(admin)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin — users",
  robots: { index: false },
};

export default async function AdminUsersPage() {
  const session = await requireRole("ADMIN");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      lockedUntil: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Users</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Manage roles and account locks. You cannot change your own role or
          lock yourself.
        </p>
      </div>

      <Panel className="overflow-hidden">
        <ul className="divide-y divide-line">
          {users.map((user) => {
            const locked = user.lockedUntil && user.lockedUntil > new Date();
            const isSelf = user.id === session.user.id;
            return (
              <li key={user.id} className="flex flex-wrap items-center gap-4 p-5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    {user.username}
                    {user.emailVerifiedAt ? null : (
                      <Badge variant="warning">unverified</Badge>
                    )}
                    {locked ? <Badge variant="danger">locked</Badge> : null}
                    {isSelf ? <Badge variant="accent">you</Badge> : null}
                  </span>
                  <span className="block truncate text-xs text-ink-faint">
                    {user.email}
                  </span>
                </span>

                <form action={setUserRoleAction} className="flex gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <select
                    name="role"
                    defaultValue={user.role}
                    disabled={isSelf}
                    className="h-9 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink disabled:opacity-50"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="SUPPORT">Support</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <Button type="submit" variant="secondary" size="sm" disabled={isSelf}>
                    Set role
                  </Button>
                </form>

                {!isSelf ? (
                  <form action={setUserLockAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="lock" value={locked ? "false" : "true"} />
                    <Button
                      type="submit"
                      variant={locked ? "ghost" : "danger"}
                      size="sm"
                    >
                      {locked ? "Unlock" : "Lock"}
                    </Button>
                  </form>
                ) : null}

                <form
                  action={adjustWalletAction}
                  className="flex w-full items-end gap-2 border-t border-line pt-3 sm:w-auto sm:border-0 sm:pt-0"
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <label className="text-xs text-ink-faint">
                    Wallet €
                    <input
                      name="euros"
                      placeholder="±0.00"
                      className="mt-0.5 block h-9 w-20 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
                    />
                  </label>
                  <label className="flex-1 text-xs text-ink-faint sm:flex-none">
                    Reason
                    <input
                      name="reason"
                      placeholder="correction"
                      className="mt-0.5 block h-9 w-40 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
                    />
                  </label>
                  <Button type="submit" variant="secondary" size="sm">
                    Adjust
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      </Panel>
      <p className="text-xs text-ink-faint">
        Wallet adjustments post a ledger entry (never mutate a balance
        directly), require a reason, are audited, and cannot drive a balance
        below zero.
      </p>
    </div>
  );
}

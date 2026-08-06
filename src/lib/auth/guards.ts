import { redirect } from "next/navigation";

import type { Role } from "@/generated/prisma/enums";
import { getActiveSession, type ActiveSession } from "@/lib/auth/session";

/**
 * Route guards. Every authenticated page and action resolves its own session
 * server-side — authorization is never inferred from client-supplied data.
 */

export async function requireSession(
  returnTo = "/dashboard",
): Promise<ActiveSession> {
  const session = await getActiveSession();
  if (!session) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(returnTo)}`);
  }
  return session;
}

const ROLE_RANK: Record<Role, number> = {
  CUSTOMER: 0,
  SUPPORT: 1,
  ADMIN: 2,
};

export function hasRole(userRole: Role, minimum: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minimum];
}

/** Requires at least the given role, 404-ing rather than revealing the route. */
export async function requireRole(minimum: Role): Promise<ActiveSession> {
  const session = await requireSession();
  if (!hasRole(session.user.role, minimum)) {
    // Not found rather than forbidden: staff routes should not confirm they
    // exist to a signed-in customer.
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return session;
}

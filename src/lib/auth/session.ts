import { cookies } from "next/headers";

import type { Role } from "@/generated/prisma/enums";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { generateToken, hashSessionToken } from "@/lib/auth/hashing";
import { isProduction } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "velour_session";
const SESSION_TTL_DAYS = 30;
/** Window during which a password confirmation counts as fresh. */
export const REAUTH_WINDOW_MINUTES = 10;

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  role: Role;
  emailVerifiedAt: Date | null;
};

export type ActiveSession = {
  sessionId: string;
  user: SessionUser;
  reauthFresh: boolean;
};

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    // Secure is required in production; localhost development uses plain HTTP.
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/**
 * Issues a new opaque session and sets the cookie. Only the token hash is
 * persisted, so the database alone cannot be used to impersonate a user.
 */
export async function createSession(
  userId: string,
  context: { ipHash?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
      reauthAt: new Date(),
      ipHash: context.ipHash ?? null,
      userAgentBrief: context.userAgent?.slice(0, 120) ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

/**
 * Issues a new token for an existing session, keeping the user signed in
 * while invalidating the previous token. Used after a password change to
 * prevent a captured cookie from outliving the credential.
 */
export async function rotateSession(sessionId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      tokenHash: hashSessionToken(token),
      expiresAt,
      reauthAt: new Date(),
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

/** Reads and validates the current session, or null when unauthenticated. */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      reauthAt: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          emailVerifiedAt: true,
          lockedUntil: true,
          disabledAt: true,
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }
  const { user } = session;
  if (user.disabledAt) return null;
  if (user.lockedUntil && user.lockedUntil > new Date()) return null;

  const reauthFresh = session.reauthAt
    ? session.reauthAt.getTime() >
      Date.now() - REAUTH_WINDOW_MINUTES * 60 * 1000
    : false;

  return {
    sessionId: session.id,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    reauthFresh,
  };
}

/** Revokes the current session and clears the cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  cookieStore.delete(SESSION_COOKIE);
  if (!token) return;

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!session || session.revokedAt) return;

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });
  await recordAuditEvent({
    action: AUDIT_ACTIONS.logout,
    userId: session.userId,
    targetType: "Session",
    targetId: session.id,
  });
}

/** Revokes every active session for a user (sign out everywhere). */
export async function revokeAllSessions(
  userId: string,
  options: { exceptSessionId?: string } = {},
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(options.exceptSessionId ? { id: { not: options.exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  await recordAuditEvent({
    action: AUDIT_ACTIONS.logoutAll,
    userId,
    metadata: { revokedCount: result.count },
  });
  return result.count;
}

/** Marks the current session as freshly password-confirmed (step-up auth). */
export async function markReauthenticated(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { reauthAt: new Date() },
  });
}

export async function touchSession(sessionId: string): Promise<void> {
  await prisma.session
    .update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);
}

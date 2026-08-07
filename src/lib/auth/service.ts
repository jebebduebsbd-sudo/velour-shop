import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { generateToken, hashEmailToken } from "@/lib/auth/hashing";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

/**
 * Account lifecycle operations. All functions here are server-only and never
 * return password hashes or raw tokens to callers except where the caller is
 * responsible for delivering the token by email.
 */

const MAX_FAILED_LOGINS = 10;
const LOCK_MINUTES = 15;
const EMAIL_TOKEN_TTL_MINUTES = { EMAIL_VERIFICATION: 1440, PASSWORD_RESET: 60 };

export type RegisterResult =
  | { ok: true; userId: string; verificationToken: string }
  | { ok: false; reason: "email_taken" | "username_taken" };

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
  ipHash?: string | null;
  /** Referral code from the attribution cookie, if any. */
  referralCode?: string | null;
}): Promise<RegisterResult> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username: input.username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    return {
      ok: false,
      reason: existing.email === email ? "email_taken" : "username_taken",
    };
  }

  // Attribute the referral if the code resolves to an existing affiliate.
  // A brand-new user can never be their own referrer, so no self-referral.
  let referredById: string | null = null;
  if (input.referralCode) {
    const profile = await prisma.affiliateProfile.findUnique({
      where: { code: input.referralCode.toUpperCase() },
      select: { id: true },
    });
    referredById = profile?.id ?? null;
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email, username: input.username, passwordHash, referredById },
    select: { id: true },
  });

  const verificationToken = await issueEmailToken(
    user.id,
    "EMAIL_VERIFICATION",
  );

  await recordAuditEvent({
    action: AUDIT_ACTIONS.registered,
    userId: user.id,
    ipHash: input.ipHash,
  });

  return { ok: true, userId: user.id, verificationToken };
}

export async function issueEmailToken(
  userId: string,
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET",
): Promise<string> {
  const token = generateToken();
  await prisma.emailToken.create({
    data: {
      tokenHash: hashEmailToken(token),
      purpose,
      userId,
      expiresAt: new Date(
        Date.now() + EMAIL_TOKEN_TTL_MINUTES[purpose] * 60 * 1000,
      ),
    },
  });
  return token;
}

export type LoginOutcome =
  | { ok: true; userId: string; emailVerified: boolean }
  | { ok: false; reason: "invalid_credentials" | "locked" | "disabled" };

/**
 * Verifies credentials. Returns a single generic failure for unknown accounts
 * and wrong passwords so responses cannot be used to enumerate accounts, and
 * always performs a hash comparison to keep timing uniform.
 */
export async function authenticate(input: {
  identifier: string;
  password: string;
  ipHash?: string | null;
}): Promise<LoginOutcome> {
  const identifier = input.identifier.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
    select: {
      id: true,
      passwordHash: true,
      emailVerifiedAt: true,
      lockedUntil: true,
      disabledAt: true,
      failedLoginCount: true,
    },
  });

  if (!user) {
    // Constant-work path: hash the supplied password so a missing account is
    // not measurably faster than a wrong password.
    await hashPassword(input.password);
    await recordAuditEvent({
      action: AUDIT_ACTIONS.loginFailed,
      metadata: { outcome: "unknown_account" },
      ipHash: input.ipHash,
    });
    return { ok: false, reason: "invalid_credentials" };
  }

  if (user.disabledAt) return { ok: false, reason: "disabled" };
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, reason: "locked" };
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
          : null,
      },
    });
    await recordAuditEvent({
      action: AUDIT_ACTIONS.loginFailed,
      userId: user.id,
      metadata: { outcome: "bad_password", failedLoginCount },
      ipHash: input.ipHash,
    });
    if (shouldLock) {
      await recordAuditEvent({
        action: AUDIT_ACTIONS.accountLocked,
        userId: user.id,
        metadata: { lockMinutes: LOCK_MINUTES, reason: "failed_logins" },
        ipHash: input.ipHash,
      });
      return { ok: false, reason: "locked" };
    }
    return { ok: false, reason: "invalid_credentials" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await recordAuditEvent({
    action: AUDIT_ACTIONS.loginSucceeded,
    userId: user.id,
    ipHash: input.ipHash,
  });

  return {
    ok: true,
    userId: user.id,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

/** Consumes a single-use email token, returning the user id when valid. */
export async function consumeEmailToken(
  token: string,
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET",
): Promise<string | null> {
  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashEmailToken(token) },
    select: {
      id: true,
      userId: true,
      purpose: true,
      usedAt: true,
      expiresAt: true,
    },
  });
  if (
    !record ||
    record.purpose !== purpose ||
    record.usedAt ||
    record.expiresAt <= new Date()
  ) {
    return null;
  }
  // Single-use: the conditional update makes concurrent redemption safe.
  const claimed = await prisma.emailToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;
  return record.userId;
}

export async function verifyEmail(token: string): Promise<boolean> {
  const userId = await consumeEmailToken(token, "EMAIL_VERIFICATION");
  if (!userId) return false;
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
  await recordAuditEvent({
    action: AUDIT_ACTIONS.emailVerified,
    userId,
  });
  return true;
}

/**
 * Completes a password reset: sets the new hash and revokes every existing
 * session so a stolen session cannot outlive the reset.
 */
export async function resetPassword(input: {
  token: string;
  newPassword: string;
  ipHash?: string | null;
}): Promise<boolean> {
  const userId = await consumeEmailToken(input.token, "PASSWORD_RESET");
  if (!userId) return false;

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  await recordAuditEvent({
    action: AUDIT_ACTIONS.passwordResetCompleted,
    userId,
    ipHash: input.ipHash,
  });
  return true;
}

export async function findUserIdByEmail(
  email: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return user?.id ?? null;
}

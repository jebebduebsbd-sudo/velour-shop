import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashEmailToken } from "@/lib/auth/hashing";
import { cleanupTestUsers, testDb } from "./db";

/**
 * Integration tests for the account lifecycle against a real PostgreSQL
 * database. The service module reads its Prisma client from @/lib/prisma,
 * which resolves DATABASE_URL — the same database these assertions inspect.
 */
const PREFIX = "vtest-auth-";

let service: typeof import("@/lib/auth/service");

beforeAll(async () => {
  service = await import("@/lib/auth/service");
  await cleanupTestUsers(PREFIX);
});

afterAll(async () => {
  await cleanupTestUsers(PREFIX);
  await testDb.$disconnect();
});

function unique(suffix: string) {
  return `${PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${suffix}`;
}

describe("registration", () => {
  it("stores a hash, never the password, and starts unverified", async () => {
    const username = unique("reg");
    const email = `${username}@velour.test`;
    const result = await service.registerUser({
      email,
      username,
      password: "a-strong-password-1",
    });
    expect(result.ok).toBe(true);

    const user = await testDb.user.findUnique({
      where: { email },
      select: {
        passwordHash: true,
        emailVerifiedAt: true,
        role: true,
        failedLoginCount: true,
      },
    });
    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toContain("a-strong-password-1");
    expect(user!.emailVerifiedAt).toBeNull();
    // New accounts are always customers; roles are never self-assigned.
    expect(user!.role).toBe("CUSTOMER");
    expect(user!.failedLoginCount).toBe(0);
  });

  it("normalizes email casing and rejects duplicates", async () => {
    const username = unique("dupe");
    const email = `${username}@velour.test`;
    expect(
      (await service.registerUser({ email, username, password: "pw-1234567890" })).ok,
    ).toBe(true);

    const duplicateEmail = await service.registerUser({
      email: email.toUpperCase(),
      username: `${username}-other`,
      password: "pw-1234567890",
    });
    expect(duplicateEmail).toEqual({ ok: false, reason: "email_taken" });

    const duplicateUsername = await service.registerUser({
      email: `other-${email}`,
      username,
      password: "pw-1234567890",
    });
    expect(duplicateUsername).toEqual({ ok: false, reason: "username_taken" });
  });
});

describe("authentication", () => {
  it("accepts the right password by email or username", async () => {
    const username = unique("login");
    const email = `${username}@velour.test`;
    await service.registerUser({ email, username, password: "pw-1234567890" });

    const byEmail = await service.authenticate({
      identifier: email,
      password: "pw-1234567890",
    });
    expect(byEmail.ok).toBe(true);

    const byUsername = await service.authenticate({
      identifier: username,
      password: "pw-1234567890",
    });
    expect(byUsername.ok).toBe(true);
  });

  it("returns the same generic failure for unknown accounts and bad passwords", async () => {
    const username = unique("generic");
    const email = `${username}@velour.test`;
    await service.registerUser({ email, username, password: "pw-1234567890" });

    const wrongPassword = await service.authenticate({
      identifier: email,
      password: "not-the-password",
    });
    const unknownAccount = await service.authenticate({
      identifier: `${PREFIX}nobody@velour.test`,
      password: "not-the-password",
    });
    expect(wrongPassword).toEqual({
      ok: false,
      reason: "invalid_credentials",
    });
    expect(unknownAccount).toEqual(wrongPassword);
  });

  it("locks the account after repeated failures and clears the counter on success", async () => {
    const username = unique("lock");
    const email = `${username}@velour.test`;
    await service.registerUser({ email, username, password: "pw-1234567890" });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await service.authenticate({ identifier: email, password: "wrong" });
    }
    const locked = await service.authenticate({
      identifier: email,
      password: "pw-1234567890",
    });
    expect(locked).toEqual({ ok: false, reason: "locked" });

    // Clear the lock the way an admin or a cooldown would, then confirm reset.
    await testDb.user.update({
      where: { email },
      data: { lockedUntil: null },
    });
    const success = await service.authenticate({
      identifier: email,
      password: "pw-1234567890",
    });
    expect(success.ok).toBe(true);
    const after = await testDb.user.findUnique({
      where: { email },
      select: { failedLoginCount: true, lastLoginAt: true },
    });
    expect(after!.failedLoginCount).toBe(0);
    expect(after!.lastLoginAt).not.toBeNull();
  });
});

describe("email tokens", () => {
  it("verifies an email exactly once", async () => {
    const username = unique("verify");
    const email = `${username}@velour.test`;
    const registered = await service.registerUser({
      email,
      username,
      password: "pw-1234567890",
    });
    if (!registered.ok) throw new Error("registration failed");

    expect(await service.verifyEmail(registered.verificationToken)).toBe(true);
    // Single-use: replaying the same token must fail.
    expect(await service.verifyEmail(registered.verificationToken)).toBe(false);

    const user = await testDb.user.findUnique({
      where: { email },
      select: { emailVerifiedAt: true },
    });
    expect(user!.emailVerifiedAt).not.toBeNull();
  });

  it("stores only the peppered hash of a token", async () => {
    const username = unique("tokenhash");
    const email = `${username}@velour.test`;
    const registered = await service.registerUser({
      email,
      username,
      password: "pw-1234567890",
    });
    if (!registered.ok) throw new Error("registration failed");

    const stored = await testDb.emailToken.findFirst({
      where: { userId: registered.userId },
      select: { tokenHash: true },
    });
    expect(stored!.tokenHash).not.toBe(registered.verificationToken);
    expect(stored!.tokenHash).toBe(
      hashEmailToken(registered.verificationToken),
    );
  });

  it("rejects an expired token", async () => {
    const username = unique("expired");
    const email = `${username}@velour.test`;
    const registered = await service.registerUser({
      email,
      username,
      password: "pw-1234567890",
    });
    if (!registered.ok) throw new Error("registration failed");

    await testDb.emailToken.updateMany({
      where: { userId: registered.userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await service.verifyEmail(registered.verificationToken)).toBe(false);
  });

  it("rejects a token used for the wrong purpose", async () => {
    const username = unique("purpose");
    const email = `${username}@velour.test`;
    const registered = await service.registerUser({
      email,
      username,
      password: "pw-1234567890",
    });
    if (!registered.ok) throw new Error("registration failed");

    // A verification token must not be redeemable as a password reset.
    const applied = await service.resetPassword({
      token: registered.verificationToken,
      newPassword: "brand-new-password",
    });
    expect(applied).toBe(false);
  });
});

describe("password reset", () => {
  it("changes the password and revokes every existing session", async () => {
    const username = unique("reset");
    const email = `${username}@velour.test`;
    const registered = await service.registerUser({
      email,
      username,
      password: "pw-1234567890",
    });
    if (!registered.ok) throw new Error("registration failed");

    await testDb.session.createMany({
      data: [
        {
          tokenHash: `${PREFIX}s1-${Date.now()}`,
          userId: registered.userId,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
        {
          tokenHash: `${PREFIX}s2-${Date.now()}`,
          userId: registered.userId,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      ],
    });

    const token = await service.issueEmailToken(
      registered.userId,
      "PASSWORD_RESET",
    );
    expect(
      await service.resetPassword({
        token,
        newPassword: "an-entirely-new-password",
      }),
    ).toBe(true);

    const active = await testDb.session.count({
      where: { userId: registered.userId, revokedAt: null },
    });
    expect(active).toBe(0);

    expect(
      (
        await service.authenticate({
          identifier: email,
          password: "an-entirely-new-password",
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await service.authenticate({
          identifier: email,
          password: "pw-1234567890",
        })
      ).ok,
    ).toBe(false);
  });

  it("cannot replay a reset token", async () => {
    const username = unique("replay");
    const email = `${username}@velour.test`;
    const registered = await service.registerUser({
      email,
      username,
      password: "pw-1234567890",
    });
    if (!registered.ok) throw new Error("registration failed");

    const token = await service.issueEmailToken(
      registered.userId,
      "PASSWORD_RESET",
    );
    expect(
      await service.resetPassword({ token, newPassword: "first-new-password" }),
    ).toBe(true);
    expect(
      await service.resetPassword({ token, newPassword: "second-attempt-pw" }),
    ).toBe(false);
  });

  it("redeems a reset token exactly once under concurrent attempts", async () => {
    const username = unique("concurrent");
    const email = `${username}@velour.test`;
    const registered = await service.registerUser({
      email,
      username,
      password: "pw-1234567890",
    });
    if (!registered.ok) throw new Error("registration failed");

    const token = await service.issueEmailToken(
      registered.userId,
      "PASSWORD_RESET",
    );
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        service.resetPassword({
          token,
          newPassword: `concurrent-password-${index}`,
        }),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe("account enumeration", () => {
  it("does not reveal whether an email exists when looking it up", async () => {
    const username = unique("enum");
    const email = `${username}@velour.test`;
    await service.registerUser({ email, username, password: "pw-1234567890" });

    expect(await service.findUserIdByEmail(email)).toBeTruthy();
    expect(
      await service.findUserIdByEmail(`${PREFIX}absent@velour.test`),
    ).toBeNull();
  });
});

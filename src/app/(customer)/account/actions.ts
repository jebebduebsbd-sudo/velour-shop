"use server";

import { z } from "zod";

import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueEmailToken } from "@/lib/auth/service";
import {
  markReauthenticated,
  revokeAllSessions,
  rotateSession,
} from "@/lib/auth/session";
import { requireSession } from "@/lib/auth/guards";
import { serverEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, clientIpHash } from "@/lib/request";

export type AccountActionState = {
  status: "idle" | "error" | "notice";
  formMessage?: string;
  fieldErrors?: Record<string, string>;
  devLink?: string;
};

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      formMessage: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  try {
    await assertSameOrigin();
    const session = await requireSession("/account/security");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (
      !user ||
      !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))
    ) {
      return {
        status: "error",
        fieldErrors: { currentPassword: "That password is not correct" },
      };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    // Keep this session alive with a fresh token, drop all others.
    await rotateSession(session.sessionId);
    const revoked = await revokeAllSessions(session.user.id, {
      exceptSessionId: session.sessionId,
    });
    await markReauthenticated(session.sessionId);
    await recordAuditEvent({
      action: AUDIT_ACTIONS.passwordResetCompleted,
      userId: session.user.id,
      metadata: { method: "account_settings", otherSessionsRevoked: revoked },
      ipHash: await clientIpHash(),
    });

    return {
      status: "notice",
      formMessage: `Password updated. ${revoked} other ${
        revoked === 1 ? "session was" : "sessions were"
      } signed out.`,
    };
  } catch {
    return {
      status: "error",
      formMessage: "Something went wrong. Please try again.",
    };
  }
}

export async function revokeOtherSessionsAction(): Promise<AccountActionState> {
  try {
    await assertSameOrigin();
    const session = await requireSession("/account/security");
    const revoked = await revokeAllSessions(session.user.id, {
      exceptSessionId: session.sessionId,
    });
    return {
      status: "notice",
      formMessage: `Signed out ${revoked} other ${
        revoked === 1 ? "session" : "sessions"
      }.`,
    };
  } catch {
    return {
      status: "error",
      formMessage: "Something went wrong. Please try again.",
    };
  }
}

export async function resendVerificationAction(): Promise<AccountActionState> {
  try {
    await assertSameOrigin();
    const session = await requireSession("/account/security");
    if (session.user.emailVerifiedAt) {
      return {
        status: "notice",
        formMessage: "Your email address is already verified.",
      };
    }
    const token = await issueEmailToken(
      session.user.id,
      "EMAIL_VERIFICATION",
    );
    return {
      status: "notice",
      formMessage: "Verification link sent. It expires in 24 hours.",
      devLink:
        serverEnv().NODE_ENV === "production"
          ? undefined
          : `/auth/verify-email?token=${token}`,
    };
  } catch {
    return {
      status: "error",
      formMessage: "Something went wrong. Please try again.",
    };
  }
}

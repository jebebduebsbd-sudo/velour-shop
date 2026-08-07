"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { clearReferralCookie, readReferralCookie } from "@/lib/affiliate/referral-cookie";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { getActiveSession, createSession, destroyCurrentSession } from "@/lib/auth/session";
import {
  authenticate,
  findUserIdByEmail,
  issueEmailToken,
  registerUser,
  resetPassword,
} from "@/lib/auth/service";
import { serverEnv } from "@/lib/env";
import { consumeRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, clientIpHash, clientUserAgent } from "@/lib/request";

/**
 * Authentication server actions.
 *
 * Every mutating action validates its input with Zod, verifies the request
 * origin (CSRF defense alongside SameSite=Lax cookies), and rate-limits by
 * client IP. Errors are normalized: no stack traces, no internal details, and
 * no responses that let a caller distinguish registered from unregistered
 * email addresses.
 */

export type AuthFormState = {
  status: "idle" | "error" | "notice";
  formMessage?: string;
  fieldErrors?: Record<string, string>;
  /** Set for flows that must show a token in development (no mail sender yet). */
  devLink?: string;
};

const GENERIC_ERROR = "Something went wrong. Please try again.";
const RATE_LIMITED = "Too many attempts. Please wait and try again.";

const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Enter your username or email")
    .max(254, "Too long"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  next: z.string().optional(),
});

const signUpSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address").max(254),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(32, "Username must be at most 32 characters")
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Use letters, numbers, dots, dashes, or underscores",
      ),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "This reset link is not valid"),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function invalid(fieldErrors: Record<string, string>): AuthFormState {
  return {
    status: "error",
    formMessage: "Check the highlighted fields and try again.",
    fieldErrors,
  };
}

/** Only same-site relative paths are accepted as post-login destinations. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

/**
 * In development there is no mail provider yet, so verification and reset
 * links are surfaced in the UI instead of being emailed. Never in production.
 */
function devLinkFor(path: string, token: string): string | undefined {
  if (serverEnv().NODE_ENV === "production") return undefined;
  return `${path}?token=${token}`;
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return invalid(fieldErrorsFrom(parsed.error));

  let destination: string;
  try {
    await assertSameOrigin();
    const ipHash = await clientIpHash();

    const limit = await consumeRateLimit(RATE_LIMITS.login, ipHash ?? "unknown");
    if (!limit.allowed) {
      return { status: "error", formMessage: RATE_LIMITED };
    }

    const outcome = await authenticate({
      identifier: parsed.data.identifier,
      password: parsed.data.password,
      ipHash,
    });

    if (!outcome.ok) {
      if (outcome.reason === "locked") {
        return {
          status: "error",
          formMessage:
            "This account is temporarily locked after repeated failed sign-ins. Try again later or reset your password.",
        };
      }
      if (outcome.reason === "disabled") {
        return {
          status: "error",
          formMessage: "This account is not available. Contact support.",
        };
      }
      return {
        status: "error",
        formMessage: "Incorrect username, email, or password.",
      };
    }

    await resetRateLimit(RATE_LIMITS.login, ipHash ?? "unknown");
    // A fresh session id after authentication prevents session fixation.
    await createSession(outcome.userId, {
      ipHash,
      userAgent: await clientUserAgent(),
    });
    destination = safeNext(parsed.data.next);
  } catch {
    return { status: "error", formMessage: GENERIC_ERROR };
  }

  redirect(destination);
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return invalid(fieldErrorsFrom(parsed.error));

  try {
    await assertSameOrigin();
    const ipHash = await clientIpHash();
    const limit = await consumeRateLimit(
      RATE_LIMITS.register,
      ipHash ?? "unknown",
    );
    if (!limit.allowed) {
      return { status: "error", formMessage: RATE_LIMITED };
    }

    const referralCode = await readReferralCookie();
    const result = await registerUser({
      email: parsed.data.email,
      username: parsed.data.username,
      password: parsed.data.password,
      ipHash,
      referralCode,
    });

    if (!result.ok) {
      // Username collisions are safe to report; email collisions are not,
      // so they surface as a field-level hint without confirming existence.
      if (result.reason === "username_taken") {
        return invalid({ username: "That username is already taken" });
      }
      return invalid({
        email:
          "That email cannot be used for a new account. Try signing in or resetting your password.",
      });
    }

    await createSession(result.userId, {
      ipHash,
      userAgent: await clientUserAgent(),
    });
    // Attribution is now persisted on the account; the cookie is no longer needed.
    await clearReferralCookie();

    return {
      status: "notice",
      formMessage:
        "Account created. Verify your email address to enable purchases.",
      devLink: devLinkFor("/auth/verify-email", result.verificationToken),
    };
  } catch {
    return { status: "error", formMessage: GENERIC_ERROR };
  }
}

export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Identical response whether or not the account exists (no enumeration).
  const confirmation: AuthFormState = {
    status: "notice",
    formMessage:
      "If an account exists for that address, a reset link is on its way. The link expires in one hour.",
  };

  try {
    await assertSameOrigin();
    const ipHash = await clientIpHash();
    const limit = await consumeRateLimit(
      RATE_LIMITS.passwordReset,
      ipHash ?? "unknown",
    );
    if (!limit.allowed) return confirmation;

    const userId = await findUserIdByEmail(parsed.data.email);
    if (!userId) return confirmation;

    const token = await issueEmailToken(userId, "PASSWORD_RESET");
    await recordAuditEvent({
      action: AUDIT_ACTIONS.passwordResetRequested,
      userId,
      ipHash,
    });
    return {
      ...confirmation,
      devLink: devLinkFor("/auth/reset-password", token),
    };
  } catch {
    return confirmation;
  }
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return invalid(fieldErrorsFrom(parsed.error));

  try {
    await assertSameOrigin();
    const ipHash = await clientIpHash();
    const limit = await consumeRateLimit(
      RATE_LIMITS.passwordReset,
      ipHash ?? "unknown",
    );
    if (!limit.allowed) {
      return { status: "error", formMessage: RATE_LIMITED };
    }

    const ok = await resetPassword({
      token: parsed.data.token,
      newPassword: parsed.data.password,
      ipHash,
    });
    if (!ok) {
      return {
        status: "error",
        formMessage:
          "This reset link is invalid or has expired. Request a new one.",
      };
    }
    return {
      status: "notice",
      formMessage:
        "Password updated and all sessions signed out. You can sign in now.",
    };
  } catch {
    return { status: "error", formMessage: GENERIC_ERROR };
  }
}

export async function signOutAction(): Promise<void> {
  try {
    await assertSameOrigin();
    await destroyCurrentSession();
  } catch {
    // Signing out must always end up unauthenticated from the user's view.
  }
  redirect("/");
}

/** Used by the header to render wallet/account state without a client fetch. */
export async function currentUserSummary() {
  const session = await getActiveSession();
  if (!session) return null;
  return {
    username: session.user.username,
    role: session.user.role,
    emailVerified: session.user.emailVerifiedAt !== null,
  };
}

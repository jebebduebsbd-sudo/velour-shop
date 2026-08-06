"use server";

import { z } from "zod";

/**
 * Validated server actions for the authentication pages.
 *
 * Phase note: pages 1–5 ship the dedicated auth UI with full server-side
 * validation. Session creation, password hashing, and account storage arrive
 * with the authentication phase — until then, valid submissions receive an
 * explicit preview notice instead of silently pretending to sign in.
 */

export type AuthFormState = {
  status: "idle" | "error" | "notice";
  formMessage?: string;
  fieldErrors?: Record<string, string>;
};

const PREVIEW_NOTICE =
  "Preview build: your details passed validation, but account services are not enabled yet. Sign-in activates with the authentication release.";

const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Enter your username or email")
    .max(254, "Too long"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      formMessage: "Check the highlighted fields and try again.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  return { status: "notice", formMessage: PREVIEW_NOTICE };
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
  if (!parsed.success) {
    return {
      status: "error",
      formMessage: "Check the highlighted fields and try again.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  return { status: "notice", formMessage: PREVIEW_NOTICE };
}

export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  // Real implementation must respond identically whether or not the account
  // exists (no account enumeration).
  return { status: "notice", formMessage: PREVIEW_NOTICE };
}

"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  resetPasswordAction,
  type AuthFormState,
} from "@/app/(public)/auth/actions";
import { FormMessage } from "@/components/auth/form-message";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = { status: "idle" };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );
  const done = state.status === "notice";

  return (
    <form action={formAction} noValidate className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      {done ? (
        <Link
          href="/auth/sign-in"
          className="block rounded-md bg-linear-to-r from-accent-deep to-accent px-6 py-2.5 text-center text-sm font-medium text-white"
        >
          Go to sign in
        </Link>
      ) : (
        <>
          <PasswordInput
            label="New password"
            name="password"
            autoComplete="new-password"
            error={state.fieldErrors?.password}
            hint="At least 10 characters."
          />
          <PasswordInput
            label="Confirm new password"
            name="confirmPassword"
            autoComplete="new-password"
            error={state.fieldErrors?.confirmPassword}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={pending}
          >
            {pending ? "Updating…" : "Update password"}
          </Button>
          <p className="text-center text-xs text-ink-faint">
            Updating your password signs out every active session.
          </p>
        </>
      )}
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  changePasswordAction,
  resendVerificationAction,
  revokeOtherSessionsAction,
  type AccountActionState,
} from "@/app/(customer)/account/actions";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";

const initialState: AccountActionState = { status: "idle" };

function StatusBanner({ state }: { state: AccountActionState }) {
  if (state.status === "idle" || !state.formMessage) return null;
  const isError = state.status === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`space-y-2 rounded-md border px-3 py-2.5 text-sm ${
        isError
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-success/40 bg-success/10 text-success"
      }`}
    >
      <p>{state.formMessage}</p>
      {state.devLink ? (
        <p className="border-t border-current/20 pt-2 text-xs">
          Development only — no mail provider configured:{" "}
          <Link href={state.devLink} className="underline">
            open the verification link
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );
  return (
    <form action={formAction} noValidate className="space-y-4">
      <StatusBanner state={state} />
      <PasswordInput
        label="Current password"
        name="currentPassword"
        autoComplete="current-password"
        error={state.fieldErrors?.currentPassword}
      />
      <PasswordInput
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        error={state.fieldErrors?.newPassword}
        hint="At least 10 characters."
      />
      <PasswordInput
        label="Confirm new password"
        name="confirmPassword"
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword}
      />
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

export function RevokeSessionsForm() {
  const [state, formAction, pending] = useActionState(
    revokeOtherSessionsAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-4">
      <StatusBanner state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Signing out…" : "Sign out all other sessions"}
      </Button>
    </form>
  );
}

export function ResendVerificationForm() {
  const [state, formAction, pending] = useActionState(
    resendVerificationAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-4">
      <StatusBanner state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Sending…" : "Resend verification email"}
      </Button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction, type AuthFormState } from "@/app/(public)/auth/actions";
import { FormMessage } from "@/components/auth/form-message";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const initialState: AuthFormState = { status: "idle" };

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );

  return (
    <form action={formAction} noValidate className="space-y-4">
      <FormMessage state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field
        label="Username or email"
        name="identifier"
        type="text"
        autoComplete="username"
        required
        placeholder="username or email"
        error={state.fieldErrors?.identifier}
      />
      <PasswordInput
        label="Password"
        name="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />
      <div className="flex justify-end">
        <Link
          href="/auth/forgot-password"
          className="text-sm text-orchid transition-colors hover:text-lilac"
        >
          Forgot password?
        </Link>
      </div>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs text-ink-faint">
        Sessions use secure, httpOnly cookies — nothing sensitive is kept in
        your browser storage.
      </p>
    </form>
  );
}

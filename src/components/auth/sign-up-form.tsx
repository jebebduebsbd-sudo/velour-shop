"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction, type AuthFormState } from "@/app/(public)/auth/actions";
import { FormMessage } from "@/components/auth/form-message";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const initialState: AuthFormState = { status: "idle" };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <form action={formAction} noValidate className="space-y-4">
      <FormMessage state={state} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        error={state.fieldErrors?.email}
        hint="You'll verify this address before your first purchase."
      />
      <Field
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        required
        placeholder="username"
        error={state.fieldErrors?.username}
      />
      <PasswordInput
        label="Password"
        name="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        hint="At least 10 characters."
      />
      <PasswordInput
        label="Confirm password"
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
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-xs text-ink-faint">
        By creating an account you agree to the{" "}
        <Link
          href="/buyer-protection"
          className="text-orchid transition-colors hover:text-lilac"
        >
          Buyer Protection policy
        </Link>
        .
      </p>
    </form>
  );
}

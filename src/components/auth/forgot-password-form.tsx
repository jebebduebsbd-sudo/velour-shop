"use client";

import { useActionState } from "react";

import {
  forgotPasswordAction,
  type AuthFormState,
} from "@/app/(public)/auth/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const initialState: AuthFormState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} noValidate className="space-y-4">
      <FormMessage state={state} />
      <Field
        label="Account email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        error={state.fieldErrors?.email}
        hint="If an account exists for this address, a reset link will be sent."
      />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your Velour account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell headline="Let's get you back in.">
      <h1 className="text-2xl font-bold text-ink">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Enter your account email and we&apos;ll send a single-use reset link.
      </p>
      <div className="mt-5 space-y-5">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-ink-muted">
          Remembered it?{" "}
          <Link
            href="/auth/sign-in"
            className="text-orchid transition-colors hover:text-lilac"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

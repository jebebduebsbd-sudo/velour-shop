import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Velour account.",
  // Reset links must never be indexed or referred onward.
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage(
  props: PageProps<"/auth/reset-password">,
) {
  const params = await props.searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <AuthShell headline="Choose a new password.">
      <h1 className="text-2xl font-bold text-ink">Set a new password</h1>
      {token ? (
        <div className="mt-5">
          <ResetPasswordForm token={token} />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-ink-muted">
            This page needs a valid reset link. Request a new one to continue.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block text-sm text-orchid transition-colors hover:text-lilac"
          >
            Request a reset link →
          </Link>
        </div>
      )}
    </AuthShell>
  );
}

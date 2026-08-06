import { CircleAlert, MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { buttonClasses } from "@/components/ui/button";
import { verifyEmail } from "@/lib/auth/service";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Confirm your email address to finish setting up your account.",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage(
  props: PageProps<"/auth/verify-email">,
) {
  const params = await props.searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const verified = token ? await verifyEmail(token) : false;

  return (
    <AuthShell headline="One quick confirmation.">
      {verified ? (
        <div className="space-y-4">
          <MailCheck
            className="h-8 w-8 text-success"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-ink">Email verified</h1>
          <p className="text-sm text-ink-muted">
            Your address is confirmed. You can fund your wallet and purchase
            listings now.
          </p>
          <Link
            href="/dashboard"
            className={buttonClasses("primary", "lg", "w-full")}
          >
            Go to dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <CircleAlert
            className="h-8 w-8 text-warning"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-ink">
            This link is not valid
          </h1>
          <p className="text-sm text-ink-muted">
            Verification links are single-use and expire after 24 hours. Sign in
            and request a new one from your account security page.
          </p>
          <Link
            href="/auth/sign-in"
            className={buttonClasses("secondary", "lg", "w-full")}
          >
            Go to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}

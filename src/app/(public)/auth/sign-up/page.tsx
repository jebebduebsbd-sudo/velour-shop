import type { Metadata } from "next";

import { AuthShell, AuthTabs } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Velour account.",
};

export default function SignUpPage() {
  return (
    <AuthShell headline="Join the market.">
      <h1 className="text-2xl font-bold text-ink">Create account</h1>
      <div className="mt-5 space-y-5">
        <AuthTabs active="sign-up" />
        <SignUpForm />
      </div>
    </AuthShell>
  );
}

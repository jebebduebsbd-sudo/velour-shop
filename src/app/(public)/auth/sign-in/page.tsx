import type { Metadata } from "next";

import { AuthShell, AuthTabs } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Velour account.",
};

export default function SignInPage() {
  return (
    <AuthShell headline="Welcome back.">
      <h1 className="text-2xl font-bold text-ink">Sign in</h1>
      <div className="mt-5 space-y-5">
        <AuthTabs active="sign-in" />
        <SignInForm />
      </div>
    </AuthShell>
  );
}

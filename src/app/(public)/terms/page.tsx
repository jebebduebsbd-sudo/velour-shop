import type { Metadata } from "next";
import Link from "next/link";

import { PolicyPage } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for Velour.",
};

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Terms of use" updated="2026-08-08">
      <p>
        These plain-language terms summarize how Velour works. They are provided
        for transparency and are not a substitute for professional legal review.
      </p>
      <h2>Accounts</h2>
      <p>
        You are responsible for your account credentials and for the activity on
        your account. Keep your password private and verify your email to enable
        purchases.
      </p>
      <h2>Purchases</h2>
      <p>
        Products are bought with your Velour wallet balance. Prices and stock are
        confirmed server-side at the moment of purchase. Delivered codes are for
        your own lawful use; reselling or publishing them and then claiming they
        were invalid is prohibited.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Both what may be sold and how the service may be used are governed by our{" "}
        <Link href="/acceptable-use">Acceptable use</Link> policy.
      </p>
      <h2>Refunds and disputes</h2>
      <p>
        Refunds, warranties, and disputes are handled per the{" "}
        <Link href="/buyer-protection">Buyer Protection</Link> and{" "}
        <Link href="/refund-policy">Refund</Link> policies.
      </p>
    </PolicyPage>
  );
}

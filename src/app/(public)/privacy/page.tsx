import type { Metadata } from "next";

import { PolicyPage } from "@/components/legal/policy-page";

export default function PrivacyPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Privacy" updated="2026-08-08">
      <p>
        This summary describes what Velour stores and how it is protected. It is
        provided for transparency and is not a substitute for professional legal
        review.
      </p>
      <h2>What we store</h2>
      <p>
        Your email, username, wallet ledger activity, orders, and support
        history. Passwords are stored only as strong one-way hashes. Sessions are
        opaque, server-side, and revocable.
      </p>
      <h2>What we never store or log</h2>
      <p>
        We do not put delivered code values, passwords, session tokens, API
        keys, or card data into logs, analytics, URLs, or emails. Audit records
        deliberately exclude these.
      </p>
      <h2>Payments</h2>
      <p>
        Card details are handled by the payment provider&rsquo;s hosted
        checkout; Velour never stores raw card numbers or security codes.
      </p>
      <h2>Your controls</h2>
      <p>
        You can change your password, sign out individual or all sessions, and
        export your own transaction history from your account.
      </p>
    </PolicyPage>
  );
}

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Velour handles your data.",
};

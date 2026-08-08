import type { Metadata } from "next";
import Link from "next/link";

import { PolicyPage } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Velour support.",
};

export default function ContactPage() {
  return (
    <PolicyPage eyebrow="Support" title="Contact us">
      <p>
        The fastest way to get help is from inside your account, where your order
        context is attached automatically:
      </p>
      <p>
        <strong>Order problems</strong> — open a refund or dispute directly on
        the order from your <Link href="/orders">Purchases</Link>.
      </p>
      <p>
        <strong>Anything else</strong> — open a{" "}
        <Link href="/support">support ticket</Link> once signed in.
      </p>
      <p>
        You can also email <strong>support@velour.shop</strong> from your account
        email; include the order reference. Support will never ask for your
        password, and you should not share delivered codes unless a reviewer
        explicitly requests proof.
      </p>
    </PolicyPage>
  );
}

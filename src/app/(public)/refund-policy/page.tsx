import type { Metadata } from "next";
import Link from "next/link";

import { PolicyPage } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Refund policy",
  description: "How refunds work on Velour.",
};

export default function RefundPolicyPage() {
  return (
    <PolicyPage eyebrow="Policy" title="Refund policy" updated="2026-08-08">
      <p>
        Refunds are issued to your Velour wallet as compensating ledger entries.
        The original purchase record is never altered, and a refund can never
        exceed the amount you paid for the order.
      </p>
      <h2>When a refund applies</h2>
      <p>
        If a delivered code, key, or voucher was invalid or already redeemed at
        the moment we delivered it, or the delivery did not match the listing,
        you are eligible for a replacement or a wallet refund after review.
      </p>
      <h2>Automated vs. manual review</h2>
      <p>
        An order whose deliverable has not yet been revealed can be refunded
        automatically. Once a code has been revealed, the refund goes to manual
        review, since the value may already have been used.
      </p>
      <h2>What is not refundable</h2>
      <p>
        Codes that were redeemed successfully, region or platform
        incompatibility that the listing disclosed before purchase, or value
        lost by sharing a delivered code with a third party.
      </p>
      <p>
        Request a refund from the order page, or read the full{" "}
        <Link href="/buyer-protection">Buyer Protection policy</Link>.
      </p>
    </PolicyPage>
  );
}

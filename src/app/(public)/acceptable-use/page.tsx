import type { Metadata } from "next";

import { PolicyPage } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Acceptable use",
  description: "What may and may not be sold or done on Velour.",
};

export default function AcceptableUsePage() {
  return (
    <PolicyPage eyebrow="Policy" title="Acceptable use" updated="2026-08-08">
      <p>
        Velour lists only lawful, authorized, transferable digital goods —
        official gift codes and links, activation keys, prepaid vouchers, gift
        cards, authorized subscription vouchers, and documented transferable
        codes.
      </p>
      <h2>Prohibited inventory</h2>
      <p>
        The following are not permitted in any form, and the platform is built
        so they cannot be listed: account usernames or passwords, shared or
        stolen accounts, mailbox credentials, browser cookies or session
        tokens, recovery codes, 2FA secrets or authenticator exports, and any
        &ldquo;via login&rdquo; fulfillment.
      </p>
      <h2>Prohibited tools and conduct</h2>
      <p>
        No spoofers, cheats, injectors, unlockers, anti-cheat bypasses, ban
        evasion, or account-checking tools (including &ldquo;skin
        checkers&rdquo; that require uploading account logins). No payment fraud,
        chargeback abuse, or funding a wallet with unauthorized methods.
      </p>
      <h2>Suppliers</h2>
      <p>
        Every inventory source must document its transfer or resale rights.
        Products cannot be activated until that evidence is recorded and
        verified.
      </p>
    </PolicyPage>
  );
}

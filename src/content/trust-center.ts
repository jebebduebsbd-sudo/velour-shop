/**
 * Trust Center content, kept as structured data. Each section links to a real
 * page or states a real, enforced control — no marketing claims that the
 * platform doesn't actually back.
 */
export type TrustSection = {
  id: string;
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

export const TRUST_CENTER = {
  title: "Trust Center",
  intro:
    "How Velour protects buyers: clear listings, wallet-only checkout, encrypted delivery, real reviews, and honest status — with the policies and controls behind each.",
  sections: [
    {
      id: "buyer-protection",
      title: "Buyer Protection",
      body: "What is covered, refund eligibility, warranty and dispute processes, and response windows — in plain language.",
      href: "/buyer-protection",
      linkLabel: "Read Buyer Protection",
    },
    {
      id: "payment-security",
      title: "Payment security",
      body: "Products are paid from your wallet balance only; checkout never charges a card directly. Wallet top-ups are credited exclusively after a verified provider webhook — never from a browser redirect. Velour never stores raw card data.",
    },
    {
      id: "inventory-verification",
      title: "Inventory verification",
      body: "Listings carry only lawful, transferable codes, keys, and vouchers. A product cannot go live until its supplier's transfer-right evidence is recorded and verified, and any credential-shaped payload is rejected at import.",
    },
    {
      id: "fulfillment",
      title: "Fulfillment & delivery",
      body: "Stocked codes are reserved atomically at checkout so nothing oversells. Deliverables are encrypted at rest and revealed only to the order owner after a fresh password confirmation — never shown in logs, emails, or page source before you unlock them.",
    },
    {
      id: "refunds",
      title: "Refunds",
      body: "Refunds are issued to your wallet as compensating ledger entries; the original purchase record is never edited, and a refund can never exceed what you paid.",
      href: "/refund-policy",
      linkLabel: "Refund policy",
    },
    {
      id: "status",
      title: "Service status",
      body: "Live checks of the app, database, and payment providers — with honest labels and no fabricated uptime figures.",
      href: "/status",
      linkLabel: "View status",
    },
    {
      id: "reviews",
      title: "Verified vouches",
      body: "Every review is tied to a real fulfilled order. There is no path to a seller-written or order-less review, and moderation can only hide policy-violating content, never rewrite a rating.",
    },
    {
      id: "data-protection",
      title: "Data protection",
      body: "Passwords are stored only as strong one-way hashes; sessions are opaque, server-side, and revocable. Audit records deliberately exclude passwords, tokens, deliverable values, and card data.",
    },
    {
      id: "responsible-products",
      title: "Responsible product policy",
      body: "Velour sells only authorized, transferable digital goods. Account credentials, mailbox access, session cookies, recovery codes, 2FA data, and account-checking tools are prohibited and structurally impossible to list.",
      href: "/acceptable-use",
      linkLabel: "Acceptable use",
    },
    {
      id: "community",
      title: "Community",
      body: "A public discussion space with published rules, named moderation steps, and a hard boundary: orders, refunds, and disputes are settled in your account, never in chat.",
      href: "/community",
      linkLabel: "Community guidelines",
    },
    {
      id: "support",
      title: "Contact support",
      body: "Open a ticket from your account, or a refund/dispute directly on the order. Support never asks for your password.",
      href: "/contact",
      linkLabel: "Contact",
    },
  ] satisfies TrustSection[],
} as const;

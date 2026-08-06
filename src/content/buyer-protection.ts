/**
 * Buyer Protection policy content, kept as structured data so it can be
 * rendered, reused, and tested. Plain-language, original wording.
 *
 * Editorial rules (enforced by tests):
 * - no absolute promises ("guaranteed refund", "lifetime replacement", ...)
 * - every required section present and non-empty.
 */

export type PolicySection = {
  id: string;
  title: string;
  summary: string;
  clauses: string[];
};

export type QuickFact = {
  title: string;
  detail: string;
};

export const BUYER_PROTECTION = {
  title: "Buyer Protection",
  updated: "2026-08-06",
  intro:
    "The rules that govern listings, wallet funding, checkout, delivery, warranties, refunds, and disputes on Velour — written in plain language so you know what to expect before you pay.",
  quickFacts: [
    {
      title: "Clear listings",
      detail: "Every listing states exactly what you receive before you pay.",
    },
    {
      title: "Wallet checkout",
      detail: "Products are paid from your wallet balance only.",
    },
    {
      title: "Recorded delivery",
      detail: "Each delivery is tied to your order with an auditable record.",
    },
    {
      title: "Structured support",
      detail: "Warranty and dispute cases follow a tracked review process.",
    },
  ] satisfies QuickFact[],
  sections: [
    {
      id: "coverage-overview",
      title: "Coverage overview",
      summary:
        "What Buyer Protection is and when it applies to an order on Velour.",
      clauses: [
        "Buyer Protection applies to every order placed through Velour checkout and paid with wallet balance.",
        "Protection covers the specific deliverable named in the listing at the time of purchase — nothing more, nothing less.",
        "Cases are reviewed individually; outcomes depend on the evidence attached to the order and the timelines in this policy.",
      ],
    },
    {
      id: "what-is-covered",
      title: "What is covered",
      summary: "Situations where you can expect a replacement or wallet refund.",
      clauses: [
        "The delivered code, key, or voucher was already redeemed or invalid at the moment Velour delivered it to you.",
        "The delivery does not match the listing's stated deliverable (wrong denomination, wrong region, wrong product).",
        "A paid order was never fulfilled and the hold on your wallet was not released.",
      ],
    },
    {
      id: "what-is-not-covered",
      title: "What is not covered",
      summary: "Situations outside the scope of Buyer Protection.",
      clauses: [
        "Codes redeemed successfully and later restricted because of activity on your own platform account.",
        "Region or platform incompatibility that the listing disclosed before purchase.",
        "Changes a platform makes to its own product, pricing, or terms after your code was delivered.",
        "Loss caused by sharing a delivered code with a third party after reveal.",
      ],
    },
    {
      id: "before-purchase",
      title: "Before you buy",
      summary: "Checks that happen — and that you should make — before paying.",
      clauses: [
        "The listing must identify the exact product, denomination, region, delivery method, and any limitations.",
        "Confirm the product is compatible with your region and intended platform account before checkout.",
        "Velour does not claim affiliation with the game or platform owners shown in the catalog.",
      ],
    },
    {
      id: "checkout-protections",
      title: "Checkout protections",
      summary: "How checkout keeps pricing and payment honest.",
      clauses: [
        "Prices and stock are confirmed server-side at the moment of purchase — the checkout never trusts values shown earlier in your browser.",
        "Products are paid from your wallet balance only; checkout never charges an external payment method directly.",
        "If fulfillment cannot start, the wallet hold for the order is released back to your balance.",
      ],
    },
    {
      id: "delivery-protections",
      title: "Delivery protections",
      summary: "How deliverables are stored and revealed.",
      clauses: [
        "Deliverables are stored encrypted and are only revealed to the authenticated owner of a fulfilled order.",
        "Reveals are recorded on the order so warranty reviews can verify when a code was first accessed.",
        "Delivered values are excluded from logs, analytics, and email notifications.",
      ],
    },
    {
      id: "warranty-process",
      title: "Warranty process",
      summary: "What to do when a delivered code does not work.",
      clauses: [
        "Report the issue from the order page within the warranty window shown on the listing.",
        "Include what you attempted, when, and any platform message you received — screenshots help.",
        "After review, an approved warranty case ends with a replacement unit when available, or a wallet refund.",
      ],
    },
    {
      id: "refund-eligibility",
      title: "Refund eligibility",
      summary: "When refunds can be issued and how they are paid.",
      clauses: [
        "Refunds are issued to your Velour wallet as compensating ledger entries — original payment records are never edited.",
        "A refund can never exceed the amount actually paid for the order.",
        "Orders that were never fulfilled and never revealed are eligible for streamlined review; revealed deliverables require manual review.",
        "Duplicate refund requests for the same order are merged into a single case.",
      ],
    },
    {
      id: "dispute-process",
      title: "Dispute process",
      summary: "What happens when you and support disagree.",
      clauses: [
        "If a warranty or refund decision doesn't resolve the issue, you can open a dispute from the order.",
        "Disputes move through defined stages: open, information requests, merchant review, and a recorded resolution.",
        "Every decision on a dispute is recorded with a reason and is visible on the case timeline.",
      ],
    },
    {
      id: "response-windows",
      title: "Response windows",
      summary: "The timelines both sides are expected to keep.",
      clauses: [
        "Warranty issues must be reported within the window stated on the listing, measured from first reveal.",
        "Support aims to give a first response to new cases within two business days.",
        "If we request more information, the case may be closed when there is no reply within seven days.",
      ],
    },
    {
      id: "customer-responsibilities",
      title: "Customer responsibilities",
      summary: "What we ask of you so cases can be resolved fairly.",
      clauses: [
        "Keep your account credentials private and enable the security features offered on your account.",
        "Redeem delivered codes promptly and only on accounts you own.",
        "Provide accurate, complete information in warranty and dispute cases.",
      ],
    },
    {
      id: "prohibited-conduct",
      title: "Prohibited conduct",
      summary: "Activity that voids protection and may close an account.",
      clauses: [
        "Reselling, sharing, or publishing delivered codes and then claiming they were invalid.",
        "Chargeback abuse, payment fraud, or funding a wallet with unauthorized payment methods.",
        "Attempting to buy or sell account credentials, mailbox access, session cookies, recovery codes, or 2FA secrets — these are not permitted on Velour in any form.",
      ],
    },
    {
      id: "contact-support",
      title: "Contact support",
      summary: "How to reach a human about an order.",
      clauses: [
        "Open a case from the order page while signed in — this attaches the order context automatically.",
        "You can also email support@velour.shop from your account email; include the order reference.",
        "Support never asks for your password, and delivered codes should not be shared in messages unless a reviewer explicitly requests proof.",
      ],
    },
  ] satisfies PolicySection[],
} as const;

/** Section ids required by the product specification. */
export const REQUIRED_SECTION_IDS = [
  "coverage-overview",
  "what-is-covered",
  "what-is-not-covered",
  "before-purchase",
  "checkout-protections",
  "delivery-protections",
  "warranty-process",
  "refund-eligibility",
  "dispute-process",
  "response-windows",
  "customer-responsibilities",
  "prohibited-conduct",
  "contact-support",
] as const;

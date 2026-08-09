/**
 * Velour Community description, kept as structured data so it can be rendered
 * on-site, reused for off-site profiles (docs/community-description.md), and
 * tested. Plain-language, original wording.
 *
 * Editorial rules (enforced by tests):
 * - no invented membership figures, uptime numbers, or absolute promises
 * - the community never becomes a second marketplace: every claim points back
 *   to the on-platform order, ticket, or policy that actually decides things
 * - the product boundary (no credentials, no credential-shaped goods) is
 *   restated here because chat is where people try to get around it.
 */

export type CommunitySection = {
  id: string;
  title: string;
  summary: string;
  points: string[];
};

export type CommunitySpace = {
  id: string;
  name: string;
  purpose: string;
  belongs: string;
};

export type CommunityRole = {
  id: string;
  name: string;
  earned: string;
  unlocks: string;
};

export type CommunityRule = {
  id: string;
  title: string;
  detail: string;
};

export type CommunityFaq = {
  id: string;
  question: string;
  answer: string;
};

export type CommunityQuickFact = {
  title: string;
  detail: string;
};

export const COMMUNITY = {
  title: "Velour Community",
  updated: "2026-08-09",

  /** Short enough for a platform "server description" field (<= 120 chars). */
  tagline:
    "The public space around velour.shop: lawful digital goods, real vouches, honest talk about orders.",

  /** One-paragraph summary, reused as the page meta description. */
  shortDescription:
    "The Velour Community is the public discussion space around the velour.shop marketplace — a place to ask about a listing before you spend wallet balance, describe how a redemption actually went, follow platform changes, and get pointed at the right support channel. Buying, refunds, and disputes always stay on the platform.",

  /** Longer opening used at the top of the community page. */
  intro:
    "Velour sells lawful, transferable digital goods — gift codes, wallet codes, vouchers, and official keys. The community is where the people buying and running that catalog talk in the open: what a listing actually delivers, which region a code works in, what changed in the last release, and what to do when something goes wrong. It is deliberately a companion to the marketplace rather than a shadow version of it, so nothing here can replace an order, a warranty case, or a dispute.",

  quickFacts: [
    {
      title: "A discussion space",
      detail: "Talk about listings and redemptions — never a place to trade.",
    },
    {
      title: "Public by default",
      detail: "Assume every message can be read, quoted, and archived.",
    },
    {
      title: "Orders stay on-platform",
      detail: "Only your account and support tickets decide an order.",
    },
    {
      title: "Same product boundary",
      detail: "No credentials, mailbox access, cookies, or 2FA data. Ever.",
    },
  ] satisfies CommunityQuickFact[],

  sections: [
    {
      id: "what-it-is",
      title: "What the community is",
      summary:
        "A public companion to the marketplace — with none of the marketplace's authority.",
      points: [
        "The Velour Community is an open discussion space for people who buy, list, or are simply curious about lawful transferable digital goods on velour.shop.",
        "It exists because a star rating cannot explain a redemption. Chat can: which region a voucher accepted, how long a platform took to apply a balance, which denomination was the better value this month.",
        "Nothing said in the community changes an order. A helpful answer is an opinion; a support decision only counts when it appears on the order or ticket inside your account.",
        "Every message is public by default. Treat it like a forum post that outlives you — never paste a delivered code, an invoice, or a document into it.",
      ],
    },
    {
      id: "who-its-for",
      title: "Who it is for",
      summary: "The people the space is designed around — and who it is not for.",
      points: [
        "Buyers who want a second opinion on an unfamiliar denomination, region, or platform before spending wallet balance.",
        "People who already bought and want to describe the redemption in more detail than a rating allows, alongside the Verified Vouch they leave on the product.",
        "Affiliates comparing what actually converts, within the disclosure rules and without spamming links.",
        "Anyone interested in how the platform works underneath: the double-entry wallet ledger, atomic stock reservation, encrypted delivery, and why the product boundary is drawn where it is.",
        "It is not for anyone shopping for account credentials, stealer logs, checkers, or a way to deal outside Buyer Protection. Those requests are removed on sight, and asking is itself a rule break.",
      ],
    },
    {
      id: "how-it-connects",
      title: "How it connects to the platform",
      summary:
        "Where a conversation stops and the marketplace's own machinery takes over.",
      points: [
        "Money never moves in chat. Purchases are paid from your Velour wallet, and wallet credit is created only by a verified server-to-server webhook after a real top-up.",
        "Stock is reserved atomically at checkout, so a code someone recommends in chat is still first-come, first-served on the product page.",
        "Deliverables are encrypted at rest and revealed only to the owner of a fulfilled order, after a fresh password confirmation. No moderator, and no chat message, can reveal one for you.",
        "Refunds are compensating ledger entries raised from the order — never a transfer arranged between members.",
        "Reviews are order-gated: a Verified Vouch on velour.shop requires a real fulfilled order behind it, which is exactly why an enthusiastic chat message is not one.",
      ],
    },
    {
      id: "conduct",
      title: "How we expect people to behave",
      summary:
        "The short version of the rules, in the order they usually matter.",
      points: [
        "Trade on the platform, talk in the community. Any offer to buy or sell directly, at any price, in any channel, is treated as a scam attempt.",
        "Be accurate about orders. Say what happened, when, and what the platform told you — and open the warranty case before declaring a code dead in public.",
        "Redact before you post. Screenshots routinely leak order references, emails, and partial codes belonging to other people.",
        "Disagree with the argument, not the person. Harassment, hate speech, and doxxing end participation quickly and permanently.",
        "One person, one account. Alternate accounts used to inflate praise, evade a mute, or fake consensus are removed together.",
      ],
    },
    {
      id: "support-boundary",
      title: "What the community cannot do for you",
      summary:
        "The community is not a support channel of record, by design.",
      points: [
        "Posting in chat does not open a ticket, start a warranty case, pause a dispute deadline, or reserve stock.",
        "Order problems belong on the order: the refund and dispute actions attach the order context automatically.",
        "Anything else belongs in a support ticket from your account, or an email to support@velour.shop sent from your account address with the order reference.",
        "The response windows described in Buyer Protection apply to tickets and cases. Chat has no response-time commitment at all.",
        "Moderators cannot see your wallet, your orders, or your delivered codes, and cannot issue, speed up, or overturn a refund.",
      ],
    },
    {
      id: "safety",
      title: "Staying safe in chat",
      summary:
        "Marketplace communities attract impersonators. Here is the short defence.",
      points: [
        "Velour staff will never message you first to ask for a password, a delivered code, a 2FA code, or a 'verification' top-up.",
        "There is no middleman or escrow service in the community. Wallet checkout is the escrow: it holds the funds and releases them through the order state machine.",
        "Nobody can add wallet balance as a favour. Credit exists only after a verified provider webhook, so 'cheap top-ups' are always a scam.",
        "If a message claims your order was cancelled or your account was frozen, open velour.shop yourself instead of following the link you were sent.",
        "Report impersonation with a screenshot and the account identifier, then stop replying. Impersonating staff is a permanent removal with no ladder and no warning.",
      ],
    },
    {
      id: "moderation",
      title: "Moderation and appeals",
      summary: "What enforcement looks like and how to challenge it.",
      points: [
        "Most problems end quietly: the message is removed or edited, and the reason is explained once.",
        "Repeat or deliberate breaks escalate along a ladder — warning, temporary mute, temporary removal, permanent removal.",
        "Scam attempts, credential trading, malware or cheat links, and staff impersonation skip the ladder entirely.",
        "Community enforcement is separate from your marketplace account. Being removed from chat does not freeze your wallet, cancel your orders, or void Buyer Protection; suspending a marketplace account is a separate decision made under the Acceptable Use policy.",
        "To appeal, send one message with a link to the removed content and what you would do differently. Appeals are read once and answered once.",
      ],
    },
    {
      id: "joining",
      title: "Joining",
      summary: "What to do first, and how to spot a fake invite.",
      points: [
        "Read the rules space before posting anywhere — posting is taken as acceptance.",
        "Pick a name you are willing to be quoted under, and keep to one account.",
        "Link your Velour account only through the verification flow published inside the community. Never send credentials, a session cookie, or a dashboard screenshot to another member, staff included.",
        "Invite links are published here and on velour.shop. An invite you found anywhere else is unverified until it matches one of those.",
        "English and Bulgarian are both welcome, matching the two languages the storefront ships in.",
      ],
    },
  ] satisfies CommunitySection[],

  spaces: [
    {
      id: "start-here",
      name: "start-here",
      purpose: "Rules, roles, and the account verification flow.",
      belongs: "Read-only. Everything you need before your first message.",
    },
    {
      id: "announcements",
      name: "announcements",
      purpose: "Releases, incidents, policy changes, planned maintenance.",
      belongs:
        "Staff posts only. Anything affecting availability is also visible on the status page.",
    },
    {
      id: "market-talk",
      name: "market-talk",
      purpose: "Questions about listings before you buy.",
      belongs:
        "Denominations, regions, platform compatibility, and what a listing does and does not include.",
    },
    {
      id: "vouches",
      name: "vouches",
      purpose: "How a purchase actually went, in full sentences.",
      belongs:
        "Your own experience, plus a link to the Verified Vouch you left on the product page.",
    },
    {
      id: "redemption-help",
      name: "redemption-help",
      purpose: "Walking through a redemption that is not going smoothly.",
      belongs:
        "Steps you tried and the exact platform message you saw. Open a warranty case in parallel — this channel does not track it.",
    },
    {
      id: "affiliate-lounge",
      name: "affiliate-lounge",
      purpose: "Comparing notes on the affiliate program.",
      belongs:
        "Referral links only here, always disclosed as your own. No mass tagging, no direct messages to strangers.",
    },
    {
      id: "feedback",
      name: "feedback",
      purpose: "Feature requests, rough edges, and bug reports.",
      belongs:
        "What you expected, what happened, and how to reproduce it. Security issues go to support privately instead.",
    },
    {
      id: "off-topic",
      name: "off-topic",
      purpose: "Everything else.",
      belongs: "Same rules, lower stakes.",
    },
  ] satisfies CommunitySpace[],

  roles: [
    {
      id: "member",
      name: "Member",
      earned: "Join and accept the rules.",
      unlocks: "Every discussion space.",
    },
    {
      id: "verified-buyer",
      name: "Verified buyer",
      earned: "Confirmed after at least one fulfilled Velour order.",
      unlocks:
        "Posting in vouches. It follows the same order-gating as on-site reviews, so it cannot be bought, traded, or vouched into.",
    },
    {
      id: "contributor",
      name: "Contributor",
      earned: "Given by moderators for consistently useful, accurate answers.",
      unlocks: "Nothing commercial — it is recognition, not a discount.",
    },
    {
      id: "affiliate",
      name: "Affiliate",
      earned: "Active participation in the Velour affiliate program.",
      unlocks:
        "Sharing disclosed referral links in the affiliate space only.",
    },
    {
      id: "moderator",
      name: "Moderator",
      earned: "Appointed by Velour.",
      unlocks:
        "Enforcing the rules. Moderators have no access to accounts, wallets, orders, or deliverables.",
    },
    {
      id: "staff",
      name: "Staff",
      earned: "Velour team members.",
      unlocks:
        "Announcements and escalation. Even staff act on an order through the platform, never through chat.",
    },
  ] satisfies CommunityRole[],

  rules: [
    {
      id: "on-platform",
      title: "Buy and sell only on Velour",
      detail:
        "Offering, requesting, or arranging a direct deal removes every protection the platform provides. It is treated as a scam attempt regardless of intent.",
    },
    {
      id: "no-credentials",
      title: "No credentials or credential-shaped goods",
      detail:
        "Account logins, mailbox access, session cookies, browser profiles, authenticator files, recovery codes, 2FA secrets, stealer logs, and checker tooling are prohibited to buy, sell, request, or link.",
    },
    {
      id: "no-piracy-or-malware",
      title: "No piracy, cheats, or malware",
      detail:
        "Cracked software, cheat clients, key generators, and links to any of them are removed, and the account with them goes with the link.",
    },
    {
      id: "protect-codes",
      title: "Never post a delivered code",
      detail:
        "Not even a used or expired one, and not in a screenshot. Codes are revealed to one owner for a reason.",
    },
    {
      id: "honest-claims",
      title: "Be honest about orders",
      detail:
        "Do not describe an order you did not place, and do not call a code invalid in public before the warranty case has been reviewed.",
    },
    {
      id: "one-account",
      title: "One account per person",
      detail:
        "Alternate accounts used to evade moderation, inflate praise, or manufacture agreement are removed together with the original.",
    },
    {
      id: "privacy",
      title: "Respect other people's data",
      detail:
        "Redact order references, emails, and usernames from screenshots. Posting someone's personal information is an immediate removal.",
    },
    {
      id: "respect",
      title: "Keep it civil",
      detail:
        "No harassment, hate speech, sexual content, or targeted pile-ons. Criticism of the platform is welcome; abuse of a person is not.",
    },
    {
      id: "advertising",
      title: "No unsolicited advertising",
      detail:
        "No promoting other shops, no unsolicited direct messages, and no giveaways without staff approval and a stated funding source.",
    },
    {
      id: "impersonation",
      title: "Never impersonate staff",
      detail:
        "Copying a staff name, avatar, or role colour is a permanent removal on the first offence.",
    },
  ] satisfies CommunityRule[],

  faq: [
    {
      id: "official",
      question: "Is the community run by Velour?",
      answer:
        "Yes — Velour staff run and moderate it. It is still a discussion space, so an official answer about your order only exists inside your account.",
    },
    {
      id: "sell-my-own",
      question: "Can I sell my own codes there?",
      answer:
        "No. A chat deal has no reservation, no encrypted delivery, no ledger entry, and no refund path. If you have inventory to list, go through supplier onboarding, where transfer rights are recorded before anything goes live.",
    },
    {
      id: "chat-vouch",
      question: "Does a good word in chat count as a review?",
      answer:
        "No. Verified Vouches are tied to a fulfilled order on the platform. Chat praise is welcome, but it never becomes a rating.",
    },
    {
      id: "moderator-refund",
      question: "Can a moderator refund me?",
      answer:
        "No. Moderators cannot see or touch orders. Refunds are raised from the order page and settled to your wallet as ledger entries.",
    },
    {
      id: "member-count",
      question: "Why does this page not advertise a member count?",
      answer:
        "Velour publishes only numbers it can back with real data. The member counter shown by the platform hosting the space is the only figure worth quoting.",
    },
    {
      id: "languages",
      question: "Which languages are used?",
      answer:
        "English and Bulgarian, matching the storefront's two UI languages. Moderation is available in both.",
    },
  ] satisfies CommunityFaq[],
} as const;

/** Section ids the community description must always cover. */
export const REQUIRED_COMMUNITY_SECTION_IDS = [
  "what-it-is",
  "who-its-for",
  "how-it-connects",
  "conduct",
  "support-boundary",
  "safety",
  "moderation",
  "joining",
] as const;

/** Related on-site pages surfaced at the bottom of the community page. */
export const COMMUNITY_RELATED_LINKS = [
  { href: "/buyer-protection", label: "Buyer Protection" },
  { href: "/acceptable-use", label: "Acceptable use" },
  { href: "/trust", label: "Trust Center" },
  { href: "/status", label: "Service status" },
  { href: "/contact", label: "Contact support" },
] as const;

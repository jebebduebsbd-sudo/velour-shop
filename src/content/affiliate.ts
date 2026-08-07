import {
  FRIEND_BONUS_MINOR,
  REFERRER_RATE,
  REFUND_WINDOW_DAYS,
} from "@/lib/affiliate/service";
import { formatMinor } from "@/lib/format";

/**
 * Affiliate program copy, kept as data so it stays honest and testable.
 *
 * Editorial rules (enforced by tests): no guaranteed-income or get-rich-quick
 * claims, no fake earnings, no "quit your job" messaging.
 */
export const AFFILIATE_CONTENT = {
  eyebrow: "Earn with Velour",
  headline: "Invite friends. Earn when approved customers buy.",
  intro:
    "Share products your audience genuinely values and earn rewards from verified purchases made through your link.",
  disclosure:
    "Earnings depend on approved referrals and completed qualifying purchases. Rewards are paid as promotional balance and are not guaranteed.",
  steps: [
    {
      title: "Share your link",
      detail:
        "Every account gets a unique referral link. Share it only where self-promotion is allowed.",
    },
    {
      title: "A friend makes a qualifying purchase",
      detail:
        "When someone you referred completes their first purchase, a reward is tracked to your account.",
    },
    {
      title: "Your reward unlocks after review",
      detail: `Rewards are held for a ${REFUND_WINDOW_DAYS}-day refund window, then credited as promotional balance.`,
    },
  ],
  get benefits() {
    return [
      {
        title: "Referral reward",
        detail: `Earn ${Math.round(REFERRER_RATE * 100)}% of a referred customer's first qualifying purchase.`,
      },
      {
        title: "Welcome bonus for your friend",
        detail: `The person you refer gets ${formatMinor(FRIEND_BONUS_MINOR, "EUR")} in promotional balance on their first purchase.`,
      },
      {
        title: "Paid as wallet promo credit",
        detail:
          "Rewards are spendable promotional balance on Velour. They are non-withdrawable.",
      },
      {
        title: "Transparent tracking",
        detail:
          "See clicks, referred signups, and every reward's status on your dashboard.",
      },
    ];
  },
  rules: [
    "No reward is granted for a click or a signup alone — only a completed qualifying purchase counts.",
    "Self-referrals, duplicate accounts, and payment fraud are not eligible and may remove access.",
    "Rewards for refunded or charged-back orders are reversed.",
    "Only promote where advertising is permitted. No spam, unsolicited messages, fake reviews, or bought engagement.",
  ],
} as const;

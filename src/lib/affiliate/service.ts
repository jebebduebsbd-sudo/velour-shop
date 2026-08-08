import { randomBytes } from "node:crypto";

import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { creditPromo, reversePromo } from "@/lib/wallet/ledger";

/**
 * Honest affiliate/referral program.
 *
 * Economics (configurable constants; admin UI comes later):
 * - The affiliate earns REFERRER_RATE of a referred user's first qualifying
 *   purchase, paid as NON-WITHDRAWABLE promotional balance, only after a
 *   refund window elapses.
 * - The referred friend receives a small promotional bonus on that first
 *   purchase.
 * No reward is granted for a click or a signup alone; self-referral is
 * impossible (a new user cannot already be an affiliate for themselves) and is
 * additionally guarded here.
 */
export const REFERRER_RATE = 0.1; // 10% of the first qualifying purchase
export const FRIEND_BONUS_MINOR = 200; // €2.00 promo for the referred buyer
export const REFUND_WINDOW_DAYS = 7;

/** Returns the caller's affiliate profile, creating one (with a code) if needed. */
export async function getOrCreateAffiliateProfile(
  userId: string,
): Promise<{ id: string; code: string }> {
  const existing = await prisma.affiliateProfile.findUnique({
    where: { userId },
    select: { id: true, code: true },
  });
  if (existing) return existing;

  // Retry on the rare code collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    try {
      return await prisma.affiliateProfile.create({
        data: { userId, code },
        select: { id: true, code: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }
  throw new Error("Could not allocate an affiliate code");
}

function generateCode(): string {
  // 8 chars, unambiguous uppercase alphabet.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i += 1) code += alphabet[bytes[i]! % alphabet.length];
  return code;
}

export async function resolveProfileByCode(
  code: string,
): Promise<{ id: string; userId: string } | null> {
  if (!code) return null;
  return prisma.affiliateProfile.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, userId: true },
  });
}

export async function recordClick(profileId: string): Promise<void> {
  await prisma.affiliateClick
    .create({ data: { profileId } })
    .catch(() => undefined);
}

/**
 * Records a conversion for a referred user's FIRST qualifying purchase and
 * holds the reward for the refund window. Idempotent per referred user and per
 * order. Returns null when there is nothing to do (no referrer, self-referral,
 * or a conversion already exists).
 */
export async function recordConversion(input: {
  referredUserId: string;
  orderId: string;
  orderAmountMinor: number;
  currency: string;
}): Promise<{ created: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: input.referredUserId },
    select: { referredById: true, referredBy: { select: { userId: true } } },
  });
  if (!user?.referredById || !user.referredBy) return { created: false };

  // Guard against self-referral (belt and suspenders — signup prevents it too).
  if (user.referredBy.userId === input.referredUserId) return { created: false };

  const rewardMinor = Math.max(
    Math.round(input.orderAmountMinor * REFERRER_RATE),
    0,
  );
  if (rewardMinor <= 0) return { created: false };

  const availableAt = new Date(
    Date.now() + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  try {
    await prisma.affiliateConversion.create({
      data: {
        profileId: user.referredById,
        referredUserId: input.referredUserId,
        orderId: input.orderId,
        rewardMinor,
        currency: input.currency,
        status: "PENDING_REFUND_WINDOW",
        availableAt,
      },
    });
  } catch (error) {
    // Unique on referredUserId/orderId: the user already converted once.
    if (isUniqueViolation(error)) return { created: false };
    throw error;
  }

  // Friend bonus is safe to credit immediately (they have already purchased).
  if (FRIEND_BONUS_MINOR > 0) {
    await creditPromo({
      userId: input.referredUserId,
      amountMinor: FRIEND_BONUS_MINOR,
      currency: input.currency,
      idempotencyKey: `friend-bonus:${input.orderId}`,
      description: "Referral welcome bonus",
    }).catch(() => undefined);
  }

  await recordAuditEvent({
    action: AUDIT_ACTIONS.affiliateConversion,
    userId: input.referredUserId,
    targetType: "AffiliateConversion",
    targetId: input.orderId,
    metadata: { rewardMinor },
  });

  return { created: true };
}

/**
 * Matures rewards whose refund window has elapsed: credits the affiliate's
 * promotional balance and marks the conversion AVAILABLE. Idempotent — the
 * ledger credit is keyed by conversion id and the row is only advanced once.
 */
export async function matureDueRewards(now = new Date()): Promise<number> {
  const due = await prisma.affiliateConversion.findMany({
    where: { status: "PENDING_REFUND_WINDOW", availableAt: { lte: now } },
    select: {
      id: true,
      rewardMinor: true,
      currency: true,
      profile: { select: { userId: true } },
    },
  });

  let credited = 0;
  for (const conversion of due) {
    const result = await creditPromo({
      userId: conversion.profile.userId,
      amountMinor: conversion.rewardMinor,
      currency: conversion.currency,
      idempotencyKey: `affiliate-reward:${conversion.id}`,
      description: "Affiliate reward",
    });
    await prisma.affiliateConversion.updateMany({
      where: { id: conversion.id, status: "PENDING_REFUND_WINDOW" },
      data: { status: "AVAILABLE", rewardLedgerTxnId: result.transactionId },
    });
    await recordAuditEvent({
      action: AUDIT_ACTIONS.affiliateReward,
      userId: conversion.profile.userId,
      targetType: "AffiliateConversion",
      targetId: conversion.id,
      metadata: { rewardMinor: conversion.rewardMinor },
    });
    credited += 1;
  }
  return credited;
}

/**
 * Reverses the reward for a refunded/charged-back order. If the reward was
 * still pending it is simply marked REVERSED; if it was already credited, the
 * promotional credit is clawed back with a compensating posting. Called from
 * the refund flow (built in a later phase).
 */
export async function reverseRewardForOrder(orderId: string): Promise<void> {
  const conversion = await prisma.affiliateConversion.findUnique({
    where: { orderId },
    select: {
      id: true,
      status: true,
      rewardMinor: true,
      currency: true,
      profile: { select: { userId: true } },
    },
  });
  if (!conversion || conversion.status === "REVERSED") return;

  const wasCredited = conversion.status === "AVAILABLE";

  await prisma.affiliateConversion.update({
    where: { id: conversion.id },
    data: { status: "REVERSED" },
  });

  // If the reward was already credited as promo balance, claw it back with a
  // compensating posting. If it was still pending, the status flip alone stops
  // maturation and nothing was credited.
  if (wasCredited) {
    await reversePromo({
      userId: conversion.profile.userId,
      amountMinor: conversion.rewardMinor,
      currency: conversion.currency,
      idempotencyKey: `affiliate-reward-reversal:${conversion.id}`,
      description: "Affiliate reward reversed (order refunded)",
    }).catch(() => undefined);
  }
}

export type AffiliateSummary = {
  code: string;
  clicks: number;
  referredSignups: number;
  qualifiedConversions: number;
  pendingMinor: number;
  availableMinor: number;
  currency: string;
  timeline: {
    id: string;
    status: string;
    rewardMinor: number;
    availableAt: Date;
    createdAt: Date;
  }[];
};

export async function getAffiliateSummary(
  userId: string,
): Promise<AffiliateSummary> {
  const profile = await getOrCreateAffiliateProfile(userId);
  const [clicks, referredSignups, conversions] = await Promise.all([
    prisma.affiliateClick.count({ where: { profileId: profile.id } }),
    prisma.user.count({ where: { referredById: profile.id } }),
    prisma.affiliateConversion.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        rewardMinor: true,
        currency: true,
        availableAt: true,
        createdAt: true,
      },
    }),
  ]);

  let pendingMinor = 0;
  let availableMinor = 0;
  for (const conversion of conversions) {
    if (conversion.status === "PENDING_REFUND_WINDOW") {
      pendingMinor += conversion.rewardMinor;
    } else if (conversion.status === "AVAILABLE") {
      availableMinor += conversion.rewardMinor;
    }
  }

  return {
    code: profile.code,
    clicks,
    referredSignups,
    qualifiedConversions: conversions.filter((c) => c.status !== "REVERSED" && c.status !== "REJECTED").length,
    pendingMinor,
    availableMinor,
    currency: "EUR",
    timeline: conversions.map((c) => ({
      id: c.id,
      status: c.status,
      rewardMinor: c.rewardMinor,
      availableAt: c.availableAt,
      createdAt: c.createdAt,
    })),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

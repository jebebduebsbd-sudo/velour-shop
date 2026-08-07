import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import { getEnabledProvider } from "@/lib/payments/registry";
import { prisma } from "@/lib/prisma";
import { creditTopUp } from "@/lib/wallet/ledger";

/**
 * Orchestrates wallet top-ups across the provider boundary.
 *
 * Crucially, wallet credit is applied only by completeTopUpFromWebhook, which
 * runs from a verified server-to-server webhook. Nothing in the browser
 * redirect path can create a credit.
 */

export const MIN_TOPUP_MINOR = 100; // €1.00
export const MAX_TOPUP_MINOR = 500000; // €5,000.00

export type CreateTopUpResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; reason: string };

export async function startTopUp(input: {
  userId: string;
  providerId: string;
  amountMinor: number;
  currency: string;
  returnUrl: string;
}): Promise<CreateTopUpResult> {
  if (
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor < MIN_TOPUP_MINOR ||
    input.amountMinor > MAX_TOPUP_MINOR
  ) {
    return { ok: false, reason: "amount out of range" };
  }

  const provider = getEnabledProvider(input.providerId);
  if (!provider) return { ok: false, reason: "provider unavailable" };
  if (!provider.supportsCurrency(input.currency)) {
    return { ok: false, reason: "currency unsupported" };
  }
  if (input.amountMinor < provider.minimumMinor(input.currency)) {
    return { ok: false, reason: "below provider minimum" };
  }

  const session = await provider.createTopUp({
    userId: input.userId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    returnUrl: input.returnUrl,
  });

  await prisma.walletTopUp.create({
    data: {
      userId: input.userId,
      provider: provider.id,
      amountMinor: input.amountMinor,
      feeMinor: session.feeMinor,
      currency: input.currency,
      status: "PENDING",
      providerReference: session.providerReference,
    },
  });

  return { ok: true, redirectUrl: session.redirectUrl };
}

export type WebhookResult =
  | { ok: true; credited: boolean }
  | { ok: false; status: number; reason: string };

/**
 * Processes a verified provider webhook. Idempotent in two layers: the
 * WebhookEvent unique constraint drops replayed events, and the ledger
 * top-up credit is keyed by the top-up id. A replay therefore credits once.
 */
export async function completeTopUpFromWebhook(input: {
  providerId: string;
  rawBody: string;
  signature: string | null;
}): Promise<WebhookResult> {
  const provider = getEnabledProvider(input.providerId);
  if (!provider) return { ok: false, status: 404, reason: "unknown provider" };

  const verification = await provider.verifyWebhook(
    input.rawBody,
    input.signature,
  );
  if (!verification.ok) {
    return { ok: false, status: 400, reason: verification.reason };
  }

  // Record the event first; a duplicate delivery is dropped here.
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: provider.id,
        externalId: verification.externalId,
        eventType: verification.eventType,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: true, credited: false }; // already processed
    }
    throw error;
  }

  if (!verification.completed) {
    return { ok: true, credited: false };
  }

  const topUp = await prisma.walletTopUp.findUnique({
    where: { providerReference: verification.providerReference },
    select: {
      id: true,
      userId: true,
      amountMinor: true,
      currency: true,
      status: true,
    },
  });
  if (!topUp) {
    return { ok: false, status: 404, reason: "top-up not found" };
  }

  // Guard against a tampered/mismatched amount in the event.
  if (topUp.amountMinor !== verification.amountMinor) {
    return { ok: false, status: 400, reason: "amount mismatch" };
  }

  const credit = await creditTopUp({
    userId: topUp.userId,
    amountMinor: topUp.amountMinor,
    currency: topUp.currency,
    idempotencyKey: `topup:${topUp.id}`,
    description: `Wallet top-up via ${provider.displayName}`,
    metadata: { provider: provider.id, topUpId: topUp.id },
  });

  await prisma.walletTopUp.update({
    where: { id: topUp.id },
    data: { status: "COMPLETED", ledgerTxnId: credit.transactionId },
  });

  await recordAuditEvent({
    action: AUDIT_ACTIONS.walletTopUp,
    userId: topUp.userId,
    targetType: "WalletTopUp",
    targetId: topUp.id,
    metadata: { provider: provider.id, amountMinor: topUp.amountMinor },
  });

  return { ok: true, credited: credit.applied };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

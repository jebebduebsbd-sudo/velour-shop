import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import { cleanupTestUsers, testDb } from "./db";

/**
 * Wallet crediting happens only through the verified webhook path, and a
 * replayed webhook credits exactly once. These are the money-safety tests.
 */
const PREFIX = "vtest-webhook-";

let topup: typeof import("@/lib/payments/topup-service");
let ledger: typeof import("@/lib/wallet/ledger");

async function makeUser(suffix: string): Promise<string> {
  const user = await testDb.user.create({
    data: {
      email: `${PREFIX}${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 7)}@velour.test`,
      username: `${PREFIX}${suffix}-${Math.random().toString(36).slice(2, 9)}`,
      passwordHash: "scrypt$1$1$1$AA==$AA==",
    },
    select: { id: true },
  });
  return user.id;
}

function signedEvent(input: {
  providerReference: string;
  amountMinor: number;
  externalId: string;
  status?: string;
}) {
  const body = JSON.stringify({
    externalId: input.externalId,
    providerReference: input.providerReference,
    eventType: "topup.status",
    status: input.status ?? "paid",
    amountMinor: input.amountMinor,
    currency: "EUR",
  });
  const signature = MockPaymentProvider.signBody(
    body,
    process.env.PAYMENT_WEBHOOK_SECRET ?? "velour-development-webhook-secret",
  );
  return { body, signature };
}

beforeAll(async () => {
  topup = await import("@/lib/payments/topup-service");
  ledger = await import("@/lib/wallet/ledger");
});

afterAll(async () => {
  await cleanupTestUsers(PREFIX);
  await testDb.$disconnect();
});

async function startPending(userId: string, amountMinor: number) {
  const result = await topup.startTopUp({
    userId,
    providerId: "mock",
    amountMinor,
    currency: "EUR",
    returnUrl: "http://localhost:3000/wallet/transactions",
  });
  expect(result.ok).toBe(true);
  const row = await testDb.walletTopUp.findFirst({
    where: { userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { providerReference: true },
  });
  return row!.providerReference!;
}

describe("webhook-only crediting", () => {
  it("does not credit the wallet from starting a top-up (no redirect credit)", async () => {
    const userId = await makeUser("noredirect");
    await startPending(userId, 5000);
    // Starting a top-up (the browser-redirect path) must not move money.
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(0);
  });

  it("credits the wallet once when a valid webhook completes", async () => {
    const userId = await makeUser("credit");
    const ref = await startPending(userId, 5000);
    const { body, signature } = signedEvent({
      providerReference: ref,
      amountMinor: 5000,
      externalId: `evt-${Date.now()}-a`,
    });

    const result = await topup.completeTopUpFromWebhook({
      providerId: "mock",
      rawBody: body,
      signature,
    });
    expect(result).toEqual({ ok: true, credited: true });

    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(5000);
  });

  it("credits exactly once when the same event is replayed", async () => {
    const userId = await makeUser("replay");
    const ref = await startPending(userId, 3000);
    const event = signedEvent({
      providerReference: ref,
      amountMinor: 3000,
      externalId: `evt-${Date.now()}-replay`,
    });

    for (let i = 0; i < 5; i += 1) {
      await topup.completeTopUpFromWebhook({
        providerId: "mock",
        rawBody: event.body,
        signature: event.signature,
      });
    }
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(3000);
  });

  it("credits once even under concurrent duplicate deliveries", async () => {
    const userId = await makeUser("concurrent");
    const ref = await startPending(userId, 4200);
    const event = signedEvent({
      providerReference: ref,
      amountMinor: 4200,
      externalId: `evt-${Date.now()}-concurrent`,
    });

    await Promise.all(
      Array.from({ length: 10 }, () =>
        topup.completeTopUpFromWebhook({
          providerId: "mock",
          rawBody: event.body,
          signature: event.signature,
        }),
      ),
    );
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(4200);
  });

  it("rejects a webhook with a bad signature", async () => {
    const userId = await makeUser("badsig");
    const ref = await startPending(userId, 1000);
    const { body } = signedEvent({
      providerReference: ref,
      amountMinor: 1000,
      externalId: `evt-${Date.now()}-badsig`,
    });
    const result = await topup.completeTopUpFromWebhook({
      providerId: "mock",
      rawBody: body,
      signature: "deadbeef",
    });
    expect(result.ok).toBe(false);
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(0);
  });

  it("rejects a tampered amount that does not match the pending top-up", async () => {
    const userId = await makeUser("tamper");
    const ref = await startPending(userId, 1000);
    const { body, signature } = signedEvent({
      providerReference: ref,
      amountMinor: 999999,
      externalId: `evt-${Date.now()}-tamper`,
    });
    const result = await topup.completeTopUpFromWebhook({
      providerId: "mock",
      rawBody: body,
      signature,
    });
    expect(result.ok).toBe(false);
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(0);
  });

  it("does not credit for a non-completed (pending) event", async () => {
    const userId = await makeUser("pending");
    const ref = await startPending(userId, 2000);
    const { body, signature } = signedEvent({
      providerReference: ref,
      amountMinor: 2000,
      externalId: `evt-${Date.now()}-pending`,
      status: "pending",
    });
    const result = await topup.completeTopUpFromWebhook({
      providerId: "mock",
      rawBody: body,
      signature,
    });
    expect(result).toEqual({ ok: true, credited: false });
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(0);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { cleanupTestUsers, testDb } from "./db";

/**
 * Double-entry ledger invariants against real PostgreSQL.
 */
const PREFIX = "vtest-ledger-";

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

beforeAll(async () => {
  ledger = await import("@/lib/wallet/ledger");
});

afterAll(async () => {
  await cleanupTestUsers(PREFIX);
  await testDb.$disconnect();
});

describe("postTransaction zero-sum invariant", () => {
  let userCash = "";
  let house = "";

  beforeEach(async () => {
    const userId = await makeUser("zerosum");
    userCash = await ledger.ensureAccount(testDb, "USER_CASH", userId);
    house = await ledger.ensureAccount(testDb, "HOUSE_FUNDING", null);
  });

  it("rejects postings that do not sum to zero", async () => {
    await expect(
      ledger.postTransaction(testDb, {
        type: "TOP_UP",
        description: "unbalanced",
        postings: [
          { accountId: userCash, amount: 1000 },
          { accountId: house, amount: -999 },
        ],
      }),
    ).rejects.toThrow(/balance to zero/i);
  });

  it("rejects non-integer amounts", async () => {
    await expect(
      ledger.postTransaction(testDb, {
        type: "TOP_UP",
        description: "float",
        postings: [
          { accountId: userCash, amount: 10.5 },
          { accountId: house, amount: -10.5 },
        ],
      }),
    ).rejects.toThrow(/integer minor units/i);
  });

  it("accepts a balanced transaction and both postings persist", async () => {
    const result = await ledger.postTransaction(testDb, {
      type: "TOP_UP",
      description: "balanced",
      postings: [
        { accountId: userCash, amount: 1500 },
        { accountId: house, amount: -1500 },
      ],
    });
    expect(result.applied).toBe(true);
    const sum = await testDb.ledgerPosting.aggregate({
      where: { transactionId: result.transactionId },
      _sum: { amount: true },
    });
    expect(sum._sum.amount).toBe(0);
  });

  it("keeps every stored transaction balanced to zero", async () => {
    await ledger.postTransaction(testDb, {
      type: "TOP_UP",
      description: "a",
      postings: [
        { accountId: userCash, amount: 700 },
        { accountId: house, amount: -700 },
      ],
    });
    // Global invariant: no transaction anywhere sums to non-zero.
    const grouped = await testDb.ledgerPosting.groupBy({
      by: ["transactionId"],
      _sum: { amount: true },
    });
    for (const group of grouped) {
      expect(group._sum.amount).toBe(0);
    }
  });
});

describe("creditTopUp", () => {
  it("credits the wallet and is idempotent on its key", async () => {
    const userId = await makeUser("credit");
    const key = `topup:test-${Date.now()}`;

    const first = await ledger.creditTopUp({
      userId,
      amountMinor: 5000,
      idempotencyKey: key,
      description: "Top-up",
    });
    expect(first.applied).toBe(true);

    const second = await ledger.creditTopUp({
      userId,
      amountMinor: 5000,
      idempotencyKey: key,
      description: "Top-up",
    });
    expect(second.applied).toBe(false);
    expect(second.transactionId).toBe(first.transactionId);

    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(5000);
    expect(balance.spendableMinor).toBe(5000);
  });

  it("applies a top-up exactly once under concurrent calls", async () => {
    const userId = await makeUser("concurrent");
    const key = `topup:concurrent-${Date.now()}`;
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        ledger.creditTopUp({
          userId,
          amountMinor: 2500,
          idempotencyKey: key,
          description: "Top-up",
        }),
      ),
    );
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.cashMinor).toBe(2500);
  });

  it("rejects non-positive top-ups", async () => {
    const userId = await makeUser("nonpos");
    await expect(
      ledger.creditTopUp({
        userId,
        amountMinor: 0,
        idempotencyKey: `topup:zero-${Date.now()}`,
        description: "bad",
      }),
    ).rejects.toThrow();
  });
});

describe("promotional balance", () => {
  it("is tracked separately and counts toward spendable", async () => {
    const userId = await makeUser("promo");
    await ledger.creditPromo({
      userId,
      amountMinor: 500,
      idempotencyKey: `promo:${Date.now()}`,
      description: "Referral reward",
    });
    const balance = await ledger.getWalletBalance(userId);
    expect(balance.promoMinor).toBe(500);
    expect(balance.cashMinor).toBe(0);
    expect(balance.spendableMinor).toBe(500);
  });
});

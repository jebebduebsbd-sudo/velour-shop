import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NowPaymentsProvider,
  sortedStringify,
} from "@/lib/payments/nowpayments-provider";

/**
 * NOWPayments adapter: disabled without flag+credentials, and IPN signature
 * verification exactly matches HMAC-SHA512 over the key-sorted JSON body.
 */
const IPN_SECRET = "test-ipn-secret-value";

function sign(body: object): { raw: string; sig: string } {
  const raw = JSON.stringify(body);
  const parsed = JSON.parse(raw);
  const sig = createHmac("sha512", IPN_SECRET)
    .update(sortedStringify(parsed))
    .digest("hex");
  return { raw, sig };
}

beforeEach(() => {
  vi.stubEnv("PAYMENT_NOWPAYMENTS_ENABLED", "true");
  vi.stubEnv("NOWPAYMENTS_API_KEY", "test-api-key");
  vi.stubEnv("NOWPAYMENTS_IPN_SECRET", IPN_SECRET);
});
afterEach(() => vi.unstubAllEnvs());

describe("NOWPayments enable gating", () => {
  it("is disabled without the flag", () => {
    vi.stubEnv("PAYMENT_NOWPAYMENTS_ENABLED", "false");
    expect(new NowPaymentsProvider().isEnabled()).toBe(false);
  });
  it("is disabled without credentials even with the flag on", () => {
    vi.stubEnv("NOWPAYMENTS_API_KEY", "");
    expect(new NowPaymentsProvider().isEnabled()).toBe(false);
  });
  it("is enabled with flag + credentials", () => {
    expect(new NowPaymentsProvider().isEnabled()).toBe(true);
  });
});

describe("NOWPayments IPN verification", () => {
  it("accepts a correctly signed 'finished' payment and marks it completed", async () => {
    const provider = new NowPaymentsProvider();
    const { raw, sig } = sign({
      payment_id: 5123456789,
      order_id: "nowp_abc",
      payment_status: "finished",
      price_amount: 50,
      price_currency: "eur",
      pay_currency: "btc",
    });
    const result = await provider.verifyWebhook(raw, sig);
    expect(result).toMatchObject({
      ok: true,
      providerReference: "nowp_abc",
      completed: true,
      amountMinor: 5000,
      currency: "EUR",
    });
  });

  it("marks a non-final status as not completed", async () => {
    const provider = new NowPaymentsProvider();
    const { raw, sig } = sign({
      payment_id: 1,
      order_id: "nowp_x",
      payment_status: "confirming",
      price_amount: 10,
      price_currency: "eur",
    });
    const result = await provider.verifyWebhook(raw, sig);
    expect(result).toMatchObject({ ok: true, completed: false });
  });

  it("rejects a bad signature", async () => {
    const provider = new NowPaymentsProvider();
    const { raw } = sign({
      payment_id: 1,
      order_id: "nowp_x",
      payment_status: "finished",
      price_amount: 10,
      price_currency: "eur",
    });
    const result = await provider.verifyWebhook(raw, "deadbeef");
    expect(result.ok).toBe(false);
  });

  it("is insensitive to key order in the body (sorted signing)", async () => {
    const provider = new NowPaymentsProvider();
    // Sign one key order, deliver another — signature must still match.
    const signed = sign({
      order_id: "nowp_y",
      payment_status: "finished",
      price_amount: 25,
      price_currency: "eur",
      payment_id: 9,
    });
    const reordered = JSON.stringify({
      payment_id: 9,
      price_currency: "eur",
      price_amount: 25,
      payment_status: "finished",
      order_id: "nowp_y",
    });
    const result = await provider.verifyWebhook(reordered, signed.sig);
    expect(result).toMatchObject({ ok: true, amountMinor: 2500 });
  });
});

describe("sortedStringify", () => {
  it("produces identical output regardless of key order", () => {
    expect(sortedStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(
      sortedStringify({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });
});

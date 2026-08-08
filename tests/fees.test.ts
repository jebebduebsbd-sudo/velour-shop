import { describe, expect, it } from "vitest";

import { estimateFeeMinor, feeRate } from "@/lib/payments/fees";
import { MockCryptoProvider, MockPaymentProvider } from "@/lib/payments/mock-provider";

describe("payment fees", () => {
  it("charges 10% on card and 1.5% on crypto", () => {
    expect(feeRate("card")).toBe(0.1);
    expect(feeRate("crypto")).toBe(0.015);
    expect(estimateFeeMinor(5000, "card")).toBe(500); // €50 → €5 fee
    expect(estimateFeeMinor(5000, "crypto")).toBe(75); // €50 → €0.75 fee
  });

  it("reflects the per-rail fee in each provider's estimate", () => {
    const card = new MockPaymentProvider();
    const crypto = new MockCryptoProvider();
    expect(card.getFeeEstimate(10000)).toEqual({
      feeMinor: 1000,
      totalChargedMinor: 11000,
    });
    expect(crypto.getFeeEstimate(10000)).toEqual({
      feeMinor: 150,
      totalChargedMinor: 10150,
    });
  });
});

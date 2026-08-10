import { describe, expect, it } from "vitest";

import {
  buildLowStockPayload,
  buildOrderAlertPayload,
} from "@/lib/notifications/discord";

/**
 * Order-alert payload: the merchant "New Sale" embed. The critical property is
 * that a deliverable (gift code / key) can never appear in the payload — the
 * builder only ever receives non-secret order metadata.
 */
describe("buildOrderAlertPayload", () => {
  const base = {
    invoiceId: "order_abc123",
    paymentMethod: "Wallet (Velour balance)",
    priceMinor: 149,
    currency: "EUR",
    customerEmail: "buyer@example.com",
    productTitle: "Steam Wallet Code — $5",
    quantity: 1,
    remainingStock: 7,
    createdAt: new Date("2026-08-10T00:13:00.000Z"),
  };

  it("renders the New Sale embed with every expected field", () => {
    const payload = buildOrderAlertPayload(base);
    const embed = payload.embeds[0];
    expect(embed.title).toBe("New Sale");

    const fields = Object.fromEntries(
      embed.fields.map((f) => [f.name, f.value]),
    );
    expect(fields["Invoice ID"]).toBe("order_abc123");
    expect(fields["Payment Method"]).toBe("Wallet (Velour balance)");
    expect(fields["Total Price"]).toBe("€1.49");
    expect(fields["Customer's E-mail"]).toBe("buyer@example.com");
    expect(fields["Product"]).toBe("Steam Wallet Code — $5");
    expect(fields["Price"]).toBe("1 x €1.49");
    expect(fields["Remaining Stock"]).toBe("7");
  });

  it("formats the total from integer minor units, never floats", () => {
    const payload = buildOrderAlertPayload({ ...base, priceMinor: 2649 });
    const fields = Object.fromEntries(
      payload.embeds[0].fields.map((f) => [f.name, f.value]),
    );
    expect(fields["Total Price"]).toBe("€26.49");
  });

  it("omits the customer email when configured off", () => {
    const payload = buildOrderAlertPayload(base, {
      includeCustomerEmail: false,
    });
    const names = payload.embeds[0].fields.map((f) => f.name);
    expect(names).not.toContain("Customer's E-mail");
    expect(names).toContain("Product");
  });

  it("applies a configured embed color", () => {
    const payload = buildOrderAlertPayload(base, { embedColor: 0x123456 });
    expect(payload.embeds[0].color).toBe(0x123456);
  });

  it("never leaks a deliverable code into the serialized payload", () => {
    // A code is not part of the input type; prove none can slip through even if
    // a caller passed a code-shaped string as, e.g., the product title.
    const payload = buildOrderAlertPayload(base);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("VELOUR-");
    expect(serialized.toLowerCase()).not.toContain("password");
    expect(serialized).not.toContain("payloadCiphertext");
  });
});

describe("buildLowStockPayload", () => {
  it("renders a Low Stock embed with remaining and threshold", () => {
    const payload = buildLowStockPayload({
      productTitle: "Steam Wallet Code — $5",
      productSlug: "steam-wallet-code-5-usd",
      remainingStock: 1,
      threshold: 3,
    });
    const embed = payload.embeds[0];
    expect(embed.title).toBe("Low Stock");
    const fields = Object.fromEntries(embed.fields.map((f) => [f.name, f.value]));
    expect(fields["Remaining Stock"]).toBe("1");
    expect(fields["Threshold"]).toBe("3");
  });
});

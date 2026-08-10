import { describe, expect, it } from "vitest";

import {
  buildLowStockText,
  buildOrderAlertText,
} from "@/lib/notifications/telegram";

/**
 * Telegram alert text: same non-secret order metadata as the Discord channel,
 * HTML-escaped. A deliverable code can never appear — it is not an input.
 */
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

describe("buildOrderAlertText", () => {
  it("includes the sale details", () => {
    const text = buildOrderAlertText(base);
    expect(text).toContain("New Sale");
    expect(text).toContain("Invoice ID: order_abc123");
    expect(text).toContain("Total Price: €1.49");
    expect(text).toContain("Customer's E-mail: buyer@example.com");
    expect(text).toContain("Remaining Stock: 7");
  });

  it("omits the email when configured off", () => {
    const text = buildOrderAlertText(base, { includeCustomerEmail: false });
    expect(text).not.toContain("buyer@example.com");
  });

  it("escapes HTML-significant characters in dynamic values", () => {
    const text = buildOrderAlertText({
      ...base,
      productTitle: "Code <b>& more</b>",
    });
    expect(text).toContain("Code &lt;b&gt;&amp; more&lt;/b&gt;");
    expect(text).not.toContain("Code <b>& more</b>");
  });

  it("low-stock text carries product, remaining, and threshold", () => {
    const text = buildLowStockText({
      productTitle: "Steam Wallet Code — $5",
      productSlug: "steam-wallet-code-5-usd",
      remainingStock: 2,
      threshold: 5,
    });
    expect(text).toContain("Low Stock");
    expect(text).toContain("Remaining Stock: 2");
    expect(text).toContain("Threshold: 5");
  });
});

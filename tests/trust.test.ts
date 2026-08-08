import { describe, expect, it } from "vitest";

import { TRUST_CENTER } from "@/content/trust-center";

describe("Trust Center content", () => {
  it("covers the core trust areas and every linked route is internal", () => {
    const ids = TRUST_CENTER.sections.map((s) => s.id);
    for (const required of [
      "buyer-protection",
      "payment-security",
      "inventory-verification",
      "fulfillment",
      "refunds",
      "status",
      "reviews",
      "data-protection",
      "responsible-products",
      "support",
    ]) {
      expect(ids).toContain(required);
    }
    for (const section of TRUST_CENTER.sections) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.body.length).toBeGreaterThan(20);
      if (section.href) expect(section.href.startsWith("/")).toBe(true);
    }
  });

  it("makes no fabricated guarantees or uptime claims", () => {
    const text = JSON.stringify(TRUST_CENTER).toLowerCase();
    // Ban fabricated guarantees and invented uptime percentages (not the honest
    // "no fabricated uptime figures" disclaimer, which legitimately uses the word).
    for (const banned of ["100%", "guaranteed", "99.9", "% uptime"]) {
      expect(text).not.toContain(banned);
    }
  });
});

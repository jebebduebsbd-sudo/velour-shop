import { describe, expect, it } from "vitest";

import {
  BUYER_PROTECTION,
  REQUIRED_SECTION_IDS,
} from "@/content/buyer-protection";

describe("Buyer Protection content", () => {
  it("contains every section required by the specification", () => {
    const ids = BUYER_PROTECTION.sections.map((section) => section.id);
    for (const required of REQUIRED_SECTION_IDS) {
      expect(ids).toContain(required);
    }
  });

  it("has a title, summary, and at least one clause per section", () => {
    for (const section of BUYER_PROTECTION.sections) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.summary.length).toBeGreaterThan(0);
      expect(section.clauses.length).toBeGreaterThan(0);
      for (const clause of section.clauses) {
        expect(clause.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("never promises guaranteed or lifetime outcomes", () => {
    const text = JSON.stringify(BUYER_PROTECTION).toLowerCase();
    for (const banned of [
      "guarantee",
      "lifetime",
      "risk-free",
      "100%",
      "always refund",
      "no questions asked",
    ]) {
      expect(text).not.toContain(banned);
    }
  });

  it("does not use another marketplace's wording markers", () => {
    const text = JSON.stringify(BUYER_PROTECTION).toLowerCase();
    for (const banned of ["lzt", "lolz", "funpay", "g2g", "playerauctions"]) {
      expect(text).not.toContain(banned);
    }
  });
});

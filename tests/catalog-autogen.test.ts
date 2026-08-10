import { describe, expect, it } from "vitest";

import {
  expandGiftCodeTemplates,
  GIFT_CODE_TEMPLATES,
} from "@/lib/catalog/autogen";
import { isCategorySlug } from "@/lib/categories";

/**
 * Gift-code autogen expansion: deterministic, lawful, and safe to re-run. These
 * assertions run without a database — the expansion is a pure function.
 */
describe("expandGiftCodeTemplates", () => {
  const specs = expandGiftCodeTemplates();

  it("produces one spec per denomination across all templates", () => {
    const expected = GIFT_CODE_TEMPLATES.reduce(
      (sum, t) => sum + t.denominations.length,
      0,
    );
    expect(specs.length).toBe(expected);
    expect(specs.length).toBeGreaterThan(0);
  });

  it("emits unique slugs", () => {
    const slugs = specs.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("targets only known catalog categories", () => {
    for (const spec of specs) {
      expect(isCategorySlug(spec.categorySlug)).toBe(true);
    }
  });

  it("prices everything as positive safe integers (minor units)", () => {
    for (const spec of specs) {
      expect(Number.isSafeInteger(spec.priceMinor)).toBe(true);
      expect(spec.priceMinor).toBeGreaterThan(0);
    }
  });

  it("describes lawful, redeem-on-your-own-account codes only", () => {
    for (const spec of specs) {
      expect(spec.deliverable.toLowerCase()).toContain("your own account");
      // The deliverable text is not itself a stored code, but it must never
      // read as credentials — reuse the same policy the import path enforces.
      expect(spec.deliverable.toLowerCase()).not.toContain("password");
      expect(spec.deliverable.toLowerCase()).not.toContain("login");
    }
  });
});

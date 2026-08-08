import { describe, expect, it } from "vitest";

import { isLocale, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Recursively collects the leaf key paths of a nested message object. */
function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? keyPaths(value as Record<string, unknown>, path)
      : [path];
  });
}

describe("i18n dictionaries", () => {
  it("has the same key structure across every locale", () => {
    const en = keyPaths(getDictionary("en") as unknown as Record<string, unknown>).sort();
    for (const locale of LOCALES) {
      const keys = keyPaths(
        getDictionary(locale) as unknown as Record<string, unknown>,
      ).sort();
      expect(keys).toEqual(en);
    }
  });

  it("has non-empty, distinct Bulgarian strings (actually translated)", () => {
    const en = getDictionary("en");
    const bg = getDictionary("bg");
    expect(bg.hero.titleLine1.length).toBeGreaterThan(0);
    // Bulgarian hero copy must differ from English (not a copy-paste stub).
    expect(bg.hero.titleLine1).not.toBe(en.hero.titleLine1);
    expect(bg.nav.market).not.toBe(en.nav.market);
  });

  it("validates locale codes", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("bg")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { formatCount, formatMinor, parseMinorFromDecimal } from "@/lib/format";

describe("formatMinor", () => {
  it("formats integer minor units as currency", () => {
    expect(formatMinor(1079)).toBe("$10.79");
    expect(formatMinor(0)).toBe("$0.00");
    expect(formatMinor(525049)).toBe("$5,250.49");
  });

  it("rejects non-integer amounts (money is never floating point)", () => {
    expect(() => formatMinor(10.5)).toThrow();
    expect(() => formatMinor(Number.NaN)).toThrow();
  });
});

describe("formatCount", () => {
  it("formats counts with separators", () => {
    expect(formatCount(1234)).toBe("1,234");
  });
});

describe("parseMinorFromDecimal", () => {
  it("parses whole and two-decimal amounts exactly, without floating point", () => {
    expect(parseMinorFromDecimal("8")).toBe(800);
    expect(parseMinorFromDecimal("8.49")).toBe(849);
    expect(parseMinorFromDecimal("0.07")).toBe(7);
    expect(parseMinorFromDecimal("79.99")).toBe(7999);
    expect(parseMinorFromDecimal("12,5")).toBe(1250);
    expect(parseMinorFromDecimal("  9.99  ")).toBe(999);
  });

  it("rejects negatives, extra precision, and non-numeric input", () => {
    expect(parseMinorFromDecimal("-3.00")).toBeNull();
    expect(parseMinorFromDecimal("1.005")).toBeNull();
    expect(parseMinorFromDecimal("")).toBeNull();
    expect(parseMinorFromDecimal("free")).toBeNull();
    expect(parseMinorFromDecimal("9.9.9")).toBeNull();
  });
});

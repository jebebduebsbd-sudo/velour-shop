import { describe, expect, it } from "vitest";

import { formatCount, formatMinor } from "@/lib/format";

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

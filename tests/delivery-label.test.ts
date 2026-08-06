import { describe, expect, it } from "vitest";

import { deliveryLabel } from "@/lib/delivery";

describe("deliveryLabel policy", () => {
  it("never advertises instant delivery without available units", () => {
    expect(
      deliveryLabel({ delivery: "INSTANT_CODE", availableUnits: 0 }),
    ).toBe("Out of stock");
    expect(
      deliveryLabel({ delivery: "MANUAL", availableUnits: 0 }),
    ).toBe("Out of stock");
    expect(
      deliveryLabel({ delivery: "INSTANT_CODE", availableUnits: -1 }),
    ).toBe("Out of stock");
  });

  it("labels stocked products by their delivery type", () => {
    expect(
      deliveryLabel({ delivery: "INSTANT_CODE", availableUnits: 3 }),
    ).toBe("Instant delivery");
    expect(deliveryLabel({ delivery: "MANUAL", availableUnits: 1 })).toBe(
      "Manual delivery",
    );
  });
});

import { describe, expect, it } from "vitest";

import { hasRole } from "@/lib/auth/guards";

describe("role hierarchy (least privilege)", () => {
  it("lets each role satisfy its own level", () => {
    expect(hasRole("CUSTOMER", "CUSTOMER")).toBe(true);
    expect(hasRole("SUPPORT", "SUPPORT")).toBe(true);
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
  });

  it("does not let customers reach staff or admin levels", () => {
    expect(hasRole("CUSTOMER", "SUPPORT")).toBe(false);
    expect(hasRole("CUSTOMER", "ADMIN")).toBe(false);
  });

  it("does not let support reach admin", () => {
    expect(hasRole("SUPPORT", "ADMIN")).toBe(false);
  });

  it("lets admin satisfy lower levels", () => {
    expect(hasRole("ADMIN", "SUPPORT")).toBe(true);
    expect(hasRole("ADMIN", "CUSTOMER")).toBe(true);
  });
});

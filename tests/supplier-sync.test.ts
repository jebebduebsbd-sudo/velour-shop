import { afterEach, describe, expect, it } from "vitest";

import { DisabledSupplierProvider } from "@/lib/suppliers/disabled-adapter";
import { enabledSupplierProviders, runSupplierSync } from "@/lib/suppliers/registry";

/**
 * Supplier sync is a fail-closed scaffold: disabled by default, and even with
 * the flag on it stays disabled until a real adapter is configured. It must
 * never import inventory in this state.
 */
describe("supplier sync (fail-closed)", () => {
  const original = process.env.SUPPLIER_SYNC_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.SUPPLIER_SYNC_ENABLED;
    else process.env.SUPPLIER_SYNC_ENABLED = original;
  });

  it("has no enabled providers by default", () => {
    delete process.env.SUPPLIER_SYNC_ENABLED;
    expect(enabledSupplierProviders()).toHaveLength(0);
  });

  it("stays disabled even when the flag is on (not configured)", () => {
    process.env.SUPPLIER_SYNC_ENABLED = "true";
    expect(new DisabledSupplierProvider().isEnabled()).toBe(false);
    expect(enabledSupplierProviders()).toHaveLength(0);
  });

  it("runSupplierSync imports nothing and reports disabled", async () => {
    delete process.env.SUPPLIER_SYNC_ENABLED;
    const result = await runSupplierSync();
    expect(result.ran).toBe(false);
    expect(result.imported).toBe(0);
  });

  it("fetchCodes fails closed with a clear message", async () => {
    await expect(new DisabledSupplierProvider().fetchCodes()).rejects.toThrow(
      /not configured/i,
    );
  });
});

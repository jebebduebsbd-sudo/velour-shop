import { describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/lib/env";

/**
 * Loads a fresh copy of the env module under a patched process.env and
 * evaluates serverEnv() before restoring the original environment.
 */
async function evaluateEnv(
  env: Record<string, string | undefined>,
): Promise<{ value?: ServerEnv; error?: Error }> {
  vi.resetModules();
  const original = { ...process.env };
  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
  }
  try {
    const { serverEnv } = await import("@/lib/env");
    return { value: serverEnv() };
  } catch (error) {
    return { error: error as Error };
  } finally {
    process.env = original;
  }
}

describe("server environment validation", () => {
  it("accepts a valid environment", async () => {
    const { value, error } = await evaluateEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      APP_ORIGIN: "http://localhost:3000",
      DELIVERY_MASTER_KEY_B64: undefined,
    });
    expect(error).toBeUndefined();
    expect(value?.DATABASE_URL).toContain("postgresql://");
    expect(value?.APP_ORIGIN).toBe("http://localhost:3000");
  });

  it("rejects a missing DATABASE_URL", async () => {
    const { error } = await evaluateEnv({ DATABASE_URL: undefined });
    expect(error?.message).toMatch(/DATABASE_URL/);
  });

  it("rejects a malformed delivery master key", async () => {
    const { error } = await evaluateEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      DELIVERY_MASTER_KEY_B64: "not-32-bytes",
    });
    expect(error?.message).toMatch(/32 bytes/);
  });
});

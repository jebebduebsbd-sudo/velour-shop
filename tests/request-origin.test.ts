import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Origin verification for mutating requests. Combined with SameSite=Lax
 * cookies this is the CSRF defense, so these cases matter: a cross-site
 * form post must be rejected, and a missing Origin header must not pass.
 */
const headerValues = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => headerValues.get(name.toLowerCase()) ?? null,
  }),
}));

let assertSameOrigin: typeof import("@/lib/request").assertSameOrigin;

beforeEach(async () => {
  headerValues.clear();
  ({ assertSameOrigin } = await import("@/lib/request"));
});

describe("assertSameOrigin", () => {
  it("accepts the configured application origin", async () => {
    headerValues.set("origin", "http://localhost:3000");
    await expect(assertSameOrigin()).resolves.toBeUndefined();
  });

  it("accepts the request's own host (previews, alternate ports)", async () => {
    headerValues.set("origin", "https://velour-preview.example.com");
    headerValues.set("host", "velour-preview.example.com");
    headerValues.set("x-forwarded-proto", "https");
    await expect(assertSameOrigin()).resolves.toBeUndefined();
  });

  it("rejects a cross-site origin", async () => {
    headerValues.set("origin", "https://evil.example.com");
    headerValues.set("host", "velour.shop");
    headerValues.set("x-forwarded-proto", "https");
    await expect(assertSameOrigin()).rejects.toThrow(/cross-origin/i);
  });

  it("rejects a request with no Origin header", async () => {
    headerValues.set("host", "velour.shop");
    await expect(assertSameOrigin()).rejects.toThrow(/cross-origin/i);
  });

  it("rejects an origin that only prefixes the real host", async () => {
    headerValues.set("origin", "https://velour.shop.evil.example.com");
    headerValues.set("host", "velour.shop");
    headerValues.set("x-forwarded-proto", "https");
    await expect(assertSameOrigin()).rejects.toThrow(/cross-origin/i);
  });

  it("rejects a protocol downgrade for the same host", async () => {
    headerValues.set("origin", "http://velour.shop");
    headerValues.set("host", "velour.shop");
    headerValues.set("x-forwarded-proto", "https");
    await expect(assertSameOrigin()).rejects.toThrow(/cross-origin/i);
  });
});

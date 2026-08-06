import { describe, expect, it } from "vitest";

import {
  generateToken,
  hashEmailToken,
  hashIp,
  hashSessionToken,
} from "@/lib/auth/hashing";

describe("token generation", () => {
  it("produces high-entropy, unique, url-safe tokens", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken()));
    expect(tokens.size).toBe(200);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });
});

describe("session token hashing", () => {
  it("is deterministic and never contains the raw token", () => {
    const token = generateToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toContain(token);
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs per token", () => {
    expect(hashSessionToken("a")).not.toBe(hashSessionToken("b"));
  });
});

describe("email token hashing", () => {
  it("is peppered, so it differs from a plain digest", () => {
    const token = generateToken();
    expect(hashEmailToken(token)).not.toBe(hashSessionToken(token));
    expect(hashEmailToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("ip hashing", () => {
  it("hashes addresses and never stores them raw", () => {
    const hash = hashIp("203.0.113.7");
    expect(hash).not.toContain("203.0.113");
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hashIp("203.0.113.7")).toBe(hash);
    expect(hashIp("203.0.113.8")).not.toBe(hash);
  });

  it("returns null for a missing address", () => {
    expect(hashIp(null)).toBeNull();
    expect(hashIp(undefined)).toBeNull();
    expect(hashIp("")).toBeNull();
  });
});

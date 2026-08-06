import { describe, expect, it } from "vitest";

import {
  hashPassword,
  isFallbackHash,
  verifyPassword,
} from "@/lib/auth/password";

describe("password hashing", () => {
  it("produces Argon2id hashes when the native binding is available", async () => {
    const hash = await hashPassword("correct horse battery staple");
    // Either Argon2id (preferred) or the documented scrypt fallback.
    expect(hash.startsWith("$argon2id$") || isFallbackHash(hash)).toBe(true);
    if (hash.startsWith("$argon2id$")) {
      expect(hash).toContain("$v=19$");
    }
  });

  it("never stores the plaintext password in the hash", async () => {
    const hash = await hashPassword("super-secret-value");
    expect(hash).not.toContain("super-secret-value");
  });

  it("salts hashes so identical passwords differ", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("verifies the correct password and rejects wrong ones", async () => {
    const hash = await hashPassword("right-password");
    expect(await verifyPassword(hash, "right-password")).toBe(true);
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
    expect(await verifyPassword(hash, "")).toBe(false);
  });

  it("rejects malformed stored hashes without throwing", async () => {
    expect(await verifyPassword("not-a-hash", "whatever")).toBe(false);
    expect(await verifyPassword("scrypt$broken", "whatever")).toBe(false);
  });
});

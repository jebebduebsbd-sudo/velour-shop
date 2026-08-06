import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  decryptDeliverable,
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";

const key = randomBytes(32).toString("base64");
const otherKey = randomBytes(32).toString("base64");

describe("deliverable encryption", () => {
  it("round-trips plaintext with authenticated encryption", () => {
    const ciphertext = encryptDeliverable("VELOUR-DEMO-AAAA-BBBB", key);
    expect(decryptDeliverable(ciphertext, key)).toBe(
      "VELOUR-DEMO-AAAA-BBBB",
    );
  });

  it("produces unique ciphertexts for the same plaintext (random IV)", () => {
    const a = encryptDeliverable("same-code", key);
    const b = encryptDeliverable("same-code", key);
    expect(a.equals(b)).toBe(false);
  });

  it("fails closed on tampered ciphertext", () => {
    const ciphertext = encryptDeliverable("secret-code", key);
    ciphertext[ciphertext.length - 1] ^= 0xff;
    expect(() => decryptDeliverable(ciphertext, key)).toThrow();
  });

  it("fails closed with the wrong key", () => {
    const ciphertext = encryptDeliverable("secret-code", key);
    expect(() => decryptDeliverable(ciphertext, otherKey)).toThrow();
  });

  it("rejects keys that are not exactly 32 bytes", () => {
    expect(() => encryptDeliverable("x", "dG9vLXNob3J0")).toThrow();
  });
});

describe("deliverable fingerprint", () => {
  it("is deterministic per key and distinct across payloads", () => {
    expect(fingerprintDeliverable("code-1", key)).toBe(
      fingerprintDeliverable("code-1", key),
    );
    expect(fingerprintDeliverable("code-1", key)).not.toBe(
      fingerprintDeliverable("code-2", key),
    );
  });

  it("does not reveal the plaintext", () => {
    const fingerprint = fingerprintDeliverable("VELOUR-SECRET", key);
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprint).not.toContain("VELOUR");
  });
});

import { describe, expect, it } from "vitest";

import { sanitizeMetadata } from "@/lib/audit";

describe("audit metadata sanitization", () => {
  it("drops any key that could carry a secret", () => {
    const safe = sanitizeMetadata({
      password: "hunter2",
      passwordHash: "$argon2id$...",
      sessionToken: "abc",
      session: "abc",
      apiKey: "k",
      api_key: "k",
      authorization: "Bearer x",
      cookie: "a=b",
      deliverable: "VELOUR-CODE",
      payload: "VELOUR-CODE",
      giftCode: "XXXX",
      cardNumber: "4111111111111111",
      cvv: "123",
      recoveryCodes: "aaa",
      mailboxPassword: "x",
      outcome: "bad_password",
      failedLoginCount: 3,
      locked: true,
    });

    expect(safe).toEqual({
      outcome: "bad_password",
      failedLoginCount: 3,
      locked: true,
    });
  });

  it("does not leak secret values even under unexpected key casing", () => {
    const safe = sanitizeMetadata({
      PassWord: "hunter2",
      SESSION_TOKEN: "abc",
      "user.api-key": "k",
      reason: "manual_review",
    });
    expect(JSON.stringify(safe)).not.toContain("hunter2");
    expect(JSON.stringify(safe)).not.toContain("abc");
    expect(safe).toEqual({ reason: "manual_review" });
  });

  it("drops nested objects so blobs cannot smuggle secrets in", () => {
    const safe = sanitizeMetadata({
      context: { password: "hunter2" },
      count: 1,
    });
    expect(safe).toEqual({ count: 1 });
  });

  it("returns undefined when nothing safe remains", () => {
    expect(sanitizeMetadata({ password: "x" })).toBeUndefined();
    expect(sanitizeMetadata(undefined)).toBeUndefined();
  });
});

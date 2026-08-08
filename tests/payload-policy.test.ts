import { describe, expect, it } from "vitest";

import { checkDeliverablePayload } from "@/lib/inventory/payload-policy";

describe("inventory payload policy", () => {
  it("accepts lawful single-line codes/keys/vouchers", () => {
    for (const code of [
      "VELOUR-DEMO-AAAA-BBBB-CCCC",
      "XXXXX-YYYYY-ZZZZZ",
      "https://discord.gift/abcdEFGH1234",
      "5PN3Q-7HToffH-JQ2M",
    ]) {
      expect(checkDeliverablePayload(code)).toEqual({ ok: true });
    }
  });

  it("rejects email:password credential pairs", () => {
    expect(checkDeliverablePayload("victim@example.com:hunter2").ok).toBe(false);
  });

  it("rejects explicit password / login fields", () => {
    expect(checkDeliverablePayload("password: hunter2").ok).toBe(false);
    expect(
      checkDeliverablePayload("login: bob\npassword: secret").ok,
    ).toBe(false);
  });

  it("rejects 2FA / recovery / authenticator data", () => {
    expect(
      checkDeliverablePayload("otpauth://totp/Acme:bob?secret=ABCD").ok,
    ).toBe(false);
    expect(checkDeliverablePayload("recovery codes: 1111 2222").ok).toBe(false);
    expect(checkDeliverablePayload("2FA secret ABCD").ok).toBe(false);
  });

  it("rejects cookies / session tokens and cookie jars", () => {
    expect(checkDeliverablePayload("session_token=abc.def.ghi").ok).toBe(false);
    expect(
      checkDeliverablePayload('[{"domain":".example.com","name":"sid"}]').ok,
    ).toBe(false);
  });

  it("rejects exported key/cert blocks and multi-line blobs", () => {
    expect(
      checkDeliverablePayload("-----BEGIN PRIVATE KEY-----\nMIIB...").ok,
    ).toBe(false);
    expect(
      checkDeliverablePayload("line1\nline2\nline3\nline4\nline5").ok,
    ).toBe(false);
  });

  it("rejects empty or oversized payloads", () => {
    expect(checkDeliverablePayload("   ").ok).toBe(false);
    expect(checkDeliverablePayload("A".repeat(5000)).ok).toBe(false);
  });
});

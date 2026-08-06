import { describe, expect, it } from "vitest";

import {
  forgotPasswordAction,
  signInAction,
  signUpAction,
} from "@/app/(public)/auth/actions";

const idle = { status: "idle" as const };

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("signInAction validation", () => {
  it("returns linked field errors for invalid input", async () => {
    const state = await signInAction(idle, form({ identifier: "a", password: "short" }));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.identifier).toBeTruthy();
    expect(state.fieldErrors?.password).toBeTruthy();
  });

  it("accepts valid input (preview notice until auth phase ships)", async () => {
    const state = await signInAction(
      idle,
      form({ identifier: "demo@velour.shop", password: "long-enough-pass" }),
    );
    expect(state.status).toBe("notice");
    expect(state.fieldErrors).toBeUndefined();
  });
});

describe("signUpAction validation", () => {
  it("rejects mismatched passwords", async () => {
    const state = await signUpAction(
      idle,
      form({
        email: "demo@velour.shop",
        username: "demo_user",
        password: "long-enough-pass",
        confirmPassword: "different-pass!",
      }),
    );
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.confirmPassword).toMatch(/do not match/i);
  });

  it("rejects invalid usernames and emails", async () => {
    const state = await signUpAction(
      idle,
      form({
        email: "not-an-email",
        username: "bad name!",
        password: "long-enough-pass",
        confirmPassword: "long-enough-pass",
      }),
    );
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBeTruthy();
    expect(state.fieldErrors?.username).toBeTruthy();
  });
});

describe("forgotPasswordAction validation", () => {
  it("responds identically for any well-formed email (no enumeration)", async () => {
    const a = await forgotPasswordAction(idle, form({ email: "a@velour.shop" }));
    const b = await forgotPasswordAction(idle, form({ email: "b@velour.shop" }));
    expect(a).toEqual(b);
  });
});

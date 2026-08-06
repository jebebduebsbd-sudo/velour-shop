import { describe, expect, it } from "vitest";

import {
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/app/(public)/auth/actions";

/**
 * Input validation and safe-failure behavior for the auth actions.
 *
 * These run outside a request context, so the actions' origin check rejects
 * them — which is itself the assertion in the CSRF cases below: without a
 * verifiable same-origin request, no action performs a mutation.
 */
const idle = { status: "idle" as const };

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("signInAction validation", () => {
  it("returns linked field errors for invalid input", async () => {
    const state = await signInAction(
      idle,
      form({ identifier: "a", password: "short" }),
    );
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.identifier).toBeTruthy();
    expect(state.fieldErrors?.password).toBeTruthy();
  });

  it("refuses to authenticate without a verifiable same-origin request", async () => {
    const state = await signInAction(
      idle,
      form({ identifier: "demo@velour.shop", password: "long-enough-pass" }),
    );
    expect(state.status).toBe("error");
    // Normalized error only: no stack trace, no internal detail.
    expect(state.formMessage).toBe("Something went wrong. Please try again.");
    expect(JSON.stringify(state)).not.toContain("long-enough-pass");
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

  it("enforces a minimum password length", async () => {
    const state = await signUpAction(
      idle,
      form({
        email: "demo@velour.shop",
        username: "demo_user",
        password: "short1",
        confirmPassword: "short1",
      }),
    );
    expect(state.fieldErrors?.password).toMatch(/at least 10/i);
  });
});

describe("forgotPasswordAction", () => {
  it("responds identically for any well-formed email (no enumeration)", async () => {
    const a = await forgotPasswordAction(
      idle,
      form({ email: "a@velour.shop" }),
    );
    const b = await forgotPasswordAction(
      idle,
      form({ email: "b@velour.shop" }),
    );
    expect(a).toEqual(b);
    expect(a.status).toBe("notice");
    expect(a.formMessage).toMatch(/if an account exists/i);
  });

  it("still validates the email format", async () => {
    const state = await forgotPasswordAction(idle, form({ email: "nope" }));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBeTruthy();
  });
});

describe("resetPasswordAction", () => {
  it("requires a token", async () => {
    const state = await resetPasswordAction(
      idle,
      form({
        token: "",
        password: "a-new-password-1",
        confirmPassword: "a-new-password-1",
      }),
    );
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.token).toBeTruthy();
  });

  it("requires both passwords to match", async () => {
    const state = await resetPasswordAction(
      idle,
      form({
        token: "a-token-value-long-enough",
        password: "a-new-password-1",
        confirmPassword: "different-password",
      }),
    );
    expect(state.fieldErrors?.confirmPassword).toMatch(/do not match/i);
  });
});

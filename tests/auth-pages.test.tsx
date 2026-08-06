// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import ForgotPasswordPage from "@/app/(public)/auth/forgot-password/page";
import SignInPage from "@/app/(public)/auth/sign-in/page";
import SignUpPage from "@/app/(public)/auth/sign-up/page";

/** Async server components are awaited, then their JSX is rendered. */
async function renderSignIn() {
  return render(
    await SignInPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }),
  );
}

describe("dedicated sign-in page", () => {
  it("renders a full page with form fields, tabs, and a forgot-password link", async () => {
    await renderSignIn();
    expect(
      screen.getByRole("heading", { level: 1, name: /sign in/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /forgot password/i }),
    ).toHaveAttribute("href", "/auth/forgot-password");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/auth/sign-up",
    );
    expect(
      screen.getByRole("button", { name: /^sign in$/i }),
    ).toBeInTheDocument();
  });

  it("has a working password visibility toggle", async () => {
    const user = userEvent.setup();
    await renderSignIn();
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(password).toHaveAttribute("type", "password");
  });
});

describe("dedicated registration page", () => {
  it("renders registration fields and links back to sign in", () => {
    render(<SignUpPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /create account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });
});

describe("forgot password page", () => {
  it("renders the reset request form", () => {
    render(<ForgotPasswordPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /reset your password/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/account email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).toBeInTheDocument();
  });
});

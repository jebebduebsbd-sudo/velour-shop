// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SidebarNav } from "@/components/layout/sidebar-nav";

let currentPath = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));
vi.mock("@/app/(public)/auth/actions", () => ({
  signOutAction: async () => {},
}));

function renderAt(path: string) {
  currentPath = path;
  return render(<SidebarNav />);
}

function activeLinkNames(): string[] {
  return screen
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent?.trim() ?? "");
}

describe("customer sidebar", () => {
  it("marks exactly one entry active on a top-level route", () => {
    renderAt("/dashboard");
    expect(activeLinkNames()).toEqual(["Dashboard"]);
  });

  it("marks only the deepest match active on a nested route", () => {
    // Regression: /account/security must not also activate /account (Profile).
    renderAt("/account/security");
    expect(activeLinkNames()).toEqual(["Security"]);
  });

  it("activates the parent entry on its own route", () => {
    renderAt("/account");
    expect(activeLinkNames()).toEqual(["Profile"]);
  });

  it("activates Market for nested market routes", () => {
    renderAt("/market/valorant");
    expect(activeLinkNames()).toEqual(["Market"]);
  });

  it("marks nothing active on an unrelated route", () => {
    renderAt("/terms");
    expect(activeLinkNames()).toEqual([]);
  });

  it("omits features that are not implemented", () => {
    renderAt("/dashboard");
    const labels = screen.getAllByRole("link").map((l) => l.textContent ?? "");
    for (const excluded of [
      "Withdraw",
      "Transfer",
      "Auto Buy",
      "Giveaways",
      "Referrals",
      "Reseller",
    ]) {
      expect(labels.some((label) => label.includes(excluded))).toBe(false);
    }
  });

  it("offers a sign-out control", () => {
    renderAt("/dashboard");
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });
});

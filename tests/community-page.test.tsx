// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/layout/site-footer";
import { COMMUNITY } from "@/content/community";
import { TRUST_CENTER } from "@/content/trust-center";

const invitesMock = vi.hoisted(() => ({ value: [] as { id: string; label: string; url: string }[] }));

vi.mock("@/lib/community/invites", () => ({
  communityInvites: () => invitesMock.value,
}));

afterEach(() => {
  invitesMock.value = [];
});

async function renderCommunityPage() {
  const { default: CommunityPage } = await import("@/app/(public)/community/page");
  render(<CommunityPage />);
}

describe("Community page", () => {
  it("renders the heading and every description section as a landmark region", async () => {
    await renderCommunityPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /velour community/i }),
    ).toBeInTheDocument();
    for (const section of COMMUNITY.sections) {
      expect(
        screen.getByRole("region", { name: section.title }),
      ).toBeInTheDocument();
    }
  });

  it("renders the spaces, rules, roles, and FAQ blocks", async () => {
    await renderCommunityPage();
    for (const name of [
      /where conversations happen/i,
      /the rules in full/i,
      /^roles$/i,
      /questions people actually ask/i,
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    for (const rule of COMMUNITY.rules) {
      expect(screen.getByText(`${rule.title}.`)).toBeInTheDocument();
    }
    for (const space of COMMUNITY.spaces) {
      expect(screen.getByText(`#${space.name}`)).toBeInTheDocument();
    }
  });

  it("renders on-page navigation anchors for each section", async () => {
    await renderCommunityPage();
    const nav = screen.getByRole("navigation", { name: /community sections/i });
    expect(nav).toBeInTheDocument();
    for (const section of COMMUNITY.sections) {
      const anchor = screen.getAllByRole("link", { name: section.title })[0];
      expect(anchor).toHaveAttribute("href", `#${section.id}`);
    }
  });

  it("says the space is unpublished instead of linking an unverified invite", async () => {
    await renderCommunityPage();
    expect(
      screen.getByText(/invite links are published here once a space goes live/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^join on/i }),
    ).not.toBeInTheDocument();
  });

  it("renders configured invites as external links that do not leak the referrer", async () => {
    invitesMock.value = [
      { id: "discord", label: "Discord", url: "https://discord.gg/velour-example" },
    ];
    await renderCommunityPage();
    const link = screen.getByRole("link", { name: /join on discord/i });
    expect(link).toHaveAttribute("href", "https://discord.gg/velour-example");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });
});

describe("Community navigation", () => {
  it("is linked from the footer", () => {
    render(<SiteFooter />);
    const link = screen.getByRole("link", { name: /^community$/i });
    expect(link).toHaveAttribute("href", "/community");
  });

  it("is listed in the Trust Center", () => {
    const section = TRUST_CENTER.sections.find((s) => s.id === "community");
    expect(section?.href).toBe("/community");
  });
});

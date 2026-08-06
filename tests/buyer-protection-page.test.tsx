// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BuyerProtectionPage from "@/app/(public)/buyer-protection/page";
import { NavLinks } from "@/components/layout/nav-links";
import { SiteFooter } from "@/components/layout/site-footer";
import { BUYER_PROTECTION } from "@/content/buyer-protection";

vi.mock("next/navigation", () => ({
  usePathname: () => "/buyer-protection",
}));

describe("Buyer Protection navigation", () => {
  it("is a real link in the primary navigation", () => {
    render(<NavLinks />);
    const link = screen.getByRole("link", { name: /buyer protection/i });
    expect(link).toHaveAttribute("href", "/buyer-protection");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("is linked from the footer", () => {
    render(<SiteFooter />);
    const link = screen.getByRole("link", { name: /buyer protection/i });
    expect(link).toHaveAttribute("href", "/buyer-protection");
  });
});

describe("Buyer Protection page", () => {
  it("renders a heading and every policy section as a landmark region", () => {
    render(<BuyerProtectionPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /buyer protection/i }),
    ).toBeInTheDocument();
    for (const section of BUYER_PROTECTION.sections) {
      expect(
        screen.getByRole("region", { name: section.title }),
      ).toBeInTheDocument();
    }
  });

  it("renders the on-page section navigation with anchors", () => {
    render(<BuyerProtectionPage />);
    const nav = screen.getByRole("navigation", { name: /policy sections/i });
    expect(nav).toBeInTheDocument();
    for (const section of BUYER_PROTECTION.sections) {
      const anchor = screen.getAllByRole("link", { name: section.title })[0];
      expect(anchor).toHaveAttribute("href", `#${section.id}`);
    }
  });
});

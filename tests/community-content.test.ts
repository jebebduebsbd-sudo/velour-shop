import { describe, expect, it } from "vitest";

import {
  COMMUNITY,
  COMMUNITY_RELATED_LINKS,
  REQUIRED_COMMUNITY_SECTION_IDS,
} from "@/content/community";

const text = JSON.stringify(COMMUNITY).toLowerCase();

describe("Community content", () => {
  it("covers every section required by the description", () => {
    const ids = COMMUNITY.sections.map((section) => section.id);
    for (const required of REQUIRED_COMMUNITY_SECTION_IDS) {
      expect(ids).toContain(required);
    }
  });

  it("gives every section a title, summary, and substantive points", () => {
    for (const section of COMMUNITY.sections) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.summary.length).toBeGreaterThan(0);
      expect(section.points.length).toBeGreaterThan(2);
      for (const point of section.points) {
        expect(point.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("keeps ids unique across sections, spaces, roles, rules, and FAQ", () => {
    for (const group of [
      COMMUNITY.sections,
      COMMUNITY.spaces,
      COMMUNITY.roles,
      COMMUNITY.rules,
      COMMUNITY.faq,
    ]) {
      const ids = group.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("keeps the tagline short enough for an off-site profile field", () => {
    expect(COMMUNITY.tagline.length).toBeGreaterThan(0);
    expect(COMMUNITY.tagline.length).toBeLessThanOrEqual(120);
    expect(COMMUNITY.shortDescription.length).toBeGreaterThan(120);
  });

  it("restates the product boundary that chat is used to test", () => {
    for (const term of [
      "credential",
      "2fa",
      "session cookie",
      "stealer log",
      "checker",
    ]) {
      expect(text).toContain(term);
    }
    const boundaryRule = COMMUNITY.rules.find(
      (rule) => rule.id === "no-credentials",
    );
    expect(boundaryRule?.detail.toLowerCase()).toContain("prohibited");
  });

  it("routes every real decision back to the platform, not to chat", () => {
    const supportBoundary = COMMUNITY.sections.find(
      (section) => section.id === "support-boundary",
    );
    expect(supportBoundary).toBeDefined();
    const boundaryText = JSON.stringify(supportBoundary).toLowerCase();
    expect(boundaryText).toContain("ticket");
    expect(boundaryText).toContain("refund");
    // Moderators must never be presented as able to act on an order.
    expect(boundaryText).toMatch(/moderators cannot/);
  });

  it("invents no membership figures, response times, or absolute promises", () => {
    for (const banned of [
      "guarantee",
      "guaranteed",
      "100%",
      "risk-free",
      "no questions asked",
      "instantly resolved",
      "24/7",
    ]) {
      expect(text).not.toContain(banned);
    }
    // No "12,000 members", "5k members", "thousands of members" style claims.
    expect(text).not.toMatch(/[\d,.]+\s*k?\+?\s*(members|users|buyers)\b/);
    expect(text).not.toMatch(/(thousands|millions|hundreds) of (members|users)/);
  });

  it("does not borrow another marketplace's wording", () => {
    for (const banned of ["lzt", "lolz", "funpay", "g2g", "playerauctions"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("links only to internal pages that exist in the storefront", () => {
    for (const link of COMMUNITY_RELATED_LINKS) {
      expect(link.href.startsWith("/")).toBe(true);
      expect(link.label.length).toBeGreaterThan(0);
    }
    const hrefs = COMMUNITY_RELATED_LINKS.map((link) => link.href);
    expect(hrefs).toContain("/buyer-protection");
    expect(hrefs).toContain("/acceptable-use");
  });
});

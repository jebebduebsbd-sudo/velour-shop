// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryCombobox } from "@/components/category/category-combobox";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const CATEGORIES = [
  { slug: "fortnite", name: "Fortnite", availableUnits: 28 },
  { slug: "valorant", name: "Valorant", availableUnits: 19 },
  { slug: "rockstar", name: "Rockstar", availableUnits: 0 },
];

function renderCombobox() {
  return render(
    <CategoryCombobox categories={CATEGORIES} totalUnits={47} />,
  );
}

beforeEach(() => {
  push.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CategoryCombobox", () => {
  it("opens on click, lists options with counts, and shows out of stock", async () => {
    const user = userEvent.setup();
    renderCombobox();

    const trigger = screen.getByRole("button", { name: /browse categories/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const listbox = screen.getByRole("listbox", { name: /categories/i });
    const options = within(listbox).getAllByRole("option");
    // "All categories" + 3 categories
    expect(options).toHaveLength(4);
    expect(within(listbox).getByText("28 available")).toBeInTheDocument();
    expect(within(listbox).getByText("Out of stock")).toBeInTheDocument();
  });

  it("supports arrow-key navigation and Enter to select", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(
      screen.getByRole("button", { name: /browse categories/i }),
    );
    const input = screen.getByRole("combobox", { name: /find a category/i });
    expect(input).toHaveFocus();

    // Move active option: All categories -> Fortnite -> Valorant
    await user.keyboard("{ArrowDown}{ArrowDown}");
    const active = input.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveTextContent("Valorant");

    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/market/valorant");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("filters options while typing and selects a match", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(
      screen.getByRole("button", { name: /browse categories/i }),
    );
    await user.keyboard("fort");

    const listbox = screen.getByRole("listbox", { name: /categories/i });
    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Fortnite");

    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/market/fortnite");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderCombobox();

    const trigger = screen.getByRole("button", { name: /browse categories/i });
    await user.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <CategoryCombobox categories={CATEGORIES} totalUnits={47} />
        <button type="button">outside</button>
      </div>,
    );
    void container;

    await user.click(
      screen.getByRole("button", { name: /browse categories/i }),
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens with ArrowDown from the closed trigger", async () => {
    const user = userEvent.setup();
    renderCombobox();

    const trigger = screen.getByRole("button", { name: /browse categories/i });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows an empty state when no category matches", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(
      screen.getByRole("button", { name: /browse categories/i }),
    );
    await user.keyboard("zzzz");
    expect(screen.getByText(/no categories match/i)).toBeInTheDocument();
  });
});

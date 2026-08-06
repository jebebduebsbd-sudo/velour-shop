"use client";

import { ChevronDown, LayoutGrid, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { PlatformMark } from "@/components/icons/platform-mark";
import { formatCount } from "@/lib/format";

export type ComboboxCategory = {
  slug: string;
  name: string;
  availableUnits: number;
};

type Option = {
  slug: string | null; // null = all categories
  name: string;
  detail: string;
  href: string;
};

function optionElementId(baseId: string, option: Option): string {
  return `${baseId}-option-${option.slug ?? "all"}`;
}

function OptionRow({
  option,
  id,
  isActive,
  isSelected,
  index,
  onHover,
  onSelect,
}: {
  option: Option;
  id: string;
  isActive: boolean;
  isSelected: boolean;
  index: number;
  onHover: (index: number) => void;
  onSelect: (option: Option) => void;
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={isSelected}
      onPointerMove={() => onHover(index)}
      onClick={() => onSelect(option)}
      className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 ${
        isActive ? "bg-surface-3" : ""
      }`}
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-orchid">
        {option.slug ? (
          <PlatformMark slug={option.slug} className="h-4 w-4" />
        ) : (
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">
          {option.name}
        </span>
        <span
          className={`block text-xs ${
            option.detail === "Out of stock" ? "text-ink-faint" : "text-ink-muted"
          }`}
        >
          {option.detail}
        </span>
      </span>
      {isSelected ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-accent"
        />
      ) : null}
    </li>
  );
}

/**
 * Accessible category selector implementing the WAI-ARIA combobox pattern
 * with a listbox popup. Replaces any native <select>:
 * searchable, arrow-key navigable, Enter selects, Escape closes, click
 * outside closes, active option is announced via aria-activedescendant.
 */
export function CategoryCombobox({
  categories,
  totalUnits,
  activeSlug = null,
}: {
  categories: ComboboxCategory[];
  totalUnits: number;
  activeSlug?: string | null;
}) {
  const router = useRouter();
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const allOptions = useMemo<Option[]>(
    () => [
      {
        slug: null,
        name: "All categories",
        detail: "View the complete market",
        href: "/market",
      },
      ...categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        detail:
          category.availableUnits > 0
            ? `${formatCount(category.availableUnits)} available`
            : "Out of stock",
        href: `/market/${category.slug}`,
      })),
    ],
    [categories],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allOptions;
    return allOptions.filter((option) =>
      option.name.toLowerCase().includes(needle),
    );
  }, [allOptions, query]);

  const close = useCallback(
    (focusTrigger: boolean) => {
      setOpen(false);
      setQuery("");
      setActiveIndex(0);
      if (focusTrigger) triggerRef.current?.focus();
    },
    [setOpen],
  );

  const openPopover = useCallback(() => {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  }, []);

  // Close when clicking/tapping outside.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Focus the search input when the popover opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the active option visible in the scroll area.
  useEffect(() => {
    if (!open) return;
    const active = filtered[activeIndex];
    if (!active) return;
    document
      .getElementById(optionElementId(baseId, active))
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, filtered, baseId]);

  function optionId(option: Option) {
    return optionElementId(baseId, option);
  }

  const select = useCallback(
    (option: Option) => {
      close(true);
      router.push(option.href);
    },
    [close, router],
  );

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(Math.max(filtered.length - 1, 0));
        break;
      case "Enter": {
        event.preventDefault();
        const option = filtered[activeIndex];
        if (option) select(option);
        break;
      }
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  const activeOption = filtered[activeIndex];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => (open ? close(false) : openPopover())}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
            event.preventDefault();
            openPopover();
          }
        }}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface-2 px-3 text-sm text-ink-muted transition-colors duration-(--duration-base) hover:border-line-strong hover:text-ink"
      >
        <LayoutGrid className="h-4 w-4 text-orchid" aria-hidden="true" />
        <span>Browse categories</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-(--duration-base) ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="glass-panel absolute right-0 z-50 mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-lg p-2">
          <p className="px-2 pt-1 text-[0.65rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Market directory
          </p>
          <div className="flex items-baseline justify-between px-2 pb-2">
            <p className="text-sm font-semibold text-ink">Browse categories</p>
            <p className="text-xs text-ink-faint">
              {formatCount(totalUnits)} units live
            </p>
          </div>
          <div className="relative px-1 pb-2">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-[calc(50%+0.25rem)] text-ink-faint"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={
                activeOption ? optionId(activeOption) : undefined
              }
              aria-label="Find a category"
              autoComplete="off"
              spellCheck={false}
              placeholder="Find a category"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              className="h-9 w-full rounded-md border border-line bg-surface-2 pr-3 pl-9 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </div>
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Categories"
            className="scroll-area max-h-72 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-ink-faint">
                No categories match “{query}”.
              </li>
            ) : (
              filtered.map((option, index) => (
                <OptionRow
                  key={option.slug ?? "all"}
                  option={option}
                  id={optionId(option)}
                  isActive={index === activeIndex}
                  isSelected={option.slug === activeSlug}
                  index={index}
                  onHover={setActiveIndex}
                  onSelect={select}
                />
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

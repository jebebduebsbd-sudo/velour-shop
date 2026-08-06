/**
 * Catalog of storefront categories shown in VELOUR and how each one maps to an
 * LZT Market category name (the `{categoryName}` path segment used by
 * https://prod-api.lzt.market/{categoryName}).
 *
 * Valid LZT category names (from the Market API docs) include:
 *   steam, fortnite, mihoyo, riot, telegram, supercell, ea, world-of-tanks,
 *   wot-blitz, epicgames, gifts, minecraft, escape-from-tarkov, socialclub,
 *   uplay, discord, tiktok, instagram, llm, battlenet, vpn, roblox, warface,
 *   hytale
 */
export type CategorySlug =
  | "fortnite"
  | "valorant"
  | "steam"
  | "discord"
  | "tiktok"
  | "instagram"
  | "minecraft"
  | "roblox"
  | "escape-from-tarkov"
  | "rockstar";

export interface Category {
  /** URL slug used on the VELOUR storefront (/market/{slug}). */
  slug: CategorySlug;
  /** Display name. */
  name: string;
  /** LZT Market category name used to build the API path. */
  lztCategory: string;
  /** Short marketing subtitle used on cards. */
  tagline: string;
  /** Demo unit count shown before the live feed loads. */
  demoUnits: number;
  /** Single-letter/short mark used as an icon fallback. */
  mark: string;
}

export const CATEGORIES: Category[] = [
  {
    slug: "fortnite",
    name: "Fortnite",
    lztCategory: "fortnite",
    tagline: "Region shown",
    demoUnits: 42,
    mark: "F",
  },
  {
    slug: "valorant",
    name: "Valorant",
    lztCategory: "riot",
    tagline: "Verified listing",
    demoUnits: 36,
    mark: "V",
  },
  {
    slug: "steam",
    name: "Steam",
    lztCategory: "steam",
    tagline: "Clear terms",
    demoUnits: 68,
    mark: "S",
  },
  {
    slug: "discord",
    name: "Discord",
    lztCategory: "discord",
    tagline: "Gift entitlement",
    demoUnits: 54,
    mark: "D",
  },
  {
    slug: "tiktok",
    name: "TikTok",
    lztCategory: "tiktok",
    tagline: "No credentials",
    demoUnits: 12,
    mark: "T",
  },
  {
    slug: "instagram",
    name: "Instagram",
    lztCategory: "instagram",
    tagline: "Handle available",
    demoUnits: 18,
    mark: "I",
  },
  {
    slug: "minecraft",
    name: "Minecraft",
    lztCategory: "minecraft",
    tagline: "Full access",
    demoUnits: 21,
    mark: "M",
  },
  {
    slug: "roblox",
    name: "Roblox",
    lztCategory: "roblox",
    tagline: "Limited items",
    demoUnits: 31,
    mark: "R",
  },
  {
    slug: "escape-from-tarkov",
    name: "Escape from Tarkov",
    lztCategory: "escape-from-tarkov",
    tagline: "Edition shown",
    demoUnits: 9,
    mark: "EFT",
  },
  {
    slug: "rockstar",
    name: "Rockstar",
    lztCategory: "socialclub",
    tagline: "Social Club",
    demoUnits: 14,
    mark: "R★",
  },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): Category | undefined {
  return BY_SLUG.get(slug as CategorySlug);
}

export function isCategorySlug(slug: string): slug is CategorySlug {
  return BY_SLUG.has(slug as CategorySlug);
}

export const TOTAL_DEMO_UNITS = CATEGORIES.reduce(
  (sum, c) => sum + c.demoUnits,
  0,
);

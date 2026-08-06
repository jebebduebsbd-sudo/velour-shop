/**
 * Static descriptors for the ten Velour market categories. Slugs are the
 * canonical identifiers shared by the database seed, routes, and UI.
 */
export const CATEGORY_DEFS = [
  {
    slug: "fortnite",
    name: "Fortnite",
    blurb: "V-Bucks cards and Crew gift codes",
  },
  {
    slug: "valorant",
    name: "Valorant",
    blurb: "VP top-up cards by region",
  },
  {
    slug: "steam",
    name: "Steam",
    blurb: "Wallet codes and game keys",
  },
  {
    slug: "discord",
    name: "Discord",
    blurb: "Nitro gift links",
  },
  {
    slug: "tiktok",
    name: "TikTok",
    blurb: "Coin vouchers",
  },
  {
    slug: "instagram",
    name: "Instagram",
    blurb: "Creator tools and vouchers",
  },
  {
    slug: "minecraft",
    name: "Minecraft",
    blurb: "Official game keys",
  },
  {
    slug: "roblox",
    name: "Roblox",
    blurb: "Robux gift cards",
  },
  {
    slug: "escape-from-tarkov",
    name: "Escape from Tarkov",
    blurb: "Edition upgrade codes",
  },
  {
    slug: "rockstar",
    name: "Rockstar",
    blurb: "GTA+ and gift codes",
  },
] as const;

export type CategorySlug = (typeof CATEGORY_DEFS)[number]["slug"];

export function isCategorySlug(value: string): value is CategorySlug {
  return CATEGORY_DEFS.some((def) => def.slug === value);
}

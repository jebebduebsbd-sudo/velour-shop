import type { CategorySlug } from "@/lib/categories";
import { isCategorySlug } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

/**
 * Gift-code product autogen.
 *
 * Turns a compact template set (brand × denomination) into full product
 * listings so the catalog can be grown without hand-writing each entry. It
 * only ever produces LAWFUL, transferable gift-code / wallet-code / voucher
 * listings — the same product boundary the rest of Velour enforces.
 *
 * Two guardrails are deliberate and must not be relaxed:
 *   1. Generated products are created as DRAFT. They are invisible to the
 *      storefront and cannot be purchased until an admin links a supplier with
 *      verified transfer-right evidence and flips them ACTIVE (setProductStatus
 *      enforces that gate). Autogen creates listings, never live inventory.
 *   2. Every generated `deliverable` describes a single transferable code the
 *      buyer redeems on their OWN account. No credentials, logins, or account
 *      transfers — those are out of scope for this platform.
 */

const STANDARD_WARRANTY =
  "If a code is invalid at the moment of delivery, report it within 48 hours of reveal for a replacement or wallet refund after review.";

type Denomination = {
  /** Human label, e.g. "$25" or "1,000". */
  label: string;
  /** Slug fragment, e.g. "25" or "1000". */
  slugValue: string;
  priceMinor: number;
};

type GiftCodeTemplate = {
  categorySlug: CategorySlug;
  /** Brand/product family, e.g. "Steam Wallet Code". */
  brand: string;
  slugBase: string;
  /** What the code is, in one noun phrase: "Steam Wallet balance". */
  unit: string;
  region: string;
  denominations: Denomination[];
};

/**
 * Curated gift-code families. Prices are placeholders in EUR minor units; an
 * operator adjusts them in admin before activating. Add a family here and the
 * autogen expands every denomination into a listing.
 */
export const GIFT_CODE_TEMPLATES: GiftCodeTemplate[] = [
  {
    categorySlug: "steam",
    brand: "Steam Wallet Code",
    slugBase: "steam-wallet-code",
    unit: "Steam Wallet balance",
    region: "Global",
    denominations: [
      { label: "$5", slugValue: "5-usd", priceMinor: 549 },
      { label: "$20", slugValue: "20-usd", priceMinor: 2149 },
      { label: "$100", slugValue: "100-usd", priceMinor: 10499 },
    ],
  },
  {
    categorySlug: "roblox",
    brand: "Roblox Gift Card",
    slugBase: "roblox-gift-card",
    unit: "Robux",
    region: "Global",
    denominations: [
      { label: "400 Robux", slugValue: "400-robux", priceMinor: 549 },
      { label: "1,700 Robux", slugValue: "1700-robux", priceMinor: 2049 },
      { label: "4,500 Robux", slugValue: "4500-robux", priceMinor: 4999 },
    ],
  },
  {
    categorySlug: "fortnite",
    brand: "V-Bucks Gift Code",
    slugBase: "v-bucks-gift-code",
    unit: "V-Bucks",
    region: "Global",
    denominations: [
      { label: "1,000 V-Bucks", slugValue: "1000", priceMinor: 849 },
      { label: "5,000 V-Bucks", slugValue: "5000", priceMinor: 3499 },
    ],
  },
  {
    categorySlug: "discord",
    brand: "Discord Nitro Gift Link",
    slugBase: "discord-nitro-gift-link",
    unit: "Discord Nitro subscription time",
    region: "Global",
    denominations: [
      { label: "1 Month", slugValue: "1-month", priceMinor: 949 },
      { label: "12 Months", slugValue: "12-month", priceMinor: 9499 },
    ],
  },
  {
    categorySlug: "valorant",
    brand: "Valorant Points Card",
    slugBase: "valorant-points-card",
    unit: "Valorant Points",
    region: "EU",
    denominations: [
      { label: "1,375 VP", slugValue: "1375-vp", priceMinor: 1249 },
      { label: "2,400 VP", slugValue: "2400-vp", priceMinor: 2149 },
      { label: "5,350 VP", slugValue: "5350-vp", priceMinor: 4699 },
    ],
  },
  {
    categorySlug: "tiktok",
    brand: "TikTok Coins Voucher",
    slugBase: "tiktok-coins-voucher",
    unit: "TikTok Coins",
    region: "Global",
    denominations: [
      { label: "350 Coins", slugValue: "350-coins", priceMinor: 449 },
      { label: "700 Coins", slugValue: "700-coins", priceMinor: 899 },
      { label: "1,400 Coins", slugValue: "1400-coins", priceMinor: 1799 },
    ],
  },
  {
    categorySlug: "minecraft",
    brand: "Minecraft Minecoins Card",
    slugBase: "minecraft-minecoins-card",
    unit: "Minecoins",
    region: "Global",
    denominations: [
      { label: "1,720 Minecoins", slugValue: "1720", priceMinor: 899 },
      { label: "3,500 Minecoins", slugValue: "3500", priceMinor: 1699 },
    ],
  },
  {
    categorySlug: "rockstar",
    brand: "GTA+ Membership Code",
    slugBase: "gta-plus-membership-code",
    unit: "GTA+ membership time",
    region: "Global",
    denominations: [
      { label: "1 Month", slugValue: "1-month", priceMinor: 799 },
      { label: "3 Months", slugValue: "3-month", priceMinor: 2199 },
    ],
  },
  {
    categorySlug: "instagram",
    brand: "Meta Verified Voucher",
    slugBase: "meta-verified-voucher",
    unit: "Meta Verified subscription time",
    region: "Global",
    denominations: [
      { label: "1 Month", slugValue: "1-month", priceMinor: 1499 },
    ],
  },
];

export type GiftCodeProductSpec = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  deliverable: string;
  categorySlug: CategorySlug;
  priceMinor: number;
  region: string;
  warranty: string;
};

/**
 * Expands the templates into concrete product specs. Pure and deterministic,
 * so it can be unit-tested without a database.
 */
export function expandGiftCodeTemplates(
  templates: GiftCodeTemplate[] = GIFT_CODE_TEMPLATES,
): GiftCodeProductSpec[] {
  const specs: GiftCodeProductSpec[] = [];
  for (const template of templates) {
    for (const denom of template.denominations) {
      specs.push({
        slug: `${template.slugBase}-${denom.slugValue}`,
        title: `${template.brand} — ${denom.label}`,
        subtitle: "Redeem on your own account",
        description:
          `An officially issued ${template.brand} for ${denom.label} of ` +
          `${template.unit}. You redeem it directly on your own account; ` +
          `it is a single-use, transferable code.`,
        deliverable:
          `One unused ${template.brand} (${denom.label}), delivered as text ` +
          `after purchase. Redeemable on your own account in supported regions.`,
        categorySlug: template.categorySlug,
        priceMinor: denom.priceMinor,
        region: template.region,
        warranty: STANDARD_WARRANTY,
      });
    }
  }
  return specs;
}

export type AutogenResult = {
  created: string[];
  skipped: string[];
  missingCategories: string[];
};

/**
 * Creates any not-yet-existing gift-code listings as DRAFT products. Idempotent
 * by slug — re-running only fills gaps and never overwrites edited listings or
 * touches inventory. Categories must already exist (see the seed); a template
 * whose category is absent is reported, not silently dropped.
 */
export async function autogenGiftCodeProducts(options?: {
  categorySlug?: string;
}): Promise<AutogenResult> {
  const filter = options?.categorySlug;
  if (filter && !isCategorySlug(filter)) {
    return { created: [], skipped: [], missingCategories: [filter] };
  }

  const specs = expandGiftCodeTemplates().filter(
    (spec) => !filter || spec.categorySlug === filter,
  );

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const created: string[] = [];
  const skipped: string[] = [];
  const missingCategories = new Set<string>();

  for (const spec of specs) {
    const categoryId = categoryIdBySlug.get(spec.categorySlug);
    if (!categoryId) {
      missingCategories.add(spec.categorySlug);
      continue;
    }

    const existing = await prisma.product.findUnique({
      where: { slug: spec.slug },
      select: { id: true },
    });
    if (existing) {
      skipped.push(spec.slug);
      continue;
    }

    await prisma.product.create({
      data: {
        slug: spec.slug,
        title: spec.title,
        subtitle: spec.subtitle,
        description: spec.description,
        deliverable: spec.deliverable,
        categoryId,
        priceMinor: spec.priceMinor,
        currency: "EUR",
        delivery: "INSTANT_CODE",
        // DRAFT — invisible and unpurchasable until an admin links a verified
        // supplier and activates it. Autogen never creates ACTIVE inventory.
        status: "DRAFT",
        warranty: spec.warranty,
        region: spec.region,
      },
    });
    created.push(spec.slug);
  }

  return {
    created,
    skipped,
    missingCategories: Array.from(missingCategories),
  };
}

import "dotenv/config";
import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "../src/lib/crypto/deliverable";
import { CATEGORY_DEFS } from "../src/lib/categories";

/**
 * Demo seed data. Every product is a lawful, transferable digital good
 * (gift codes, wallet codes, vouchers, official keys). Inventory payloads
 * are generated demo codes, encrypted at rest like real inventory.
 */

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to seed");
const masterKey = process.env.DELIVERY_MASTER_KEY_B64;
if (!masterKey) {
  throw new Error(
    "DELIVERY_MASTER_KEY_B64 is required to seed (generate with: openssl rand -base64 32)",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

type SeedProduct = {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  deliverable: string;
  priceMinor: number;
  warranty: string;
  region: string;
  featured?: boolean;
  units: number;
};

const STANDARD_WARRANTY =
  "If a code is invalid at the moment of delivery, report it within 48 hours of reveal for a replacement or wallet refund after review.";

const PRODUCTS: Record<string, SeedProduct[]> = {
  fortnite: [
    {
      slug: "fortnite-crew-1-month-gift-code",
      title: "Fortnite Crew — 1-Month Gift Code",
      subtitle: "Official subscription gift code",
      description:
        "A single-use gift code for one month of the official Fortnite Crew subscription, redeemed on the buyer's own Epic Games account.",
      deliverable:
        "One single-use Fortnite Crew 1-month gift code, delivered as text after purchase. Redeemable on your own Epic Games account in supported regions.",
      priceMinor: 1199,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      featured: true,
      units: 8,
    },
    {
      slug: "v-bucks-1000-gift-code-global",
      title: "V-Bucks 1,000 — Gift Code",
      subtitle: "Redeem on your own account",
      description:
        "An officially issued V-Bucks card code worth 1,000 V-Bucks. You redeem it directly on your own Epic Games account.",
      deliverable:
        "One unused V-Bucks card code worth 1,000 V-Bucks, delivered as text after purchase.",
      priceMinor: 849,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      units: 14,
    },
    {
      slug: "v-bucks-2800-gift-code-global",
      title: "V-Bucks 2,800 — Gift Code",
      subtitle: "Redeem on your own account",
      description:
        "An officially issued V-Bucks card code worth 2,800 V-Bucks. You redeem it directly on your own Epic Games account.",
      deliverable:
        "One unused V-Bucks card code worth 2,800 V-Bucks, delivered as text after purchase.",
      priceMinor: 2199,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      units: 6,
    },
  ],
  valorant: [
    {
      slug: "valorant-points-1375-eu",
      title: "Valorant Points 1,375 — Top-Up Card",
      subtitle: "EU region card code",
      description:
        "A prepaid card code worth 1,375 Valorant Points for EU-region Riot accounts. Redeemed in the official Riot client.",
      deliverable:
        "One unused Valorant Points card code worth 1,375 VP (EU region), delivered as text after purchase.",
      priceMinor: 1249,
      warranty: STANDARD_WARRANTY,
      region: "EU",
      featured: true,
      units: 10,
    },
    {
      slug: "valorant-points-475-na",
      title: "Valorant Points 475 — Top-Up Card",
      subtitle: "NA region card code",
      description:
        "A prepaid card code worth 475 Valorant Points for NA-region Riot accounts. Redeemed in the official Riot client.",
      deliverable:
        "One unused Valorant Points card code worth 475 VP (NA region), delivered as text after purchase.",
      priceMinor: 499,
      warranty: STANDARD_WARRANTY,
      region: "NA",
      units: 9,
    },
  ],
  steam: [
    {
      slug: "steam-wallet-code-10-us",
      title: "Steam Wallet Code — $10",
      subtitle: "US storefront",
      description:
        "An official Steam Wallet code that adds $10 to your own Steam account balance on the US storefront.",
      deliverable:
        "One unused $10 Steam Wallet code (US storefront), delivered as text after purchase.",
      priceMinor: 1079,
      warranty: STANDARD_WARRANTY,
      region: "US",
      featured: true,
      units: 20,
    },
    {
      slug: "steam-wallet-code-25-us",
      title: "Steam Wallet Code — $25",
      subtitle: "US storefront",
      description:
        "An official Steam Wallet code that adds $25 to your own Steam account balance on the US storefront.",
      deliverable:
        "One unused $25 Steam Wallet code (US storefront), delivered as text after purchase.",
      priceMinor: 2649,
      warranty: STANDARD_WARRANTY,
      region: "US",
      units: 12,
    },
    {
      slug: "steam-wallet-code-50-global",
      title: "Steam Wallet Code — $50",
      subtitle: "Global (USD regions)",
      description:
        "An official Steam Wallet code that adds $50 to your own Steam account balance in USD-priced regions.",
      deliverable:
        "One unused $50 Steam Wallet code (USD regions), delivered as text after purchase.",
      priceMinor: 5249,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      units: 5,
    },
  ],
  discord: [
    {
      slug: "discord-nitro-1-month-gift-link",
      title: "Discord Nitro — 1-Month Gift Link",
      subtitle: "Official gift link",
      description:
        "An official Discord Nitro gift link covering one month of Nitro, claimed on your own Discord account.",
      deliverable:
        "One unclaimed Discord Nitro 1-month gift link, delivered as text after purchase. Claimable on accounts without an active Nitro subscription.",
      priceMinor: 949,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      featured: true,
      units: 16,
    },
    {
      slug: "discord-nitro-basic-1-month-gift-link",
      title: "Discord Nitro Basic — 1-Month Gift Link",
      subtitle: "Official gift link",
      description:
        "An official Discord Nitro Basic gift link covering one month, claimed on your own Discord account.",
      deliverable:
        "One unclaimed Discord Nitro Basic 1-month gift link, delivered as text after purchase.",
      priceMinor: 299,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      units: 22,
    },
  ],
  tiktok: [
    {
      slug: "tiktok-coins-700-voucher",
      title: "TikTok Coins 700 — Voucher Code",
      subtitle: "Redeem in-app",
      description:
        "A prepaid voucher code worth 700 TikTok Coins, redeemed on your own TikTok account through the official recharge flow.",
      deliverable:
        "One unused voucher code worth 700 TikTok Coins, delivered as text after purchase.",
      priceMinor: 899,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      featured: true,
      units: 7,
    },
  ],
  instagram: [
    {
      slug: "meta-verified-1-month-voucher",
      title: "Meta Verified — 1-Month Voucher",
      subtitle: "Official subscription voucher",
      description:
        "A voucher covering one month of the official Meta Verified subscription for your own Instagram profile.",
      deliverable:
        "One unused Meta Verified 1-month voucher code, delivered as text after purchase.",
      priceMinor: 1499,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      units: 0,
    },
  ],
  minecraft: [
    {
      slug: "minecraft-java-bedrock-pc-key",
      title: "Minecraft: Java & Bedrock Edition — PC Key",
      subtitle: "Official game key",
      description:
        "An official Minecraft: Java & Bedrock Edition key for PC, redeemed on your own Microsoft account.",
      deliverable:
        "One unused Minecraft: Java & Bedrock Edition (PC) key, delivered as text after purchase.",
      priceMinor: 2989,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      featured: true,
      units: 11,
    },
  ],
  roblox: [
    {
      slug: "roblox-gift-card-800-robux",
      title: "Roblox Gift Card — 800 Robux",
      subtitle: "Official gift card code",
      description:
        "An official Roblox gift card code worth 800 Robux, redeemed on your own Roblox account.",
      deliverable:
        "One unused Roblox gift card code worth 800 Robux, delivered as text after purchase.",
      priceMinor: 999,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      units: 18,
    },
    {
      slug: "roblox-gift-card-2000-robux",
      title: "Roblox Gift Card — 2,000 Robux",
      subtitle: "Official gift card code",
      description:
        "An official Roblox gift card code worth 2,000 Robux, redeemed on your own Roblox account.",
      deliverable:
        "One unused Roblox gift card code worth 2,000 Robux, delivered as text after purchase.",
      priceMinor: 2449,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      units: 4,
    },
  ],
  "escape-from-tarkov": [],
  rockstar: [
    {
      slug: "gta-plus-1-month-code",
      title: "GTA+ Membership — 1-Month Code",
      subtitle: "Official membership code",
      description:
        "An official code covering one month of GTA+ membership, redeemed on your own Rockstar Games account.",
      deliverable:
        "One unused GTA+ 1-month membership code, delivered as text after purchase.",
      priceMinor: 799,
      warranty: STANDARD_WARRANTY,
      region: "Global",
      units: 0,
    },
  ],
};

function demoCode(): string {
  const block = () => randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  return `VELOUR-DEMO-${block()}-${block()}-${block()}`;
}

async function main() {
  // Catalog data is replaced wholesale; accounts are upserted, never dropped.
  // Orders reference inventory units, so clear them first (dev seed only).
  await prisma.orderEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryUnit.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  let productCount = 0;
  let unitCount = 0;

  for (const [index, def] of CATEGORY_DEFS.entries()) {
    const category = await prisma.category.create({
      data: {
        slug: def.slug,
        name: def.name,
        blurb: def.blurb,
        sortOrder: index,
      },
    });

    for (const product of PRODUCTS[def.slug] ?? []) {
      const created = await prisma.product.create({
        data: {
          slug: product.slug,
          title: product.title,
          subtitle: product.subtitle,
          description: product.description,
          deliverable: product.deliverable,
          categoryId: category.id,
          priceMinor: product.priceMinor,
          currency: "EUR",
          delivery: "INSTANT_CODE",
          status: "ACTIVE",
          warranty: product.warranty,
          region: product.region,
          featured: product.featured ?? false,
        },
      });
      productCount += 1;

      for (let i = 0; i < product.units; i += 1) {
        const code = demoCode();
        await prisma.inventoryUnit.create({
          data: {
            productId: created.id,
            status: "AVAILABLE",
            // Copy into a plain Uint8Array<ArrayBuffer> as Prisma's Bytes type requires.
            payloadCiphertext: new Uint8Array(
              encryptDeliverable(code, masterKey!),
            ),
            payloadFingerprint: fingerprintDeliverable(code, masterKey!),
          },
        });
        unitCount += 1;
      }
    }
  }

  await seedDemoAccounts();

  console.log(
    `Seeded ${CATEGORY_DEFS.length} categories, ${productCount} products, ${unitCount} inventory units.`,
  );
}

/**
 * Optional local demo accounts.
 *
 * No account or password is hardcoded in the repository. Demo accounts are
 * created only when explicitly opted in for local development:
 *   SEED_DEMO_ACCOUNTS=true DEMO_ACCOUNT_PASSWORD=<your-choice> npm run db:seed
 * They are never created in production.
 */
async function seedDemoAccounts() {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.SEED_DEMO_ACCOUNTS !== "true") return;

  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!password || password.length < 8) {
    console.log(
      "Skipping demo accounts: set DEMO_ACCOUNT_PASSWORD (min 8 chars) to create them.",
    );
    return;
  }

  const passwordHash = await hashPassword(password);
  const accounts = [
    {
      email: "demo@velour.shop",
      username: "demo",
      role: "CUSTOMER" as const,
      verified: true,
    },
    {
      email: "unverified@velour.shop",
      username: "newcomer",
      role: "CUSTOMER" as const,
      verified: false,
    },
    {
      email: "admin@velour.shop",
      username: "admin",
      role: "ADMIN" as const,
      verified: true,
    },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        passwordHash,
        role: account.role,
        emailVerifiedAt: account.verified ? new Date() : null,
      },
      create: {
        email: account.email,
        username: account.username,
        passwordHash,
        role: account.role,
        emailVerifiedAt: account.verified ? new Date() : null,
      },
    });
  }
  // The password is never printed.
  console.log(`Seeded ${accounts.length} demo accounts (opt-in).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import "dotenv/config";

import { autogenGiftCodeProducts } from "../src/lib/catalog/autogen";
import { prisma } from "../src/lib/prisma";

/**
 * Gift-code product autogen.
 *
 * Expands the curated gift-code templates into DRAFT product listings,
 * idempotently (existing slugs are skipped). It never activates a product or
 * creates inventory — that stays behind the admin supplier/compliance gate.
 *
 * Usage:
 *   tsx scripts/autogen-products.ts                 # all templates
 *   tsx scripts/autogen-products.ts --category=steam # one category
 */
async function main() {
  const categoryArg = process.argv
    .find((arg) => arg.startsWith("--category="))
    ?.split("=")[1];

  const result = await autogenGiftCodeProducts(
    categoryArg ? { categorySlug: categoryArg } : undefined,
  );

  console.log(
    `Autogen complete — ${result.created.length} created, ${result.skipped.length} skipped.`,
  );
  if (result.created.length > 0) {
    console.log("Created (DRAFT):");
    for (const slug of result.created) console.log(`  + ${slug}`);
  }
  if (result.missingCategories.length > 0) {
    console.log(
      `Skipped templates for missing categories: ${result.missingCategories.join(", ")}`,
    );
    console.log("Run the seed first so categories exist, or check the slug.");
  }
  console.log(
    "\nNext steps: in admin, link a supplier with verified transfer-right",
    "evidence, import codes, then set each product ACTIVE.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

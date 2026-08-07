import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";
import { creditTopUp } from "./src/lib/wallet/ledger";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "demo@velour.shop" },
  });
  
  if (!user) {
    console.error("Demo user not found");
    return;
  }
  
  // Add $50 USD to the demo user's wallet
  const result = await creditTopUp({
    userId: user.id,
    amountMinor: 5000, // $50.00 in cents
    currency: "USD",
    idempotencyKey: "demo-usd-topup-" + Date.now(),
    description: "Demo USD balance top-up",
  });
  
  console.log("Added $50 USD to demo user wallet", result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

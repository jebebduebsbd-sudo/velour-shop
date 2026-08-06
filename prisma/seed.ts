import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { z } from "zod";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const userInput = z.object({
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

const seedUsers = [
  { email: "ada@velore.dev", name: "Ada Lovelace", password: "changeme123" },
  { email: "alan@velore.dev", name: "Alan Turing", password: "changeme123" },
  { email: "grace@velore.dev", name: "Grace Hopper", password: "changeme123" },
];

async function main() {
  for (const raw of seedUsers) {
    const data = userInput.parse(raw);
    const passwordHash = await bcrypt.hash(data.password, 10);

    await prisma.user.upsert({
      where: { email: data.email },
      update: { name: data.name, password: passwordHash },
      create: {
        email: data.email,
        name: data.name,
        password: passwordHash,
      },
    });
  }

  const count = await prisma.user.count();
  console.log(`Seed complete. Users in database: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

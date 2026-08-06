import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Integration-test database client. Tests run against a real PostgreSQL
 * instance so transactional and concurrency behavior is genuinely exercised.
 */
const connectionString =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://velour:velour_dev@localhost:5432/velour_test";

export const testDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Removes rows created by a test run, identified by an email/username prefix. */
export async function cleanupTestUsers(prefix: string): Promise<void> {
  await testDb.user.deleteMany({
    where: { OR: [{ email: { startsWith: prefix } }, { username: { startsWith: prefix } }] },
  });
}

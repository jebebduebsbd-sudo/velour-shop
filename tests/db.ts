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

/**
 * Removes rows created by a test run, identified by an email/username prefix.
 *
 * Ledger postings are deliberately not user-cascade-deletable (the ledger is
 * append-only in production), so test cleanup removes the ledger rows for the
 * test users explicitly, in FK-safe order, before deleting the users.
 */
export async function cleanupTestUsers(prefix: string): Promise<void> {
  const users = await testDb.user.findMany({
    where: {
      OR: [{ email: { startsWith: prefix } }, { username: { startsWith: prefix } }],
    },
    select: { id: true, ledgerAccounts: { select: { id: true } } },
  });
  const accountIds = users.flatMap((u) => u.ledgerAccounts.map((a) => a.id));
  if (accountIds.length > 0) {
    await testDb.ledgerTransaction.deleteMany({
      where: { postings: { some: { accountId: { in: accountIds } } } },
    });
    await testDb.ledgerAccount.deleteMany({ where: { id: { in: accountIds } } });
  }
  await testDb.walletTopUp.deleteMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });
  await testDb.user.deleteMany({
    where: { id: { in: users.map((u) => u.id) } },
  });
}

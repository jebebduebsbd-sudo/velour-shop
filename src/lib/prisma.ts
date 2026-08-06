import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: serverEnv().DATABASE_URL });
  return new PrismaClient({ adapter });
}

function client(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing) return existing;
  const created = createClient();
  // Reuse across dev hot reloads; in production each instance is long-lived.
  globalForPrisma.prisma = created;
  return created;
}

/**
 * Lazily-connected Prisma client.
 *
 * Construction is deferred to first use so importing this module never reads
 * the environment. That keeps `next build` (which evaluates modules without
 * runtime secrets) working while still failing closed on a real request.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const value = Reflect.get(client(), property, receiver);
    return typeof value === "function" ? value.bind(client()) : value;
  },
});

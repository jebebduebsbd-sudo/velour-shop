import { prisma } from "@/lib/prisma";

/**
 * Health / readiness endpoint used by Railway's healthcheck.
 *
 * Returns 200 when the app is up and the database is reachable, 503 when the
 * database cannot be queried. Always no-store. No secrets or internal detail
 * are returned.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", database: "up", latencyMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "degraded", database: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

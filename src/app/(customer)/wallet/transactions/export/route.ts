import { getActiveSession } from "@/lib/auth/session";
import { exportUserTransactionsCsv } from "@/lib/wallet/transactions";

/**
 * CSV export of the authenticated user's own transactions. Owner-scoped: the
 * export is built from the session user's id, so one user can never download
 * another's records. No internal ids, provider payloads, or secrets included.
 */
export async function GET() {
  const session = await getActiveSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const csv = await exportUserTransactionsCsv(session.user.id);
  const filename = `velour-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

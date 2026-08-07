import { NextResponse, type NextRequest } from "next/server";

import { completeTopUpFromWebhook } from "@/lib/payments/topup-service";

/**
 * Payment provider webhook endpoint.
 *
 * This is the ONLY path that can credit a wallet. It reads the raw body,
 * asks the provider to verify the signature, dedupes by event id, and applies
 * an idempotent ledger credit. Browser redirects/success pages never touch it.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/webhooks/payment/[provider]">,
) {
  const { provider } = await ctx.params;
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-velour-signature") ??
    request.headers.get("x-nowpayments-sig") ??
    null;

  const result = await completeTopUpFromWebhook({
    providerId: provider,
    rawBody,
    signature,
  });

  if (!result.ok) {
    // Normalized error: no internal detail leaks to the caller.
    return NextResponse.json(
      { ok: false },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, credited: result.credited },
    { headers: { "Cache-Control": "no-store" } },
  );
}

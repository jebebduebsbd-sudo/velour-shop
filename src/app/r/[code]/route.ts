import { NextResponse, type NextRequest } from "next/server";

import { recordClick, resolveProfileByCode } from "@/lib/affiliate/service";
import { setReferralCookie } from "@/lib/affiliate/referral-cookie";
import { serverEnv } from "@/lib/env";

/**
 * Referral link entry point: velour.shop/r/<code>. Records a click, drops the
 * attribution cookie when the code is valid, and redirects to the storefront.
 * Invalid codes still redirect home (no error, no enumeration signal).
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/r/[code]">,
) {
  const { code } = await ctx.params;
  const profile = await resolveProfileByCode(code).catch(() => null);
  if (profile) {
    await setReferralCookie(code);
    await recordClick(profile.id);
  }
  const origin = serverEnv().APP_ORIGIN;
  return NextResponse.redirect(new URL("/?ref=welcome", origin), {
    headers: { "Cache-Control": "no-store" },
  });
}

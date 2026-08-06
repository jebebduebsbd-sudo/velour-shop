import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers for every response.
 *
 * A per-request nonce is generated and passed to the app via the `x-nonce`
 * request header, so inline Next.js bootstrap scripts are allowed without
 * `unsafe-inline`. `unsafe-eval` is development-only (React uses eval for
 * error reconstruction in dev).
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Tailwind injects style elements at runtime; styles are first-party only.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self' data:`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // Authenticated areas must never be stored by shared caches.
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/account") ||
    path.startsWith("/orders") ||
    path.startsWith("/wallet") ||
    path.startsWith("/admin") ||
    path.startsWith("/api/")
  ) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static asset requests.
    "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
  ],
};

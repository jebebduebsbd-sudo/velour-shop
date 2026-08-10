/**
 * Best-effort JSON POST for outbound notifications.
 *
 * Retries once on a network error or non-2xx response, then gives up. Never
 * throws — notifications are fire-and-forget and must never affect the caller.
 * Failures are logged with a label and status only (never the body or URL, so
 * a webhook token can't leak into logs).
 */
export async function postJson(
  url: string,
  body: unknown,
  label: string,
): Promise<boolean> {
  const payload = JSON.stringify(body);
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
      });
      if (response.ok) return true;
      console.warn(
        `[notifications] ${label} failed (attempt ${attempt}): HTTP ${response.status}`,
      );
    } catch (error) {
      console.warn(
        `[notifications] ${label} error (attempt ${attempt}): ${
          error instanceof Error ? error.name : "unknown"
        }`,
      );
    }
  }
  return false;
}

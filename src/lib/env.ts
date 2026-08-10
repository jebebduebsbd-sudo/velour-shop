import { z } from "zod";

/**
 * Server-side environment validation.
 *
 * This module must never be imported from client components. Client-exposed
 * configuration (none yet) must use a separate schema and the NEXT_PUBLIC_
 * prefix; server secrets must never be serialized to the client.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  /**
   * Secret used to derive session/IP hashing keys. Required in production;
   * development falls back to a clearly-marked local value.
   */
  SESSION_SECRET: z.string().min(32).optional(),
  /** Pepper mixed into email token hashes. Required in production. */
  EMAIL_TOKEN_PEPPER: z.string().min(16).optional(),

  /**
   * Payment providers. Real providers are disabled by default and only
   * activate when their flag is "true" AND their secrets are present. The
   * mock provider is available only outside production.
   */
  PAYMENT_DSK_ENABLED: z.enum(["true", "false"]).default("false"),
  PAYMENT_NOWPAYMENTS_ENABLED: z.enum(["true", "false"]).default("false"),
  PAYMENT_OVGC_ENABLED: z.enum(["true", "false"]).default("false"),
  /** Shared secret used to verify mock/dev webhook signatures. */
  PAYMENT_WEBHOOK_SECRET: z.string().min(16).optional(),
  /** NOWPayments credentials (server-only). Required to enable that provider. */
  NOWPAYMENTS_API_KEY: z.string().min(8).optional(),
  NOWPAYMENTS_IPN_SECRET: z.string().min(8).optional(),
  /**
   * Discord order-alert webhook. When alerts are enabled AND a webhook URL is
   * present, a "New Sale" notification is posted to the configured channel
   * after each fulfilled order. Disabled by default and fails closed: a missing
   * URL simply means no alert is sent. The deliverable code is NEVER included.
   */
  DISCORD_ORDER_ALERTS_ENABLED: z.enum(["true", "false"]).default("false"),
  DISCORD_ORDER_WEBHOOK_URL: z
    .string()
    .url()
    .refine((value) => /\/api\/webhooks\//.test(value), {
      message: "DISCORD_ORDER_WEBHOOK_URL must be a Discord webhook URL",
    })
    .optional(),
  /** Optional hex color for the Discord embed (e.g. "#4f46e5"). */
  DISCORD_EMBED_COLOR: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/, "DISCORD_EMBED_COLOR must be a 6-digit hex")
    .optional(),

  /**
   * Order-alert presentation. The customer email is included by default (it is
   * the merchant's own private channel); set to "false" to omit it. The payment
   * label overrides the wallet default shown in the alert.
   */
  ORDER_ALERT_INCLUDE_EMAIL: z.enum(["true", "false"]).default("true"),
  ORDER_ALERT_PAYMENT_LABEL: z.string().min(1).max(80).optional(),
  /**
   * Low-stock alert threshold. When > 0, an alert fires after a sale that
   * leaves a product's available units at or below this count. 0 disables it.
   */
  LOW_STOCK_ALERT_THRESHOLD: z.coerce.number().int().min(0).default(0),

  /**
   * Telegram order alerts. Enabled only when the flag is "true" AND both the
   * bot token and chat id are present. Fails closed like the Discord channel.
   */
  TELEGRAM_ALERTS_ENABLED: z.enum(["true", "false"]).default("false"),
  TELEGRAM_BOT_TOKEN: z.string().min(10).optional(),
  TELEGRAM_CHAT_ID: z.string().min(1).optional(),

  /**
   * Authorized gift-code supplier sync. Disabled by default and fails closed:
   * the live adapter stays inert until a legitimate distributor API, its docs,
   * and server-side credentials are in place. Never sources account inventory.
   */
  SUPPLIER_SYNC_ENABLED: z.enum(["true", "false"]).default("false"),

  /**
   * 32-byte base64 master key for deliverable encryption. Optional until the
   * delivery phase, but validated for shape whenever present.
   */
  DELIVERY_MASTER_KEY_B64: z
    .string()
    .refine(
      (value) => {
        try {
          return Buffer.from(value, "base64").length === 32;
        } catch {
          return false;
        }
      },
      { message: "DELIVERY_MASTER_KEY_B64 must decode to exactly 32 bytes" },
    )
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid server environment: ${issues}`);
    }
    if (parsed.data.NODE_ENV === "production") {
      const missing = (
        ["SESSION_SECRET", "EMAIL_TOKEN_PEPPER"] as const
      ).filter((key) => !parsed.data[key]);
      if (missing.length > 0) {
        throw new Error(
          `Invalid server environment: ${missing.join(", ")} ${
            missing.length === 1 ? "is" : "are"
          } required in production`,
        );
      }
    }
    cached = parsed.data;
  }
  return cached;
}

/**
 * Development-only fallbacks so a fresh clone runs without configuration.
 * Production startup rejects missing secrets (see serverEnv above).
 */
const DEV_SESSION_SECRET =
  "velour-development-session-secret-not-for-production";
const DEV_EMAIL_TOKEN_PEPPER = "velour-development-email-pepper";

export function sessionSecret(): string {
  return serverEnv().SESSION_SECRET ?? DEV_SESSION_SECRET;
}

export function emailTokenPepper(): string {
  return serverEnv().EMAIL_TOKEN_PEPPER ?? DEV_EMAIL_TOKEN_PEPPER;
}

const DEV_WEBHOOK_SECRET = "velour-development-webhook-secret";

export function paymentWebhookSecret(): string {
  return serverEnv().PAYMENT_WEBHOOK_SECRET ?? DEV_WEBHOOK_SECRET;
}

export function isProduction(): boolean {
  return serverEnv().NODE_ENV === "production";
}

/**
 * Resolves the Discord order-alert webhook, or null when alerts are disabled
 * or unconfigured. Callers treat null as "do not send" — fail closed, never
 * throw, so a missing webhook can never break checkout.
 */
export function discordOrderWebhookUrl(): string | null {
  const env = serverEnv();
  if (env.DISCORD_ORDER_ALERTS_ENABLED !== "true") return null;
  return env.DISCORD_ORDER_WEBHOOK_URL ?? null;
}

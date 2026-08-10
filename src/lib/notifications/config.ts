import { discordOrderWebhookUrl, serverEnv } from "@/lib/env";

/**
 * Resolved notification configuration.
 *
 * Every channel is opt-in and fails closed: a channel appears here only when
 * it is both enabled and fully configured, so callers can treat presence as
 * "safe to send". Nothing here is a secret beyond the webhook/token needed to
 * deliver — and those are never logged.
 */
export type TelegramConfig = { botToken: string; chatId: string };

export type NotificationConfig = {
  /** Include the customer email in alerts (merchant's own channel). */
  includeCustomerEmail: boolean;
  /** Label shown for the payment method. */
  paymentLabel: string;
  /** Discord embed color as an integer. */
  embedColor: number;
  /** Alert when post-sale stock is at or below this; 0 disables it. */
  lowStockThreshold: number;
  /** Discord webhook URL, or null when the channel is off/unconfigured. */
  discordWebhookUrl: string | null;
  /** Telegram config, or null when the channel is off/unconfigured. */
  telegram: TelegramConfig | null;
};

const DEFAULT_EMBED_COLOR = 0x4f46e5; // Velour indigo.
const DEFAULT_PAYMENT_LABEL = "Wallet (Velour balance)";

function parseColor(hex: string | undefined): number {
  if (!hex) return DEFAULT_EMBED_COLOR;
  return Number.parseInt(hex.replace(/^#/, ""), 16);
}

function resolveTelegram(): TelegramConfig | null {
  const env = serverEnv();
  if (env.TELEGRAM_ALERTS_ENABLED !== "true") return null;
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return null;
  return { botToken: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID };
}

export function notificationConfig(): NotificationConfig {
  const env = serverEnv();
  return {
    includeCustomerEmail: env.ORDER_ALERT_INCLUDE_EMAIL !== "false",
    paymentLabel: env.ORDER_ALERT_PAYMENT_LABEL ?? DEFAULT_PAYMENT_LABEL,
    embedColor: parseColor(env.DISCORD_EMBED_COLOR),
    lowStockThreshold: env.LOW_STOCK_ALERT_THRESHOLD,
    discordWebhookUrl: discordOrderWebhookUrl(),
    telegram: resolveTelegram(),
  };
}

/** True when at least one alert channel is enabled and configured. */
export function anyChannelEnabled(config: NotificationConfig): boolean {
  return Boolean(config.discordWebhookUrl || config.telegram);
}

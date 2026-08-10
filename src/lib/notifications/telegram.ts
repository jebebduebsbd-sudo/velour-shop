import { formatMinor } from "@/lib/format";
import type { TelegramConfig } from "@/lib/notifications/config";
import { postJson } from "@/lib/notifications/http";
import type {
  AlertPresentation,
  LowStockAlertData,
  OrderAlertData,
} from "@/lib/notifications/types";

/**
 * Telegram order alerts via the Bot API `sendMessage`. Like the Discord
 * channel, these carry only non-secret order metadata — never a deliverable.
 * Messages use HTML parse mode; dynamic values are escaped.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Builds the "New Sale" message text (HTML). Pure and secret-free. */
export function buildOrderAlertText(
  data: OrderAlertData,
  options?: Partial<AlertPresentation>,
): string {
  const includeEmail = options?.includeCustomerEmail ?? true;
  const total = formatMinor(data.priceMinor, data.currency);
  const lines = [
    "<b>New Sale</b>",
    `Invoice ID: ${escapeHtml(data.invoiceId)}`,
    `Payment Method: ${escapeHtml(data.paymentMethod)}`,
    `Total Price: ${escapeHtml(total)}`,
  ];
  if (includeEmail) {
    lines.push(`Customer's E-mail: ${escapeHtml(data.customerEmail)}`);
  }
  lines.push(
    `Product: ${escapeHtml(data.productTitle)}`,
    `Price: ${data.quantity} x ${escapeHtml(total)}`,
    `Remaining Stock: ${data.remainingStock}`,
  );
  return lines.join("\n");
}

/** Builds the "Low Stock" message text (HTML). */
export function buildLowStockText(data: LowStockAlertData): string {
  return [
    "<b>Low Stock</b>",
    `Product: ${escapeHtml(data.productTitle)}`,
    `Remaining Stock: ${data.remainingStock}`,
    `Threshold: ${data.threshold}`,
  ].join("\n");
}

/** Posts a message to the configured Telegram chat. Best-effort. */
export function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
  label: string,
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  return postJson(
    url,
    { chat_id: config.chatId, text, parse_mode: "HTML" },
    label,
  );
}

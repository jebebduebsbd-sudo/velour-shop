import { formatMinor } from "@/lib/format";
import type {
  AlertPresentation,
  LowStockAlertData,
  OrderAlertData,
} from "@/lib/notifications/types";

/**
 * Discord embed builders for order alerts.
 *
 * These are pure and free of any secret: they receive only non-sensitive
 * order/catalog metadata, so a deliverable can never reach Discord by
 * construction. Sending (with retry) lives in `http.ts`; orchestration and the
 * DB read live in `order-alerts.ts`.
 */

const DEFAULT_COLOR = 0x4f46e5; // Velour indigo.
const LOW_STOCK_COLOR = 0xf59e0b; // Amber.

function present(options?: Partial<AlertPresentation>): AlertPresentation {
  return {
    includeCustomerEmail: options?.includeCustomerEmail ?? true,
    embedColor: options?.embedColor ?? DEFAULT_COLOR,
  };
}

/** Builds the "New Sale" Discord webhook body. */
export function buildOrderAlertPayload(
  data: OrderAlertData,
  options?: Partial<AlertPresentation>,
) {
  const opts = present(options);
  const total = formatMinor(data.priceMinor, data.currency);

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: "Invoice ID", value: data.invoiceId, inline: false },
    { name: "Payment Method", value: data.paymentMethod, inline: false },
    { name: "Total Price", value: total, inline: false },
  ];
  if (opts.includeCustomerEmail) {
    fields.push({
      name: "Customer's E-mail",
      value: data.customerEmail,
      inline: false,
    });
  }
  fields.push(
    { name: "Product", value: data.productTitle, inline: false },
    { name: "Price", value: `${data.quantity} x ${total}`, inline: false },
    {
      name: "Remaining Stock",
      value: String(data.remainingStock),
      inline: false,
    },
  );

  return {
    username: "Velour Orders",
    embeds: [
      {
        title: "New Sale",
        description: "You have just made a new sale on Velour!",
        color: opts.embedColor,
        fields,
        footer: { text: "Velour" },
        timestamp: data.createdAt.toISOString(),
      },
    ],
  };
}

/** Builds a "Low Stock" Discord webhook body. */
export function buildLowStockPayload(data: LowStockAlertData) {
  return {
    username: "Velour Orders",
    embeds: [
      {
        title: "Low Stock",
        description: `\`${data.productTitle}\` is running low.`,
        color: LOW_STOCK_COLOR,
        fields: [
          { name: "Product", value: data.productTitle, inline: false },
          {
            name: "Remaining Stock",
            value: String(data.remainingStock),
            inline: true,
          },
          { name: "Threshold", value: String(data.threshold), inline: true },
        ],
        footer: { text: "Velour" },
      },
    ],
  };
}

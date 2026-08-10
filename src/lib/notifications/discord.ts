import { discordOrderWebhookUrl } from "@/lib/env";
import { formatMinor } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * Discord order-completion alerts.
 *
 * When enabled, a "New Sale" embed is posted to a private orders channel after
 * an order is fulfilled — the merchant's operational notification, matching the
 * shape shops expect (invoice, method, total, customer email, product, stock).
 *
 * Two invariants this module upholds:
 *   1. The deliverable (gift code / key / voucher) is NEVER selected, built
 *      into the payload, or sent. Only non-secret order metadata is posted.
 *   2. Sending is best-effort and fails closed: if alerts are disabled or the
 *      webhook is unset/unreachable, nothing is sent and checkout is unaffected.
 */

export type OrderAlertData = {
  /** Order id, shown as the invoice reference. */
  invoiceId: string;
  /** Human-facing payment method (wallet-only checkout today). */
  paymentMethod: string;
  priceMinor: number;
  currency: string;
  customerEmail: string;
  productTitle: string;
  /** Units in this order (single-unit instant-code model → 1). */
  quantity: number;
  /** AVAILABLE units left for the product after this sale. */
  remainingStock: number;
  createdAt: Date;
};

// Velour brand indigo, as a Discord embed color integer.
const EMBED_COLOR = 0x4f46e5;

/**
 * Builds the Discord webhook JSON body for a sale. Pure and free of any
 * secret: it receives only non-sensitive order metadata, so the deliverable
 * can never reach Discord by construction.
 */
export function buildOrderAlertPayload(data: OrderAlertData) {
  const total = formatMinor(data.priceMinor, data.currency);
  return {
    username: "Velour Orders",
    embeds: [
      {
        title: "New Sale",
        description: "You have just made a new sale on Velour!",
        color: EMBED_COLOR,
        fields: [
          { name: "Invoice ID", value: data.invoiceId, inline: false },
          { name: "Payment Method", value: data.paymentMethod, inline: false },
          { name: "Total Price", value: total, inline: false },
          { name: "Customer's E-mail", value: data.customerEmail, inline: false },
          { name: "Product", value: data.productTitle, inline: false },
          { name: "Price", value: `${data.quantity} x ${total}`, inline: false },
          {
            name: "Remaining Stock",
            value: String(data.remainingStock),
            inline: false,
          },
        ],
        footer: { text: "Velour" },
        timestamp: data.createdAt.toISOString(),
      },
    ],
  };
}

/**
 * Posts the "New Sale" alert for a fulfilled order. No-op when alerts are
 * disabled/unconfigured. Never throws: callers fire-and-forget after checkout
 * commits, so a Discord outage can never roll back or block a purchase.
 */
export async function sendOrderAlert(orderId: string): Promise<void> {
  const webhookUrl = discordOrderWebhookUrl();
  if (!webhookUrl) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      priceMinor: true,
      currency: true,
      productTitle: true,
      createdAt: true,
      user: { select: { email: true } },
      product: { select: { id: true } },
    },
  });
  // Only alert on a fulfilled sale we can describe without touching inventory
  // payloads. If the order or its product vanished, stay silent.
  if (!order) return;

  const remainingStock = await prisma.inventoryUnit.count({
    where: { productId: order.product.id, status: "AVAILABLE" },
  });

  const payload = buildOrderAlertPayload({
    invoiceId: order.id,
    paymentMethod: "Wallet (Velour balance)",
    priceMinor: order.priceMinor,
    currency: order.currency,
    customerEmail: order.user.email,
    productTitle: order.productTitle,
    quantity: 1,
    remainingStock,
    createdAt: order.createdAt,
  });

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Best-effort: swallow network/Discord errors so checkout is never affected.
  }
}

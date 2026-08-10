import {
  anyChannelEnabled,
  notificationConfig,
  type NotificationConfig,
} from "@/lib/notifications/config";
import {
  buildLowStockPayload,
  buildOrderAlertPayload,
} from "@/lib/notifications/discord";
import { postJson } from "@/lib/notifications/http";
import {
  buildLowStockText,
  buildOrderAlertText,
  sendTelegramMessage,
} from "@/lib/notifications/telegram";
import type {
  LowStockAlertData,
  OrderAlertData,
} from "@/lib/notifications/types";
import { prisma } from "@/lib/prisma";

/**
 * Order-completion + low-stock alert orchestration.
 *
 * Fans an alert out to every enabled channel (Discord, Telegram). Best-effort
 * and never throws: callers fire-and-forget after checkout commits, so a
 * notification outage can never roll back or block a purchase. The deliverable
 * is never selected, built into a payload, or sent — only order metadata.
 */

function dispatchOrderAlert(
  config: NotificationConfig,
  data: OrderAlertData,
): Promise<unknown>[] {
  const tasks: Promise<unknown>[] = [];
  const presentation = {
    includeCustomerEmail: config.includeCustomerEmail,
    embedColor: config.embedColor,
  };
  if (config.discordWebhookUrl) {
    tasks.push(
      postJson(
        config.discordWebhookUrl,
        buildOrderAlertPayload(data, presentation),
        "discord order alert",
      ),
    );
  }
  if (config.telegram) {
    tasks.push(
      sendTelegramMessage(
        config.telegram,
        buildOrderAlertText(data, presentation),
        "telegram order alert",
      ),
    );
  }
  return tasks;
}

function dispatchLowStockAlert(
  config: NotificationConfig,
  data: LowStockAlertData,
): Promise<unknown>[] {
  const tasks: Promise<unknown>[] = [];
  if (config.discordWebhookUrl) {
    tasks.push(
      postJson(
        config.discordWebhookUrl,
        buildLowStockPayload(data),
        "discord low-stock alert",
      ),
    );
  }
  if (config.telegram) {
    tasks.push(
      sendTelegramMessage(
        config.telegram,
        buildLowStockText(data),
        "telegram low-stock alert",
      ),
    );
  }
  return tasks;
}

export async function sendOrderAlert(orderId: string): Promise<void> {
  try {
    const config = notificationConfig();
    if (!anyChannelEnabled(config)) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        priceMinor: true,
        currency: true,
        productTitle: true,
        createdAt: true,
        user: { select: { email: true } },
        product: { select: { id: true, slug: true } },
      },
    });
    if (!order) return;

    const remainingStock = await prisma.inventoryUnit.count({
      where: { productId: order.product.id, status: "AVAILABLE" },
    });

    const tasks = dispatchOrderAlert(config, {
      invoiceId: order.id,
      paymentMethod: config.paymentLabel,
      priceMinor: order.priceMinor,
      currency: order.currency,
      customerEmail: order.user.email,
      productTitle: order.productTitle,
      quantity: 1,
      remainingStock,
      createdAt: order.createdAt,
    });

    // Low-stock alert when this sale drops the product to/below the threshold.
    if (
      config.lowStockThreshold > 0 &&
      remainingStock <= config.lowStockThreshold
    ) {
      tasks.push(
        ...dispatchLowStockAlert(config, {
          productTitle: order.productTitle,
          productSlug: order.product.slug,
          remainingStock,
          threshold: config.lowStockThreshold,
        }),
      );
    }

    await Promise.allSettled(tasks);
  } catch {
    // Alerts are best-effort; never surface an error to the checkout path.
  }
}

/**
 * Channel-neutral alert payloads. These carry only non-secret order/catalog
 * metadata — never a deliverable code, key, or voucher value.
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

export type LowStockAlertData = {
  productTitle: string;
  productSlug: string;
  remainingStock: number;
  threshold: number;
};

/** Presentation options resolved from configuration. */
export type AlertPresentation = {
  includeCustomerEmail: boolean;
  embedColor: number;
};

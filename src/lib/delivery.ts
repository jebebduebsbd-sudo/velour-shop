/**
 * Delivery label policy: a product may only advertise instant delivery when
 * at least one deliverable inventory unit is actually available.
 */
export function deliveryLabel(product: {
  delivery: "INSTANT_CODE" | "MANUAL";
  availableUnits: number;
}): string {
  if (product.availableUnits <= 0) return "Out of stock";
  return product.delivery === "INSTANT_CODE"
    ? "Instant delivery"
    : "Manual delivery";
}

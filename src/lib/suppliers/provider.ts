/**
 * Provider-neutral interface for AUTHORIZED gift-code supplier sync.
 *
 * A supplier provider pulls lawful, transferable gift/wallet/voucher codes from
 * a legitimate distributor and hands them to the policy-checked, encrypted
 * inventory import path. It must NEVER source account credentials, logins,
 * cookies, or any non-transferable inventory — that is out of scope for this
 * platform, and every imported code still passes `checkDeliverablePayload`.
 *
 * The compliance gate is unchanged: synced codes attach to a Product only when
 * that product is linked to a Supplier whose transfer-right evidence is
 * verified. Providers here are disabled by default and fail closed until a real
 * distributor API, its official docs, and server-side credentials are in place.
 */

export type SupplierCatalogItem = {
  /** Distributor SKU / product reference. */
  sku: string;
  title: string;
  /** Maps to a Velour catalog category slug. */
  categorySlug: string;
  priceMinor: number;
  currency: string;
  region: string;
  availableQuantity: number;
};

/** A single authorized deliverable code fetched from the distributor. */
export type SupplierCode = { code: string };

export type SupplierHealth = { healthy: boolean; detail: string };

export interface SupplierProvider {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  /** Whether this provider is enabled AND configured right now. */
  isEnabled(): boolean;
  /** Lists the distributor's available authorized catalog items. */
  listCatalog(): Promise<SupplierCatalogItem[]>;
  /** Fetches up to `quantity` authorized codes for a SKU, for import. */
  fetchCodes(sku: string, quantity: number): Promise<SupplierCode[]>;
  healthCheck(): Promise<SupplierHealth>;
}

import type {
  SupplierCatalogItem,
  SupplierCode,
  SupplierHealth,
  SupplierProvider,
} from "@/lib/suppliers/provider";

/**
 * Disabled supplier-sync scaffold.
 *
 * Intentionally NOT wired to any live distributor. It is enabled only when
 * SUPPLIER_SYNC_ENABLED is "true" AND real credentials/config are present
 * (`configured()` — false until the live adapter is implemented). Every action
 * fails closed with a clear message. Wiring the live protocol requires the
 * distributor's official API docs and approved credentials from server-side
 * secrets — never invented field names, never a token pasted into a prompt.
 */
export class DisabledSupplierProvider implements SupplierProvider {
  readonly id = "distributor";
  readonly displayName = "Authorized gift-code distributor";
  readonly description =
    "Pulls lawful, transferable gift/wallet/voucher codes for import. Disabled until distributor onboarding, official API docs, and secrets are in place.";

  protected flagEnabled(): boolean {
    return process.env.SUPPLIER_SYNC_ENABLED === "true";
  }

  /** Real credential/config presence. Always false until the adapter exists. */
  protected configured(): boolean {
    return false;
  }

  isEnabled(): boolean {
    return this.flagEnabled() && this.configured();
  }

  async listCatalog(): Promise<SupplierCatalogItem[]> {
    return [];
  }

  async fetchCodes(): Promise<SupplierCode[]> {
    throw new Error(
      `${this.displayName} is not configured. Supplier sync stays disabled until onboarding, official API docs, and secrets are in place.`,
    );
  }

  async healthCheck(): Promise<SupplierHealth> {
    return {
      healthy: false,
      detail: `${this.displayName} disabled (awaiting onboarding + secrets)`,
    };
  }
}

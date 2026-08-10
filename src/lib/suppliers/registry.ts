import { DisabledSupplierProvider } from "@/lib/suppliers/disabled-adapter";
import type { SupplierProvider } from "@/lib/suppliers/provider";

/**
 * Server-only registry of supplier-sync providers. All are disabled by default
 * and surface only when enabled AND configured. Until a real distributor
 * adapter is implemented, `runSupplierSync` reports "disabled" and imports
 * nothing — the catalog is grown by autogen (drafts) + the manual, policy-
 * checked inventory import in the meantime.
 */
const PROVIDERS: SupplierProvider[] = [new DisabledSupplierProvider()];

export function enabledSupplierProviders(): SupplierProvider[] {
  return PROVIDERS.filter((provider) => provider.isEnabled());
}

export type SupplierSyncResult = {
  ran: boolean;
  detail: string;
  imported: number;
};

/**
 * Entry point for a scheduled/admin-triggered supplier sync. Fails closed: with
 * no enabled provider it imports nothing and says so. When a live adapter is
 * added, this is where its catalog would be pulled and each fetched code run
 * through the existing policy-checked, encrypted inventory import — gated on a
 * verified supplier, exactly like manual import.
 */
export async function runSupplierSync(): Promise<SupplierSyncResult> {
  const providers = enabledSupplierProviders();
  if (providers.length === 0) {
    return {
      ran: false,
      detail:
        "No supplier provider is enabled and configured. Sync is disabled (fail-closed).",
      imported: 0,
    };
  }
  // A real adapter's pull/import flow lands here behind the compliance gate.
  return {
    ran: false,
    detail: "Supplier provider enabled but no import flow is implemented yet.",
    imported: 0,
  };
}

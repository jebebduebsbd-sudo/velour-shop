import type { SupplierFeedProvider } from "@/lib/suppliers/feed";
import { HttpSupplierFeedProvider } from "@/lib/suppliers/http-feed-provider";

/**
 * Server-only registry of supplier feed adapters.
 *
 * One generic HTTPS adapter covers token-authenticated catalogue feeds. It is
 * disabled until the operator sets the flag, the URL, and the token, so a
 * fresh deployment syncs nothing.
 */
const PROVIDERS: SupplierFeedProvider[] = [new HttpSupplierFeedProvider()];

export function getFeedProvider(id: string): SupplierFeedProvider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

/** The adapter a sync uses when the caller does not supply one. */
export function defaultFeedProvider(): SupplierFeedProvider {
  return PROVIDERS[0];
}

export function enabledFeedProviders(): SupplierFeedProvider[] {
  return PROVIDERS.filter((provider) => provider.isEnabled());
}

import { DskVirtualPosProvider, OvgcProvider } from "@/lib/payments/disabled-adapters";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import { NowPaymentsProvider } from "@/lib/payments/nowpayments-provider";
import type {
  PaymentProvider,
  PublicProviderInfo,
} from "@/lib/payments/provider";

/**
 * Server-only registry of payment providers. Real providers are disabled by
 * default and only surface when enabled AND configured; the mock provider is
 * available outside production. The UI must render only enabled providers.
 *
 * NOWPayments is a real adapter (enabled only with flag + credentials). DSK and
 * OVGC remain disabled scaffolds pending their integration docs / onboarding.
 */
const PROVIDERS: PaymentProvider[] = [
  new MockPaymentProvider(),
  new DskVirtualPosProvider(),
  new NowPaymentsProvider(),
  new OvgcProvider(),
];

export function getProvider(id: string): PaymentProvider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

/** Only providers that are enabled and configured right now. */
export function enabledProviders(): PaymentProvider[] {
  return PROVIDERS.filter((provider) => provider.isEnabled());
}

/** Enabled provider whose id matches, or undefined (used to gate top-ups). */
export function getEnabledProvider(id: string): PaymentProvider | undefined {
  const provider = getProvider(id);
  return provider && provider.isEnabled() ? provider : undefined;
}

export function publicProviderInfo(
  provider: PaymentProvider,
  currency = "EUR",
): PublicProviderInfo {
  return {
    id: provider.id,
    displayName: provider.displayName,
    description: provider.description,
    kind: provider.kind,
    minimumMinor: provider.minimumMinor(currency),
    estimatedArrival: provider.estimatedArrival(),
  };
}

export function listPublicProviders(currency = "EUR"): PublicProviderInfo[] {
  return enabledProviders().map((provider) =>
    publicProviderInfo(provider, currency),
  );
}

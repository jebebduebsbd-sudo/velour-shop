import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getProvider } from "@/lib/payments/registry";

export const metadata: Metadata = {
  title: "Admin — providers",
  robots: { index: false },
};

const PROVIDER_IDS = ["mock", "dsk", "nowpayments", "ovgc"] as const;

export default async function AdminProvidersPage() {
  const rows = await Promise.all(
    PROVIDER_IDS.map(async (id) => {
      const provider = getProvider(id);
      if (!provider) return null;
      const health = await provider.healthCheck().catch(() => ({
        healthy: false,
        detail: "health check failed",
      }));
      return {
        id: provider.id,
        name: provider.displayName,
        kind: provider.kind,
        enabled: provider.isEnabled(),
        health,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Payment providers</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Real providers stay disabled until their feature flag is set and the
          live adapter is configured with credentials. Read-only here.
        </p>
      </div>

      <Panel className="overflow-hidden">
        <ul className="divide-y divide-line">
          {rows
            .filter((row): row is NonNullable<typeof row> => row !== null)
            .map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-4 p-5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {row.name}{" "}
                    <span className="text-xs text-ink-faint">({row.kind})</span>
                  </span>
                  <span className="block text-xs text-ink-faint">
                    {row.health.detail}
                  </span>
                </span>
                <Badge variant={row.enabled ? "success" : "muted"}>
                  {row.enabled ? "enabled" : "disabled"}
                </Badge>
                <Badge variant={row.health.healthy ? "success" : "warning"}>
                  {row.health.healthy ? "healthy" : "unavailable"}
                </Badge>
              </li>
            ))}
        </ul>
      </Panel>
    </div>
  );
}

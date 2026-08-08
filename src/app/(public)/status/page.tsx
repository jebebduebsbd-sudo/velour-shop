import { CircleCheck, CircleSlash, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/payments/registry";

export const metadata: Metadata = {
  title: "Service status",
  description: "Live status of Velour's app, database, and payment providers.",
};

// Always reflect the live state.
export const dynamic = "force-dynamic";

type Check = {
  name: string;
  state: "operational" | "degraded" | "disabled";
  detail: string;
};

async function runChecks(): Promise<{ checks: Check[]; dbLatencyMs: number | null }> {
  const checks: Check[] = [];

  // App is up if this code is running.
  checks.push({
    name: "Storefront",
    state: "operational",
    detail: "Serving requests",
  });

  // Database readiness with a real latency measurement.
  let dbLatencyMs: number | null = null;
  try {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - started;
    checks.push({
      name: "Database",
      state: "operational",
      detail: `Reachable (${dbLatencyMs} ms)`,
    });
  } catch {
    checks.push({
      name: "Database",
      state: "degraded",
      detail: "Not reachable",
    });
  }

  for (const id of ["mock", "dsk", "nowpayments"] as const) {
    const provider = getProvider(id);
    if (!provider) continue;
    if (!provider.isEnabled()) {
      checks.push({
        name: provider.displayName,
        state: "disabled",
        detail: "Disabled (not configured)",
      });
      continue;
    }
    const health = await provider.healthCheck().catch(() => ({
      healthy: false,
      detail: "health check failed",
    }));
    checks.push({
      name: provider.displayName,
      state: health.healthy ? "operational" : "degraded",
      detail: health.detail,
    });
  }

  return { checks, dbLatencyMs };
}

const ICON = {
  operational: CircleCheck,
  degraded: TriangleAlert,
  disabled: CircleSlash,
} as const;

const VARIANT = {
  operational: "success",
  degraded: "warning",
  disabled: "muted",
} as const;

export default async function StatusPage() {
  const { checks } = await runChecks();
  const allOperational = checks
    .filter((c) => c.state !== "disabled")
    .every((c) => c.state === "operational");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Service status
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          {allOperational ? "All systems operational" : "Some systems degraded"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Live checks run when you load this page. Velour is a new service, so
          historical uptime is not tracked yet — these are real-time signals, not
          estimated percentages.
        </p>
      </div>

      <Panel className="overflow-hidden">
        <ul className="divide-y divide-line">
          {checks.map((check) => {
            const Icon = ICON[check.state];
            return (
              <li
                key={check.name}
                className="flex items-center gap-4 px-5 py-4"
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    check.state === "operational"
                      ? "text-success"
                      : check.state === "degraded"
                        ? "text-warning"
                        : "text-ink-faint"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {check.name}
                  </span>
                  <span className="block text-xs text-ink-faint">
                    {check.detail}
                  </span>
                </span>
                <Badge variant={VARIANT[check.state]}>{check.state}</Badge>
              </li>
            );
          })}
        </ul>
      </Panel>

      <p className="text-xs text-ink-faint">
        Last checked {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC.
      </p>
    </div>
  );
}

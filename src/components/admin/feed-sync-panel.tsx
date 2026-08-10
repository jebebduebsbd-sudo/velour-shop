"use client";

import { useActionState } from "react";

import {
  syncSupplierFeedAction,
  type FeedSyncState,
} from "@/app/(admin)/actions";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

const initialState: FeedSyncState = { status: "idle" };

export type FeedSyncPanelProps = {
  /** Whether the feed adapter is enabled AND configured, computed server-side. */
  enabled: boolean;
  /** Operator-facing reason the feed is unusable. Empty when enabled. */
  disabledReason: string;
  suppliers: { id: string; name: string; evidenceVerified: boolean }[];
};

/**
 * Admin control for the supplier catalogue feed. The API token itself never
 * reaches this component — it lives in the server environment, and only the
 * "configured or not" bit crosses to the client.
 */
export function FeedSyncPanel({
  enabled,
  disabledReason,
  suppliers,
}: FeedSyncPanelProps) {
  const [state, formAction, pending] = useActionState(
    syncSupplierFeedAction,
    initialState,
  );

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Catalogue feed</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            enabled
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          }`}
        >
          {enabled ? "configured" : "not configured"}
        </span>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        Pulls a supplier&apos;s listings over HTTPS using the API token in the
        server environment. Only transferable codes, keys and vouchers are
        imported; anything describing account access is rejected. Synced
        products arrive in compliance review and stay off the storefront until
        you activate them.
      </p>

      {!enabled ? (
        <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {disabledReason}
        </p>
      ) : null}

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="feed-supplier"
            className="block text-xs text-ink-faint"
          >
            Attribute inventory to
          </label>
          <select
            id="feed-supplier"
            name="supplierId"
            required
            disabled={!enabled || suppliers.length === 0}
            className="h-9 min-w-56 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
          >
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
                {supplier.evidenceVerified ? "" : " (evidence unverified)"}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!enabled || pending || suppliers.length === 0}
        >
          {pending ? "Syncing…" : "Sync now"}
        </Button>
      </form>

      {suppliers.length === 0 ? (
        <p className="mt-3 text-xs text-ink-faint">
          Add a supplier below first — synced inventory must be attributed to
          one.
        </p>
      ) : null}

      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "ok" ? (
        <div className="mt-4 space-y-3">
          <p
            role="status"
            className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
          >
            {state.message}
          </p>
          {!state.supplierVerified ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              This supplier&apos;s transfer-right evidence is not verified, so
              the synced products cannot be activated yet.
            </p>
          ) : null}
          {state.rejected.length > 0 ? (
            <div className="rounded-md border border-line">
              <p className="border-b border-line px-3 py-2 text-xs font-semibold text-ink">
                Rejected listings
              </p>
              <ul className="divide-y divide-line">
                {state.rejected.map((rejection, index) => (
                  <li
                    key={`${rejection.ref}-${index}`}
                    className="flex flex-wrap gap-2 px-3 py-2 text-xs"
                  >
                    <span className="font-mono text-ink">{rejection.ref}</span>
                    <span className="text-ink-muted">{rejection.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

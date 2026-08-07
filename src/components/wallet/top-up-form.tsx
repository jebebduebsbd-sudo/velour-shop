"use client";

import { Banknote, Bitcoin, CreditCard, Ticket } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import {
  startTopUpAction,
  type TopUpFormState,
} from "@/app/(customer)/wallet/actions";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { PublicProviderInfo } from "@/lib/payments/provider";
import { formatMinor } from "@/lib/format";

const PRESETS_MINOR = [1000, 2500, 5000, 10000, 25000];
const initialState: TopUpFormState = { status: "idle" };

const KIND_ICON = {
  card: CreditCard,
  crypto: Bitcoin,
  voucher: Ticket,
} as const;

/** Client-side fee preview mirrors the mock provider's 1.5% for the summary. */
function estimateFeeMinor(amountMinor: number, kind: string): number {
  if (kind === "crypto") return Math.round(amountMinor * 0.01);
  if (kind === "voucher") return Math.round(amountMinor * 0.02);
  return Math.round(amountMinor * 0.015);
}

export function TopUpForm({
  providers,
  currentBalanceMinor,
}: {
  providers: PublicProviderInfo[];
  currentBalanceMinor: number;
}) {
  const [state, formAction, pending] = useActionState(
    startTopUpAction,
    initialState,
  );
  const [amountMinor, setAmountMinor] = useState(5000);
  const [customValue, setCustomValue] = useState("");
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");

  const provider = providers.find((p) => p.id === providerId);
  const feeMinor = useMemo(
    () => estimateFeeMinor(amountMinor, provider?.kind ?? "card"),
    [amountMinor, provider?.kind],
  );

  if (providers.length === 0) {
    return (
      <Panel className="p-8 text-center">
        <p className="text-sm font-semibold text-ink">
          No payment methods are available yet
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Wallet funding activates once a payment provider is configured. Demo
          checkout is available in development.
        </p>
      </Panel>
    );
  }

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <input type="hidden" name="amountMinor" value={amountMinor} />
      <input type="hidden" name="providerId" value={providerId} />

      <div className="space-y-6">
        <Panel className="p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface-2 text-xs text-orchid">
              1
            </span>
            Amount to add
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS_MINOR.map((preset) => {
              const active = amountMinor === preset && customValue === "";
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmountMinor(preset);
                    setCustomValue("");
                  }}
                  className={`h-11 min-w-20 rounded-md border px-4 text-sm font-semibold transition-colors duration-(--duration-base) ${
                    active
                      ? "border-accent/60 bg-accent/15 text-lilac"
                      : "border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {formatMinor(preset, "EUR")}
                </button>
              );
            })}
            <label className="relative">
              <span className="sr-only">Custom amount in euros</span>
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-faint">
                €
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                max={5000}
                step="0.01"
                placeholder="Custom"
                value={customValue}
                onChange={(event) => {
                  setCustomValue(event.target.value);
                  const euros = Number.parseFloat(event.target.value);
                  if (Number.isFinite(euros) && euros > 0) {
                    setAmountMinor(Math.round(euros * 100));
                  }
                }}
                className="h-11 w-32 rounded-md border border-line bg-surface-2 pr-3 pl-7 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
              />
            </label>
          </div>
        </Panel>

        <Panel className="p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface-2 text-xs text-orchid">
              2
            </span>
            Payment method
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            Providers fund your wallet. Product checkout always uses wallet
            balance only.
          </p>
          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Choose a payment method</legend>
            {providers.map((option) => {
              const Icon = KIND_ICON[option.kind];
              const selected = providerId === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors duration-(--duration-base) ${
                    selected
                      ? "border-accent/60 bg-accent/10"
                      : "border-line bg-surface-2 hover:border-line-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="providerChoice"
                    value={option.id}
                    checked={selected}
                    onChange={() => setProviderId(option.id)}
                    className="sr-only"
                  />
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface-3 text-orchid">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {option.displayName}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {option.description}
                    </span>
                  </span>
                  <span className="text-right text-xs text-ink-faint">
                    <span className="block">{option.estimatedArrival}</span>
                    <span className="block">
                      min {formatMinor(option.minimumMinor, "EUR")}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        </Panel>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Panel className="p-6">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
            Order summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Wallet credit" value={formatMinor(amountMinor, "EUR")} />
            <Row
              label="Provider fee"
              value={formatMinor(feeMinor, "EUR")}
              muted
            />
            <div className="flex items-center justify-between border-t border-line pt-3">
              <dt className="font-semibold text-ink">Total charged</dt>
              <dd className="text-lg font-bold text-ink">
                {formatMinor(amountMinor + feeMinor, "EUR")}
              </dd>
            </div>
            <Row
              label="Balance after"
              value={formatMinor(currentBalanceMinor + amountMinor, "EUR")}
              muted
            />
          </dl>

          {state.status === "error" ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {state.message}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-5 w-full"
            disabled={pending || !provider}
          >
            {pending
              ? "Starting…"
              : `Continue with ${provider?.displayName ?? "payment"}`}
          </Button>
          <p className="mt-3 flex items-center gap-1.5 text-center text-xs text-ink-faint">
            <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
            Funds are credited only after the provider confirms payment.
          </p>
        </Panel>
      </aside>
    </form>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-faint">{label}</dt>
      <dd className={muted ? "text-ink-muted" : "text-ink"}>{value}</dd>
    </div>
  );
}

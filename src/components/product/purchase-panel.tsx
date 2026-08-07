import { ShieldCheck, Wallet, Zap } from "lucide-react";
import Link from "next/link";

import { buyProductAction } from "@/app/(public)/product/actions";
import { StockBadge } from "@/components/market/stock-badge";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { deliveryLabel } from "@/lib/delivery";
import { formatMinor, formatCount } from "@/lib/format";

type Viewer =
  | { state: "guest" }
  | { state: "unverified" }
  | { state: "ready"; balanceMinor: number; currency: string };

const ERROR_MESSAGES: Record<string, string> = {
  out_of_stock: "That was the last unit — it just sold out.",
  insufficient_balance: "Your wallet balance is too low. Add funds and retry.",
  email_unverified: "Verify your email address before purchasing.",
  product_unavailable: "This product is no longer available.",
};

/**
 * Purchase box. The purchase button submits a server action that performs the
 * wallet-only checkout; price and balance are always confirmed server-side.
 */
export function PurchasePanel({
  slug,
  priceMinor,
  currency,
  region,
  delivery,
  availableUnits,
  warranty,
  idempotencyKey,
  viewer,
  error,
}: {
  slug: string;
  priceMinor: number;
  currency: string;
  region: string;
  delivery: "INSTANT_CODE" | "MANUAL";
  availableUnits: number;
  warranty: string;
  idempotencyKey: string;
  viewer: Viewer;
  error?: string;
}) {
  const inStock = availableUnits > 0;
  const insufficient =
    viewer.state === "ready" && viewer.balanceMinor < priceMinor;

  return (
    <Panel className="p-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-3xl font-bold text-ink">
          {formatMinor(priceMinor, currency)}
        </span>
        <StockBadge availableUnits={availableUnits} />
      </div>

      <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-ink-faint">Delivery</dt>
          <dd className="flex items-center gap-1.5 text-ink">
            <Zap
              className={`h-3.5 w-3.5 ${inStock ? "text-accent" : "text-ink-faint"}`}
              aria-hidden="true"
            />
            {deliveryLabel({ delivery, availableUnits })}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-faint">Region</dt>
          <dd className="text-ink">{region}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-faint">Stock</dt>
          <dd className="text-ink">
            {inStock ? `${formatCount(availableUnits)} units` : "None available"}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-faint">Payment</dt>
          <dd className="flex items-center gap-1.5 text-ink">
            <Wallet className="h-3.5 w-3.5 text-orchid" aria-hidden="true" />
            Wallet balance only
          </dd>
        </div>
        {viewer.state === "ready" ? (
          <div className="flex items-center justify-between">
            <dt className="text-ink-faint">Your balance</dt>
            <dd className={insufficient ? "text-danger" : "text-success"}>
              {formatMinor(viewer.balanceMinor, viewer.currency)}
            </dd>
          </div>
        ) : null}
      </dl>

      {error && ERROR_MESSAGES[error] ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {ERROR_MESSAGES[error]}
        </p>
      ) : null}

      {!inStock ? (
        <button
          type="button"
          disabled
          className={buttonClasses("secondary", "lg", "mt-6 w-full")}
        >
          Out of stock
        </button>
      ) : viewer.state === "guest" ? (
        <Link
          href={`/auth/sign-in?next=${encodeURIComponent(`/product/${slug}`)}`}
          className={buttonClasses("primary", "lg", "mt-6 w-full")}
        >
          Sign in to purchase
        </Link>
      ) : viewer.state === "unverified" ? (
        <Link
          href="/account/security"
          className={buttonClasses("secondary", "lg", "mt-6 w-full")}
        >
          Verify email to purchase
        </Link>
      ) : insufficient ? (
        <Link
          href="/wallet/top-up"
          className={buttonClasses("primary", "lg", "mt-6 w-full")}
        >
          Add funds to purchase
        </Link>
      ) : (
        <form action={buyProductAction} className="mt-6">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <button
            type="submit"
            className={buttonClasses("primary", "lg", "w-full")}
          >
            Buy for {formatMinor(priceMinor, currency)}
          </button>
        </form>
      )}

      <p className="mt-4 flex items-start gap-1.5 border-t border-line pt-4 text-xs text-ink-faint">
        <ShieldCheck
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success/80"
          aria-hidden="true"
        />
        {warranty}
      </p>
    </Panel>
  );
}

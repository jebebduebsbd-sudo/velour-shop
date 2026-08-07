import type { Metadata } from "next";

import { TopUpForm } from "@/components/wallet/top-up-form";
import { requireSession } from "@/lib/auth/guards";
import { listPublicProviders } from "@/lib/payments/registry";
import { getWalletBalance } from "@/lib/wallet/ledger";

export const metadata: Metadata = {
  title: "Add funds",
  robots: { index: false, follow: false },
};

export default async function TopUpPage() {
  const session = await requireSession("/wallet/top-up");
  const [providers, balance] = await Promise.all([
    Promise.resolve(listPublicProviders("EUR")),
    getWalletBalance(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Wallet
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Add funds</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Top up your Velour wallet. Payment providers fund the wallet only —
          your product purchases are always paid from your balance.
        </p>
      </div>
      <TopUpForm
        providers={providers}
        currentBalanceMinor={balance.spendableMinor}
      />
    </div>
  );
}

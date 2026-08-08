# Velour roadmap

Velour is a marketplace for **lawful, authorized, transferable digital goods**
(gift codes and links, activation keys, prepaid vouchers, gift cards, authorized
subscription vouchers). Work the topmost unchecked item in **Now** first, ship it
as a pull request, and tick it off in that PR. Add newly discovered work to the
bottom of the relevant section.

Items marked **needs a decision / credentials** must not be guessed at — raise the
question (and never accept secrets in chat; they belong in server environment
variables).

## Done

- [x] Design system + storefront (home, market, product, category combobox).
- [x] Authentication: Argon2id, opaque DB sessions, email verify / reset,
      rate limiting, lockout, CSRF/origin checks, CSP/HSTS, audit log.
- [x] Wallet: append-only double-entry ledger; mock payment provider; webhook-only
      crediting; top-ups; transactions + CSV export.
- [x] Wallet-only checkout with atomic reservation (no oversell) and encrypted,
      step-up, masked-by-default delivery.
- [x] Affiliate program (order-gated, non-withdrawable rewards, refund reversal).
- [x] Refunds (compensating ledger entries) and disputes.
- [x] Admin: products/suppliers with compliance gating, policy-checked encrypted
      inventory import, orders/refunds/disputes/users/reviews, providers, audit.
- [x] Order-gated reviews (Verified Vouches).
- [x] Support tickets, saved searches, warranty.
- [x] English / Bulgarian UI localization.
- [x] Trust Center, live status page, real recent-purchase notifications.
- [x] Railway deployment config (`railway.json`, `/api/health`).

## Now

- [ ] **Per-product artwork + OpenGraph images**, stored locally and documented in
      `public/assets/manifest.json`.
- [ ] **Partial refunds** and **admin wallet adjustments** (require a reason and an
      audit event; never mutate balances directly — post ledger entries).
- [ ] **Accessibility + Lighthouse pass**: keyboard focus, contrast, metadata.
- [ ] **CI**: run lint, typecheck, tests, and build on every PR with a Postgres
      service.

## Next

- [ ] **Live payment adapters** behind the existing fail-closed interfaces:
      NOWPayments (public API: invoice + IPN HMAC) and DSK virtual POS.
      **Needs a decision / credentials:** merchant onboarding, the official DSK
      integration spec, and provider secrets (set in env, not chat).
- [ ] **Real email delivery** for verification/reset (currently dev-only links).
      **Needs a decision:** the email provider.
- [ ] **Market filters**: price range, delivery type, sorting, pagination.

## Later

- [ ] Lawful catalog/supplier sync — read-only, filtered to transferable codes,
      rejecting anything credential-shaped. **Needs a decision:** a supplier that
      actually offers such inventory.
- [ ] Cart / multi-item checkout.
- [ ] Professional legal review + Bulgarian legal translation of policy pages.

## Ground rules

- Only lawful, transferable goods. Never account credentials, mailbox access,
  cookies, session tokens, recovery/2FA data, or account-checking tools; the
  schema and the inventory payload policy enforce this.
- Money is integer minor units; every ledger transaction sums to zero; refunds
  are compensating entries, never edits.
- Wallet credit only from a verified server-to-server webhook, never a redirect.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` must pass
  before opening a PR. Never commit secrets.

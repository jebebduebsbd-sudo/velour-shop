# Velour

Premium marketplace for lawful, transferable digital goods — gift codes,
wallet codes, vouchers, and official keys. Built with Next.js 16 (App
Router), TypeScript (strict), Tailwind CSS 4, Prisma 7, and PostgreSQL.

Production domain: `velour.shop`.

## Product boundary (important)

Velour only lists lawful, authorized, transferable digital goods:
activation keys, gift codes, vouchers, officially transferable entitlements,
and documented transferable codes.

Velour never stores, sells, or delivers: account passwords, mailbox
credentials, session cookies, browser profiles, authenticator files,
recovery codes, 2FA secrets, or any stolen / brute-forced / phished /
stealer-derived inventory. Any future supplier integration must live behind
a server-only provider interface, be disabled by default, and fail closed.

## Current status

Storefront, authentication, and the wallet ledger are implemented:

- Velour branding and design-token system (CSS variables + Tailwind 4)
- Shared public shell (header, footer, mobile navigation, wallet chip)
- Homepage: hero, live inventory panel, trust strip, categories, featured
  products — all database-driven with skeleton/empty/error states
- Custom accessible category combobox (searchable, keyboard navigable)
- Market and product pages (initial versions; filters arrive later)
- Buyer Protection policy page rendered from structured content data
- Dedicated sign-in / sign-up / forgot-password / reset-password /
  verify-email pages
- Working authentication: registration, login, logout, email verification,
  password reset, password change, session revocation, account lockout,
  Argon2id hashing, database-backed opaque sessions, secure cookies,
  origin/CSRF checks, rate limiting, immutable audit trail
- Authenticated customer shell with sidebar: dashboard, profile, security
- Security headers via `proxy.ts` (CSP with per-request nonce, HSTS,
  Referrer-Policy, Permissions-Policy, frame-ancestors, cache controls)
- Append-only double-entry wallet ledger (integer minor units, zero-sum
  transactions, balance computed from postings), separate cash / promotional
  / held balances
- Payment provider architecture: `PaymentProvider` interface + mock provider;
  DSK / NOWPayments / OVGC adapters scaffolded but disabled and fail-closed
- Wallet top-up flow with webhook-only crediting (HMAC-verified, replay-safe),
  transactions page with filters/pagination, owner-scoped CSV export
- Wallet-only checkout for authorized codes: atomic single-unit reservation
  (`FOR UPDATE SKIP LOCKED`, no oversell), server-side price/balance checks,
  idempotent one-order-one-debit, order state machine, verified-email gate
- Encrypted delivery: owner-only reveal gated on a fulfilled order + step-up
  password re-auth; deliverable masked by default and never written to logs
- Purchases list + order detail pages; catalog priced in EUR to match the
  wallet
- PostgreSQL schema (accounts, sessions, email tokens, audit events, rate
  limits, catalog, ledger, top-ups, webhook events) with encrypted-at-rest
  demo inventory payloads

Not yet implemented (later phases): refunds and disputes, the affiliate
platform, reviews/vouches (real, order-gated), Fortnite gifting fulfillment,
admin interfaces, Bulgarian localization, and Railway deployment. Some sidebar
entries point to pages that arrive with the corresponding phase.

### Payment providers

Real providers are disabled by default. Each activates only when its feature
flag is set AND its live adapter is configured with merchant credentials
(which arrive through server-side secrets, never source). Until then only the
mock provider (development) is offered, and every real adapter fails closed.

| Provider | Flag | Status |
| --- | --- | --- |
| Mock (demo) | — | Enabled outside production |
| DSK Bank vPOS (card) | `PAYMENT_DSK_ENABLED` | Scaffolded, disabled |
| NOWPayments (crypto) | `PAYMENT_NOWPAYMENTS_ENABLED` | Scaffolded, disabled |
| OVGC (voucher) | `PAYMENT_OVGC_ENABLED` | Scaffolded, disabled |

Wallet credit is created only by a verified server-to-server webhook at
`/api/webhooks/payment/[provider]` — never from a browser redirect or success
page.

### Demo accounts (development seed only)

| Email | Username | Role | State |
| --- | --- | --- | --- |
| `demo@velour.shop` | `demo` | CUSTOMER | verified |
| `unverified@velour.shop` | `newcomer` | CUSTOMER | unverified |
| `admin@velour.shop` | `admin` | ADMIN | verified |

Password for all three: `velour-demo-2026`. These are never created when
`NODE_ENV=production`.

## Requirements

- Node.js >= 20.9 (developed on Node 22)
- PostgreSQL 14+ (developed on PostgreSQL 16)

## Local setup

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Create a database and role (example)
sudo -u postgres psql -c "CREATE ROLE velour LOGIN PASSWORD 'velour_dev' CREATEDB;"
sudo -u postgres createdb -O velour velour

# 3. Configure environment
cp .env.example .env
# set DATABASE_URL, APP_ORIGIN and generate a key:
#   openssl rand -base64 32   -> DELIVERY_MASTER_KEY_B64

# 4. Apply migrations and seed demo data
npm run db:migrate
npm run db:seed

# 5. Run
npm run dev
```

## Environment variables

All variables are server-side; none use `NEXT_PUBLIC_`. Validated at
startup by `src/lib/env.ts` (Zod).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | always | PostgreSQL connection string |
| `APP_ORIGIN` | always | Canonical origin, e.g. `https://velour.shop` |
| `SESSION_SECRET` | production | Derives session/IP hashing keys (min 32 chars) |
| `EMAIL_TOKEN_PEPPER` | production | Pepper for email token hashes (min 16 chars) |
| `DELIVERY_MASTER_KEY_B64` | seeding/delivery | 32-byte base64 key for deliverable encryption (kept outside the DB) |
| `PAYMENT_WEBHOOK_SECRET` | payments | HMAC secret for verifying payment webhooks (min 16 chars) |
| `PAYMENT_DSK_ENABLED` | optional | `true` to enable the DSK card adapter once configured |
| `PAYMENT_NOWPAYMENTS_ENABLED` | optional | `true` to enable the NOWPayments adapter once configured |
| `PAYMENT_OVGC_ENABLED` | optional | `true` to enable the OVGC adapter once configured |

Production startup rejects missing `SESSION_SECRET` or `EMAIL_TOKEN_PEPPER`;
development falls back to clearly-marked local values. Never commit real
values. `.env` is gitignored; `.env.example` documents placeholders only.

`npm run build` does not require runtime secrets — the Prisma client and env
access are lazy, so builds work in CI without production configuration.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest suite |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Seed demo catalog |
| `npm run db:validate` | Validate the Prisma schema |

## Testing

`npm test` runs unit, component, and integration tests (Vitest + Testing
Library). Integration tests need a PostgreSQL database — by default
`velour_test` on the local server:

```bash
sudo -u postgres createdb -O velour velour_test
DATABASE_URL="postgresql://velour:velour_dev@localhost:5432/velour_test" npx prisma migrate deploy
npm test
```

Override the target with `TEST_DATABASE_URL`. Coverage includes: password
hashing (Argon2id/scrypt, salting, no plaintext), token hashing and peppering,
single-use email tokens (including concurrent redemption), password reset
revoking all sessions, account lockout and counter reset, account-enumeration
resistance, origin/CSRF verification, RBAC role hierarchy, audit metadata
sanitization, deliverable encryption fail-closed behavior, delivery-label
policy, Buyer Protection content rules, and category combobox keyboard
interaction.

## Security notes

- Passwords: Argon2id (19 MiB, t=2, p=1) with a documented scrypt fallback
  (N=2^15, r=8, p=1). Hashes are never returned to clients; passwords are
  never logged.
- Sessions: opaque 32-byte tokens, stored only as SHA-256 hashes, delivered in
  httpOnly + SameSite=Lax cookies (Secure in production), rotated on password
  change, revocable individually and in bulk. Nothing sensitive is kept in
  `localStorage`.
- Email tokens are single-use, peppered, expiring, and purpose-scoped.
- Mutating server actions verify request origin, validate with Zod, and are
  rate-limited by hashed client IP; errors are normalized with no stack traces.
- Audit events are append-only and sanitized: any key resembling a password,
  token, key, cookie, or deliverable is dropped before the write.
- Money is integer minor units only; never floating point.
- Inventory deliverables are encrypted at rest (AES-256-GCM, HKDF-derived
  keys); the master key lives in the environment, never the database.
- Payload fingerprints (HMAC) enforce de-duplication without exposing
  plaintext.
- Storefront claims are database-backed: stock counts, "Instant delivery",
  and statistics are computed from real inventory; no fake ratings or
  invented numbers.
- Server env is validated with Zod at startup; client-exposed config would
  require a separate schema (none exists yet).

## Assets

Platform marks are stored locally under `public/assets/platforms/` and
documented in `public/assets/manifest.json` (source, license, acquisition
date, commercial-use status, attribution). Marks come from the CC0-licensed
Simple Icons set, plus two original glyphs drawn for Velour. All other
visuals are original code-drawn SVG/CSS. Nothing is hotlinked.

Regenerate with: `node scripts/generate-platform-marks.mjs`.

## Deployment

Railway deployment (railway.json, health endpoint, migration pre-deploy)
arrives with a later phase alongside the transactional backend.

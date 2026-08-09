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
- Community page (`/community`): the published description, space guide,
  rules, roles, moderation ladder, and anti-impersonation notes, with invite
  links driven by server configuration instead of hardcoded URLs
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

### Demo accounts (optional, development only)

No accounts or passwords are committed to the repository. If you want demo
accounts for local development, opt in explicitly and choose your own password:

```bash
SEED_DEMO_ACCOUNTS=true DEMO_ACCOUNT_PASSWORD=<your-password> npm run db:seed
```

That creates `demo@velour.shop` (CUSTOMER, verified), `unverified@velour.shop`
(CUSTOMER, unverified), and `admin@velour.shop` (ADMIN, verified), all with the
password you provide. They are never created when `NODE_ENV=production`, and the
password is never printed or stored in the repo. Otherwise, register a normal
account through the sign-up flow.

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
| `COMMUNITY_DISCORD_URL` | optional | https invite shown on `/community`; unset means the space is presented as unpublished |
| `COMMUNITY_TELEGRAM_URL` | optional | Same, for the Telegram space |

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

## Deployment (Railway)

The repo ships a `railway.json` that builds with Nixpacks, runs
`npx prisma migrate deploy` as a pre-deploy step, starts with `npm run start`,
and health-checks `/api/health` (which pings the database). Node is pinned to
`>=20.9` via `engines` and `.nvmrc`.

### Steps

1. Create a Railway project and add a **PostgreSQL** database plugin. Railway
   exposes its connection string as `DATABASE_URL`.
2. Add a service from this GitHub repo (branch of your choice). Railway detects
   `railway.json` automatically.
3. Set the service variables (see the table below). At minimum you need
   `DATABASE_URL` (from the DB plugin — reference it as `${{Postgres.DATABASE_URL}}`),
   `APP_ORIGIN`, `SESSION_SECRET`, `EMAIL_TOKEN_PEPPER`, and
   `DELIVERY_MASTER_KEY_B64`.
4. Deploy. The pre-deploy step applies migrations; the release then starts and
   must pass `/api/health` before receiving traffic.
5. (Optional, once) open a Railway shell / one-off command and run
   `npx prisma db seed` if you want the demo catalog. Do **not** seed a real
   production catalog — add real, documented inventory instead.

### Environment variables on Railway

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | From the Postgres plugin: `${{Postgres.DATABASE_URL}}` |
| `APP_ORIGIN` | yes | Public URL of the service, e.g. `https://velour.shop` (used for origin/CSRF checks) |
| `SESSION_SECRET` | yes (prod) | `openssl rand -base64 48` |
| `EMAIL_TOKEN_PEPPER` | yes (prod) | `openssl rand -base64 32` |
| `DELIVERY_MASTER_KEY_B64` | yes | 32-byte base64: `openssl rand -base64 32`. Store as a Railway secret; keep it out of the DB and out of logs |
| `PAYMENT_WEBHOOK_SECRET` | for payments | `openssl rand -base64 24`; verifies provider webhooks |
| `NODE_ENV` | auto | Railway sets `production`; do not override |
| `PORT` | auto | Railway sets this; `next start` respects it |
| `PAYMENT_DSK_ENABLED` | optional | Leave `false` until the DSK adapter is implemented and onboarded |
| `PAYMENT_NOWPAYMENTS_ENABLED` | optional | Leave `false` until NOWPayments is implemented and onboarded |
| `PAYMENT_OVGC_ENABLED` | optional | Leave `false` (voucher funding not enabled) |

In production the app **fails to start** if `SESSION_SECRET` or
`EMAIL_TOKEN_PEPPER` are missing — that is intentional. Never set any of these
with a `NEXT_PUBLIC_` prefix; they are server-only.

### Optional Redis

A background worker / Redis is not required for the current feature set. When
the async-fulfillment and rate-limit-at-scale phases land, add a Railway Redis
plugin and a `REDIS_URL` variable; until then the DB-backed rate limiter is
sufficient.

### Notes

- The build runs `prisma generate` automatically via the `postinstall` script,
  so `npm ci` on Railway produces the client before `next build`.
- `next build` does not need runtime secrets; they are only required at
  runtime, so builds succeed even before you set them (the app still refuses to
  serve requests without the required production secrets).

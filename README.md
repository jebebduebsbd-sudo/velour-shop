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

Phases 1–5 of the build plan are implemented:

- Velour branding and design-token system (CSS variables + Tailwind 4)
- Shared public shell (header, footer, mobile navigation, wallet chip)
- Homepage: hero, live inventory panel, trust strip, categories, featured
  products — all database-driven with skeleton/empty/error states
- Custom accessible category combobox (searchable, keyboard navigable)
- Market and product pages (initial versions; filters arrive later)
- Buyer Protection policy page rendered from structured content data
- Dedicated sign-in / sign-up / forgot-password pages with validated
  server actions (session creation ships with the authentication phase)
- PostgreSQL catalog schema (Category, Product, InventoryUnit) with
  encrypted-at-rest demo inventory payloads

Not yet implemented (later phases): authentication/sessions, wallet ledger,
top-ups, checkout, orders, refunds/disputes, admin, Railway deployment.

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

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_ORIGIN` | Canonical origin, e.g. `https://velour.shop` |
| `DELIVERY_MASTER_KEY_B64` | 32-byte base64 master key for deliverable encryption (kept outside the DB) |

Never commit real values. `.env` is gitignored; `.env.example` documents
placeholders only.

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

`npm test` runs unit and component tests (Vitest + Testing Library):
deliverable encryption round-trips and fail-closed behavior, delivery-label
policy ("Instant delivery" never shown without stock), Buyer Protection
content completeness and banned-promise checks, category combobox keyboard
interaction, dedicated auth page rendering, server-action validation, and
environment validation.

## Security notes

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

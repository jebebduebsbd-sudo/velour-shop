# Velour roadmap

An ordered backlog. Work the topmost unchecked item in **Now** first, ship it as a
pull request, and tick it off in that same PR. Add newly discovered work to the
bottom of the right section rather than reordering what's already here.

Items marked **needs a decision** must not be guessed at — open the PR with the
question instead of inventing an answer.

## Now

- [ ] **Resale markup.** Cards currently show Salta7's own prices, so the shop
      sells at cost. Add a configurable markup (env var, applied in one place in
      `src/lib/salta7.ts`) and show the customer-facing price everywhere.
      **Needs a decision:** the multiplier, and whether it varies per product.
- [ ] **Product detail page** at `/p/[slug]`, linked from each card: full
      description, warranty, format, live stock, and the buy call-to-action.
      Note `params` is a Promise in Next 16 and must be awaited.
- [ ] **Loading and error states.** Add `loading.tsx` (skeleton cards) and
      `error.tsx` for the storefront so a slow or failing upstream degrades
      visibly rather than hanging on a blank page.
- [ ] **Brand basics.** Favicon, OpenGraph image, and per-page metadata.

## Next

- [ ] **Database layer.** `prisma/schema.prisma` plus a Postgres datasource for
      the Railway instance, replacing the SQLite adapter currently in
      `package.json`. `prisma.config.ts` already points at `prisma/schema.prisma`
      and `prisma/seed.ts`, so Prisma commands fail until both exist.
      **Needs a decision:** the `DATABASE_URL` for Velour's own database.
- [ ] **Order records.** An `Order` model written when a purchase completes, so
      delivered items can be re-shown to the customer later.
- [ ] **Checkout.** `POST /buy` with `SALTA7_API_TOKEN`, always passing a unique
      `client_tx_id` so a retry can never double-charge. Handle the documented
      failures explicitly: 403 insufficient balance, 409 not enough stock, 429
      rate limited.
- [ ] **Customer accounts.** Sign-up and sign-in (`bcryptjs` is already a
      dependency). Sessions must be server-side only.

## Later

- [ ] Search and category filtering once the catalog outgrows one screen.
- [ ] Cart for buying several products in one go.
- [ ] Order history page reading from the `Order` model.
- [ ] Accessibility and Lighthouse pass: keyboard focus, contrast, metadata.
- [ ] Tests around the Salta7 client, especially the degraded paths (upstream
      down, non-numeric stock, admin-only products excluded).

## Ground rules

- The storefront must keep rendering when the Salta7 API is unreachable. That
  upstream goes into maintenance, and `fetchCatalog` deliberately never throws.
- `npm run build` and `npx tsc --noEmit` must both pass before opening a PR.
- Never commit secrets. `SALTA7_API_TOKEN` and `DATABASE_URL` belong in the host's
  environment variables; `.env.example` documents them without values.
- Products flagged `admin_only` by the API stay off the public storefront.

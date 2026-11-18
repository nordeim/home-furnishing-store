# Implementation Plan — NORDHEM Singapore (IKEA-SG functional superset)

## Stack Decision Record
- Next.js 16 App Router + React 19 + TypeScript strict + Tailwind v4 CSS-first `@theme`
  (literal hex tokens; no `tailwind.config.js`, no `var()` chains) — per
  `web-application-engineering` §§2–3 and `e-commerce-nextjs16-monorepo` §4.
- Drizzle ORM + PostgreSQL (project `db` client reused); idempotent `ensureSeed()` on first
  read so the storefront degrades to a static catalogue fallback if Postgres is unreachable
  ("Degrade, Never Fail").
- Client state: one React-context store (cart + wishlist + promo, localStorage persisted) —
  same "ONE store" rule as the Zustand guidance, without adding a dependency.
- Money: integer cents everywhere; totals re-derived server-side in `placeOrder`
  (never trust client totals). GST 9% back-calc for display.
- API envelope `{ ok:true,data } | { ok:false,error:{code,message} }` on all routes.
- Validation at every write boundary (email/postal/phone regex, rating 1–5, qty clamps);
  in-process fixed-window rate limit on checkout.

## Deviations Ledger
- Prisma → Drizzle (project template ships Drizzle + `DATABASE_URL`; migrating would add
  risk with zero behavioural gain).
- Zustand → React context singleton (avoids a new dependency; same replace-contract semantics).
- Auth.js/Better-Auth → none: Family/Business flows are demo-grade (no passwords stored);
  documented as deferred, not silently omitted.
- Stripe → mock payment methods (card/PayNow/GrabPay/Atome selectors, no charge);
  flagged in UI ("Demo — no charge").

## Acceptance criteria
- [x] All routes render + build green; `/api/health` 200.
- [x] Shop filters/sort/search work against `/api/products`.
- [x] PDP shows stock per store, reviews (read+write), related items.
- [x] Bag → promo → checkout → order number → tracking round-trip persists in Postgres.
- [x] Inspiration rooms link to live PDPs; offers/calculators/quote/booking interactive.
- [x] a11y: skip link, labels, focus rings, radiogroups, live regions; responsive ≤360px.
- [ ] Auth + real payments explicitly deferred (see above).

## Verification ledger
- `npx next typegen`, `tsc --noEmit`, `npm run build`, `build_and_start` — rerun after
  every schema/code change; logs in /tmp/*.log.
- `npx drizzle-kit push` applies `src/db/schema.ts` (10 tables).
- Manual smoke: /, /shop, /product/solbakken-3-seat-sofa, /cart, /checkout,
  /track-order, /inspiration, /offers + API GET /api/products.

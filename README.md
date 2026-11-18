# NORDHEM Singapore — Furniture & Home Furnishing Store

![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black)
![React](https://img.shields.io/badge/React-19.2.6-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.17-38bdf8)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45.2-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-required-336791)
![GST](https://img.shields.io/badge/GST-9%25_inclusive-ffdb00)

A Singapore-market furniture & home-furnishing e-commerce storefront — an
original-code **functional superset of the public IKEA Singapore site's
information architecture** (public-route observation only: no credentials, no
asset copying, invented product names, Pexels-licensed imagery). Built as a
single Next.js 16 app that **degrades, never fails**: the storefront renders from
a static catalogue even when PostgreSQL is unreachable.

## Overview

The problem: a demo-grade but production-shaped storefront that exercises the
full e-commerce loop — browse → filter/search → product detail with store stock
→ bag → promo → checkout → order number → tracking — plus the surrounding
surfaces a furniture retailer needs (inspiration rooms, offers, services,
stores, Family/Business programmes, food, sustainability, planning tools).

The approach: Next.js 16 App Router with React 19 and TypeScript strict on the
front; Drizzle ORM over PostgreSQL on the back with an idempotent first-read
seed and static fallbacks; one React-context client store (cart/wishlist/promo)
persisted to localStorage; integer-cents money with server-side re-derivation
at checkout; mock payment methods (card/PayNow/GrabPay/Atome — "Demo, no
charge") with real authentication explicitly deferred.

## Key Features

| Feature | What it does |
|---|---|
| 🛋️ **Catalogue** | 24 original products (SOLBAKKEN, MAKAN, HAVBRIS…) across 8 room categories with badges, ratings, compare-at pricing |
| 🔍 **Shop** | Category tabs, keyword filter, max-price slider, 6 sort orders via `/api/products` |
| 📦 **Product pages** | Gallery, materials/dimensions, per-store stock with aisle/bin locations, reviews (read + write), related items |
| 🛒 **Bag & wishlist** | One React-context store, localStorage-persisted, quantity steppers (1–99) |
| 🎟️ **Promo codes** | `WELCOME10` / `MAKAN15` / `FLAT20` with minimum-spend rules, validated server-side |
| 💳 **3-step checkout** | Contact → delivery (standard/express/click-&-collect) → payment; 9% GST-inclusive pricing with back-calculated display; order numbers `NH-YYYYMMDD-XXXXXX` |
| 🚚 **Order tracking** | Order number + email lookup with timeline |
| 🏠 **Inspiration rooms** | 6 shoppable room stories (BTO, makan nights, WFH corner…) linking to live PDPs |
| 🧮 **Interactive tools** | Family points calculator, Business instant quote, buy-back estimator, room explorer + booking |
| 🌱 **Full retail surface** | Offers, services, 3 stores, food, sustainability, help, search, wishlist |
| ♿ **Accessibility** | Skip link, labels, focus rings, radiogroups/tablists, live regions, responsive to 360px |
| 🛡️ **Degrade, never fail** | Static-catalogue fallback on every DB read; `/api/health` reports DB status |

## Architecture

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Web framework | Next.js (App Router) | 16.4.2 | Pages, route handlers, SSR/metadata |
| UI runtime | React | 19.2.6 | Server + client components |
| Language | TypeScript (strict) | 5.9.3 | Type safety, `@/*` path alias |
| Styling | Tailwind CSS (CSS-first `@theme`) | 4.1.17 | Literal-hex tokens, no config file |
| ORM | Drizzle ORM | 0.45.2 | Schema in `src/db/schema.ts` |
| Database | PostgreSQL (node-postgres) | pg 8.20.0 | 11 tables, pooled client |
| Lint | ESLint (flat config) | 9.39.4 | `eslint-config-next/core-web-vitals` |
| Imagery | Pexels CDN | — | Licensed, attributed in code comments |

```mermaid
flowchart TB
    B[Browser] -->|pages| NEXT[Next.js 16 App Router]
    B -->|/api/*| NEXT
    NEXT --> SD[server-data.ts<br/>ensureSeed + fallbacks]
    SD -->|Drizzle ORM| PG[(PostgreSQL)]
    SD -->|catch → static fallback| CAT[catalog.ts<br/>24 products / 8 categories]
    NEXT --> CS[cart-store.tsx<br/>React Context + localStorage]
    B -.->|img| PEX[Pexels CDN]
```

**Governing decisions** (full record in `docs/implementation-plan.md` and the
PAD): Drizzle over Prisma (the template already shipped it), one context store
over Zustand (no new dependency), no auth / mock payments (demo-grade,
documented deferrals), integer-cents money with server re-derivation, the
`{ ok, data | error }` API envelope on every route, and a Tailwind v4
candidate-scan guard in `globals.css` (prose files quote class names — see
Troubleshooting).

## File Hierarchy

```
📂 home-furnishing-store/
├── 📂 src/app/               # 20 page routes + 6 API route handlers
│   ├── 📄 page.tsx           # Home: hero, rooms, bestsellers, deals, brand
│   ├── 📂 shop/ product/[slug]/ cart/ checkout/ track-order/ order/[number]/
│   ├── 📂 inspiration/[slug]/ offers/ services/ stores/ family/
│   ├── 📂 business/ food/ sustainability/ planning-tools/ search/ wishlist/ help/
│   ├── 📂 api/               # products, promotions/validate, checkout, orders/track, reviews, health
│   ├── 📄 globals.css        # Tailwind v4 @theme tokens + scan guard + utilities
│   └── 📄 layout.tsx · robots.ts · sitemap.ts
├── 📂 src/components/        # Header, Footer, ProductCard, BuyBox, ReviewSection
├── 📂 src/lib/               # server-data (DB+fallbacks), catalog (static seed), cart-store, utils
├── 📂 src/db/                # schema.ts (11 tables) + index.ts (pooled Drizzle client)
├── 📂 docs/                  # implementation-plan, reference-investigation, SSH push runbook, archives
├── 📂 skills/                # vendored agent skills (excluded from gates)
├── 📂 tests/                 # ⚠️ inherited from predecessor repo — not runnable here (see Testing)
├── 📄 AGENTS.md · CLAUDE.md · Project_Architecture_Document.md
├── 📄 drizzle.config.json · playwright.config.ts · vitest.config.ts
└── 📄 worklog.md             # session-by-session working history
```

## Quick Start

Requires **Node.js ≥ 20** and a PostgreSQL database (or skip the DB — the
storefront runs on the static fallback).

1. **Clone & install**

   ```bash
   git clone https://github.com/nordeim/home-furnishing-store.git
   cd home-furnishing-store
   npm install
   ```

2. **Configure the database** (the only variable the app reads)

   ```bash
   cp .env.example .env
   # edit .env → DATABASE_URL="postgresql://user:pass@host:5432/db"
   ```

3. **Create the tables** (schema push; seeding happens automatically on first read)

   ```bash
   npx drizzle-kit push
   ```

4. **Run**

   ```bash
   npm run dev        # development → http://localhost:3000
   # or production:
   npm run build && npm run start
   ```

**Verify setup**

- `curl http://localhost:3000/api/products` → `{"ok":true,"data":[…24 products…]}`
- `curl http://localhost:3000/api/health` → `{"ok":true}` with a live DB (500 without — expected on the static fallback)
- Browse `/shop`, add to bag from a product page, apply `WELCOME10` at `/checkout`
  with a $150+ subtotal, place the demo order, then track it at `/track-order`
  with the order number + the email you entered (full persistence requires the DB).

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. `src/db/index.ts` throws at module load without it. `drizzle.config.json` separately pins `postgresql://postgres:postgres@127.0.0.1:5432/app_db` for `drizzle-kit push` — update both when your DB moves. |

That is the complete list. There is no `AUTH_SECRET` (auth deferred), no payment
keys (mock methods only), and `NEXT_PUBLIC_SITE_URL` is not read by this
codebase (canonical origin `https://nordhem.sg` is set in `layout.tsx`).

## Testing

There is currently **no runnable test suite for this codebase** — the `tests/`
tree (73 unit + 15 e2e files) and its configs were inherited from the
predecessor `ely-beauty` project, import packages that are not installed
(`vitest`, `@playwright/test`) and ~40 modules that do not exist in this `src/`.
Re-pinning the suite is the top open remediation item (PAD §11).

Until then, the verification gate (run before every commit):

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck   # app scope: src/** + next.config.ts — currently clean
npm run lint        # 7 known react-hooks/set-state-in-effect errors (documented debt)
```

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/products` | GET | public | Filter (`q`, `cat`, `max`) and sort (`featured`, `popular`, `price-asc/desc`, `rating`, `new`) the catalogue |
| `/api/promotions/validate` | POST | public | `{ code, subtotalCents }` → promo or `INVALID_PROMO` with min-spend message |
| `/api/checkout` | POST | public | ⚠️ Places an order (demo, no charge). Validates email/phone/postal/address, rate-limits 20/min/IP, **re-derives all money server-side** |
| `/api/orders/track` | POST | public | `{ orderNumber, email }` → order + items (email must match) |
| `/api/reviews` | GET/POST | public | List by `productId` / publish a review (rating 1–5, name ≥ 2 chars) |
| `/api/health` | GET | public | `{ ok: true }` iff the database answers `select 1` |

All responses use the envelope `{ ok: true, data } | { ok: false, error: { code, message } }`.

## Design System

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-brand` | `#0058a3` | Primary blue — buttons, links, logo block |
| `--color-brand-dark` | `#004382` | Hover state |
| `--color-accent` | `#ffdb00` | Yellow — CTAs, badges, selection, focus rings |
| `--color-paper` / `--color-cream` | `#f7f5f0` / `#faf8f4` | Warm neutrals — section backgrounds |
| `--color-ink` / `--color-muted` | `#111111` / `#5b5b5b` | Text primary / secondary |
| `--color-line` | `#e5e1d8` | Hairline borders |
| `--color-moss` / `--color-clay` | `#2e6b34` / `#b5502a` | In-stock green / low-stock amber |

**Typography**: `"Arial Black"` stack for display weights (the IKEA-style bold
look), `"Helvetica Neue"`/system for body. **Motion**: one `reveal-up` entrance
animation (0.7s cubic-bezier), `prefers-reduced-motion` respected.

## Local Context (Singapore)

- **Currency**: SGD via `Intl.NumberFormat("en-SG")`; all money stored as integer cents.
- **GST**: 9%, included in listed prices; the checkout back-calculates the GST
  component for the receipt line.
- **Addresses**: 6-digit postal codes; phone `+65` formats; delivery pricing in
  SGD ($12 standard, free ≥ $200, $29 express, free Click & Collect).
- **Payments**: card / PayNow / GrabPay / Atome selectors — all demo (no charge,
  no SDKs). Real payments are a documented deferral.
- **Stores**: Tampines, Jurong, Alexandra (fictional addresses/phones under the
  NORDHEM brand).

## Project Status

| Phase | Status | Notes |
|-------|--------|-------|
| Reference investigation (IKEA SG, public routes) | ✅ Done | `docs/reference-investigation.md` |
| Implementation plan + decision record | ✅ Done | `docs/implementation-plan.md` |
| Storefront build (20 routes, 6 APIs, 11 tables) | ✅ Done | built from the `ely-beauty` template lineage |
| Build/typecheck gate | ✅ Green (this run fixed the clean-build breaker) | scan guard restored in `globals.css` |
| Lint gate | 🟡 7 known errors (one rule family) | remediation plan in PAD §11 |
| Test suite | 🔴 Inherited, not runnable | re-pin or retire — top open item |
| Auth + real payments | ⏸️ Deferred by decision | documented in the plan's deviations ledger |

Latest cycle (2026-11-18): docs-validation audit of the plan/investigation
against the codebase, clean-build blocker fixed, AGENTS/CLAUDE/README/PAD
regenerated — details in `worklog.md`.

## Troubleshooting

| Symptom | Cause → Fix |
|---------|-------------|
| Build fails: `Missed semicolon` in `globals.css` | Tailwind v4's candidate scan read a class-like string from a **prose file** (the classic colon-form `md:aspect-[3:1]`). The `@source not` guard at the top of `globals.css` prevents it — don't remove it, and never write colon-form aspect values. Always test builds cold (`rm -rf .next`): a warm cache can mask it. |
| `Error: DATABASE_URL is required` at startup | `src/db/index.ts` throws without it. Set any Postgres URL in `.env` (even unreachable — the storefront falls back to the static catalogue; writes need a live DB). |
| `/api/health` returns 500 | The database is unreachable — expected on the static fallback; bring Postgres up and re-check. |
| Checkout returns 500 `CHECKOUT_FAILED` | Almost certainly the DB (write path has no fallback). Verify `DATABASE_URL`, `drizzle-kit push`, and that first-read seeding has run. |
| `tsc` errors under `tests/` or `scripts/` | Those trees belong to the predecessor repo. `npm run typecheck` is scoped to the app; don't widen the include without re-pinning the suite. |
| Push rejected by wrapper: default remote wrong | The wrapper's built-in default still points at `nordeim/ely-beauty`. Always pass `--remote git@github.com:nordeim/home-furnishing-store.git` (runbook: `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`). |

## Contributing

Working conventions for agents and humans (full detail in `AGENTS.md` /
`CLAUDE.md`):

- **main only**, Conventional Commits, atomic changes; push through the SSH
  wrapper with an operator-supplied key that never enters the repo.
- Gate before every push: cold build + typecheck + lint; never weaken a rule to
  pass one.
- React 19 / Tailwind v4 specifics: no `forwardRef` needed; CSS-first tokens in
  `@theme` (no `tailwind.config.js`); slash-form arbitrary values only.
- `skills/` is vendored reference material — excluded from checking, testing,
  and compilation.
- Update `worklog.md` and the live docs in the same commit as behavior changes.

## License

No license file is present in this repository; the code is unpublished
proprietary work of the repo owner. Do not add a license without the owner's
decision.

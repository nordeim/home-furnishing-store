---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
project_type: nextjs
framework_version: "16.4.2 (App Router)"
last_updated: 2026-11-18 (Task 114: test harness, lint debt, a11y, SEO, PII)
---

# NORDHEM Singapore (home-furnishing-store)

## Core Identity & Purpose

NORDHEM is a Singapore-market furniture & home-furnishing e-commerce storefront: 24
products across 8 room categories, 3 physical stores (Tampines/Jurong/Alexandra),
shoppable inspiration rooms, promo codes, a 3-step checkout with order tracking, and
Family/Business/Food/Sustainability/Planning-tools surfaces. It is an original-code,
IA-level functional superset of the public IKEA Singapore site (public-route
observation only; no asset copying, no credentials — see
`docs/reference-investigation.md`). Maintained by a single operator (`nordeim`)
working with AI coding agents; the working history lives in `worklog.md` and the
engineering reference in `Project_Architecture_Document.md`.

**Tech stack**: Next.js 16 App Router · React 19 · TypeScript 5.9 (strict) ·
Tailwind CSS 4.1 (CSS-first `@theme`, no config file) · Drizzle ORM 0.45 ·
PostgreSQL (node-postgres) · ESLint 9 flat config.

## Foundational Principles

### Meticulous Approach (Six-Phase Workflow)

1. **ANALYZE** — read the relevant files, schema, configs and docs in full; prefer
   executable truth over prose; reproduce failures before diagnosing them.
2. **PLAN** — smallest correct, sequential, verifiable plan; name files, tests and
   verification evidence; state assumptions when proceeding without confirmation.
3. **VALIDATE** — check the plan against the codebase, lockfile, schema and gates
   before executing.
4. **IMPLEMENT** — small, typed, test-backed increments; keep lint/type/build gates
   green without weakening guardrails.
5. **VERIFY** — run the full gate chain (`build` cold, `typecheck`, `lint`) plus a
   runtime smoke of touched routes; capture executed evidence.
6. **DELIVER** — atomic Conventional Commit to `main`, docs updated in lockstep,
   hand off with what was Verified / Reasoned / Assumed.

### Project-Specific Principles

- **Degrade, Never Fail** — every DB read has a static-catalogue fallback; pages
  must render with Postgres down; only writes require the DB.
- **Server-truth money** — integer cents everywhere; totals re-derived in
  `placeOrder()`, never trusted from the client; GST-inclusive pricing with 9%
  back-calc for display.
- **No premature dependencies** — one React-context store instead of Zustand;
  plain `<img>` + Pexels CDN instead of an image pipeline; mock payments instead
  of Stripe (auth + real payments are documented deferrals, not omissions).
- **Original content only** — invented product names/copy (SOLBAKKEN, MAKAN,
  HAVBRIS…), licensed Pexels imagery, no IKEA assets or trademarks in the clone.

## Implementation Standards

### Next.js 16 / React 19

- App Router only (`src/app/`); server components by default, `"use client"` for
  interactivity. All data-driven pages use `export const dynamic = "force-dynamic"`.
- Route handlers under `src/app/api/*/route.ts` return the envelope
  `{ ok: true, data } | { ok: false, error: { code, message } }` — always.
- `generateMetadata` on dynamic product pages; `metadataBase` fixed at
  `https://nordhem.sg` (layout.tsx, robots.ts, sitemap.ts).
- Client state: cart/wishlist/promo live in `src/lib/local-store.ts` external
  stores consumed via `useSyncExternalStore` (`src/lib/cart-store.tsx`) —
  localStorage hydration without effect-setState (the React Compiler-era rule).
  Params-derived page state uses adjust-during-render (`shop/`, `search/`).
  See the known-gotcha list in AGENTS.md before refactoring this seam.

### TypeScript Strict Mode

- `strict: true`; no `any` (use `unknown` + narrowing); early returns; small pure
  helpers in `src/lib/utils.ts` (`formatSGD`, `priceTotals`, `clampInt`,
  `isValidEmail/Phone/Postal`, `stars`, `cn`).
- Path alias `@/*` → `./src/*`. `npm run typecheck` covers the app scope
  (`src/**`, `next.config.ts`) only — the inherited `tests/`/`scripts/` are from
  the predecessor repo and are not part of the app compile.

### Tailwind CSS v4 (CSS-first)

- **No `tailwind.config.js`.** Tokens are literal hex in the `@theme` block of
  `src/app/globals.css` (`--color-brand`, `--color-accent`, `--color-paper`, …).
- Arbitrary values in JSX by convention: `bg-[#f5f3ee]`, `text-[15px]`,
  `aspect-[16/9]` (slash form — **never** the colon form; the candidate-scan guard
  in globals.css exists because of it).
- `focus-ring`, `reveal-up`, `no-scrollbar` are hand-rolled utility classes in
  globals.css, not plugins.

### Component Conventions

- Five shared components in `src/components/` (`Header`, `Footer`, `ProductCard`,
  `BuyBox`, `ReviewSection`); pages compose them — no component library (Shadcn/
  Radix/MUI) is installed; match the existing hand-rolled style.
- Accessibility is a feature, not a garnish: skip link, `aria-label`s, `role=`
  `"tablist"/"radiogroup"`, `aria-live` regions, visible focus rings, Escape-close
  on the mobile drawer, responsive down to 360px.
- SEO surfaces are code: `robots.ts` disallows utility/personal routes, the
  sitemap lists indexable routes only (never both), PDPs carry canonical +
  OpenGraph + `schema.org/Product` JSON-LD, and `<html>` carries
  ˋdata-scroll-behavior="smooth"ˋ (the CSS pairs with it in globals.css).

## Development Workflow

### Environment Setup

```bash
git clone https://github.com/nordeim/home-furnishing-store.git
cd home-furnishing-store
npm install
cp .env.example .env          # set DATABASE_URL to your Postgres
npx drizzle-kit push          # create the 11 tables (seed happens on first read)
npm run dev                   # http://localhost:3000
```

No Postgres handy? `npm run dev` still renders the full storefront from the static
catalogue (`src/lib/catalog.ts`); the DB-backed paths (checkout, reviews POST,
order tracking) will fail until `DATABASE_URL` points at a live database.

### Build Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build (needs `DATABASE_URL` in env; test cold with `rm -rf .next`) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`skills/` ignored by operator contract) — 0 errors expected |
| `npm run typecheck` | App-scope TypeScript check (`typecheck:tests` covers the test tree) |
| `npm run test` | Vitest unit suite (50 tests, pure seams) |
| `npm run test:e2e` | Playwright e2e (23 tests, production build on :3100) |
| `npx drizzle-kit push` | Apply `src/db/schema.ts` to the database |

## Testing Strategy

**Current state (Task 117):** a NORDHEM-native suite is wired into the gates.

- **Unit (Vitest, 50 tests)** at the pure seams — `src/lib/utils.ts` money math,
  validators, `familyVoucherCents` and `visibleBadges` (Task 117), `src/lib/catalog.ts`
  invariants + `findPromo`, the `local-store.ts` external-store contract,
  `maskEmail`, and the `robots.ts` / `sitemap.ts` SEO policy. Node environment
  with a localStorage shim (`tests/unit/setup.ts`); no jsdom, no component
  rendering.
- **E2E (Playwright, 23 tests)** against the **production build** (the webServer
  builds and boots `:3100` with a pinned `DATABASE_URL`): a mobile-navigation
  project (390×844 — drawer open/Escape/toggle/navigate/auto-close, hamburger
  hidden ≥1024) and a desktop project (home, shop filters, PDP SEO + JSON-LD,
  robots/sitemap endpoints, API envelope + boundary validation (invalid
  productId → 422, malformed body → 400), fetch-failure resilience for
  wishlist/search, and the full bag → promo → checkout → masked confirmation →
  tracking journey against live Postgres).
- The predecessor's 73-unit/15-e2e dead tree (ely-beauty imports) was retired;
  `tsconfig.tests.json` + `typecheck:tests` now cover the NORDHEM test tree.

TDD is the default for logic changes: red → green → refactor, one seam at a
time (`skills/tdd`). Bug fixes require a regression test that fails before the
fix and passes after.

## Code Quality Standards

- Gate order: lint → typecheck (+ `typecheck:tests`) → unit → cold build → e2e
  → runtime smoke. Never weaken a rule, skip a check, or delete a test to make
  a gate pass.
- Lint is **0 errors / 0 warnings** — the former 7-error
  `react-hooks/set-state-in-effect` debt was fixed in Task 114 via
  `useSyncExternalStore` external stores + adjust-during-render (never by
  suppression). Do not reintroduce effect-body setState.
- Comments explain *why* (the degrade-fallbacks and the scan guard carry
  rationale comments); no commented-out code, no placeholder values.

## Git & Version Control

- **`main` branch only** — no feature branches (operator contract).
- Conventional Commits, atomic units (`fix:`, `feat:`, `docs:` — history uses
  plain and Conventional styles; prefer Conventional).
- Push via the SSH wrapper (never commit keys):
  `python3 docs/ssh_git_wrapper_v3.py --key-file /secure/key
  --remote git@github.com:nordeim/home-furnishing-store.git` — the `--remote`
  override is mandatory (the script's default still points at the old
  `ely-beauty` repo). Runbook: `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`.

## Error Handling & Debugging

- API routes catch, log (`console.error("[api/…]", err)`) and return the error
  envelope with a 4xx/5xx status — no silent swallows; validation failures are
  422 with field-specific copy.
- `ensureSeed()` failures log `[seed] failed` and reset the seed promise (retry on
  next request); read fallbacks log nothing by design (degrade is normal
  operation, not an error).
- Debugging a "Missed semicolon" build failure in `globals.css`: it is almost
  always the Tailwind candidate scan picking up a class-like string from prose —
  see the scan guard at the top of `globals.css` and AGENTS.md gotcha #1.
- "App connects to the wrong DB / health 500 with the DB up": an exported shell
  `DATABASE_URL` overrides `.env` (dotenv never overrides). Check
  `env | grep DATABASE` and pin the value per command.

## Communication & Documentation

- Update `README.md` (product view), `Project_Architecture_Document.md`
  (engineering reference) and `worklog.md` (append a dated task entry) in the same
  commit as behavior changes; keep claims live-tense and verified (label
  Verified / Reasoned / Assumed).
- `docs/implementation-plan.md` is the build's decision record (deviations ledger
  included); `docs/reference-investigation.md` is the reference-site evidence
  dossier — both are historical records, correct forward in the live docs rather
  than editing history.

## Project-Specific Standards

### Architecture

Three-layer single Next.js app: `src/app` (routes/pages + API handlers) →
`src/lib` (data access `server-data.ts`, static catalogue `catalog.ts`, client
store `cart-store.tsx`, pure helpers `utils.ts`) → `src/db` (Drizzle schema +
pooled client). No services, no workers, no external APIs (imagery is Pexels CDN).

### API Design

| Route | Method | Notes |
|-------|--------|-------|
| `/api/products` | GET | `?q&cat&sort&max` filter/sort/search |
| `/api/promotions/validate` | POST | `{ code, subtotalCents }` |
| `/api/checkout` | POST | validated, rate-limited, server re-prices |
| `/api/orders/track` | POST | order number + email match |
| `/api/reviews` | GET/POST | by `productId`; rating 1–5 |
| `/api/health` | GET | `{ ok: true }` iff DB reachable |

### Database / Data Layer

Drizzle ORM over `node-postgres`; 11 tables (`categories`, `products`, `stores`,
`inventory`, `carts`, `cart_items`, `orders`, `order_items`, `reviews`,
`inspirations`, `promotions`); types exported as `typeof table.$inferSelect`.
`drizzle.config.json` pins the local dev URL
(`postgresql://postgres:postgres@127.0.0.1:5432/app_db`) — update it when your
database moves. Idempotent seed on first read (`ensureSeed()`); `onConflictDoNothing`
throughout.

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Postgres connection string — the only variable the code reads; module-load throws without it |

## Anti-Patterns to Avoid

- Colon-form arbitrary aspect values (`aspect-[3:1]`) anywhere in the repo —
  breaks the clean build via the candidate scan (use slash form).
- Trusting client-sent totals at checkout; floating-point money; `Intl`-formatted
  strings round-tripped as data.
- Adding state libraries, auth, or payment SDKs without an explicit decision
  record — the current deferrals are documented contracts.
- Editing files under `skills/` (vendored reference, excluded from all gates) or
  treating the inherited `tests/` as runnable.
- Pushing without the cold-build gate, or with a key anywhere inside the repo.

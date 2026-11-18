# Task 114 Remediation Plan — Test Harness Re-Pin, Lint Debt, A11y, SEO & PII

Date: 2026-11-18 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: audit per `skills/web-application/SKILL.md` (§14–§16), mobile-nav per
`skills/nextjs16-tailwind4/SKILL.md` §9 taxonomy (agent-browser at 390×844 + 1280×800),
execution per `skills/tdd/SKILL.md` (red → green, one seam at a time).
`skills/` folder excluded from checking, testing and compilation (operator contract).

## 1. Audit baseline (all Verified this run, live PostgreSQL 17.12 on 127.0.0.1:5432)

| Gate | Result |
|---|---|
| Cold `npm run build` | GREEN — 30 routes |
| `npm run typecheck` (app scope) | GREEN |
| `npm run lint` | 7 errors, one rule family (`react-hooks/set-state-in-effect`) |
| Route smoke (19 pages + 404) | All 200 / 404 as expected |
| `/api/health` | `{"ok":true}` with live DB |
| Checkout round-trip in Postgres | VERIFIED — `NH-20261118-2NRWZD`, subtotal 259800, WELCOME10 −25980, free delivery, GST 19306, total 233820; tracking 200 on email match, 404 on mismatch |
| Seed (first read) | 24 products / 8 categories / 72 inventory / 5 reviews / 3 promos / 6 inspirations / 3 stores |
| Mobile menu (agent-browser 390×844) | Opens (aria-expanded swaps), lists Shop-all + 8 categories + 5 utility links, navigates, auto-closes on route change, toggles; **Escape does not close it** |
| Desktop header (1280×800) | Category nav + store picker + utility links correct; no hamburger |
| Tailwind v4 scan guard | Present at `src/app/globals.css` top — the known v4 build-breaker is contained; cold build proves it |

Environment note (not a code bug): the sandbox parent shell exports
`DATABASE_URL=file:/home/z/my-project/db/custom.db` (predecessor-lineage shadow).
Shell env beats `.env` (dotenv never overrides), so every server/e2e invocation this
run pins `DATABASE_URL` explicitly. Documented in README troubleshooting.

## 2. Findings → ToDo (ordered by severity; each item names its evidence)

### F-1 HIGH — Test harness absent; inherited suites dead (top open item, PAD §10)
Evidence: `tests/unit/**` (73 files) and `tests/e2e/**` (15 specs) import `vitest` /
`@playwright/test` (not in package.json) and ~40 modules that do not exist in this
`src/` (`@/lib/stripe-payment`, `@/lib/auth`, …). `vitest.config.ts`,
`playwright.config.ts`, `tsconfig.tests.json` are the ely-beauty configs.
`scripts/restore-demo-stock.ts` imports `@prisma/client`; `scripts/capture-screenshots.ts`
imports `@playwright/test` + deleted ely-beauty paths; `scripts/measure-parity.mjs` measures
the predecessor parity surfaces; `scripts/ensure-build-configs.mjs` would **overwrite** the
test configs with ely-beauty content if run (CONFIG_FALLBACKS registry).
Fix (ToDo-1):
- [x] `npm install -D vitest @vitejs/plugin-react @playwright/test` (versions resolved by npm; playwright browser matched to the cached chromium build)
- [x] Rewrite `vitest.config.ts` (node env, `tests/unit/**`, `@` alias, setup file)
- [x] Rewrite `playwright.config.ts` (NORDHEM: `127.0.0.1:3100`, webServer = production build with pinned `DATABASE_URL`, mobile-navigation + desktop projects)
- [x] Add npm scripts `test`, `test:e2e`, `test:e2e:install`
- [x] Retire the dead ely-beauty trees: `tests/unit/*`, `tests/e2e/*` (replaced by NORDHEM-pinned suites — the family "re-pin" precedent, applied to THIS codebase), `scripts/restore-demo-stock.ts`, `scripts/capture-screenshots.ts`, `scripts/measure-parity.mjs`, `scripts/ensure-build-configs.mjs` (its fallback registry is the config-clobber hazard)
- [x] Keep `scripts/generate-imagery.mjs`, `scripts/gen-gallery-variants.mjs` (lineage imagery utilities, no broken imports)

### F-2 MEDIUM — 7 `react-hooks/set-state-in-effect` errors (documented debt, PAD §10)
Evidence (exact sites): `src/lib/cart-store.tsx:53` (localStorage hydration),
`src/components/Header.tsx:26,30` (route-close effect + store-picker hydration),
`src/app/shop/page.tsx:30,37` (URL-param sync + sync `setLoading`),
`src/app/search/page.tsx:17,21` (URL-param sync + `setItems([])`).
Fix (ToDo-2) — the PAD-documented path (useSyncExternalStore / render-derivation),
NOT suppression:
- [x] New `src/lib/local-store.ts`: a tiny localStorage-backed external store factory (`subscribe`/`getSnapshot`/`getServerSnapshot`/`set`), SSR-safe, storage-failure-safe — unit-tested first (RED)
- [x] `cart-store.tsx`: three external stores (`nordhem_cart_v1`, `nordhem_wish_v1`, `nordhem_promo`) consumed via `useSyncExternalStore`; actions mutate the stores; `loaded` flag retired (the hook's hydration contract replaces it); persistence stays synchronous on set
- [x] `Header.tsx`: store picker via the shared local-store; drawer close on route change via the adjust-during-render pattern; remove dead `searchRef`
- [x] `shop/page.tsx`: `cat`/`sort` derived from URL params (tabs update the URL via `router.replace`, matching the desktop nav links' existing `?cat=` behavior); loading/error state set inside the debounced async callback, not synchronously in the effect body
- [x] `search/page.tsx`: `q` follows the params via adjust-during-render; empty-needle case becomes a render derivation (no `setItems([])`)
- [x] Gate: `npm run lint` → 0 errors (never weaken the rule)

### F-3 MEDIUM — SEO gaps
Evidence: `robots.ts` allows everything (no `Disallow` for `/cart`, `/checkout`,
`/track-order`, `/order/`, `/wishlist`, `/search`, `/api/`); PDP
`generateMetadata` lacks OpenGraph/canonical; no structured data anywhere;
`layout.tsx` `<html>` lacks `data-scroll-behavior="smooth"` (Next 16 console warning,
verified in dev console); README/PAD say "18 static" sitemap URLs — actual 17
(47 total = 17 + 24 + 6).
Fix (ToDo-3):
- [x] `robots.ts`: `Disallow` the private/util routes, keep allow-all otherwise + sitemap pointer (unit test first — RED)
- [x] PDP metadata: `openGraph` (title, description, image, type) + canonical; product JSON-LD (`schema.org/Product` with offer + aggregateRating)
- [x] `layout.tsx`: `data-scroll-behavior="smooth"` on `<html>`
- [x] Docs: correct the sitemap static-route count (17) in README/PAD
- [x] Sitemap characterization test (47 URLs, product URLs present, no `/order/` URLs)

### F-4 MEDIUM — Mobile drawer a11y (agent-browser finding)
Evidence: Escape pressed with drawer open → still `aria-expanded=true` (verified at
390×844); no focus management on open/close.
Fix (ToDo-4): Escape handler closes the drawer; the drawer is a non-modal inline panel,
so no focus trap (scroll stays available; taxonomy §9.4 adapted), but Escape-to-close
is mandatory. Pinned by the mobile-navigation e2e spec (RED → GREEN).

### F-5 MEDIUM — `/order/[number]` exposes full PII by order number alone
Evidence: `src/app/order/[number]/page.tsx` renders `order.email`, full street address,
postal code to anyone holding the order number (the tracking contract is number+email;
the confirmation page has no such check).
Fix (ToDo-5): mask email (`t***@nordhem.sg` via a tested `maskEmail` helper) and omit
the street address/postal on the public confirmation page (keep slot/store); full detail
remains on `/track-order` behind the email match. RED test → implement → GREEN.

### F-6 LOW — Promo display rules duplicated with a wrong default branch
Evidence: `cart/page.tsx` and `checkout/page.tsx` both hardcode
`FLAT20→fixed 2000, MAKAN15→percent 15, else→percent 10` — an *unknown* code displays
as 10% off (server later rejects; display-only drift, but misleading).
Fix (ToDo-6): `findPromo(code)` helper in `src/lib/catalog.ts` (client-safe, single
source with the seed); cart + checkout use it for display; server re-derivation stays
the truth (ADR-005 unchanged).

### F-7 LOW — Identity & hygiene
- [x] `package.json` name → `home-furnishing-store` (was `nextjs-postgresql-template`)
- [x] `searchRef` dead binding removed (with F-2)
- [x] `.env.example` re-verified against the code's env reads (already rewritten Task 113; zero drift — only `DATABASE_URL`; add the shell-precedence note)

### F-8 INFO — Verified-correct, no action
Mobile menu core behavior (open/navigate/auto-close/toggle) — no TailwindCSS v4 bug
found: the conditional-mount pattern + `lg:` breakpoints are sound and the one v4 trap
in this repo family (candidate scan of prose) is guarded and cold-build-verified.
Scan guard, degrade-fallback reads, money re-derivation, rate limiter, envelope,
fail-closed tracking, seed idempotence — all re-verified green this run.

## 3. Test seams (agreed with the codebase's contracts — TDD skill)

| Seam | Tier | Catches |
|---|---|---|
| `src/lib/utils.ts` pure helpers (formatSGD, priceTotals, validators, stars, clampInt) | unit | money-math + validation regressions |
| `src/lib/catalog.ts` invariants (24/8/3/6/3 counts, unique slugs/skus, price sanity, findPromo) | unit | catalogue drift |
| `src/lib/local-store.ts` (new) | unit | external-store contract (subscribe/persist/SSR) |
| `src/lib/mask.ts` (new maskEmail) | unit | PII masking |
| `robots.ts` / `sitemap.ts` route modules | unit | SEO surface regressions |
| Mobile navigation journey (390×844) | e2e | drawer open/Escape/toggle/navigate/auto-close + hamburger hidden ≥1024 |
| Storefront + commerce journey (1440×900) | e2e | home → PDP → bag → promo → checkout → order page (masked PII) → tracking; API envelope/validation/health; sitemap+robots served |

## 4. Execution order (vertical slices, red → green each)

1. Toolchain install + configs + npm scripts (F-1) — harness first so every later fix is test-backed.
2. Unit RED: local-store, findPromo, maskEmail, robots disallows, sitemap counts → implement → GREEN.
3. Lint-debt refactor (F-2) behind the local-store tests + a Playwright bag-journey spec
   that must stay green across the refactor (characterization first: cart→checkout e2e
   passes on the CURRENT code, then refactor, then still green + lint 0).
4. Header Escape + focus polish (F-4) with mobile-nav e2e RED → GREEN.
5. Order-page PII mask (F-5) with e2e RED → GREEN.
6. SEO surface (F-3): robots (already unit-RED), PDP OG + JSON-LD + data-scroll-behavior
   (e2e asserts meta tags + attribute).
7. Promo display helper (F-6) with unit RED → GREEN; cart/checkout UI swap.
8. Hygiene (F-7).
9. Full gate: lint 0 / typecheck 0 / unit (exact count) / cold build / e2e / dev-server
   screenshots to `docs/screenshots/` (home, shop, PDP, bag, checkout, order
   confirmation, track-order, inspiration, offers, mobile menu open — mobile + desktop).
10. Docs lockstep (README, AGENTS, CLAUDE, PAD revision block, worklog Task 114),
    `home-furnishing-store_SKILL.md` via `skills/distill-codebase-skill` +
    `skills/to-distill-project-into-skill`, single Conventional Commit to `main`,
    push via `docs/ssh_git_wrapper_v3.py` (mandatory `--remote` override).

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and was read in full this run; every lint site is
  quoted from `npx eslint --format json` (machine-readable), not from prose.
- The refactor targets (`useSyncExternalStore`, adjust-during-render, URL-derived
  shop filters) do not change the persistence contract (`nordhem_cart_v1`,
  `nordhem_wish_v1`, `nordhem_promo`, `nordhem_store` keys preserved) or the API
  envelope; ADR-003/005 stand.
- Tabs→URL behavior change (shop) matches the existing desktop-nav `?cat=` links —
  it unifies two behaviors rather than adding a new one.
- Order-page masking keeps the page functional for its actual user (the buyer who
  just placed the order, arriving with the number from their own session).
- No new runtime dependencies; dev-only toolchain additions (vitest, plugin-react,
  @playwright/test).

---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
project_type: nextjs
framework_version: "16.4.2 (App Router)"
last_updated: 2026-11-19 (Task 125: test integrity, boundary parity, identity/origin seams)
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
  `isValidEmail/Phone/Postal`, `stars`, `DELIVERY_SLOTS`, `isValidDeliverySlot`).
- Path alias `@/*` → `./src/*`. `npm run typecheck` covers the app scope
  (`src/**`, `next.config.ts`) only; the NORDHEM-native test tree is covered by
  `npm run typecheck:tests` (`tsconfig.tests.json`) — both scopes are live gates.

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
- Accessibility is a feature, not a garnish: skip link, `aria-label`s,
  toggle-button groups (`role="group"` + `aria-pressed` — widget roles only
  with the full APG keyboard pattern, the Task-119 stance), `aria-live`
  regions, visible focus rings, Escape-close on the mobile drawer,
  responsive down to 360px.
- SEO surfaces are code: `robots.ts` disallows utility/personal routes, the
  sitemap lists indexable routes only (never both), PDPs carry canonical +
  OpenGraph + `schema.org/Product` JSON-LD, and `<html>` carries
  `data-scroll-behavior="smooth"` (the CSS pairs with it in globals.css).

## Development Workflow

### Environment Setup

```bash
git clone https://github.com/nordeim/home-furnishing-store.git
cd home-furnishing-store
npm install
cp .env.example .env          # set DATABASE_URL to your Postgres
npx drizzle-kit push          # create the 9 tables (seed happens on first read)
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
| `npm run test` | Vitest unit suite (145 tests, pure seams) |
| `npm run test:e2e` | Playwright e2e (97 tests, production build on :3100) |
| `npx drizzle-kit push` | Apply `src/db/schema.ts` to the database |

## Testing Strategy

**Current state (Tasks 114–125, extended this cycle):** a NORDHEM-native suite is wired into the gates.

- **Unit (Vitest, 145 tests)** at the pure seams — `src/lib/utils.ts` money math,
  validators, `familyVoucherCents` and `visibleBadges` (Task 117), `src/lib/catalog.ts`
  invariants + `findPromo`, the `local-store.ts` external-store contract,
  `maskEmail`, the `robots.ts` / `sitemap.ts` SEO policy, the `globals.css`
  candidate-scan guard, and the repo-infrastructure contract (`.env.example`
  single-variable, docker-compose postgres-only, `allowedDevOrigins` — the
  Task 118 lineage-drift pins), the shared fixed-window `createRateLimiter`
  factory (window math, Retry-After, expired-key purge — Task 119), the
  `storeName` label seam, the `orderStepIndex` ladder seam (Task 120), and the
  docs-counts pin (`tests/unit/docs-counts.test.ts` fails the run when any
  live-tense test-count claim in AGENTS/README/CLAUDE/SKILL/**PAD** disagrees
  with the fs-computed reality — count-lockstep is enforced across all five
  operator docs, not remembered). Node environment with a localStorage shim
  (`tests/unit/setup.ts`); no jsdom, no component rendering.
- **E2E (Playwright, 97 tests)** against the **production build** (the webServer
  builds and boots `:3100` with a pinned `DATABASE_URL`): a mobile-navigation
  project (390×844 — drawer open/Escape/toggle/navigate/auto-close, hamburger
  hidden ≥1024) and a desktop project (home, shop filters, PDP SEO + JSON-LD
  incl. derived availability + badge dedupe, robots/sitemap endpoints, API
  envelope + boundary validation (invalid/unknown productId → 422, malformed
  body → 400), the 20/min/IP rate-limit pins on track/promo, fetch-failure
  resilience for wishlist/search, cart promo persistence (failed apply keeps
  the discount; the Remove button), the full bag → promo → checkout →
  masked confirmation → tracking journey against live Postgres, plus the
  Task-119 additions: JSON-LD availability deriving from LIVE per-store
  inventory (the spec zeroes a quiet product's rows in the pinned DB and
  restores them), the LOW_STOCK 422 on overselling, and the SEO metadata
  blanket (titles/canonicals for the sitemap-indexed client pages via their
  route layouts, the order-page noindex, and the site-level Organization/
  WebSite JSON-LD). Task-120 additions: the checkout boundary set
  (malformed-JSON 400 with fixed copy, overlong-field 422, and the concurrent
  last-unit pair — exactly one 201 + one 422 LOW_STOCK against a
  function-level-demonstrated TOCTOU), the completed metadata blanket for the
  six title-only routes + the /family earn-rate truth spec, and the a11y pins
  (computed focus indication, qty-1 minus disabled, failed promo → alert role).
- The predecessor's 73-unit/15-e2e dead tree (ely-beauty imports) was retired;
  `tsconfig.tests.json` + `typecheck:tests` now cover the NORDHEM test tree.
- **ARIA stance (Task 119):** toggle-button groups use `role="group"` +
  `aria-pressed` — widget roles (`radiogroup`/`tablist`) are only for widgets
  that implement the full APG keyboard pattern (roving tabindex, arrows);
  announcing radio/tab semantics without the keyboard behaviour is worse than
  plain buttons.
- **Task-121 seams:** `createLocalStore` takes an optional `validate`
  predicate (wrong-shape persisted JSON degrades to the fallback — a bare
  `JSON.parse` guard only catches invalid JSON); `/shop` is a server
  component that ships the initial (cat/sort-filtered) grid in SSR (the
  client `ShopInner` takes over filtering — no `useSearchParams`, which
  forces the CSR bailout and an empty SSR shell); `sortProductList` in
  `utils.ts` is the single display-sort seam (API + shop SSR); click-&-collect
  availability is scoped to the chosen store's inventory rows; the checkout
  route validates `storeSlug` against the three real stores and refuses
  overlong `deliverySlot`; search verdicts gate on a settled-for-query flag;
  `campaignEnd`/`campaignEndLabel` roll the Dec-29–31 stale window.
- **Task-122 seams:** `sgTomorrowISO()` (UTC+8 arithmetic — the Task-121 F-10
  fix that was claimed but never landed); `isValidCartPayload`/
  `isValidWishPayload` (ELEMENT-level validation — container checks let
  `[null]` through); `global-error.tsx` bounds root-layout crashes
  (CartProvider is ABOVE `error.tsx`'s boundary) with reload-based recovery
  (module-poisoned state survives `reset()`); `effectivePromo(code,
  subtotalCents)` gates the cart/checkout preview on the promo minimum
  (display and server refusal can no longer diverge); checkout caps
  `promoCode` (≤32) and `lines` (≤100) and drops `qty: null` lines (never
  qty-1 coercion); reviews REFUSE overlong fields (the Task-120 rule now
  spans every write boundary); `inventory` carries a unique
  (product_id, store_slug) index; the pg pool pins
  `connectionTimeoutMillis`/`query_timeout` (degrade has a time bound);
  `campaignEndLabel()` computes per render (module-load froze it for the
  process lifetime); the search page `replaceState`s `?q=` on submit/chip
  click; the inspiration index quotes the pieces total (not the editorial
  budget).
- **Task-123 seams:** `findPromoMinimumCents(code)` feeds the cart's
  below-minimum notice (the message half of the F-5 gate — "CODE applied"
  never survives a subtotal that dropped under the minimum);
  `DELIVERY_SLOTS`/`isValidDeliverySlot` in `utils.ts` is the shared
  slot-contract seam (the checkout page's options and the API boundary's
  whitelist); the checkout journey spec cleans up its order + inventory in
  a `finally` (the suite runs residue-free against the pinned DB);
  `clear()` drops the persisted promo with the lines;
  `getReviewCount()` is a true `count(*)` (the rendered list stays capped
  at 20 — a display cap, not a count cap); `orderNumber(now?)` derives its
  date segment at SGT (UTC+8); the promo store's predicate mirrors the
  32-char write boundary; `/api/health` speaks the standard envelope;
  the API keyword filter matches `categorySlug` (one recall with the
  shop-SSR seam); the search error box gates on `settledFor === needle`
  like the verdicts.
- **Task-124 seams:** the docs-counts file now also pins the health-envelope
  BODY across the operator docs (three sites had kept the pre-Task-123 bare
  `{ ok: true }` claim); the search page's grid AND the Try-again window
  gate on the full settle discipline (`settledFor === needle` AND
  `settledRetry === retry` — a failed re-search no longer renders the
  previous query's cards, and a retry hides the error box through its
  debounce window); the checkout route drops non-number TYPE qty/productId
  values (the Task-122 F-8 value check let `true`/`[5]`/`"3"` coerce into
  real orders); the cart's unknown-code notice says "isn't a valid code"
  (`findPromoMinimumCents` null — never "$0.00 minimum");
  `availableDeliverySlots(method, now?)` in `utils.ts` is the temporal slot
  seam (the click-collect "Today 2pm" hides after 14:00 SGT — the boundary
  keeps the full `DELIVERY_SLOTS` sets: method coherence unchanged, stale
  tabs get grace); `matchesProductQuery` in `catalog.ts` is the ONE recall
  definition (API + shop SSR + a needle-case fix: capitalized queries used
  to return 0); the five utility client routes carry noindex layouts
  (belt-and-suspenders with robots.txt); the journey spec's finally deletes
  by email + spec-start window (a post-201 assertion failure used to strand
  the row); product cards show stars without the invented seed
  `ratingCount`.
- **Task-125 seams:** `clientIp(headers)` in `rate-limit.ts` is the ONE
  rate-limit identity (rightmost XFF hop → shared `"direct"` bucket — the
  leftmost hop the four routes used to take is the client-forgeable form);
  `jsonLdScript(data)` in `utils.ts` is the ONE ld+json serialization
  (`<` + U+2028 + U+2029 escaped — legal-in-JSON line terminators that
  break the script element); `SITE_ORIGIN` in `utils.ts` is the ONE origin
  (fs-pinned: no raw literal in `src/app`); the reviews POST boundary is
  TYPE-strict like checkout (crafted `rating: true` / numeric-author
  payloads are 422s, never persisted junk); track/promo-validate cap their
  string fields (order number ≤32, email ≤254, code ≤32); the checkout page
  resets a held slot that leaves `availableDeliverySlots(method)` during
  render (the clock crossing its own cutoff can no longer make the select
  display "Tomorrow 10am" while POSTing "Today 2pm"); the mobile drawer
  closes on click (param-only navigations kept it open — the pathname guard
  never fired); home/planning-tools/shop metadata derive their counts and
  category names from the catalogue; `next.config.ts` ships the platform
  security-header set with `poweredByHeader: false`; `app/icon.svg` +
  `app/manifest.ts` give the site an icon and installable metadata; and
  CartProvider stamps `html[data-hydrated]` with the e2e specs gating on it
  (`tests/e2e/helpers.ts` `gotoHydrated`).

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
- "Dev page renders but drawer/cart/search do nothing (no console errors), only
  via `http://127.0.0.1:3000`": Next 16 `allowedDevOrigins` dropped the `/_next/hmr`
  websocket — the page never hydrated. `next.config.ts` pins
  `allowedDevOrigins: ["127.0.0.1"]` (unit-pinned; see AGENTS.md gotcha #11).
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
| `/api/health` | GET | `{ ok: true, data: { db: "up" } }` iff DB reachable (500 + `DB_DOWN` error envelope without) |

### Database / Data Layer

Drizzle ORM over `node-postgres`; 9 tables (`categories`, `products`, `stores`,
`inventory`, `orders`, `order_items`, `reviews`, `inspirations`, `promotions`); types exported as `typeof table.$inferSelect`.
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
  resurrecting ely-beauty specs (the current `tests/` tree is NORDHEM-native —
  pin new specs to THIS `src/`).
- Pushing without the cold-build gate, or with a key anywhere inside the repo.

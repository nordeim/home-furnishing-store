---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
project_type: nextjs
framework_version: "16.4.2 (App Router)"
last_updated: 2026-11-21 (Task 139: store-count derivation completion, gotoHydrated docs-claims pin, starter-kit guard polarity proof, dead-export retirement)
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
| `npm run typecheck` | App-scope TypeScript check (`src/**`, `next.config.ts`) |
| `npm run typecheck:tests` | Test-tree TypeScript check (`tests/**` via `tsconfig.tests.json` — both scopes are live gates) |
| `npm run test` | Vitest unit suite (211 tests, pure seams) |
| `npm run test:watch` | Vitest in watch mode (the same suite, re-run on change) |
| `npm run test:e2e` | Playwright e2e (137 tests, production build on :3100) |
| `npm run test:e2e:install` | One-time: install the pinned Playwright Chromium build (the fresh-clone cache miss) |
| `npx drizzle-kit push` | Apply `src/db/schema.ts` to the database |

## Testing Strategy

**Current state (Tasks 114–139, extended this cycle):** a NORDHEM-native suite is wired into the gates.

- **Unit (Vitest, 211 tests)** at the pure seams — `src/lib/utils.ts` money math,
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
  with the fs-computed reality — count-lockstep is enforced across all six
  operator docs (AGENTS/README/CLAUDE/SKILL/PAD/DEPLOYMENT — DEPLOYMENT.md
  joined in Task 131), not remembered). Node environment with a localStorage shim
  (`tests/unit/setup.ts`); no jsdom, no component rendering.
- **E2E (Playwright, 140 tests)** against the **production build** (the webServer
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

- **Task-126 seams:** `orders.idempotencyKey` (nullable unique) +
  `mintIdempotencyKey()`/`IDEMPOTENCY_KEY_RE` in `utils.ts` +
  `PlaceOrderResult { order, replayed }` are the idempotent-checkout seam —
  the client mints ONE key per checkout-page mount (`useState(() => mint…)`,
  re-minted on remount = new intent, kept across error-path retries), the
  route drops malformed keys to null (dedupe is an enhancement, never a
  persisted field), and `placeOrder` replays via the pre-transaction
  fast-path OR the pg-23505 catch (the loser's transaction — insert and
  decrement included — rolled back; replay answers 200, create 201);
  `deleteProbeOrders(email)` in the storefront spec is the shared RED-run
  safety net (email-keyed order deletion + inventory restore re-derived
  from the inserted order_items — a net that runs AFTER a failing expect is
  dead code, the nets live in `finally` blocks); track/promo-validate/reviews
  GET are TYPE-strict like every write boundary (String()/Number() coercion
  → 422 VALIDATION); `getReviews` ties-break on `desc(id)` (createdAt alone
  is not a total order — same-timestamp rows are physically ordered);
  `catalogMaxDiscountPercent()` in `catalog.ts` is the ONE max-discount
  derivation (hero/strip/offers copy + the e2e pins interpolate it; the fee
  copy derives from the `*_DELIVERY_*` constants); `PERSISTED_STORAGE_KEYS`
  in `local-store.ts` is the ONE recovery list (both crash boundaries
  import it, fs-pinned); the root layout declares `twitter.card`
  (summary_large_image, inherits everywhere), OG images declare their true
  1200×627, and the PDP Offer carries `priceValidUntil` from the rolling
  `campaignEnd()` seam; `dotenv` is REMOVED from dependencies (Next's own
  env loader reads `.env` — the precedence note names the real actor).
- **Task-127 seams:** the checkout route's five free-text fields +
  `deliverySlot` are TYPE-strict (present-non-string → 422 — a
  single-element array used to String()-coerce past every validator into a
  real order; absent fields still fall to the documented defaults);
  `/api/products?max=` accepts whole-number strings only (the reviews-GET
  discipline — `abc`/`1.5` are 422s, never silent NaN); both idempotent
  replay paths bind to the bound order's own email via `resolveReplay()`
  (mismatch → 422 `REPLAY_MISMATCH`, never disclosure — the homenest
  S6-8/S7-2 ownership discipline) and the fast path runs BEFORE bag/promo
  validation (an emptied-bag post-success resubmit replays; the route
  defers its empty-bag refusal to placeOrder when a key is present);
  `mintIdempotencyKey`'s non-secure fallback consumes `getRandomValues`
  bytes (128-bit hex — only `randomUUID` is secure-context-gated;
  Math.random survives as the both-absent last resort); `campaignEnd()`
  derives the year and the Dec-28-00:00-SGT instant on the UTC+8 clock (the
  label formats with `timeZone: "Asia/Singapore"`; the PDP's
  `priceValidUntil` renders the SGT calendar date via `en-CA`, not the UTC
  ISO slice); the GST/threshold/FLAT20/family-voucher copy interpolates its
  constants (`Math.round(GST_RATE * 100)`, `FREE_DELIVERY_THRESHOLD_CENTS`,
  the PROMOS row, `FAMILY_VOUCHER_CENTS`/`FAMILY_POINTS_PER_VOUCHER` — a
  rate edit self-corrects copy and pins together); template-literal copy
  carries plain `&` (JSX entities do NOT decode inside `{`…`}` — the
  Task-126 regression class); and the storefront spec's interaction-first
  blocks navigate through `gotoHydrated` like the mobile spec's.
- **Task-128 seams:** every POST boundary guards the JSON body's SHAPE
  beside its parse guard (`null` — and on checkout any primitive/array —
  is a 400 BAD_REQUEST, never a TypeError 500 for a client fault);
  `/api/products` trims the `q` needle (one recall definition, one
  normalization — padded needles used to miss field-starting words);
  `orderNumber` reads `getUTC*` fields (the SGT discipline, TZ-pure on any
  server); the checkout route consumes the exported `IDEMPOTENCY_KEY_RE`
  (fs-pinned — no inlined key-shape literal in the route); the inspiration
  detail pages declare their og:image 1200×627 like home/PDP;
  `FAMILY_POINTS_PER_DOLLAR` and `TRADE_RATE` drive the family/business
  calculators AND their copy (the earn/trade halves of the Task-127 F-4
  derivation class); the Footer year derives on the SGT clock (the last
  bare server-local calendar read); every `createLocalStore` key (literal
  or constant) is fs-pinned as a member of `PERSISTED_STORAGE_KEYS`; and
  the family voucher / shop strip / offers FLAT20 copy carries e2e pins
  that derive from the same constants the pages interpolate (a rate edit
  self-corrects copy and pins together — the Task-127 claim now true).
  The storefront spec's interaction-first coverage is complete: zero bare
  interaction-first gotos remain (51 gotoHydrated call sites in the storefront
  spec after the Task-129 conversions and the Task-131..141 probes — 53 across
  both files, the mobile spec contributing its two sites), and every
  write-capable refusal spec carries its RED-run `finally` net.
- **Task-129 seams:** every write-capable refusal spec is netted — including
  the REVIEW probes (the overlong-body and bad-rating specs insert rows on
  their RED paths; author/title-scoped deletes in their `finally`) and the
  nullqty order probe, plus the one positive-control writer (the slot-
  coherence spec) whose cleanup moved from an if-block into a
  `finally { deleteProbeOrders }`; the checkout route's enum trio is
  TYPE-strict + whitelist-strict like storeSlug/deliverySlot
  (`paymentMethod: ["card"]` used to String()-coerce into a real 201 —
  present-but-invalid is a 422, absent keeps the documented default, and
  `promoCode: null` stays the UI's accepted "no promo" encoding); the
  business panel's label/saving/estimate rows are pinned against
  `TRADE_RATE` + the default-quantity list total (the Task-128 F-9 business
  half); the last racy interaction-first bare goto (the search-freeze spec's
  sleep-then-click) and its two freeze-spec siblings route through
  `gotoHydrated`; the checkout array-body guard carries an e2e probe; the
  producer-side fs-pin scans every `.ts/.tsx` under `src/` (a new store in
  any file cannot escape `PERSISTED_STORAGE_KEYS`); the route's store
  whitelist, the checkout page's options and the Header picker derive from
  the `STORES` seed via `storeName()`; and the IDEMPOTENCY_KEY_RE /
  docs-counts fs-pins resolve from `import.meta.dirname` (cwd-proof).
- **Task-130 seams:** checkout fulfilment is store-scoped for EVERY method
  (the availability lock query and the decrement read the SAME
  chosen-store rows — the pre-130 delivery shape checked the island-wide
  aggregate while the decrement floored one row through `greatest(0,·)`,
  minting phantom units; the register's redistribution alternative was
  rejected because the e2e RED-run nets restore inventory post-hoc and a
  multi-store drain is not reconstructible); `storeSlug` is TYPE-strict
  like its enum siblings (the last String()-coerced seam — no UI
  null-encoding to preserve); `isUniqueViolationOn(err, constraint)` in
  `utils.ts` discriminates 23505s by constraint name (the replay path
  narrows to `orders_idempotency_key_unique`; an `order_number` collision
  re-mints and re-runs the fully-rolled-back transaction once); the three
  sibling POST routes join checkout's `Array.isArray` shape guard (400 for
  array bodies, not a limping 422); the Footer store chips derive from the
  `STORES` seed (the fourth hand-duplicated list, e2e-pinned); the
  wishlist heading counts RESOLVED items once loaded (error keeps the
  persisted count); `priceTotals` caps BOTH promo branches at the subtotal
  (a >100% percent promo can no longer mint negative cents); and the
  saturation spec's 21-review probe moved havbris → pandan-rug-200 (the
  fullyParallel race with the two "Reviews (0)" havbris assertions).
- **Task-131 seams:** `orderNumber`'s 6-char suffix mints from
  `crypto.getRandomValues` bytes (uint32 → base36 — exactly 6 chars on
  every path, the ~2^31 entropy claim now true against V8's
  state-recoverable Math.random; the both-absent fallback padStarts to 6,
  closing the rare 1-char mantissa mints; the mintIdempotencyKey posture,
  Task 127 F-6, applied to its sibling seam); the placeOrder decrement
  reads the `fulfilStore` seam (structurally fs-pinned by the tenth unit
  file — the Task-130 F-2 check/decrement coherence no longer rests on
  textual coincidence); the wishlist header badge is the persisted
  SAVED-entry count by design (the Header cannot resolve without a fetch on
  every route) while the page EXPLAINS the saved-vs-resolved difference
  with a "N saved items are no longer available" note — e2e-pinned
  together, and the F-8 pin's broken ghost-card locator repaired; the
  Task-119 oversell probe moved katong → wokhey-cookware-5pc (the
  fullyParallel zero-window overlap with the 500-class spec); placeOrder's
  qty clamp goes through the NaN-safe `clampInt` seam; and the docs-counts
  pin covers DEPLOYMENT.md (six live operator docs — its gate chain had
  rotted five count-bumps deep outside the pin's scope).
- **Task-132 seams:** the unit tree is **TZ-pure** — every date-time literal
  carries a `Z` designator and every now-relative expectation reads
  `getUTC*` (the pre-132 survivors of the Task-127/128 swaps were a false-RED
  gate on non-UTC hosts: the orderNumber "today" pin 8h/day on
  Asia/Singapore, the campaignEnd pins deterministically on America/New_York
  — observed live; the Z-less-literal fs-pin in `utils.test.ts` holds the
  class unrecurrable, and the GREEN discipline is the three-TZ run —
  UTC/Singapore/New_York all pass identically; deliberately NO `TZ` pin in
  `vitest.config.ts`, which would silently mask the next TZ-coupled test);
  the fulfilment-seam fs-pin binds BOTH sites (`eq(inventory.storeSlug,
  fulfilStore)` exactly twice — lock AND decrement; the pre-132 presence-only
  regex was satisfied by the lock alone, demonstrated by temporary mutation);
  the wishlist all-ghost branch ("Your saved items are no longer available"
  replaces the contradictory "Nothing saved yet" when every persisted slug
  departed — e2e-pinned); and every write-capable e2e spec mints its OWN
  probe email (the three checkout-caps specs shared one — a concurrent-RED
  double-restore window through the shared deleteProbeOrders nets).
- **Task-133 seams:** the reviews boundary bounds `productId` above by the
  shared `MAX_INT4` in `utils.ts` (2^31 passed every JS gate but the driver
  rejects the int4 parameter with 22003 — the POST 500'd for a client fault
  and the GET silently degraded to `[]`; both verbs 422 now, e2e-pinned);
  the typeqty e2e spec's RED-run net is the full `deleteProbeOrders`
  restore (the pre-133 finally deleted rows but stranded the inventory
  decrement — the uniform-net claim is now true for every write-capable
  spec); `isValidCartPayload`/`isValidWishPayload` reject DUPLICATE entries
  (the shape→element→uniqueness chain's third layer — `["slug","slug"]`
  used to render the FALSE "1 saved item is no longer available." note; a
  duplicate payload degrades to the fallback, unit-pinned + e2e-probed);
  `priceTotals`' `net === 0` delivery corner is pinned (the historically
  load-bearing free-delivery edge — sibling cap pins used click-collect
  where the fee is 0 regardless); the `/order/[number]` lookup normalizes
  like `trackOrder` (`.trim().toUpperCase()` — a hand-typed lowercase number
  used to not-found while the tracking page found it with the same input);
  and the pin-hardening batch (the inspiration pieces-total derives from
  the catalogue; the TZ fs-pin fails on numeric-args Date constructors; the
  PERSISTED_STORAGE_KEYS producer scan is fail-closed against computed
  keys — the last two proven by mutation).
- **Task-134 seams:** the cart duplicate-payload probe joins its wishlist
  sibling at the e2e tier (a duplicated `nordhem_cart_v1` payload degrades
  to the honest empty bag — never doubled React keys/subtotal;
  honest-RED by mutation); the order-URL decode corner is pinned on the
  browser-reachable form (`/order/%25ZZ` → not-found, never a 5xx — a RAW
  malformed request is platform-handled inside Next 16's routing layer
  before app code runs, register row; the Task-133 case-sibling's negative
  assertion was repaired in passing — its typographic apostrophe never
  matched the rendered `can&apos;t`, a permanent no-op); the three `+`
  steppers (cart/BuyBox/business) disable at their 99/99/200 ceilings like
  their floor-disabled `−` siblings; `addLine`'s found-branch clamps its
  floor (`Math.max(1, …)` — both branches now 1–99, fs-pinned); the
  `MAX_INT4` comment names checkout's drop-exception (lines[] ids DROP via
  the catalogue `byId.get` — the documented answer, not a 422); and the TZ
  zless fs-pin covers all three quote forms + fractional seconds (the
  lookahead rejects `.` and digits — closing TWO backtracking splits that
  let a legitimate `.500Z` false-positive, both mutation-proven).
- **Task-135 seams:** every cart-store qty writer (addLine's both branches
  AND `setLineQty`) routes through the shared NaN-safe `clampInt` seam
  (`Math.max(1, NaN)` is NaN and `Math.max(1, 3.7)` is 3.7 — the Task-134
  literal forms never covered the non-finite/fractional class;
  `setLineQty` read `Math.min(99, Math.floor(qty))` — a fractional add
  stored a qty-0 line; fs-pinned as the three-writer form with the literal
  forms retired); `/api/products` validates `?cat=` against the
  `CATEGORIES` seed and `?sort=` against the exported `SORT_KEYS` seam
  (utils.ts, `satisfies ProductSortKey[]` — `?cat=zzz` used to answer a
  fake empty catalogue and `?sort=zzz` an unsorted 200 while `?max` was
  422-strict; both are 422 VALIDATION now, and the shop display list is
  fs-pinned as a subset of the seam so the UI can never offer what the
  boundary refuses); and the wishlist + search pages gate resolution on
  `Array.isArray(json.data)` (a 200 `{ok:true}` with no `data` used to
  render the FALSE all-ghost note / false "0 results" verdict — the
  Task-128 body-shape discipline mirrored client-side, e2e-pinned by
  route-fulfilled body-less envelopes).

- **Task-136 seams:** the shop grid — the THIRD client consumer of
  `/api/products` and the primary catalogue funnel — gates on
  `Array.isArray(json.data)` too (it read `json.data ?? []` and rendered
  the false "0 products" + "Nothing matches those filters" verdict; the
  client-resilience class is now closed across all three consumers,
  e2e-pinned via the LOCAL keyword filter — the one path that fires the
  client-side refetch, cat/sort landing in the atServerView skip); the
  DB-funnel golden rule is RESTORED and fs-pinned (the order page
  funnels through the new `getOrderByNumber` seam — decode guard,
  trackOrder-normalization parity, outage authority all moved in; the
  reviews POST delegates to the new `submitReview` seam; only
  `src/db/**`, `server-data.ts`, and the `api/health` infra-probe
  exception may import `@/db`); `getReviews`/`getReviewCount` degrade to
  `null` (the outage signal — the PDP renders the honest "Reviews are
  unavailable right now" note with no count claim, the JSON-LD omits
  `aggregateRating`, and the API GET answers the `DB_DOWN` envelope
  instead of the false "no reviews" empty list); and `placeOrder`
  re-reads the promotions row `FOR UPDATE` INSIDE the createOrder
  transaction, deriving the totals after the locked re-read (the
  Task-130 F-2 check/act coherence applied to the other money-shaping
  input — a promo deactivated under the order refuses with
  INVALID_PROMO and the whole transaction rolls back).

- **Task-137 seams:** the PDP reviews-outage signal is UNIFIED (the two
  review seams degrade independently, but the JSON-LD `aggregateRating`
  gate, the section's `initial` list AND the heading count claim all key on
  the combined `reviewsUnavailable` signal — a partial outage (pool
  exhaustion, query_timeout on one of the two queries) no longer renders the
  unavailable note above a live list, and never publishes an aggregateRating
  the visible page disavows); `ReviewSection`'s unavailable state is
  RECOVERABLE client state (`useState(!!unavailable)` flipped `false` on a
  successful POST — the SSR note unmounts and the heading resumes its count
  when the write provably landed); the cart's promo-apply is the FOURTH
  envelope-trust consumer to gate on `json.data` presence (an ok-but-dataless
  `200` is the failure state — scoped alert, no persisted code — the
  Task-135/136 class closed at its last sibling, the only POST one);
  `getOrderByNumber`'s outage-vs-not-found discrimination and the four
  rendered outage surfaces (order-page copy, PDP unavailable note,
  reviews-GET `DB_DOWN`, `submitReview` delegation) are fs-pinned
  (mutation-proven — the Task-131 F-2 precedent for DB-touching branches
  that are not e2e-reachable without killing the live server); and the shop
  strip suppresses its count claim under `loading || error` (the GST /
  free-delivery tail is static truth and stays — the wishlist-heading
  honesty sibling).

- **Task-138 seams:** the shop resync block flips `loading` for cat/sort
  transitions under an active keyword/price filter (a fresh server view
  arrived with `items` still describing the PREVIOUS view, and
  `setLoading(true)` only fired inside the 250 ms debounce callback — the
  commit rendering the fresh heading carried the departed view's rows with
  the strip quoting their count; skeletons + no count claim at the
  transition itself, the Task-137 F-5 gate extended to the resync window —
  e2e-pinned by a commit-time DOM capture keyed on the heading, because
  auto-retrying assertions bridge the 250 ms window); the store COUNT
  derives from the `STORES` seed everywhere (the hero stat, the
  Click-&-Collect strip, both checkout refusal messages interpolate
  `STORES.length` — the Task-129 list-derivation class completed one tier
  over); `productDiscountPercent` in `catalog.ts` is the ONE per-product
  discount seam (the card chip, the PDP chip and `catalogMaxDiscountPercent`
  all consume it — the Task-126 F-3 max seam's per-product sibling);
  `findProduct`/`findPromo`/`productImage` are RETIRED (dead exports since
  the Task-122 display-gate move to `effectivePromo` — the lesson-8
  retirement discipline, pins repointed at the live seams);
  `ASSEMBLY_FEE_CENTS`/`DESIGN_SERVICE_FEE_CENTS` drive the $25/$190
  service-fee copy at all seven sites (the Task-126 F-3 fee discipline's
  last hand-copied pair); and the offers starter-kit set-copy is guarded on
  the resolved rows (`KIT_SLUGS` + `bundles.length === KIT_SLUGS.length` —
  the HERO_SLUG departure-guard discipline).
- **Task-139 seams:** the store-count derivation is COMPLETE and
  class-pinned (the Task-138 pin scoped its negatives to the two files it
  fixed — the /stores metadata description + og description + h1 and the
  /sustainability stat card kept hand-drawn "Three"/"3" literals with
  every gate green; all four interpolate `STORES.length` now and the
  blast-radius fs-pin fails if any count literal exists anywhere under
  `src/`; the e2e metadata-blanket expectation derives from the seed —
  never re-hardcode the count a pin replaced); the gotoHydrated count
  claims are PINNED (AGENTS ×2 + CLAUDE + PAD must carry the fs-computed
  per-spec counts — docs-counts fails the run on drift); the starter-kit
  guard pin proves POLARITY (the trio copy on the guard's TRUE branch —
  presence-only pins are satisfiable by the inverted falsehood);
  `CLICK_COLLECT_TODAY_CUTOFF_SGT_HOUR` is module-private (its dead
  `export` retired — the constant feeds only `availableDeliverySlots`).

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
  `DATABASE_URL` overrides `.env` (Next's own env loader never overrides an
  existing env). Check `env | grep DATABASE` and pin the value per command.

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

---
name: home-furnishing-store
description: "NORDHEM Singapore — furniture & home-furnishing e-commerce storefront on Next.js 16 App Router + React 19 + TypeScript strict + Tailwind CSS v4 (CSS-first @theme) + Drizzle ORM + PostgreSQL. Distilled engineering memory: architecture contracts (Degrade-Never-Fail, integer-cents money, API envelope), the Tailwind v4 candidate-scan guard, external-store client state, SEO policy, the NORDHEM-native test harness, and the hard-won lessons of the build/remediation lineage."
version: 2.12.0
last_updated: "2026-11-21 (Task 138: shop resync-window honesty + store-count derivation + productDiscountPercent seam + dead-export retirement + fee-copy derivation + starter-kit guard)"
project_state: "gates: lint 0/0 · typecheck + typecheck:tests clean · 198/198 unit (TZ-pure — verified UTC/Singapore/New York; the fs-pin covers all three quote forms + fractional seconds since Task 134) · 133/133 e2e · cold build green · PostgreSQL 17 live-verified (docs/setup_pg_z.sh) · counts + the health-envelope body pinned by tests/unit/docs-counts.test.ts (incl. the PAD + DEPLOYMENT.md since Task 131)"
---

# NORDHEM (home-furnishing-store) — Engineering Skill

> How to use: this is the distilled engineering memory of the NORDHEM codebase
> after the Task 114 remediation, the Task 117 honesty/hardening cycle, the
> Task 118 dev-hydration/lineage-drift cycle, the Task 119 server-truth/SEO
> blanket cycle, the Task 120 API-boundary/atomic-checkout/docs-truth cycle,
> the Task 121 client-state/commerce-honesty/SSR-content cycle, the Task 122
> skipped-fix/crash-boundary/display-honesty cycle, the Task 123
> journey-residue/promo-display-truth/boundary-docs-honesty cycle, and the
> Task 124 docs-truth-completion/settle-discipline/boundary-strictness
> cycle, and the Task 125 test-integrity/boundary-parity/identity-origin-seams
> cycle, and the Task 126 idempotent-checkout/test-residue-parity/derived-copy
> cycle, and the Task 127 boundary-type-parity/replay-ownership/derived-copy
> cycle, and the Task 128 body-shape-guard/recall-parity/derived-pin
> cycle, and the Task 129 residue-net-completion/enum-boundary-parity/
> business-derived-pin cycle, and the Task 130 store-coherent-fulfilment/
> unique-violation-discrimination/wishlist-heading-honesty cycle, and the
> Task 131 wishlist-count-parity/fulfilment-seam-structural-pin/orderNumber-
> crypto-suffix/DEPLOYMENT-truth cycle, the Task 132 TZ-pure-test-gates/
> fulfilment-pin-binding/wishlist-all-ghost/probe-email-uniqueness cycle, the
> Task 133 reviews-int4-overflow-bound/typeqty-residue-net-completion/
> persisted-payload-uniqueness/order-lookup-normalization-parity/pin-
> hardening cycle, the Task 134 cart-duplicate-e2e-parity/order-URL-
> decode-pin/stepper-ceiling-state/addLine-floor-clamp/TZ-pin-widening/docs-
> gate-truth cycle, the Task 135 qty-writer-clamp-parity/API-cat-sort-
> boundary-stance/envelope-trust-gate/docs-truth cycle, the Task 136
> shop-grid-envelope-trust-completion/DB-funnel-golden-rule-restoration/
> reviews-degrade-honesty/promo-in-tx-coherence/docs-truth cycle, and the
> Task 137 PDP-unified-outage-signal/ReviewSection-recovery-state/cart-
> promo-envelope-trust-completion/outage-branch-pin-coverage/shop-strip-
> honesty/docs-truth cycle, and the Task 138 shop-resync-window-honesty/
> store-count-derivation/productDiscountPercent-seam/dead-export-retirement/
> fee-copy-derivation/starter-kit-guard cycle. `AGENTS.md` is the
> quick operator reference, the PAD is the full blueprint, and this skill is the
> pattern/lesson layer an agent needs before touching the code. When code and
> this document disagree, **the code wins** — then fix this document in the
> same commit.

## 1. Project Identity & Design Philosophy

NORDHEM is a Singapore-market furniture & home-furnishing e-commerce
storefront: 24 original products across 8 room categories, 3 stores, 6
shoppable inspiration rooms, promo codes, a 3-step checkout with order
tracking, and Family/Business/Food/Sustainability/Planning-tools surfaces. It
is an original-code, IA-level functional superset of the public IKEA Singapore
site (public-route observation only — invented product names, Pexels imagery,
no reference assets; evidence dossier in `docs/reference-investigation.md`).

Philosophy, in priority order:

1. **Degrade, Never Fail** — every DB read has a static-catalogue fallback
   (`src/lib/catalog.ts`); the storefront renders with Postgres down; only
   writes (checkout, review POST, tracking) require the DB.
2. **Server-truth money** — integer cents everywhere; totals re-derived in
   `placeOrder()`, never trusted from the client; GST-inclusive pricing with
   the 9% component back-calculated for display.
3. **No premature dependencies** — one external-store pattern instead of
   Zustand; plain `<img>` + Pexels CDN instead of an image pipeline; mock
   payments instead of Stripe. Every deferral is documented, not silent.
4. **Original content only** — invented names/copy; no reference trademarks.

## 2. Tech Stack & Environment

| Layer | Technology | Version (lockfile-pinned) |
|-------|-----------|---------------------------|
| Framework | Next.js (App Router, Turbopack) | 16.4.2 |
| UI runtime | React | 19.2.6 |
| Language | TypeScript, `strict: true` | 5.9.3 |
| Styling | Tailwind CSS, CSS-first `@theme` | 4.1.17 (postcss 8.5.23) |
| ORM | Drizzle ORM (`drizzle-orm/node-postgres`) | 0.45.2 |
| DB driver | `pg` | 8.20.0 |
| Unit tests | Vitest + @vitejs/plugin-react | 5.1.0 / 6.3.0 |
| E2E | @playwright/test (chromium) | 1.65.1 |
| Lint | ESLint flat + eslint-config-next/core-web-vitals | 9.39.4 |

Environment contract: **`DATABASE_URL` is the only variable the code reads**
(`src/db/index.ts` throws at module load without it). `drizzle.config.json`
pins `postgresql://postgres:postgres@127.0.0.1:5432/app_db`. Precedence trap:
an exported shell `DATABASE_URL` beats `.env` (Next's own env loader never
overrides an existing env) — pin per command when in doubt.

## 3. Bootstrapping & Configuration

```bash
git clone https://github.com/nordeim/home-furnishing-store.git && cd home-furnishing-store
npm install
cp .env.example .env            # set DATABASE_URL (any Postgres; unreachable = static fallback)
npx drizzle-kit push            # 9 tables; seeding happens automatically on first read
npm run dev                     # http://localhost:3000 (or 127.0.0.1:3000 — allowedDevOrigins covers it)
```

The env contract is single-variable (DATABASE_URL) and **pinned by test**
(`tests/unit/env-example.test.ts`): a sibling-project `.env.example` once
replaced it inter-session listing Stripe/BDT/auth variables this codebase
never reads — the pin fails BY CONTENT if that drift class returns. The same
file pins `docker-compose.yml` to a postgres-only service (no Redis/Stripe/
Adminer — this architecture has none) and the `allowedDevOrigins` entry in
`next.config.ts` (see §10: the dev-hydration trap).

Gate chain (there is no hosted CI; the local gate is the only gate):

```bash
rm -rf .next && DATABASE_URL="postgresql://…" npm run build   # COLD (cache masks the scan-guard failure)
npm run typecheck && npm run typecheck:tests
npm run lint                                                   # 0 errors / 0 warnings
npm run test                                                   # 198/198
npm run test:e2e                                               # 133/133 (live Postgres for the journey)
```

Rootless PostgreSQL (no sudo): the `skills/rootless-postgresql` procedure —
`apt-get download` + `dpkg-deb -x` into a user prefix, `initdb` with the socket
inside the data dir, scram on TCP / trust on socket, lifecycle scripts. Adapt
prefix/port/role/db to the target sandbox (this cycle:
`/home/z/my-project/pg`, port 5432, `postgres`/`app_db` to match the pinned
URLs).

## 4. The Design System (CSS-First)

No `tailwind.config.js`. Tokens are literal hex in the `@theme` block of
`src/app/globals.css`:

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-brand` / `--color-brand-dark` / `--color-brand-ink` | `#0058a3` / `#004382` / `#003a6b` | Primary blue, hover, deep |
| `--color-accent` / `--color-accent-dark` | `#ffdb00` / `#e5c400` | CTAs, badges, selection, focus rings (always `#111` text) |
| `--color-paper` / `--color-cream` | `#f7f5f0` / `#faf8f4` | Warm neutrals |
| `--color-ink` / `--color-muted` | `#111111` / `#5b5b5b` | Text |
| `--color-line` | `#e5e1d8` | Hairlines |
| `--color-moss` / `--color-clay` | `#2e6b34` / `#b5502a` | In-stock / low-stock |

Typography: `"Arial Black"` display stack + `"Helvetica Neue"` body (no web
fonts — LCP posture). Arbitrary values in JSX are the house style
(`bg-[#f5f3ee]`, `text-[15px]`, `tracking-[0.16em]`); **slash-form aspect
values only** (`aspect-[16/9]`, never `aspect-[3:1]` — see §9). Hand-rolled
utilities: `focus-ring`, `reveal-up` (respects `prefers-reduced-motion`),
`no-scrollbar`.

## 5. Component Architecture & Patterns

Three layers, one golden rule — **every DB touch funnels through
`src/lib/server-data.ts`** (it owns the fallback contract and pricing truth; a
page importing `@/db` directly is an architecture violation):

```
Layer 0  src/db        schema.ts (9 tables) + index.ts (pooled client, globalThis singleton)
Layer 1  src/lib       server-data.ts · catalog.ts · cart-store.tsx · local-store.ts · utils.ts · mask.ts
Layer 2  src/components Header · Footer · ProductCard · BuyBox · ReviewSection (all "use client" except Footer)
Layer 3  src/app       20 page routes + 6 API handlers (all force-dynamic where data-driven)
```

Canonical patterns (full code in the PAD §3.3):

- **Degrade-fallback read** — `await ensureSeed(); try { db… } catch { return PRODUCTS… }`;
  the catch is empty by design (degradation is normal operation).
- **Idempotent single-flight seed** — module-level promise; `onConflictDoNothing`
  throughout; a failed seed resets the promise (retry next request).
- **Server-side money truth** — `placeOrder()` clamps qty 1–99, drops unknown
  products, validates per-product qty against the LIVE inventory aggregate
  (422 `LOW_STOCK` — Task 119), and derives every cent by calling
  `priceTotals()` itself (Task 119: the hand-rolled copy had drifted on the
  net===0 delivery edge; the constants-import of Task 117 was only half the
  consolidation); the route zeroes the client's `totals` field at the boundary
  and returns `{ orderNumber }` only (minimized, like the track route).
- **API envelope** — `{ ok: true, data } | { ok: false, error: { code, message } }`
  on every route; codes (`VALIDATION`, `RATE_LIMIT`, `EMPTY_BAG`,
  `INVALID_PROMO`, `NOT_FOUND`, …) are stable contract points.
- **Shared rate-limit seam** — `createRateLimiter({ limit, windowMs })` in
  `src/lib/rate-limit.ts` (Task 119): fixed window, `retryAfterSec()` for the
  429's Retry-After header, opportunistic expired-key purge past 256 entries;
  each write/lookup route instantiates one (20/min/IP) — never re-inline a
  Map limiter.
- **External-store client state** — see §6.

## 6. Client State — the External-Store Pattern (Task 114)

The React Compiler-era `react-hooks/set-state-in-effect` lint rule flags the
old "hydrate from localStorage inside an effect" pattern. The compliant
replacement, used for ALL persisted client state:

```ts
// src/lib/local-store.ts — factory (SSR-safe, quota-safe, corrupt-JSON-safe)
const store = createLocalStore<T>(key, fallback);   // subscribe / getSnapshot /
                                                    // getServerSnapshot / set
// consumer (src/lib/cart-store.tsx)
const lines = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
```

`useSyncExternalStore` handles the server/client hydration split natively
(server snapshot during SSR/hydration, client snapshot after mount — no
effect-setState, no hydration mismatch). Persistence keys: `nordhem_cart_v1`,
`nordhem_wish_v1`, `nordhem_promo` (JSON-encoded since the refactor),
`nordhem_store`. For params-derived page state use **adjust-during-render**
(`shop/`, `search/`, Header route-close): compare a prev-value state during
render and call setState in the conditional branch — the React-docs pattern.
Shop filters are URL-derived (`?cat=` + `?sort=` via `router.replace`) — the
same contract the header links already use.

## 7. Catalogue & Data Management

The static catalogue (`src/lib/catalog.ts`) is **the seed AND the
fallback**: 24 products / 8 categories / 3 stores / 6 inspirations / 3 promos,
plus `findProduct` and `findPromo`. `findPromo(code)` is the single
client-side promo lookup for DISPLAY (cart + checkout previews); the server
re-validates every code against the `promotions` table (ADR-005 stands).
Pure display helpers worth knowing (Task 117, unit-pinned): `familyVoucherCents(points)`
implements the Family programme's printed rule ($5 per 1,000 pts) and
`visibleBadges(badges, { isNew, discountPercent })` dedupes catalogue badge
literals against the computed card chips. Schema highlights (`src/db/schema.ts`): money is `integer` cents;
`rating_avg` is `numeric(3,2)` (arrives as string over JSON — cards accept
`string | number`); `order_items` is a denormalized snapshot (orders survive
catalogue edits); 9 tables total. Inventory is seeded 3 rows/product
(tampines/jurong/alexandra) with `A12-B04`-style aisle bins; checkout
decrements the CHOSEN store's row inside the locked transaction —
fail-closed, method-independent since Task 130 F-2 (check and decrement
read the same rows; an arithmetic miss aborts the transaction).

## 8. Accessibility (WCAG 2.2 AA baseline)

Skip link; `aria-label`s on icon buttons; toggle-button groups use
`role="group"` + `aria-pressed` (Task 119's stance: widget roles like
`radiogroup`/`tablist` are reserved for widgets that implement the full APG
keyboard pattern — announcing radio semantics without arrow-key roving focus
is worse than plain buttons; the five former role sites were converted);
`aria-live` on status regions (`role="alert"` for failures — Task 119); visible
`focus-ring` (3px accent,
`:focus-visible` only); responsive to 360px; `prefers-reduced-motion`
disables the entrance animation and smooth scroll. The mobile drawer is a
non-modal inline panel that MUST close on Escape (keydown handler — pinned by
`tests/e2e/mobile-navigation.spec.ts`), on route change, and on toggle;
`aria-expanded` swaps the button's accessible name Open/Close menu (test with
a stable locator, not the name). Responsive double-DOM (two search inputs):
query with `.filter({ visible: true })` and beware substring role-name
matches ("Go" ⊂ "ERGONOMI").

## 9. Anti-Patterns & Common Bugs

1. **Colon-form arbitrary aspect values** (`aspect-[3:1]`) anywhere in the
   repo — Tailwind v4's candidate scan reads prose too; it once compiled to
   invalid `aspect-ratio: 3:1` and broke the clean build with PostCSS
   "Missed semicolon". The `@source not` guard at the top of `globals.css` is
   load-bearing; never remove it. A warm `.next` cache masks the failure —
   always build cold.
2. **Effect-body setState** (localStorage hydration, URL-param sync) — cascading
   renders + lint errors. Use the external store / adjust-during-render
   patterns (§6). Never suppress the rule.
3. **Trusting client totals** or floating-point money — `placeOrder()`
   re-derives; keep pricing logic in `src/lib/utils.ts`.
4. **Bare throws / silent catches at API boundaries** — always the envelope;
   read-fallbacks may catch silently (degrade), writes may not.
5. **Rendering PII on `/order/[number]`** — reachable by number alone;
   `maskEmail()` + no street address; full detail only behind the email match
   on `/track-order`.
6. **Listing robots-disallowed URLs in the sitemap** (or vice versa) — the
   policy is coherent by construction: sitemap = 12 indexable static + 24
   product + 6 room URLs; robots disallows `/cart`, `/checkout`,
   `/track-order`, `/order/`, `/wishlist`, `/search`, `/api/`. Both are
   unit-pinned (`tests/unit/robots-sitemap.test.ts`).
7. **Hardcoding promo display values in pages** — the old inline switch gave
   unknown codes a phantom 10% off. Use `findPromo()` (null for unknown).
8. **Forgetting `data-scroll-behavior="smooth"`** on `<html>` when CSS sets
   `scroll-behavior: smooth` — Next 16 warns in dev console.
9. **Unescaped JSON-LD** — `JSON.stringify(jsonLd).replace(/</g, "\\u003c")`
   before `dangerouslySetInnerHTML` (server-controlled values only).
10. **Letting the inherited ely-beauty artifacts back in** — the dead test
    tree and config-restorer scripts were retired in Task 114; pin new tests
    to THIS `src/`.
11. **Fabricating fallback data on degrade paths** — BuyBox once invented a
    12-unit Tampines stock row when inventory was unavailable (Task 117);
    a degrade state must say what it truly is ("information unavailable"),
    never invent plausible data.
12. **Conflating fetch failure with the empty state** — wishlist/search once
    rendered "Nothing saved yet"/"No products found" on a dead API (Task 117);
    every client fetch surface needs the loading/error/empty trio (see
    `shop/page.tsx` for the house pattern).
13. **Display copy that contradicts computed math** — the Family calculator
    printed "$5 voucher every 1,000 pts" while computing $5 per 100 (Task
    117); when a page states a rule, the code and the copy must be pinned to
    the same unit-tested helper.
14. **Money/rule magic numbers at the write boundary** — `placeOrder` once
    inlined 2900/20000/1200/0.09 while `utils.ts` exported named constants
    (Task 117 unified them); every fee the server charges must come from the
    same exported constant the display uses.
15. **Hardcoding structured-data claims** — JSON-LD `availability: InStock`
    regardless of actual stock (Task 118): every crawler-facing claim must be
    derived from the same data the visible page renders.
16. **Default titles that imply unearned trust** — `r.title || "Verified
    review"` stamped "Verified" on unverified user reviews (Task 118); render
    the field only when it exists.
17. **Destroying user state on a failed action** — the cart's promo catch wiped
    an applied code because a NEW apply failed (Task 118); failed actions
    must leave prior state intact, and removal must be an explicit affordance.
18. **Accepting whole-file lineage pastes** — the operator's inter-session
    commits brought a sibling repo's `.env.example`, docker-compose (Redis/
    Stripe/Adminer) and a "Maison" init script for extensions this schema
    doesn't use (Task 118): infra files are code — pin them to the codebase
    with content tests, not convention.
19. **Announcing widget roles without the keyboard pattern** — `role="radio"`
    on buttons with no roving tabindex promised screen readers an interaction
    that never existed (Task 119): use `aria-pressed` toggle semantics, or
    implement the full APG pattern — never half of it.
20. **Deriving crawler-facing claims from stale aggregates** — JSON-LD
    availability read `products.stockTotal`, a seed figure no order ever
    decrements, while the visible BuyBox read live inventory (Task 119):
    every structured-data claim must compute from the same rows the page
    renders.
21. **Per-route limiter Maps that never evict** — four copies of the same
    fixed-window limiter kept every expired key forever (Task 119): one
    factory (`src/lib/rate-limit.ts`) owns the window, Retry-After and the
    expired-key sweep; routes instantiate it.
22. **Letting docs count by memory** — SKILL.md's Appendix B drifted to 50/23
    against a 58/27 reality (Task 119): test counts are documentation claims;
    `tests/unit/docs-counts.test.ts` fs-computes them and fails the run on
    drift, so the same-commit sweep is enforced, not remembered.

23. **Truncating order-boundary fields** — slice() caps are for display
    fields; order fields (address/email/name) must be refused at caps
    (Task 120): a truncated delivery address is a broken order, and
    truncation can launder invalid input into valid.
24. **Check-then-write without a lock** — any validate→insert→mutate
    sequence at a write boundary is a TOCTOU window (Task 120): wrap it in
    one transaction with row locks, or the "refuses what it cannot fulfil"
    claim is timing-dependent fiction.
25. **An unguarded `req.json()` at the busiest route** — the one POST route
    without a parse guard becomes the leakiest (Task 120: checkout 500'd
    with the raw parse error AND echoed driver errors from the generic
    catch). Parse-guard → 400 fixed copy; 500s ship fixed copy only.
26. **`JSON.parse` success ≠ shape success** — a valid-JSON wrong-shape
    payload in a localStorage key sailed past the corrupt-data guard and
    crashed CartProvider's `lines.reduce` at render, taking every route down
    (Task 121): every `createLocalStore` now carries a validate predicate;
    a root `error.tsx` bounds whatever the next unknown crash class is.
27. **Aggregate stock checks for single-store promises** — click-&-collect
    at Jurong passed on Tampines stock while the PDP printed "Jurong: Out of
    stock" (Task 121): scope the availability check to the fulfilment
    source; the aggregate is only honest for delivery.
28. **`useSearchParams` in a client page = empty SSR** — the hook forces the
    CSR bailout, so the component renders only its Suspense fallback in
    SSR; worse, streamed Suspense content lands in a `<div hidden>` that
    only JS reveals — a no-JS crawler sees nothing either way (Task 121):
    read the params in the server component and pass them down.
29. **A verdict rendered before the data settles** — the search page
    initialized `loading: false`, so the hydrated page announced "0 results"
    during the 250ms debounce window (Task 121): verdict blocks gate on a
    settled-for-the-current-query flag, and the e2e proves it by freezing
    the debounce timeout (a polling assertion sleeps right through a
    250ms-wide bug).
30. **Container-shape validation of persisted state** — `Array.isArray`
    accepts `[null]`/`[42]`; the validator must check ELEMENTS (the Task-121
    fix guarded the container only, and the crash class survived it) —
    Task 122: `isValidCartPayload`/`isValidWishPayload`.
31. **A route boundary that cannot catch its crash class** — any client
    component inside the ROOT LAYOUT (CartProvider) crashes through
    `error.tsx`; root-layout crashes need `global-error.tsx` with its own
    `<html>/<body>` (Task 122). Related: recovery from module-poisoned state
    must reload, not `reset()`.
32. **Ungated display of a server-refusable rule** — the promo preview
    ignored `minSubtotalCents` and advertised a discount `placeOrder`
    refuses; every server refusal rule needs its client display gate
    (`effectivePromo`, Task 122).
33. **Finite-looking coercions at write boundaries** — `Number(null) === 0`
    is finite, so a null qty min-clamped to a real qty-1 order; null-check
    BEFORE the numeric coercion (Task 122 F-8).
34. **An unbounded array field at a write boundary** — `lines` had no count
    cap while every scalar had one; a 101-element array became a 101-row
    insert per request (Task 122 F-7).
## 10. Debugging Guide

| Symptom | Root cause | Fix |
|---|---|---|
| Build: "Missed semicolon" in globals.css | Candidate scan read prose (a colon-form class) | Check the `@source not` guard; `rg "aspect-\[" --glob '!src/**'`; rebuild cold |
| Seed logs `SASL: client password must be a string` | Shell-exported `DATABASE_URL` (e.g. a `file:` URL) shadows `.env` | `env \| grep DATABASE`; pin per command |
| `/api/health` 500 with the DB up | Same env shadow, or PG not listening on the pinned port | `status_pg.sh`; verify the URL matches `drizzle.config.json` |
| Checkout 500 `CHECKOUT_FAILED` | Write path has no fallback — DB down/tables missing | Start PG, `drizzle-kit push`, confirm first-read seeding |
| e2e "strict mode violation" on nav links | Same accessible name in drawer + page + footer | Scope to `getByRole("banner")` / drawer locator |
| e2e locator vanishes after click | The accessible name swapped (Open/Close menu) | Anchor on a stable attribute (`header button[aria-expanded]`) |
| e2e count() returns 0 with content present | `count()` does not auto-wait | `await expect(locator.first()).toBeVisible()` first |
| Hydration mismatch warnings about `data-gr-ext-installed` | Browser extension injected attributes (Grammarly et al.) | Not a code bug — test headless |
| `tsc` clean but runtime import error under tests | Test tree not in the app tsconfig scope | `npm run typecheck:tests` (tsconfig.tests.json) |
| e2e POST of a malformed body returns 422, not the expected 400 | Playwright's request API JSON-serializes string `data` (wraps it in quotes → valid JSON) | Send the raw bytes via `page.evaluate(() => fetch(...))` |
| e2e `getByRole("alert")` strict-mode violation | Next's route announcer (`__next_route_announcer__`) also carries `role=alert` | Scope to `page.locator("main").getByRole("alert")` |
| Seeding localStorage in e2e has no effect | The external stores read localStorage once at module load | Seed via `page.addInitScript` (before app boot), never post-load `evaluate` |
| Agent-browser ref extraction returns the whole line | Button refs render as `[expanded=false, ref=e477]` — `\[ref=` patterns miss | `grep -oE "ref=e[0-9]+"` then prefix `@` |
| Search "Try again" button does nothing | `setQ(needle)` with an unchanged value never re-runs the effect | A `retry` counter state in the effect deps (see `search/page.tsx`) |
| Dev page renders but nothing is interactive (no console errors), only via `http://127.0.0.1:3000` | Next 16 `allowedDevOrigins` dropped the `/_next/hmr` websocket (origin host ≠ banner host); the RSC client discarded the inline flight payload and waits forever — `self.__next_f` array(0) | `allowedDevOrigins: ["127.0.0.1"]` in `next.config.ts` (unit-pinned); or open `localhost:3000`. Detect: `Object.keys(document.body).some(k => k.startsWith("__react"))` after load |
| PDP spec parses the wrong JSON-LD node | The root layout's site-level Organization/WebSite graph precedes the page's Product node in the DOM — `.first()` grabs the site one (Task 119) | Select by `@type`: iterate all `ld+json` scripts and pick `@type === "Product"` (see `productJsonLd` in storefront.spec.ts) |
| A green gate contradicts "obvious" file corruption (e.g. `{SLOTS[m…` looks eaten) | The sandbox display layer mangles `[m` sequences in tool OUTPUT — the file bytes are fine (re-confirmed Task 119; Edit-tool arguments can genuinely lose them though) | Verify with `od -c` / `awk NR==n` / a tsc run before rewriting anything |
| Edit/MultiEdit writes land mangled | The Edit-tool argument path ate `[[d`/`[m` sequences in this sandbox (Task 119) | Do bracket-heavy source edits via a python heredoc through Bash with exact-string asserts, then gate with tsc |
| e2e spec needs DB manipulation (zero inventory, cleanup) | The spec runs in Node with repo deps — `import { Client } from "pg"` and the pinned URL (`E2E_DATABASE_URL ?? postgresql://postgres:postgres@127.0.0.1:5432/app_db`) | Manipulate in-test, restore in `finally`; pick products no other spec touches (grep the spec tree for slugs first) |
| DB probe fails `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` | The ambient shell exports a sibling repo's `DATABASE_URL=file:…` (SQLite URL) — it shadows the repo `.env` at module load AND in ad-hoc pg Clients (AGENTS gotcha #10, re-hit Task 120) | Pin the URL per command: `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" <cmd>`; never read bare `process.env.DATABASE_URL` in probes |
| Concurrency e2e passes though the TOCTOU bug is present | A cold pg pool's lazy connection handshake serializes the second concurrent caller behind connection setup — the race window never opens (Task 120) | For deterministic function-level REDs, pre-warm two pool connections before firing the pair; the HTTP-level pair still pins the contract post-fix |
| Computed focus check passes with no visible focus | Tailwind v4's `outline-none` computes `outlineWidth: 1px` with `outlineStyle: none` — width alone is not an indication (Task 120) | Assert `boxShadow !== 'none'` OR (`outlineStyle !== 'none'` AND width>0 AND color≠transparent) |
| Raw-body POST spec receives 4xx instead of the parse guard's 400 | Playwright's request API JSON-serializes string `data` (quoting makes it valid JSON) — the server never sees malformed bytes | Send raw bodies via `page.evaluate(() => fetch(…, { body: '…' }))` — the repo's documented discipline |

## 11. Pre-Ship Checklist

```bash
rm -rf .next && DATABASE_URL=… npm run build
npm run typecheck && npm run typecheck:tests && npm run lint
npm run test && npm run test:e2e
git status   # no .env, *.key, db/*.db, test-results/, playwright-report/
```

Plus: changed surfaces verified at 390 and 1440; SEO surfaces re-pinned if
routes changed; screenshots refreshed for docs surfaces that changed;
README/AGENTS/CLAUDE/PAD/this SKILL + `docs/DEPLOYMENT.md` + `worklog.md`
updated in the same commit (count lockstep: route/test/table counts are
documentation claims — DEPLOYMENT.md joined the pinned six-doc set in
Task 131).

## 12. Lessons Learnt (this lineage)

1. **The display-redaction layer lies.** A tool-output redactor once mangled
   `[msg` into `sg`, making a valid file look like a syntax error that
   contradicted a green gate. Verify exact bytes (hexdump/base64) before
   diagnosing "impossible" states.
2. **Shell env beats the .env file, always.** The ely-beauty lineage hit it
   (`DATABASE_URL=file:…` shadow); NORDHEM hit it again in the sandbox. Pin
   env per command in every server/e2e invocation and document the trap.
3. **A green gate can be stale.** `tsbuildinfo` and a warm `.next` cache can
   mask real failures — cold builds are the only truth (the scan-guard
   failure mode is cache-maskable by design).
4. **Fix lint debt by refactor, never suppression** — the 7
   `set-state-in-effect` errors took an afternoon to fix properly with a
   characterization e2e holding the behavior; the external-store pattern is
   now simpler than the old effect code.
5. **Write the spec's assumptions down in the spec.** The substring traps
   ("Go" ⊂ "ERGONOMI"), the accessible-name swap, and the non-waiting count()
   each cost a test run — the comments in the specs now teach the next agent.
6. **SEO policy must be single-sourced.** robots and sitemap drift
   independently unless a test pins their coherence (a URL in both is a bug).
7. **Order numbers are capability-ish.** `NH-YYYYMMDD-XXXXXX` is unguessable
   enough for a demo, but the public confirmation page still masks PII —
   defense in depth for a page reachable by URL knowledge alone.
8. **Retire dead code when the replacement lands.** The 88-file ely-beauty
   test tree and the config-restorer script were hazards
   (`ensure-build-configs.mjs` would have clobbered the new configs);
   "re-pinning" means writing NORDHEM-native specs, not keeping broken ones.
9. **A printed rule is a spec.** The Family page's own bullet text ("$5
   voucher every 1,000 pts") was the correct spec the code violated ×10
   (Task 117); when copy states a numeric rule, encode it as a named,
   unit-tested constant pair (`FAMILY_VOUCHER_CENTS` /
   `FAMILY_POINTS_PER_VOUCHER`) so the page cannot drift from itself.
10. **Honesty is a UX state.** Fabricated stock on the degrade path and
    confirmations for never-sent requests are worse than an honest "this
    demo doesn't do X" — the checkout's "Demo — no charge" flag is the house
    pattern; apply it everywhere a demo surface promises an action.
11. **Docs rot at the edges.** Task 114 updated the PAD's §7 but left §1.2's
    "not installed" row and Pattern 5's retired code sample stale; a doc
    sweep must `rg` the whole doc set for the old claim (route counts, test
    totals, lineage notes), not just edit the section you touched.
12. **Dev-only bugs are gate-invisible.** The 127.0.0.1 hydration trap
    (Task 118) broke every interactive element on the dev server while ALL
    gates stayed green — the e2e suite boots the production build, which has
    no HMR. When a bug class lives only in one runtime mode, add a probe for
    that mode to the audit ritual (a hydration check is now part of the
    dev-server smoke).
13. **The environment participates in debugging.** Two "impossible" symptoms
    this lineage traced to the sandbox, not the code: a display-redaction
    layer mangling tool output, and Next 16's cross-origin HMR guard. When
    evidence contradicts a green gate, suspect the environment layer next
    (shell env shadows, proxies, origin guards) before rewriting code.
14. **Docs count by memory rot; count by test.** Every remediation cycle
    hand-swept test totals across five documents, and one still drifted
    (SKILL Appendix B: 50/23 vs 58/27 — Task 119). The neo-crm mechanism
    (`tests/unit/docs-counts.test.ts`) turns count-lockstep into a gate —
    and the pin must itself use literal `test()` declarations, because a
    loop-generated test is invisible to the fs regex that counts it.
15. **Site-level JSON-LD changes the spec's DOM contract.** Adding the
    Organization/WebSite graph to the root layout silently broke two PDP
    specs that parsed `script[ld+json]` with `.first()` — new global markup
    shifts DOM order; select structured data by `@type`, not position.
16. **The display layer lies in both directions.** The Task-114 lesson
    (output mangling `[msg` → `sg`) recurred with `[m` during Task 119 —
    AND its inverse appeared: the Edit-tool path genuinely ate bracket
    sequences from new_str, corrupting the file. od/tsc before trusting
    either direction.

17. **A pin that doesn't cover a doc doesn't pin it.** The Task-119
    docs-counts pin covered AGENTS/README/CLAUDE/SKILL — and the PAD rotted
    one file over (live-tense 50/23, 58/27, 5-files/58 sites). Task 120
    extended the pin to the fifth doc. When you build a self-truthing
    mechanism, enumerate EVERY surface it must guard, then add a test that
    fails when a covered claim site moves.
18. **Refuse, don't truncate, at order write boundaries.** Silently
    slicing a 300-char address to 200 creates a delivery-breaking order AND
    can transform invalid input into valid (a truncated string could pass a
    length check it should have failed). Caps on customer-facing order data
    return 422 with field copy; slicing has no remaining write-boundary use
    (reviews refused at caps since Task 122 F-11 — display-layer formatting
    is the only sanctioned slicing).
19. **A check that isn't atomic isn't a check.** The Task-119 LOW_STOCK
    validation read availability, inserted the order, then decremented —
    three statements, one window: two concurrent last-unit orders both
    passed. The function-level RED needed a pre-warmed pool (a cold pool's
    lazy handshake serializes the second caller and masks the race). The fix
    is one `db.transaction()` with `SELECT … FOR UPDATE` (ordered by id for
    deterministic lock acquisition). Sibling lesson: Playwright's request API
    JSON-wraps string `data` — raw-body probes go through the browser's
    fetch.
20. **Metadata is product copy.** The /family description claimed a 20×-lower
    earn rate than the page's own calculator printed beside it, plus
    "members-only workshops" that don't exist. Route descriptions must be
    verified against the surface's computed math, the same way visible copy
    is — the e2e blanket now pins the earn-rate agreement.
21. **Run the RED before believing the finding.** The Task-121 audit flagged
    PDP→PDP stale review state as Medium with a plausible mechanism (same
    tree position, useState persistence) — the RED spec passed immediately:
    the App Router remounts the page subtree on dynamic-param navigation.
    The spec stayed as a pin; the "fix" (keys) would have been dead code.
    Theory is a hypothesis until the failing test exists.
22. **The `[m` display-layer trap produces convincing fake corruption.**
    Tool output this session showed `const ethod, setMethod]` — a missing
    `[m` — in a file that typechecked, built and passed 43 e2e tests.
    Byte-level verification (char codes via python) proved the file intact;
    the display layer eats `[m` sequences in Bash output. ALWAYS verify
    "impossible corruption" at the byte level before fixing it.
23. **A swallowed catch inside a transaction is a lie.** The decrement's
    `try/catch { /* non-blocking */ }` promised best-effort semantics, but a
    failed UPDATE aborts the surrounding Postgres transaction — the COMMIT
    then fails and the whole order 500s. Either remove the catch (fail
    closed, honestly) or use a SAVEPOINT; never write a comment the
    transaction semantics cannot deliver (Task 121).
24. **Playwright's toHaveText can sleep through a flash.** A wrong-state
    flash that lasts ~250ms (hydration → debounce) passes a polling
    assertion that only checks the settled text. Freeze the state instead:
    patch setTimeout in an init script to hold the page in the pre-settle
    window, assert, then unfreeze and assert the settle path (Task 121).
25. **Error boundaries are placement-sensitive (Task 122 F-2).**
    `app/error.tsx` wraps the PAGE subtree only — a client component
    rendered inside the ROOT LAYOUT (CartProvider) crashes through it onto
    Next's unbranded default page. Root-layout crashes need
    `app/global-error.tsx`, which owns its own `<html>/<body>`. And the
    recovery for module-poisoned state must `window.location.reload()` —
    `reset()` re-renders against the same poisoned module snapshot and
    loops forever. Verify BOTH boundary classes with a temporary-throw
    probe; the dev overlay intercepts real clicks, so click via DOM
    (`element.click()` through eval).
26. **A worklog claim is not a fact (Task 122 F-1).** Task 121's stage
    summary said "19 findings fixed TDD-first" — the true record was 18
    fixed + 1 disproven + 1 silently skipped (the SGT date fix was planned,
    listed, and never implemented; its PAD row said "Fixed"). A fix without
    a pin is a claim: when a finding's fix has no test evidencing it, treat
    the claim as unverified and re-run the plan's ToDo list against the
    code. The docs-counts pin guards counts, not fix claims — the gap is
    closed by checking `rg <symbol> src/` for every named seam in a
    previous plan before building on it.
27. **RED e2e runs leave DB residue (Task 122).** A spec whose RED path
    succeeds in writing (an order placed, a review inserted) leaves that
    row behind — the GREEN path refuses it. The residue broke an
    UNSUSPECTING hard-count pin from a prior cycle ("Reviews (2)" — a
    probe review made it 3). Clean between runs (track inserted ids,
    delete in `finally`), and when a previously-green count pin fails,
    check the table for probe rows before touching the spec.
28. **Display gates must mirror server refusals (Task 122 F-5).**
    `findPromo` dropped `minSubtotalCents`, so the cart preview kept
    showing WELCOME10's 10% after item removal while `placeOrder` refused
    it — display/server divergence on a NEW axis after Task 119 closed the
    money-math one. Rule: every server-side refusal rule (promo minimums,
    stock, caps) needs a client-side display gate, or the UI advertises
    what the API will reject. `effectivePromo(code, subtotalCents)` is the
    pattern — one seam, both preview sites consume it, unit + e2e pinned.
29. **A display gate is only half the fix — the message must agree
    (Task 123 F-2).** The Task-122 F-5 gate hid the discount ROW below the
    promo minimum, but the "CODE applied" MESSAGE kept advertising the
    code (browser-reproduced: green "WELCOME10 applied" beside a vanished
    Discount row, and the code still submitted to a server INVALID_PROMO).
    Rule: when a gate hides a UI element, audit every sibling element that
    claims the same state — message, badge, button copy — or the fix
    ships its own contradiction. `findPromoMinimumCents` feeds the honest
    "needs a $150.00 minimum" notice; the CURRENT bag state owns the
    message, not the apply-moment transient.
30. **The oldest spec in the suite is the least likely to follow its own
    discipline (Task 123 F-1).** The flagship journey spec placed a real
    order on every run with no cleanup while four younger siblings all
    restored their DB state — the residue drained makan Tampines 24 → 20
    across sessions and would have broken the journey's own checkout at
    ~42 runs. Rule: when a suite-level discipline lands (gotcha #13),
    sweep EVERY DB-touching spec — including the ones written before the
    rule existed — and make RED-capable probes self-cleaning (a reverted
    boundary turns a refusal spec into a writer).
31. **Restored snapshots lose DDL and empty directories (Task 123
    baseline).** The sandbox pgdata restore came back missing the Task-122
    unique index (the fs snapshot predated the push — the F-12 e2e pin
    failed at baseline) AND the initdb empty subdirectories (pg_notify,
    pg_logical/snapshots…) that archivers skip. Rule: after any DB
    restore, verify the SCHEMA (pg_indexes) against drizzle-kit's
    expectation — not just the row counts — and recreate the empty PG
    subdirectory set (pg_notify, pg_commit_ts, pg_dynshmem, pg_replslot,
    pg_serial, pg_snapshots, pg_stat, pg_stat_tmp, pg_tblspc,
    pg_twophase, pg_subtrans, pg_logical/{snapshots,mappings},
    pg_multixact/{offsets,members}) before pg_ctl start.

32. **A settle gate must cover EVERY axis a verdict has (Task 124 F-3/F-13).**
    The Task-123 F-4 fix gated the search error BOX on the settled needle —
    but the product GRID still rendered the previous query's cards beneath a
    failed re-search's error box, and the Try-again retry kept the box
    through its own debounce window (loading only flips inside the 250ms
    timeout the lint rule forbids setting sync). Rule: when a settle-gate
    lands, enumerate every UI element that renders from the same data
    (grid, verdicts, error box, counts) AND every trigger that changes the
    data (needle change, retry, param change) — gate them all on the same
    settled marker (`settledFor === needle && settledRetry === retry`).

33. **A cleanup keyed on a captured success strands on failure (Task 124
    F-2).** The journey's finally deleted by an order number captured only
    AFTER the confirmation assertions — a 201 followed by any assertion
    failure left `placedOrder` null and the row stranded (browser-
    reproduced with an injected `expect(false)`; the settle wait is needed
    too: a failure injected immediately after the Pay click aborts the spec
    while the POST is in flight and the order lands AFTER a zero-wait
    delete). Rule: probe cleanup keys on the probe's OWN identity (email +
    spec-start window), never on a value captured post-hoc.

34. **Pin docs CLAIMS, not just counts (Task 124 F-1).** The docs-counts
    pin guarded test totals while three operator-doc sites still documented
    the pre-Task-123 `/api/health` body — envelope claims rotted straight
    through a cycle whose title was "docs honesty". The pin file now asserts
    the shipped body text appears at every live health-claim site. Rule:
    when a self-truthing mechanism exists, ask what OTHER claim classes the
    docs make, and pin the load-bearing ones the same way.

35. **A pinned seam is an audit multiplier (Task 124 F-12).** The API filter
    and the shop-SSR searchProducts carried identical duplicated literals
    that line-auditing had just re-synchronized by hand (Task-123 F-5);
    extracting `matchesProductQuery` and pinning it exposed a live bug
    neither the audit nor the e2e caught — the needle was never lowercased,
    so "Outdoor" returned 0 results on both seams. Rule: duplicated logic
    is not just drift risk, it is audit blindness; extract the seam and the
    pins write the bug reports the audit missed.

36. **When a seam becomes temporal, every pin touching it becomes temporal
    too (Task 125 F-1).** Task-124 F-8 made the click-collect slot options
    clock-sensitive — and the Task-121 method-switch spec asserting that
    exact set kept running on the real clock. The suite's green runs had
    simply all happened before 14:00 SGT; the first post-cutoff run would
    have gone red with zero code change (AGENTS' "the local gate is the
    only gate" makes that a commit blocker). Rule: when a behavior gains a
    time axis, grep every existing assertion over that behavior and pin
    the clock the same way the new seam's own specs do — and prove the
    bomb honestly by running one pinned past the boundary before pinning
    before it.

37. **The leftmost XFF hop is the client's own forgery (Task 125 G-2).**
    Four routes read `x-forwarded-for.split(",")[0]` — the FIRST hop is
    written by whoever sent the request, so a direct-deploy client rotates
    its own rate-limit buckets by sending changing fake XFF values; only
    the RIGHTMOST hop is the one the nearest proxy appended. Rule:
    rate-limit identity derives through one shared seam (`clientIp`),
    takes the rightmost hop, and falls back to one shared "direct" bucket
    — and when a real proxy fronts the app, strip ITS hop there, not in
    four routes.

38. **A controlled select lies about its value when the option set
    shrinks (Task 125 F-6).** With `form.slot` holding "Today 2pm" and
    the clock crossing the cutoff, the options dropped it — the browser
    displayed the first remaining option while React state (and the POSTed
    payload) still carried the stale slot. The divergence is invisible to
    any display-only assertion: the pin must capture what the server
    RECEIVES (intercepted-POST payload), not what the select renders.
    Rule: display/state agreement needs a payload-level pin, and a held
    value that leaves its legal set must be re-derived during render (the
    adjust-during-render pattern covers clock crossings, not just method
    switches).

39. **A safety net that runs after a failing assertion is dead code
    (Task 126 F-2).** The Task-123-era net guarded its cleanup with
    `if (res.status() === 201)` AFTER `expect(res.status()).toBe(422)` —
    but the failed expect THROWS past the if-block, so the net never fired
    on exactly the RED runs it existed for (it was a no-op on GREEN runs
    too). Rule: cleanup for a spec whose RED path writes must live in a
    `finally` (or run before the assertions) — and the honest proof is to
    temporarily revert the boundary, watch the row strand, then watch the
    net clean it with the boundary still broken.

40. **Trace insert order before believing a partial-state reachability
    claim (Task 126 AUD-3).** The audit claimed an early-return check could
    strand half-seeded tables — but the inserts it worried about all run
    BEFORE the state the early return requires, so the claimed state was
    unreachable. Program order is executable truth: an early-return
    condition over tables X+Y can only strand tables that insert AFTER the
    last of X/Y. Rule: reachability analysis walks the code's actual
    sequence, not the condition in isolation (the second audit disproof in
    the lineage — authority is not evidence).

41. **Idempotency is a three-part pattern, not a column (Task 126 F-1).**
    The unique index dedupes; the pre-transaction fast-path replays the
    sequential case cheaply; the unique-violation catch replays the
    concurrent race (the loser's transaction rolled back — insert AND
    decrement — so nothing double-burns). The key must be client-minted
    once per INTENT (per checkout-page mount: a remount is a new intent,
    an error-path retry is the same one), survive non-secure contexts
    (crypto.randomUUID throws on plain HTTP — the getRandomValues
    fallback), and — Task 127's completion — replay with
    ownership-as-authority: bind BOTH replay paths to the bound order's
    own identity field (email, case-insensitive) and run the fast path
    BEFORE payload validation (a post-success resubmit with an emptied
    bag must replay, not EMPTY_BAG-refuse; a leaked key must get a
    refusal, never the victim's receipt). Answer 200 on replay vs 201 on
    create — the client treats both identically, the semantics stay
    honest.

42. **JSX entities do not decode inside template literals (Task 127 F-1).**
    Moving copy from JSX text children into `{`…`}` silently changes its
    semantics: `&amp;` renders as `&amp;`, not `&`. The Task-126
    fee-derivation did exactly this and every PDP shipped "Click &amp;
    Collect" with all gates green (no spec asserted the string). Rule:
    after a JSX-text → template-literal refactor, grep the migrated
    string for `&[a-z]+;` — and pin user-visible copy strings that no
    test asserts.

43. **String() coercion is a boundary hole even when every validator
    passes (Task 127 F-2).** Three cycles of TYPE-strictness hardening
    (lines, reviews POST, read boundaries) missed the checkout route's
    five FREE-TEXT fields — `String(body.x ?? "").trim()` happily
    coerces `["a@b.sg"]` into a valid email, and a fully array-typed
    payload placed a real 201 order. The discipline: audit boundary
    strictness by FIELD CLASS (free-text, enum, numeric, array-of-
    structs), not by route — a class fixed on one route is still open on
    its siblings until each is checked.

44. **An SGT seam that reads the server-local calendar is a latent
    timezone bug (Task 127 F-7).** `campaignEnd()` computed `new
    Date(now.getFullYear(), 11, 28)` — fine on an SGT server, 16 hours
    wrong on UTC (priceValidUntil rolled to next year during the
    campaign's final day). When a codebase has ONE time-zone discipline
    (UTC+8 arithmetic + getUTC* reads), EVERY date seam follows it; and
    when a seam returns a true-SGT instant, its LABEL must format with
    `timeZone: "Asia/Singapore"` (else the instant renders a day early
    on any other server) and its ISO-date consumers must render the SGT
    CALENDAR date (en-CA YYYY-MM-DD), never the UTC slice.

45. **A parse guard proves the body PARSES, not that it is a record
    (Task 128 F-1).** `req.json()` inside a try/catch answers only the
    JSON-syntax question; `null`, `5`, `"x"` and `true` are all VALID
    JSON — and the first `"field" in body` / `body.field` on them is a
    TypeError that the outer catch reports as a 500 "failed on our
    side" for a pure client fault (browser-verified on all four POST
    routes). The shape guard (`typeof body === "object" && body !==
    null && !Array.isArray(body)`) belongs BESIDE the parse guard, in
    the same client-fault 400 class — and arrays need the decision too
    (they parse, they are objects, but they are not the record the
    boundary's field reads assume).

46. **A docs claim about pins must be verified against the PINS, not
    the code (Task 128 F-2/F-3).** Task 127's summary said "the GST +
    family e2e pins derive" and "the interaction-first specs navigate
    through gotoHydrated" — both HALF true: the code derived with zero
    family/shop/offers pins to catch its rot, and 13 interaction-first
    gotos (including a /cart site two sweeps missed) still raced
    hydration bare. Claims about test coverage rot exactly like counts;
    re-derive them mechanically each cycle (grep the pins, re-scan
    goto-followed-by-interaction) instead of trusting the prose — and
    prefer making the claim true (add the pins, convert the gotos) over
    rewording it.

47. **A write-capable spec is a write-capable spec — the refusal/positive
    distinction is not the net boundary (Task 129 F-1).** The Task-126
    F-2 / Task-128 F-7 finally-net program swept "refusal specs" and the
    docs claimed "every write-capable refusal spec carries its RED-run
    net" — while three specs whose RED paths genuinely WRITE sat outside
    both sweeps (the nullqty order probe, the overlong-review-body probe,
    the bad-rating probe; a boundary regression in each inserts a real
    row), and the one positive-control writer cleaned up under an if-block
    a `json()` throw could skip. The correct sweep key is WRITE
    CAPABILITY — "does this spec's RED path insert or decrement a row?"
    — applied to every DB-touching spec, refusal or positive, every time
    the net discipline lands (lesson 30's rule pointed at the net program
    itself). Phrase the docs claim by the same key ("every write-capable
    spec"), or the claim rots one class over.

48. **An enum field's silent default is a coercion hole — and check the
    UI's own null encoding before refusing nulls (Task 129 F-3).**
    `["card","paynow",…].includes(String(body.paymentMethod))` is kind to
    absent fields and hostile to crafted ones: `paymentMethod: ["card"]`
    String()-coerced into a REAL 201 order, and unknown strings silently
    rode the documented default while the enum siblings (storeSlug,
    deliverySlot) refused. The enum-class discipline: present-non-string
    → 422 AND unknown-string → 422, absent keeps the documented default
    (the storeSlug/deliverySlot posture — lesson 43's field-class audit
    extended to enums). And before refusing `null` on a nullable field,
    read the primary client: `promoCode: null` is the checkout page's own
    "no promo" encoding (it always sends the key) — refusing it would
    have broken the UI the boundary exists to serve.

49. **A check that reads different rows than its write is a phantom-unit
    mint (Task 130 F-2).** placeOrder's availability check summed ALL
    stores for delivery while the decrement hit ONE row with a
    `greatest(0, …)` clamp — a 17-unit delivery order against 15+3+0 stock
    passed the aggregate, clamped the store to 0, and 2 units materialised
    from nowhere; the table then overstated stock for every later refusal.
    Rule: at any write boundary, the CHECK and the WRITE must read the
    SAME rows — and when choosing between "widen the write" (multi-store
    drain) and "narrow the check" (scope to the fulfilment store), weigh
    the tooling around the seam: the e2e RED-run nets restore inventory
    post-hoc from the order rows, and a multi-store drain is not
    reconstructible after the fact — the symmetric-by-construction option
    wins even when it narrows a capability.

50. **fullyParallel serialises nothing — shared DB state must not overlap
    across specs in the same file (Task 130 F-3).** The saturation spec
    inserted 21 reviews on HAVBRIS while two sibling specs asserted
    `Reviews (0)` on the same product — `fullyParallel: true` parallelises
    tests WITHIN a file too, so the insert window raced the zero-review
    assertions (CI was safe only because `workers: 1`). Rule: when a spec
    mutates shared DB state, grep the suite for every other consumer of
    that entity BEFORE choosing its fixture — the overlap is an accident
    of product choice, not a necessity, and quiet entities are plentiful.
    The same rule applies to inventory: the LOW_STOCK/JSON-LD specs each
    own a distinct product for a reason.
51. **A count-honesty fix that lands one surface short CREATES a visible
    contradiction where none existed.** Task 130's F-8 made the wishlist
    heading count resolved items while the header badge still counted
    persisted slugs — before the fix both surfaces lied consistently
    (invisible); after the half-fix they disagreed side by side ("Wishlist,
    2 items" above "Your wishlist (1)"). When fixing a rendered count, sweep
    EVERY surface that renders it; where a surface genuinely cannot resolve
    (the Header would need a catalogue fetch on every route), make the
    honest page EXPLAIN the difference instead of leaving two truths
    unqualified.
52. **A `git log --since DATE` filter includes DATE itself — boundary-day
    commits hide in the inclusive edge.** Six cycles of "zero src/tests
    changes since 2026-10-23" missed that the boundary day itself carried
    ff65bd2 (a src/tests commit); the audits were true in substance but
    imprecise in claim. Date filters narrow a search; a SHA names a
    boundary. State quiescence as "no changes after <sha>; the N subsequent
    commits are docs/skills only" — precise, checkable, and immune to the
    inclusive-edge trap.
53. **A test tree is a program that runs on the OPERATOR's host — its
    clock is an input, and undesignated date-time literals are
    host-coupled bugs (Task 132 F-1).** ECMAScript parses a date-TIME
    literal without a timezone designator (`new Date("2026-12-27T12:00:00")`)
    as LOCAL time — on UTC−5 hosts that instant is 17:00Z, past the
    campaign's Dec-27-16:00Z end, so a correct implementation answers 2027
    while the pin demands 2026: a deterministic false RED (observed live
    with `TZ=America/New_York`). The now-relative sibling class derives its
    expectation with LOCAL getters while the impl reads `getUTC*` — a
    false RED 8h/day on the project's OWN locale. Rule: when a seam goes
    TZ-pure (impl swaps to `getUTC*`/`Z`-suffixed instants), sweep the TEST
    TREE for the old idiom in the same commit — the impl fix and the pin
    fix are one change; hold the class closed with an fs-pin (zero Z-less
    date-time literals under `tests/unit/`) and verify GREEN under three
    timezones (UTC / the project locale / a far-western one). Do NOT pin
    `TZ` in the vitest config to "fix" it — that silently converts the
    NEXT TZ-coupled test into an always-pass; the honest gate fails loud
    on the wrong host instead.
54. **A structural fs-pin must bind the site it claims to protect — a
    presence-only regex is satisfied by ANY occurrence (Task 132 F-2).**
    The Task-131 fulfilment-seam pin asserted the file CONTAINED
    `eq(inventory.storeSlug, fulfilStore)` somewhere; the availability lock
    satisfied it alone, so a decrement rewritten to any other expression
    passed both pins while check and decrement drifted apart — the exact
    phantom-unit class the pin existed to close (demonstrated by temporary
    mutation: the old pin stayed green on the mutated tree). Rule: an fs-pin
    that guards a relationship BETWEEN two sites must count or slice the
    occurrences so each site is bound ("exactly twice — lock AND
    decrement"), and the pin-strengthening's RED vehicle is the mutation
    demo: temporarily introduce the drift shape, observe the OLD pin stay
    green (the blindness proven) and the NEW pin go RED, then revert.
    Task 133 widened the class twice (the pin-hardening batch, both
    mutation-proven): the TZ fs-pin now also fails on NUMERIC-ARGS Date
    constructors (a string-literal-only scan was blind to the year-first
    form — the same LOCAL-time class), and the PERSISTED_STORAGE_KEYS
    producer scan is FAIL-CLOSED (a call whose first argument is a template
    literal/lowercase const previously escaped the scan silently — the
    pattern must match every call site or fail by name; a scan that
    silently skips non-conforming shapes is a pin that lies).
55. **Validate the STORAGE range, not just the JS type — every id/quantity
    boundary has an int4 ceiling the driver enforces for you as a 500
    (Task 133 F-1).** `productId: 2147483648` is a number, an integer, and
    positive — it passes every JS gate — but Postgres rejects the parameter
    for the int4 column (22003 value out of range), and the route's generic
    catch answered 500 REVIEW_FAILED for a pure client fault while its own
    comment claimed the FK-crash class closed (Task 118 F-6 had probed the
    LOWER bound and the unknown-id corner; the UPPER bound was never
    probed — proven live on the dev server before the fix). The read-verb
    sibling silently degraded to `[]` — inconsistent with its own 1.5 → 422
    stance. Rule: when a boundary takes a numeric id/quantity, bound it by
    the COLUMN'S storage range (the shared `MAX_INT4` seam), not just by
    JS-level integer/positivity checks — and probe the full numeric range
    (negative, zero, fraction, unknown, and the storage ceiling), because
    the comment that says "closed" only covers the shapes its author
    thought to test.
56. **A cleanup net is complete only if it restores EVERYTHING the write
    path mutates — audit nets by content diff, not by presence (Task 133
    F-2).** The typeqty e2e spec's finally deleted the order rows with two
    manual queries but never restored the inventory decrement — and both
    uniform-net sweeps (Tasks 126/129) passed it by because the spec *had*
    a finally. The uniformity claim ("every write-capable refusal spec
    carries the full net") was audited by presence, not by content: the
    diff that matters is what the write path mutates (orders + order_items
    + inventory) minus what the net restores. Rule: sweep RED-run nets by
    content — for each write-capable spec, enumerate the mutated tables
    from the code path and check the finally inverts every one (the shared
    `deleteProbeOrders` helper exists precisely so this diff is one call);
    a partial net is a delayed flake (gotcha #13's exact failure mode,
    stranded silently across RED runs).
57. **A fix that ships two halves must pin both halves at the same tier —
    audit coverage by SYMMETRY, not by presence (Task 134 F-1).** Task 133's
    uniqueness layer landed on the cart and wishlist predicates together,
    but the e2e probe was written for the wishlist half only; the cart half
    — the MORE severe consequence (duplicate React keys + doubled subtotal)
    — kept the unit pin alone, and the commit message's "unit-pinned +
    e2e-probed" was true of only one of the two. A per-file grep for the
    key name (the usual sweep) found the one seeding site and read it as
    covered — the asymmetry only surfaces when you ask, for EACH half of a
    two-surface fix, "which tier pins THIS half?". Rule: when a fix names
    two surfaces, enumerate the pin tier of each; a GREEN-on-arrival pin
    must still be mutation-proven against its own half (disable the guard,
    watch the probe fail).
58. **The platform layer answers some crafted-input classes before your
    code runs — pin what the APP can own, register what the PLATFORM owns,
    and prove which is which by mutation (Task 134 F-2).** The order-URL
    decode corner looked like an app-guard question (decodeURIComponent
    inside a try, URIError classified to not-found); the pin attempt
    surfaced the truth — Next 16's route matcher decodes path segments
    itself and a raw malformed-percent request throws DecodeError INSIDE
    the router (prod: bare platform 500, no log; dev: 400) before any page
    code runs; browser URL parsers normalize a lone `%` to `%25` first, so
    the raw class is curl-only. The in-page URIError guard is unreachable
    defensive depth on this version (hoist-mutation kept the probe GREEN —
    the guard never fires through the public interface). Rule: before
    pinning a "my code handles X" claim on a request-input class, run the
    crafted input against the PRODUCTION build and against a mutation of
    the guard — the observable (which layer answers, with what status) is
    the pin; the unreachable guard stays as depth with an honest comment,
    and the platform-owned class becomes a register row, not a code fix.
59. **A clamp shipped as literal Math.min/Math.max forms is one edge short
    of NaN — route every qty writer through the shared isFinite clamp seam
    (Task 135 F-1).** The Task-134 floor fix (`Math.min(99, Math.max(1, …))`)
    looked complete — but `Math.max(1, NaN)` is NaN (stores NaN) and
    `Math.max(1, 3.7)` is 3.7 (stores a fractional qty), and the sibling
    writer `setLineQty` (`Math.min(99, Math.floor(qty))`) floored 0.5 to a
    qty-0 line that violated the store's own load predicate. The project
    already had the answer: `clampInt` (floor + isFinite guard + min/max)
    at the server's qty seams. Rule: when the same domain value is
    written at N seams and one seam has the stronger guard, don't
    replicate the weaker literal at the others — route all N through the
    one seam and fs-pin the routing so a future writer cannot silently
    regress to the literal form.
60. **An envelope's `ok` is not a resolution — the consumer must verify the
    `data` shape before treating absence as empty (Task 135 F-5).** Both
    client pages read `json.data ?? []`: a well-formed 200 `{ok:true}`
    with NO `data` (contract violation, not network failure) rendered
    the wishlist's FALSE all-ghost note and search's false "0 results"
    verdict — customer-facing claims derived from a resolution that never
    happened. The fetch-failure pair pinned the network-error class but
    left the body-shape class open; the Task-128 boundary discipline
    (guard the body's SHAPE, not just its parseability) applies client-side
    too. Rule: `ok !== resolved` — gate every consumer on
    `Array.isArray(json.data)` (or the shape the contract promises) and
    let the malformed envelope take the error path; pin it with
    route-fulfilled contract-violating bodies beside the abort-based
    siblings.
61. **A class closed at N seams is not closed at N+1 — audit the sibling
    count before declaring a rollout complete (Task 136 F-1).** Task 135
    gated the envelope-trust seam at wishlist and search, wrote the
    completion claim, and moved on — but `/api/products` had THREE client
    consumers, and the third one was the shop grid, the primary catalogue
    funnel, still shipping the pre-fix `json.data ?? []`. The recurring
    shape: fix the siblings you found, pin them, and the completion
    narrative quietly scopes itself to the fixed set. Rule: when a fix
    targets "every X that consumes Y", enumerate the consumers
    mechanically (grep the fetch call sites) and pin the LAST one's
    absence-of-fix as the completion test — the missing sibling is
    invisible to a plan written from the fixed set.
62. **A golden rule without a pin is a comment, not an invariant — the
    funnel must be enforced where it can be violated (Task 136 F-2).** The
    PAD's "every DB touch funnels through server-data.ts; a page importing
    @/db directly is an architecture violation" stood for 22 cycles while
    the order page violated it literally and the reviews POST was the only
    write path outside the funnel — every audit read the rule as prose
    about intent, not as a checkable claim. The fix is not just the refactor
    (move the reads/writes into seams) but the fs-pin that walks `src/` and
    fails the run on any new `@/db` import outside `src/db/**`,
    `server-data.ts`, and the documented health-probe exception. Rule:
    architectural invariants that can be expressed as import-graph
    properties belong in the unit suite as fs-pins, with explicit,
    documented exception lists — prose rules rot silently; pinned rules
    fail loudly.
63. **A combined degrade signal must be derived ONCE and consumed by EVERY
    downstream claim — OR-ing two independent degrades at the top while
    downstream consumers trust their own signal recreates the incoherence
    the OR was supposed to fix (Task 137 F-1).** The two review seams
    degrade independently (separate try/catch), the page ORs the nulls
    into `reviewsUnavailable` — but the JSON-LD `aggregateRating` gate
    trusted `reviewCount` alone and the section's `initial` passed the
    live list through, so a PARTIAL outage (one query timed out, the other
    answered) rendered the "unavailable" note above live reviews, or
    published a rating the page disavowed. The full-outage test hides the
    split (both null → both consumers agree); only the partial branch
    exposes it. Rule: when two data sources feed one render, enumerate
    every consumer of each source and gate them all on the SAME combined
    signal; and make SSR-derived degrade state RECOVERABLE client state
    when a successful write can disprove it (the note unmounts, the count
    resumes) — a mount-frozen note survives the recovery that falsifies
    it.
64. **Behavior that cannot be e2e-driven without killing the live server
    ships unpinned — characterize it with fs-pins and prove each with a
    mutation demo (Task 137 F-3, the Task 131 F-2 precedent extended).**
    The Task-136 outage branches (getOrderByNumber's outage-vs-not-found
    discrimination, the order-page outage copy, the PDP unavailable note,
    the reviews-GET DB_DOWN envelope) were correct but unpinned: a
    regression swapping `"outage"` for `null` would render the false
    "can't find that order" verdict under a dead DB with every gate green.
    The honest vehicle for branches that need a dead DB to fire: pin the
    source structure (the discrimination forms, the shipped copy strings)
    and run a temporary mutation for each pin to prove it fails when the
    guarded behavior drifts — a characterization pin without its mutation
    demo is a claim, not a net. Rule: every outage/degrade branch joins
    the pin set in the same cycle that ships it, or it ships as
    unregistered debt that the next outage silently regresses.

65. **Auto-retrying assertions BRIDGE transient windows — pin the commit
    itself (Task 138 F-1, the resync-window probe).** A 250 ms-debounce
    honesty gap (the fresh category heading rendering above the departed
    view's rows and count) is invisible to `toHaveCount(0)` /
    `toBeVisible()` assertions: Playwright retries them until the debounce
    flips the state, so the first probe draft false-passed GREEN against
    the unfixed tree. The honest vehicle: capture the DOM at the exact
    commit (a MutationObserver keyed on the heading, resolving the
    strip/skeleton/rows state into a window variable) and hold the
    triggering fetch open (`page.route` with a never-resolving handler) so
    the intermediate state persists. Sibling trap: `document.body
    .textContent` includes the RSC flight-payload `<script>` text — an
    SSR-embedded product name matches FOREVER; scope text searches to
    rendered elements (product-card links in `main`), not the whole body.

66. **A settle gate closed for the terminal states is not closed for the
    transitions between them (Task 138 F-1).** The Task-137 strip gate
    suppressed the count claim under `loading || error` — but the resync
    window between two server views stayed `loading=false` until the
    debounce fired, so the departed view's count rendered above the fresh
    heading with the gate green. The fix belongs at the TRANSITION itself
    (the sanctioned adjust-during-render block flips `loading` when the
    server view changes under an active filter), not inside the async
    callback — the callback only ever runs late. Rule: when a discipline
    names its states, audit the gaps BETWEEN the states before declaring
    the class closed.

## 13. Pitfalls to Avoid

- Adding state/auth/payment SDKs without a decision record (ADR-006 deferrals
  are contracts).
- `next/image` conversions (no local pipeline; `<img>` + eslint-disable is
  the pattern).
- Editing `skills/` (vendored reference; excluded from checking/testing/compilation).
- Pushing without the cold-build gate, or with a key inside the repo (wrapper
  runbook: `docs/ssh_git_wrapper_v3.py` with the **mandatory** `--remote`
  override — its default still targets the predecessor repo).
- New branches (main only, Conventional Commits, atomic units).

## 14. Best Practices

- Route handlers: validate at the boundary, delegate to `server-data.ts`,
  wrap in the envelope, log with a route-prefixed `console.error`.
- Money/logic changes: TDD at the pure seam first (`priceTotals` etc. with
  WORKED examples from verified orders, not recomputed expectations).
- E2E against the production build; the webServer pins its own env.
- Keep helper modules small and pure (`utils.ts`, `mask.ts`, `local-store.ts`)
  — they are the unit-test surface.
- Screenshots for docs from the dev server, gate evidence from the build.
- Test-count changes: run `npm run test` BEFORE the docs sweep —
  `tests/unit/docs-counts.test.ts` names the stale claim site in its failure
  message; fix every named site in the same commit.

## 15. Coding Patterns (representative)

```ts
// Degrade-fallback read (server-data.ts)
export async function getAllProducts() {
  await ensureSeed();
  try { return await db.select().from(products).orderBy(products.id); }
  catch { return PRODUCTS.map((p, i) => ({ ...p, id: i + 1 })); }
}

// External store consumption (cart-store.tsx)
const lines = useSyncExternalStore(linesStore.subscribe, linesStore.getSnapshot, linesStore.getServerSnapshot);

// Adjust-during-render (search/page.tsx)
const [prevParamQ, setPrevParamQ] = useState(paramQ);
if (paramQ !== prevParamQ) { setPrevParamQ(paramQ); setQ(paramQ); }

// Money truth (placeOrder — the verified example)
// 259800 − 10% (25980) = 233820 ≥ 20000 → delivery 0; GST = round(233820×0.09/1.09) = 19306

// JSON-LD with escape (product/[slug]/page.tsx)
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
```

## 16. Coding Anti-Patterns (inverse of §15)

- `useEffect(() => setState(readLocalStorage()))` — the exact pattern §6 replaced.
- Inline promo-value switches in pages (use `findPromo`).
- Raw `JSON.parse` of client input without narrowing (`unknown` + checks).
- `any` (strict repo; use `unknown` + narrowing).
- Importing `@/db` from pages/components (Layer rule).

## 17. Responsive Breakpoint Reference

| Breakpoint | Surface |
|---|---|
| `< 768px` (md) | Mobile: hamburger + drawer (`lg:hidden`), inline mobile search (last in DOM), 2-col grids |
| `768–1023px` | Tablet: utility links + desktop search appear; hamburger + drawer still present (no category nav) |
| `≥ 1024px` (lg) | Desktop: category nav (`hidden lg:block`), store picker; hamburger/drawer unmount from the a11y tree |

Breakpoints in play: `sm` (640) spacing, `md` (768) search/utility, `lg`
(1024) nav/drawer switch. The drawer is conditionally MOUNTED (`{open && …}`)
— no classList toggling, so no Tailwind v4 dynamic-class purge risk.

## 18. Z-Index Layer Map

| Value | Element |
|---|---|
| `z-50` | Sticky `<header>` |
| `focus:z-[100]` | Skip-to-content link |

That is the entire map — no modals, no portals. Keep new overlays above 50
and below 100.

## 19. Color Reference (complete)

See §4 — plus one-off literals worth knowing: `#cc0008` (discount badges),
`#e5a000` (star ratings), `#e8f3e9`/`#2e6b34` (success tint/text),
`#fff4f4`/`#a00008` (error tint/text), `#f0f6fc` (selected radio card tint),
`#8fe388` (discount text on dark aside).

## 20. TypeScript Interface Reference (key shapes)

```ts
// src/lib/cart-store.tsx
interface CartLine { productId: number; slug: string; name: string; sku: string;
  imageUrl: string; unitPriceCents: number; qty: number }
// src/lib/utils.ts
interface TotalsInput { subtotalCents: number;
  promo?: { kind: string; value: number } | null;
  deliveryMethod: "delivery" | "click-collect" | "express" }
interface Totals { subtotalCents: number; discountCents: number;
  deliveryFeeCents: number; gstCents: number; totalCents: number }
// src/components/ProductCard.tsx — numeric(3,2) arrives as string over JSON
interface CardProduct { …; ratingAvg: string | number; … }
// API envelope (every route)
type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
```

## Appendix A — The Meticulous Approach (six-phase workflow)

ANALYZE (read everything, reproduce failures) → PLAN (smallest correct
verifiable plan) → VALIDATE (plan vs codebase/lockfile/schema) → IMPLEMENT
(small typed test-backed increments) → VERIFY (full gate chain + runtime
smoke + browser evidence) → DELIVER (atomic Conventional Commit to main,
docs lockstep, Verified/Reasoned/Assumed handoff). Full text in `CLAUDE.md`.

## Appendix B — Quick Reference Card

| Need | Path |
|---|---|
| Commands & gotchas | `AGENTS.md` |
| Architecture detail | `Project_Architecture_Document.md` |
| Decision record | `docs/implementation-plan.md` |
| Remediation plans + evidence | `docs/plans/2026-11-18-task114-remediation-plan.md` … through … `docs/plans/2026-11-21-task138-remediation-plan.md` (23 plans: Tasks 114, 117–138) |
| Screenshots | `docs/screenshots/01…109-*.png` (numbered per capture cycle; two `05-*` mobile/desktop variants — 110 PNGs) |
| SSH push runbook | `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` |
| Working history | `worklog.md` (Tasks 113+ NORDHEM; the 1–112 predecessor lineage was operator-trimmed) |
| Money/validators | `src/lib/utils.ts` |
| Catalogue + the derivation seams (productDiscountPercent, effectivePromo) | `src/lib/catalog.ts` |
| DB seam + pricing truth | `src/lib/server-data.ts` |
| External store factory | `src/lib/local-store.ts` |
| PII masking | `src/lib/mask.ts` |
| SEO surfaces | `src/app/robots.ts` · `src/app/sitemap.ts` · PDP `generateMetadata` |
| Unit suite | `tests/unit/*.test.ts` (198) — 10 files |
| E2E suite | `tests/e2e/mobile-navigation.spec.ts` · `tests/e2e/storefront.spec.ts` (133) — 125 storefront + 8 mobile |

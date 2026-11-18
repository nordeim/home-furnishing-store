# Task 122 Remediation Plan — Skipped-Fix Debt, Crash-Boundary Truth, Display/Money Honesty

Date: 2026-11-19 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (§14–§20) with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
+ hydration probe on the dev server), execution per `skills/tdd` (red → green, one seam at a
time). `skills/` excluded from checking/testing/compilation (operator contract). Reference
patterns cross-checked against `homenest-store-s` (security-headers/CSP and JSON-LD-escape
patterns reviewed; its mobile-nav "never JS-toggle display utilities — conditionally mount"
lesson matches this repo's drawer; its per-element seed-state validation posture motivates F-3).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 on 127.0.0.1:5432, postgres/app_db — fresh sandbox, PG installed per skills/rootless-postgresql with the repo-contract adaptation)

| Gate | Result |
|---|---|
| fresh clone → `9042784` (delta since pushed Task-121 `77cd1a8`: docs-only — session_8.md log) | clean tree |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 94/94 |
| `npm run test:e2e` (Playwright, production build :3100, chromium-1255) | 59/59 |
| DB contract | 9 tables; first-read seed 24/8/72/3/6/3/5 (products/categories/inventory/stores/inspirations/promotions/reviews) |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | open / navigate+auto-close (`/shop?cat=bedroom`) / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact); pages hydrate (`allowedDevOrigins` holds); utility-strip "Shop offers" link fully inside 390px (x=312.8+w=61.2=374.0 < 390 — Task-121 F-5 fix holds) |
| Sitemap/SEO | sitemap = 12 static + 24 product + 6 room URLs, indexable-only, no lastModified; robots coherent; metadata blanket + JSON-LD verified by the e2e baseline |
| Full-file audit | all 51 `src/` files + 11 test files read by an Explore agent; every headline finding re-verified by me at line/byte level (the `[m` display-layer trap re-encountered and re-confirmed on `shop-inner.tsx:33` — typecheck/e2e green, bytes intact, no action) |
| Reference repo | `homenest-store-s` reviewed: same Next 16/React 19/TS-strict/Tailwind v4 CSS-first spine; its element-level persisted-state validation, `global-error` boundary, server-side promo gating and spoof-resistant clientIp grid checked against this repo (deltas became findings F-3/F-2/F-5/F-20) |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 HIGH — Task-121 F-10 (`sgTomorrowISO`) was planned and claimed fixed, but never implemented
Evidence: `src/app/planning-tools/page.tsx:10` still computes
`new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)` (pure UTC);
`rg sgTomorrowISO src/` → no matches; the Task-121 worklog stage summary
(`worklog.md:158`) claims "19 fixed TDD-first" while the true record is 18
fixed + 1 disproven (F-3) + 1 silently skipped (F-10 — this finding). Product
bug: between 00:00–07:59 SGT the `min` booking date equals *today*,
contradicting the "Sessions book from tomorrow onward" comment.
Fix (ToDo-1): pure `sgTomorrowISO(now)` in `src/lib/utils.ts` (UTC+8
arithmetic, no `Intl` in the hot path), rewire the page, unit-pin a fixed
UTC-evening instant → SGT tomorrow. Correct the Task-121 count claim in this
cycle's worklog entry (the plan file and Task-121 worklog body are history —
corrected forward here, not rewritten).

### F-2 HIGH — The F-4 "safety net" cannot catch the crash class it was built for; its recovery button cannot recover
Evidence: `src/app/error.tsx` is a *route* boundary, but `CartProvider`
(`src/app/layout.tsx:52`) renders inside the **root layout**, above it — a
render crash there escapes to Next's unbranded default error page (no
`global-error.tsx` exists, glob-verified). The "Clear saved bag & retry"
button removes localStorage keys then calls `reset()` — but a poisoned
snapshot lives in module memory (`local-store.ts:50` `let value: T` read once
at import), so `reset()` re-renders against the same poison and re-crashes;
only `window.location.reload()` re-evaluates the module. The boundary also
swallows diagnostics (no `console.error`, no digest render).
Fix (ToDo-2): add `src/app/global-error.tsx` (branded, own `<html>/<body>`,
reload-based recovery for the persisted-state class); `error.tsx` gains
`console.error(error)` + digest render and switches the clear-and-retry button
to remove + `window.location.reload()`. Manual browser verification (dev
server, temporary throw in the layout — reverted before commit): branded page
renders, reload recovers.

### F-3 MEDIUM — Shape validation is container-shallow: `[null]` still bricks, `[42]` NaNs every total
Evidence: `src/lib/cart-store.tsx:47` validates with `Array.isArray` only;
`[null]` passes → `lines.reduce((a, l) => a + l.qty, 0)` (`:90`) throws inside
CartProvider (lands on the F-2 path); `[42]` / `[{"productId":1}]` pass →
NaN count/subtotal, "Your bag (NaN)" junk render. Unit pins cover only
wrong-container shapes.
Fix (ToDo-3): element validators — cart lines check
(object, integer productId, integer qty 1–99, number unitPriceCents, string
name/slug/sku/imageUrl), wishlist elements are strings; RED units for
`[null]`, `[42]`, partial line, and the pass-through cases.

### F-4 MEDIUM — Order page: an items-query outage renders a confirmed order as "Items (0)"
Evidence: `src/app/order/[number]/page.tsx:25-38` — the `outage` flag is set
when the *items* query throws, but `:40` gates only on `!order`; with the
order row present the page ships "Tak! Your order is confirmed" above an
empty item list — more alarming than the honest outage copy one branch away.
Fix (ToDo-4): honour `outage` before the order branch (the outage state is
authoritative regardless of whether the order row arrived). Manual browser
verification: stop PG, load a known order number, expect the outage copy
(today: confirmed page with Items (0)); restart PG.

### F-5 MEDIUM — Cart/checkout promo preview ignores the minimum-spend rule (display shows what the server refuses)
Evidence: `src/lib/catalog.ts:155` `findPromo` returns
`Pick<PromoLike, "kind" | "value">` — dropping `minSubtotalCents`; cart
(`src/app/cart/page.tsx:60-61`) and checkout (`src/app/checkout/page.tsx:31`)
preview the discount unconditionally. Apply WELCOME10 on a $150+ bag, then
remove items: the preview keeps the 10% discount on an $89 bag while
`placeOrder` refuses with `INVALID_PROMO`. The comment at `catalog.ts:150`
claims "the UI can never show a phantom discount" — the minimum-spend path
does exactly that. (`nordhem_promo` persists across sessions, so the phantom
can survive reloads.)
Fix (ToDo-5): `findPromo(code, subtotalCents?)` keeps its pure lookup but a
new `effectivePromo(code, subtotalCents)` gate (null below the minimum) feeds
the two preview sites; RED unit (below-min → null) + RED e2e (apply WELCOME10
on a stocked cart, remove items below $150, assert the discount row
disappears from the cart summary).

### F-6 MEDIUM — `sortProductList` (the Task-121 shared seam) has zero unit tests and no SSR-order pin
Evidence: `src/lib/utils.ts:161-171`; absent from `tests/unit/utils.test.ts`
imports; the SSR e2e pair asserts card *presence*, never order. A regression
that re-sorts only one caller (API vs SSR divergence — the exact bug F-17 of
Task 121 existed to prevent) passes all 153 tests.
Fix (ToDo-6): unit-pin all six sort keys + unknown-sort passthrough + a
same-reference/no-mutation property; e2e (JS-disabled context) pin that
`/shop?sort=price-asc` ships ascending price text in HTML order.

### F-7 LOW — Checkout boundary residue: `promoCode` and `lines` are unbounded
Evidence: `src/app/api/checkout/route.ts:85` accepts any-length `promoCode`
string (every other field is capped at :58); `:37` `rawLines` has no count
cap — a 10k-entry array becomes a 10k-row insert per request under the
20/min limiter.
Fix (ToDo-7): refuse `promoCode` > 32 chars and `lines.length` > 100 with
the standard 422. RED e2e: 33-char promo → 422; 101 lines → 422 (today 201/processed).

### F-8 LOW — `qty: null` coerces to 1 instead of dropping
Evidence: `checkout/route.ts:48` `clampInt(Number(line.qty), 1, 99, NaN)` —
`Number(null) === 0` is finite, so the min-clamp makes it 1 while
`undefined`/"abc" (→ NaN) drop; the comment claims crafted non-finite qty
"must drop out here".
Fix (ToDo-8): null/undefined qty → NaN (drop) before the clamp. RED e2e:
single line `{productId: X, qty: null}` → 422 EMPTY_BAG (today: 201 with qty 1).

### F-9 LOW — pg Pool has no connection/query timeout — "Degrade, Never Fail" has no time bound
Evidence: `src/db/index.ts:14-18` — bare `new Pool({ connectionString })`; a
*wedged* (not refused) Postgres hangs every force-dynamic page indefinitely.
The reference repo pins this class; our e2e resilience pair covers only
connection-refused.
Fix (ToDo-9): `connectionTimeoutMillis: 5_000` + `query_timeout: 8_000` on
the pool; source-pin unit test (the scan-guard precedent: read
`src/db/index.ts`, assert the two keys and values); manual verification —
unroutable `DATABASE_URL` IP against the dev server degrades to the static
catalogue within ~5s instead of hanging.

### F-10 LOW — `campaignEndLabel()` is frozen at module load — the F-19 roll only helps processes (re)started inside the stale window
Evidence: `src/app/page.tsx:14`, `src/app/offers/page.tsx:25` compute the
label at module scope; a process started Dec 20 still advertises "ends 28 Dec"
on Dec 30 (`force-dynamic` re-runs the component, not module init).
Fix (ToDo-10): call `campaignEndLabel()` inside the two server-component
render bodies (pure + cheap; both are server components — no hydration
concern). Existing campaign unit pins stay green.

### F-11 LOW — Reviews POST silently truncates; the refuse-never-truncate rule is now inconsistent across write boundaries
Evidence: `src/app/api/reviews/route.ts:39,51-52` `slice(0, 60/120/2000)` vs
`checkout/route.ts:29-31`'s stated principle. Truncating a 3000-char review
transforms the user's words — the exact class Task 120 refused.
Fix (ToDo-11): refuse overlong review fields with 422 (same caps as the
client `maxLength`s). RED e2e: 3000-char body → 422 (today: 201 truncated).

### F-12 LOW — `inventory` has no unique constraint on (product_id, store_slug) — the seed's `onConflictDoNothing` is a no-op
Evidence: `src/db/schema.ts:65-73` (PK only) vs `server-data.ts:46`
`.onConflictDoNothing()` with nothing to conflict on; a duplicate row makes
the decrement UPDATE hit every copy.
Fix (ToDo-12): `uniqueIndex` on (product_id, store_slug) + `drizzle-kit
push`; RED e2e (pg in-spec): duplicate INSERT → unique violation (today:
succeeds).

### F-13 LOW — Hardcoded catalogue counts in the shop layout metadata (the drift class F-13/F-18 of Task 121 hunted)
Evidence: `src/app/shop/layout.tsx:11,16` — "24 furniture and furnishing
products" / "Browse 24 … across 8 room categories" as literals.
Fix (ToDo-13): derive from `PRODUCTS.length` / `CATEGORIES.length` (imported
constants beside the metadata).

### F-14 LOW — Shop layout stale architecture comment + filter-copy drift
Evidence: `src/app/shop/layout.tsx:4-7` still says "/shop page itself is a
client component" (false since the F-17 SSR conversion); `:11` claims "Filter
by room, price and rating" — rating is a *sort*, the keyword filter is
unmentioned.
Fix (ToDo-14): correct the comment and the description copy (filter = room +
keyword + price; sort = featured/popular/price/rating/new).

### F-15 LOW — Stepper/GST parity: business quote minus dead at 0; checkout summary omits the "Incl. 9% GST" line the cart shows
Evidence: `src/app/business/page.tsx:39` `Math.max(0, …)` keeps an enabled
no-op minus at the floor (the F-11 pattern, missed here);
`checkout/page.tsx:148-153` vs `cart/page.tsx:121` — the cart renders the
GST component, checkout does not (same totals seam, inconsistent disclosure).
Fix (ToDo-15): disabled at 0 + `disabled:opacity-40`; add the GST line to the
checkout summary. RED e2e for the stepper; GST line pinned in the existing
checkout journey spec.

### F-16 LOW — Inspiration index labels the editorial budget as the shoppable total
Evidence: `src/app/inspiration/page.tsx:38` "Shop this room · $800.00"
(`budgetCents`) while the detail page honestly splits "Room budget $800" vs
"These pieces $667" (`inspiration/[slug]/page.tsx:42,58`) — the exact
conflation Task 119 F-4 fixed on the detail page.
Fix (ToDo-16): compute the pieces total on the index (same
`productSlugs → reduce` derivation) and label it "Shop this room · from
$X" or the pieces total; RED e2e: index card shows the pieces total, not the
budget.

### F-17 LOW — The search page never syncs its URL — refresh loses the query; the SearchAction target stays theoretical
Evidence: `src/app/search/page.tsx:67` `onSubmit` only bumps `retry`; `?q=`
never reflects in-page searches (the header search path pushes `?q=` and the
page *does* read it — `:12-21` — so the URL round-trip works, it is just
never written by the page itself). The layout's SearchAction targets
`/search?q={search_term_string}` (`layout.tsx:35-39`) — a URL shape the page
itself never produces.
Fix (ToDo-17): on submit and popular-chip click, `history.replaceState` the
needle (`/search?q=…`, or `/search` when cleared) before the fetch —
shareable/refreshable searches, no RSC round-trip, no extra history entries.
RED e2e: type + submit → URL carries `?q=`; reload → results restored.

### F-18 INFO — ShopInner's `atServerView` cat/sort clauses are tautological
Evidence: `src/app/shop/shop-inner.tsx:31-32,42` — `cat`/`sort` are locals
assigned from `initial`, so `cat === initial.cat` is always true; the guard
reduces to `q === "" && max === 0`. Misleading dead code (the resync below
handles the real transitions).
Fix (ToDo-18): drop the tautological clauses, comment the real guard
(`q === "" && max === 0`). No behavior change; existing e2e stays green.

### F-19 INFO — Hero/offers discount copy is loosely attributed
Evidence: `src/app/page.tsx:61` "Up to 24% off extendable dining tables,
stackable chairs and warm lighting" — the max (−24%) is NORDLYS (lighting);
the only extendable dining table (MAKAN) carries no discount, chairs are
−17%. `offers/page.tsx:31` "Up to 24% off dining, decor and sleep" — same
looseness (the −24% is lighting/decor).
Fix (ToDo-19): recompute the honest max-discount set from the catalogue and
write copy that attributes exactly (e.g. "Up to 24% off lighting, chairs and
more"); pin the home hero line in the existing home e2e.

### F-20 INFO — Rate-limiter clientIp keys on the spoofable `x-forwarded-for` first hop
Evidence: `checkout/route.ts:14` (and siblings) — header rotation defeats the
in-process buckets when directly exposed; the reference repo's
spoof-resistant grid (`cf-connecting-ip` → rightmost hop → "direct") is the
production pattern. Documented deferral (single trusted proxy posture).
Fix (ToDo-20): document the posture + the upgrade path in the PAD
known-issues register row (no code change this cycle — the in-process
single-node limiter is already a documented deferral).

### F-21 INFO — error.tsx prop signature declares `error` but never uses it
Evidence: `src/app/error.tsx:9` — folded into ToDo-2 (digest render +
console.error make the prop load-bearing).

Deferred (documented in the PAD register — do NOT "fix"): offers bundle slug
curation (editorial, filter-degrades gracefully), SearchAction decorative
posture beyond F-17 (Google retired sitelinks searchbox rendering; the node
is harmless and now honest), header store-picker wiring, unthrottled GET
reads, delivery-order decrement source = tampines, wishlist full-catalogue
fetch, `drizzle.config.json` local URL, wrapper default remote, orderNumber
collision retry, PDP repeated catalogue reads, cross-tab storage sync, cart
standard-delivery preview label, mixed-line payload drop semantics,
aggregateRating ratingValue fiction (invented-content stance),
`hover:font-bold` glyph jitter, `[m` display-layer trap (sandbox lesson, not
a code defect — re-verified this run on shop-inner.tsx:33).

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| `sgTomorrowISO()` fixed-instant tests (UTC-evening → SGT tomorrow; UTC-morning → same-day+1 SGT) | unit (RED) | F-1 UTC/SGT edge |
| cart-line/wishlist element validators: `[null]`, `[42]`, partial line, valid pass-through | unit (RED) | F-3 shallow-validation regression |
| `effectivePromo(code, subtotalCents)` below-min → null, at/above → promo | unit (RED) | F-5 gate regression |
| cart: discount row disappears below the promo minimum | e2e (RED) | F-5 display/server money divergence |
| `sortProductList`: 6 keys + unknown passthrough + no-mutation | unit (RED) | F-6 seam divergence |
| `/shop?sort=price-asc` ships ascending prices in SSR HTML (JS off) | e2e (RED) | F-6 SSR-order pin |
| 33-char promoCode → 422; 101 lines → 422 | e2e (RED) | F-7 boundary drift |
| `qty: null` single line → 422 EMPTY_BAG | e2e (RED) | F-8 null-coercion |
| db/index.ts source-pin: connectionTimeoutMillis + query_timeout present | unit (RED) | F-9 unbounded-degrade regression |
| 3000-char review body → 422 | e2e (RED) | F-11 truncation-policy regression |
| inventory duplicate (product_id, store_slug) INSERT → unique violation | e2e (RED, pg in-spec) | F-12 constraint absence |
| business stepper minus disabled at 0 | e2e (RED) | F-15 floor regression |
| inspiration index shows the pieces total (not budgetCents) | e2e (RED) | F-16 conflation returning |
| search submit/chip → URL carries `?q=`; reload restores results | e2e (RED) | F-17 URL-sync regression |
| home hero discount copy pin | e2e (RED) | F-19 attribution drift |
| global-error branded page + reload recovery (temporary layout throw, dev only) | manual browser | F-2 boundary placement |
| order-page outage copy with PG down (dev only) | manual browser | F-4 outage precedence |
| unroutable DATABASE_URL degrades within ~5s (dev only) | manual curl | F-9 timeout engagement |
| existing pins re-run (unit+e2e) | both | money journeys, LOW_STOCK, TOCTOU pair, metadata blanket, docs-counts |

## 4. Execution order (vertical slices, red → green each)

1. **Skipped-fix slice**: ToDo-1 (`sgTomorrowISO` + planning-tools rewire) →
   unit GREEN; worklog claim correction documented in this cycle's entry.
2. **Crash-boundary slice**: ToDo-3 (element validators — RED units first),
   ToDo-2 (`global-error.tsx` + reload recovery + diagnostics in
   `error.tsx`) → unit GREEN + manual browser verification of both boundary
   classes.
3. **Money-display slice**: ToDo-5 (`effectivePromo` + two preview sites,
   RED unit + RED e2e), ToDo-7 (promoCode/lines caps), ToDo-8 (qty null
   drop), ToDo-15 (business stepper + checkout GST line) → all RED → GREEN.
4. **Resilience slice**: ToDo-4 (order outage precedence — manual verify),
   ToDo-9 (pool timeouts + source pin + manual degrade check), ToDo-12
   (inventory unique index — RED pg spec → push → GREEN).
5. **Honesty/parity slice**: ToDo-11 (reviews refuse), ToDo-13 (shop layout
   counts), ToDo-14 (comment/copy), ToDo-16 (inspiration index), ToDo-19
   (hero/offers copy) → RED → GREEN.
6. **UX/SEO slice**: ToDo-17 (search URL sync), ToDo-10 (campaignEnd in
   render), ToDo-6 (sortProductList pins), ToDo-18 (tautology cleanup).
7. **Docs lockstep**: worklog Task 122 (incl. the Task-121 count
   correction), AGENTS/CLAUDE/README counts + notes, PAD revision block +
   register rows (incl. F-20 posture row), SKILL.md refresh via
   skills/distill-codebase-skill + skills/to-distill-project-into-skill,
   this plan archived, `.env.example` re-verified (contract unchanged, in
   commit).
8. **Full gate**: lint → typecheck → typecheck:tests → unit (new total) →
   cold build (`rm -rf .next`) → e2e (new total) → dev-server screenshots
   for changed surfaces into `docs/screenshots/`.
9. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py`
   with the mandatory `--remote` override.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this
  run (Explore-agent audit + my line-level re-reads of planning-tools,
  error.tsx, layout.tsx, local-store.ts, cart-store.tsx, order page,
  catalog.ts findPromo, checkout route, db/index.ts, utils.ts, search page,
  shop layout + shop-inner, business page, inspiration index/detail, offers
  page; browser-verified the mobile taxonomy, the utility strip, hydration,
  the search URL behavior and the sitemap/robots endpoints).
- The `[m`-eating display layer re-produced a false "corruption" on
  `shop-inner.tsx:33` (`const ax, setMax]`) — typecheck/e2e green, the known
  sandbox trap, no action (documented SKILL lesson 22).
- F-2 boundary semantics: Next.js docs place root-layout errors under
  `global-error.tsx`; the reference repo ships both boundaries — the
  pattern is established in the family.
- F-5 signature change (`findPromo` callers: cart, checkout, existing unit
  tests) — additive overload keeps every existing call site valid; the new
  `effectivePromo` seam carries the gate.
- F-12 schema change is additive (unique index on existing non-duplicate
  data — verified 72 rows, no dupes via SQL this run); `drizzle-kit push`
  applies it without data migration.
- F-9 `query_timeout`/`connectionTimeoutMillis` are first-class node-postgres
  ClientConfig options (pg 8.20 lockfile pin) — no driver change needed.
- The e2e DB-manipulation specs reuse the Task-119/120/121 quiet-product
  discipline (pg in-spec with restore in `finally`).
- No new runtime dependencies; no new env variables; `.env.example`
  contract unchanged; the docs-counts pin sweeps all five operator docs at
  final counts (count-lockstep, no exceptions).

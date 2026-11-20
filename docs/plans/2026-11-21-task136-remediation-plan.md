# Task 136 Remediation Plan — Shop-Grid Envelope-Trust Completion, DB-Funnel Golden-Rule Restoration, Reviews Degrade Honesty, Promo In-Tx Coherence, Docs Truth

Date: 2026-11-21 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (fresh clone → `fb64859` = Task-135 `b449013` + the session_36 narrative; npm install green; rootless PostgreSQL 17.12 restored via the lesson-31 discipline — stale postmaster.pid + 9 missing empty initdb subdirs + the nested `pg_logical/snapshots`+`pg_logical/mappings` pair; server up; 9-table DDL contract + seed quantities verified by direct SQL before any gate: 4 named indexes, seed 24/8/3/72/5/0/0/6/3, inventory 1379 = the formula, zero residue) with the mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900 on the dev server via 127.0.0.1 — 8/8 PASS: open (aria-expanded=true, label toggles) / navigate+auto-close / the F-7 param-close regression / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) / hydration (`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item") / no horizontal overflow at 390px — **no Tailwind v4 bug**; the CSS-first `@theme` posture + the candidate-scan guard re-verified in `globals.css`). Sitemap/SEO re-verified live: 42 indexable URLs no lastmod; robots 7 disallows coherent; og:image 1200×627 on home; noindex on the order page + all five utility routes; the 404 surface branded + 404 status; the security-header set present with no `x-powered-by`. One environment trap handled pre-gate: an exported shell `DATABASE_URL` (a previous session's SQLite leftover, present in the recycled sandbox) silently overrode `.env` — gotcha #10, unset + pinned per command. The pinned Playwright Chromium 1255 re-installed via `npm run test:e2e:install` after the fresh-clone cache miss (the Task-133/135 precedent). Reference repo `homenest-store-s` cross-checked: **quiescent — HEAD still `4771c3d`, zero src/tests changes after `ff65bd2`** — the twelfth cycle of "nothing to port". The vitest/playwright suites exist and are wired (`vitest.config.ts` + `tsconfig.tests.json` + `playwright.config.ts` :3100 production webServer; 183/129 baseline green); this cycle EXTENDS them with the new pins below (the config files need no modification — the suites are the repo's own). Execution per `skills/tdd` (red → green, one seam at a time; honest-RED by temporary mutation for every GREEN-on-arrival pin). `skills/` excluded from checking/testing/compilation (operator contract).

## 1. Audit baseline (all Verified this run; fresh clone, cold caches)

| Gate | Result |
|---|---|
| Fresh clone → `fb64859` (Task-135 `b449013` + session_36 narrative) | clean tree |
| Rootless PostgreSQL 17.12 (lesson-31 restore) | up; DDL contract verified (`orders_idempotency_key_unique`, `orders_order_number_unique`, `inventory_product_store_uq`, `reviews_product_idx`); seed 24/8/3/72/5/0/0/6/3, inventory 1379 |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 183/183 |
| `npm run test:e2e` (Playwright, cold production build :3100) | 129/129 (after the chromium-1255 install) |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 bug |
| Full-tree audit | two audit agents (deep code + docs-truth); every finding re-verified at line level by me (the lesson-46 discipline) |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — the shop grid is the THIRD client consumer of `/api/products` still reading `json.data ?? []` (the Task-135 F-5 class, one sibling short)
Evidence (line-verified): `src/app/shop/shop-inner.tsx:81-84` —
`setItems((json.data ?? []).map(…))` gated only by `json.ok`. Task 135 F-5 added the
`Array.isArray(json.data)` gate to exactly two of the three client consumers
(`wishlist/page.tsx:31`, `search/page.tsx:75`) with the route-fulfilled probe
quartet; the shop grid — the primary catalogue funnel — kept the pre-fix
expression. A well-formed `200 {ok:true}` with no `data` resolves to `[]`, so the
page renders the FALSE verdict: `"0 products"` (line 116) + `"Nothing matches
those filters"` (line 166) with a "Clear filters" CTA — indistinguishable from a
legitimate empty filter result, with no error/retry UI. The exact recurring
sibling-parity class (Task 134's addLine-found-branch clamp, Task 135's own
setLineQty clamp, Task 133's cart-duplicate e2e parity). NOT the registered
"shop-strip sibling" deferral (that is the header strip).
Fix (ToDo-1): mirror the one-line gate — `if (!json.ok || !Array.isArray(json.data))
throw new Error(json.error?.message ?? "Failed to load");` then
`setItems(json.data.map(…))`. Pin: one e2e probe (route-fulfilled `200 {ok:true}`
body-less envelope beside the Task-135 pair, `**/api/products*` glob for the
query-string fetch): goto `/shop` hydrated, click a category chip to trigger the
client-side fetch, assert the ERROR state (main `role="alert"`) renders and the
false verdict ("Nothing matches those filters") never does. TRUE RED first.

### F-2 MEDIUM — three sites import `@/db` directly, contradicting the repo's own golden rule (the oldest unregistered debt in the tree)
Evidence (line-verified): `src/app/order/[number]/page.tsx:3-4` (a PAGE importing
`@/db` + `@/db/schema`, reads at `:35`/`:37` — PAD §3.1 line 1492: "A page
importing `@/db` directly is an architecture violation"); `src/app/api/reviews/route.ts:2,4` (a route handler with the product-existence read at `:88` and the only
write path outside the funnel — the insert at `:97`); `src/app/api/health/route.ts:1`
(the infra probe — a MUST-bypass-degrade exception by design). All three predate
Task 114 and survived 22 audit cycles unflagged and unpinned. The order page even
duplicates the `trackOrder` lookup discipline in-page (Task 133 F-5 fixed the
normalization IN PLACE instead of funneling it).
Fix (ToDo-2): restore the funnel — (a) new `getOrderByNumber(rawNumber)` seam in
`src/lib/server-data.ts` (decode + normalize + outage/not-found semantics moved
from the page: `URIError → null`, other errors → `"outage"`, hit →
`{order, items}`); the page keeps its render branches but imports only the seam;
(b) new `submitReview({productId, author, rating, title, body})` seam in
`server-data.ts` (product-existence check + insert; returns the envelope
`{ ok: true, data } | { ok: false, error: { code: "VALIDATION", message } }`;
DB faults propagate as exceptions — the route's 500 posture is unchanged); the
reviews POST keeps its boundary validation (parse/type/length) and delegates the
DB work; (c) health stays the DOCUMENTED infra-probe exception (PAD §3.1 golden
rule gains the exception sentence). Pin: a NEW funnel fs-pin in
`tests/unit/server-data.test.ts` — the only `@/db`/`@/db/schema` importers under
`src/` are `src/db/**`, `src/lib/server-data.ts`, and
`src/app/api/health/route.ts`. TRUE RED today (the order page + reviews route
violate). The existing 129 e2e (order-page taxonomy + reviews POST boundary
specs) are the behavior net (the Mode-D characterization discipline).

### F-3 LOW — the reviews surface degrades to a FALSE "No reviews yet" under Postgres outage, and the seam's comment claims otherwise
Evidence (line-verified): `src/lib/server-data.ts:121-122,136-137` — `getReviews`
catch → `[]`, `getReviewCount` catch → `0`; the comment at `:129-130`: "the
reviews section hides on outage either way" is FALSE — `product/[slug]/page.tsx:198` renders `ReviewSection` unconditionally and
`ReviewSection.tsx:56` renders "No reviews yet — be the first…" for an empty
list. Under outage a product with live DB reviews renders "Reviews (0)" + the
false invitation — the server-side twin of the "fetch failure ≠ empty state"
class (Task 119) that Task 135 F-5 just re-affirmed client-side. The sibling
BuyBox degrades honestly for the same outage class ("Stock information is
unavailable right now").
Fix (ToDo-3): distinguish degraded from genuinely-zero — `getReviews` →
`ReviewRow[] | null` (null = outage), `getReviewCount` → `number | null`; the
PDP derives `reviewsUnavailable` and passes it to `ReviewSection` (honest
"Reviews are unavailable right now" note in place of the false empty-list copy;
JSON-LD omits `aggregateRating` when the count is null — mirroring the existing
zero-guard); `api/reviews` GET maps null → the `DB_DOWN` envelope (the health
route's outage posture — an honest failure beats a false empty list at an API
boundary that has no static fallback); the `:129-130` comment corrected. Pin: an
fs-pin on the two catch-return forms (null, not `[]`/`0`). TRUE RED today.
Honest-RED by mutation is inherent (the outage path needs a dead DB — the pin
class is the Task-131 F-2 precedent).

### F-4 LOW — the promo is validated OUTSIDE the order transaction (the Task-130 F-2 coherence class, the other order-shaping input)
Evidence (line-verified): `src/lib/server-data.ts:253-259` — `validatePromo`
(plain read) runs BEFORE `createOrder()`'s transaction opens at `:305`; the
committed order carries `discountCents` derived from promo state that may have
changed (row deactivated/edited) between validation and commit. Task 130 F-2
moved the inventory check+decrement INSIDE one `FOR UPDATE` transaction so
concurrent writers cannot interleave — the promo read, the other
money-shaping input, did not get the same discipline.
Fix (ToDo-4): inside `createOrder`, after the inventory availability check:
re-read the promotions row `FOR UPDATE`; re-validate (active + min subtotal) —
a promo that changed under the order refuses with `INVALID_PROMO` (the
`OrderRefusalError` the route already maps); derive the totals INSIDE the
transaction after the re-read (the `priceTotals` call moves in with the fresh
promo). The early `validatePromo` stays (fail-fast UX + the outage static
fallback). Pin: an fs-pin that the createOrder body carries the in-tx
promotions re-read (`.for("update")` on the promotions select). TRUE RED today;
mutation demo: removing the re-read REDs the pin.

### Docs findings (D-1, D-2) — the truth layer
- **D-1 MEDIUM** — `CLAUDE.md:353-357`: "42 gotoHydrated call sites across the
  two files … 44 including the mobile spec's three conversions" — fs-computed
  reality: 42 storefront call sites + **2** mobile (lines 13, 53) = **44 across
  both files**; "across the two files" mis-scopes 42 (storefront-only) and "three
  conversions" is wrong (mobile contributes 2). AGENTS states it correctly at
  both sites. Fix: the AGENTS phrasing ("42 storefront call sites (44 across
  both files)"), updated for this cycle's counts.
- **D-2 LOW** — AGENTS "Commands" + CLAUDE "Build Commands" tables carry
  `typecheck:tests` only as a parenthetical (no dedicated row). Fix: add the row
  (the Task-135 D-5 precedent).
- **D-3/D-4 INFO — kept**: session-file numbering is off-cycle (historical
  naming; no truth defect); no live doc claims a mobile-PNG count (the "8
  mobile" claims are the e2e test count — fs-true). No action.

### Evaluated and kept (deferrals — documented, unchanged)
- The standing register (ssh-wrapper default remote, drizzle.config.json local
  URL, auth/payments deferral, per-process rate limiter, CSP, jsdom layer,
  store-picker wiring, unthrottled GETs, wishlist full-catalogue fetch,
  ratingValue catalogue fiction, orderNumber-collision retry-wiring, wishlist
  refetch window + shop-strip sibling, the raw malformed-percent platform-500
  class, ensureSeed reviews-only partial-seed window, the checkout slot-options
  render-time clock read) — verified present in the docs, unchanged.

## 3. Test seams + execution order (TDD — RED observed before every behavior change; mutation-honest RED for every GREEN-on-arrival pin)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-1 | shop-grid envelope trust | NEW e2e probe (route.fulfill `200 {ok:true}` no `data`; drive the client-side refetch with the LOCAL keyword filter — cat/sort land in the atServerView skip via RSC navigation, the addendum records the first probe design's correction; assert the error alert renders, the false "Nothing matches those filters" verdict never) — TRUE RED | `!json.ok \|\| !Array.isArray(json.data)` gate in shop-inner |
| B | F-2 | DB-funnel golden rule | NEW funnel fs-pin (the only `@/db` importers are `src/db/**` + `server-data.ts` + `api/health`) — TRUE RED | `getOrderByNumber` + `submitReview` seams; page/route refactors; PAD §3.1 exception sentence |
| C | F-3 | reviews degrade honesty | fs-pin on the two catch-return forms (null, not `[]`/`0`) — TRUE RED | null-typed seams + PDP unavailable note + API GET DB_DOWN + comment fix |
| D | F-4 | promo in-tx coherence | fs-pin on the in-tx promotions re-read — TRUE RED; mutation demo | `FOR UPDATE` re-read + in-tx totals derivation |
| E | D-1/D-2 + lockstep | docs truth | reading (verified above) | CLAUDE gotoHydrated fix (with this cycle's counts); typecheck:tests rows; six-doc sweep with the new counts; SKILL v2.10.0; PAD v1.21.0 |

Order: A → B → C → D (code + pins), then the full gate (cold build, lint,
typechecks, unit ×3 TZ, e2e, residue), then E (docs), then screenshots (95–99),
`.env.example` re-verification, session_37 log, worklog entry, commit + push.

Expected count deltas (fs-verified after the code slices, before the docs
sweep): unit 183 → **186** (+1 the funnel fs-pin; +1 the reviews-degrade fs-pin;
+1 the promo in-tx fs-pin — all three land in `tests/unit/server-data.test.ts`);
e2e 129 → **130** (+1 the shop-grid envelope probe). One new `gotoHydrated`
call site in storefront.spec.ts → **43 storefront (45 across both files)** —
the AGENTS/CLAUDE counts sweep with it. Unit files stay 10; e2e specs stay 2.

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint                # 0 errors expected
npm run test                # 186/186 unit (TZ=UTC host)
TZ=Asia/Singapore npm run test       # 186/186 — the three-TZ discipline
TZ=America/New_York npm run test     # 186/186
npm run test:e2e            # 130/130 (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at seed quantities (1379)
```

## 5. Post-execution addendum (what the execution itself discovered — recorded for the audit trail)

- **The F-1 probe's first design was WRONG and the RED re-observed honestly.**
  The first probe drove the client-side refetch with a category-chip click —
  but a chip click is an RSC navigation that re-renders the server component
  and ships a fresh `initial` view, so the effect's `atServerView` guard
  intentionally SKIPS the refetch (the page rendered the real dining
  catalogue; the interception never fired — a test-design artifact, not a
  code defect). The corrected probe drives the LOCAL keyword filter (the one
  path that fires the client fetch), and the TRUE RED was then observed
  against the temporarily-reverted pre-fix tree: the error-context snapshot
  shows the exact documented false verdict ("0 products" + "Nothing matches
  those filters" + a Clear-filters CTA); re-applying the fix → GREEN. The
  plan's probe design was amended in place before commit.
- **The e2e webServer's `reuseExistingServer` masked the first fix run**: the
  stale :3100 production server from the baseline run served the pre-fix
  build, so the first post-fix probe run still failed. Killed the stale
  server before the re-run (the cold-build discipline extends to the e2e
  webServer; noted for future cycles).
- **One operator mishap during the F-4 mutation demo**: the demo reverted the
  whole `server-data.ts` via `git checkout --` instead of restoring from a
  patch, momentarily wiping ALL Task-136 seams (submitReview /
  getOrderByNumber / the null degrades / the in-tx re-read). All edits were
  re-applied and the full verification chain (typechecks, 5/5 pins, lint,
  186/186 unit, 130/130 e2e, zero residue) re-run GREEN afterwards — the
  final gates below are measured on the re-applied tree, not the pre-mishap
  one.
- **Count deltas landed exactly as planned**: unit 183 → **186** (+3 fs-pins
  in server-data.test.ts), e2e 129 → **130** (+1 shop-grid envelope probe),
  unit files stay 10, e2e specs stay 2; the new probe adds one gotoHydrated
  call site → **43 storefront (45 across both files)**, swept through
  AGENTS/CLAUDE alongside D-1's mis-attribution fix.
- **The F-2 refactor was verified by the existing 28-spec behavior net**
  (the Mode-D characterization discipline): the order-page taxonomy
  (not-found/outage/lowercase/normalized-decode pins) and the reviews-POST
  boundary set (unknown-id 422, valid 201, int4 pair) all pass unchanged
  against the seam-refactored tree — behavior preserved by construction,
  not by luck.
- **Gate outcome (the exact tree to be committed)**: cold build green ·
  typechecks + lint clean · unit **186/186** (the 17 mid-sweep docs-counts
  reds resolved by the six-doc sweep; identical under UTC /
  Asia/Singapore / America/New_York — the three-TZ discipline) · e2e
  **130/130** against the cold production build · zero DB residue (direct
  SQL: orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) ·
  screenshots 95–99 verified non-blank (PNG signatures, dimensions,
  byte-density 0.058–0.368 B/px) with live DOM verification of every
  captured state.

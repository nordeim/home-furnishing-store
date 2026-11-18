# Task 119 Remediation Plan — Server-Truth Consolidation, SEO Metadata Blanket, ARIA Honesty & Docs-Count Pin Cycle

Date: 2026-11-18 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (§14–§16,
§18–§20) with the mobile-navigation + Tailwind v4 taxonomies (agent-browser hydration
probe + drawer taxonomy at 390×844/1440×900), execution per `skills/tdd` (red →
green, one seam at a time). `skills/` excluded from checking/testing/compilation
(operator contract).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 on 127.0.0.1:5432, postgres/app_db — the sandbox survived this cycle, PG was already live)

| Gate | Result |
|---|---|
| `git pull` → `c4fbaab` (only delta since the pushed Task-118 `52204e7`: `docs/session_5.md`, docs-only) | clean tree |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 58/58 |
| DB contract | 11 tables; seed 24/8/72/3/6/3/5 (products/categories/inventory/stores/inspirations/promotions/reviews) |
| `.env.example` | single-variable contract intact (matches `src/db/index.ts`; lineage pins still unit-enforced) |
| `next.config.ts` | `allowedDevOrigins: ["127.0.0.1"]` pinned (Task-118 fix holds) |
| Dev-server hydration probe (`127.0.0.1:3000`, Playwright chromium) | `hydrated: true`, hamburger toggles drawer — fix holds |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900) | open / navigate+auto-close / Escape / toggle / hamburger-hidden-≥1024 ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact) |
| Full-file audit | 28 files read by an Explore agent (all pages/components) + headline findings re-verified by me at line level |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 HIGH — Sitemap-indexed routes publish zero metadata (client pages) or generic titles
Evidence: `src/app/shop/page.tsx:1` `"use client"`; sitemap pins `/shop`
(`sitemap.ts:10`, `robots-sitemap.test.ts:13` INDEXABLE_STATIC). Same for
`/family`, `/business`, `/sustainability`, `/planning-tools` (all `"use client"`
line 1, all in INDEXABLE_STATIC). `/inspiration/[slug]/page.tsx` is a server
component with NO metadata export (6 sitemap-pinned URLs). Home ships only the
layout default. SSR HTML of /shop contains no product content (client fetch).
Impact: 6 of 12 indexable static routes + all 6 inspiration URLs publish the
identical generic title; crawlers see skeleton-only /shop.
Fix (ToDo-1): route-level server `layout.tsx` files exporting `metadata`
(title/description/canonical/OG) for the 4 client pages + `/shop`;
`generateMetadata` on `/inspiration/[slug]`; page-level metadata on home;
PDP-pattern title/description per surface. No interaction changes.

### F-2 HIGH — `placeOrder()` re-implements `priceTotals()` and has already diverged
Evidence: `server-data.ts:166-177` hand-rolls delivery fee + GST; `utils.ts:50`
waives standard delivery at `net === 0`, `placeOrder` charges $12 in that case.
Unreachable today (promo minimums ≥ $150), but the single-source-of-truth comment
is false — latent server-money drift.
Fix (ToDo-2): `placeOrder` builds `TotalsInput` from validated lines and calls
`priceTotals()` (Mode D refactor; the exact-money e2e journey $679.15/$2,338.20 is
the characterization pin).

### F-3 MEDIUM — PDP JSON-LD availability derives from `stockTotal`, which orders never decrement
Evidence: `product/[slug]/page.tsx:69` `p.stockTotal > 0 ? InStock : OutOfStock`;
`placeOrder` decrements only the `inventory` table (`server-data.ts:214-222`);
seed itself disagrees (NORDLYS `stockTotal` 210 vs inventory sum 78). BuyBox on
the same page reads live per-store inventory.
Fix (ToDo-3): derive availability from the same live `getInventory()` rows
BuyBox uses (sum of per-store qty > 0). RED e2e: zero a product's inventory rows
via the DB from the spec, assert JSON-LD OutOfStock (current code says InStock),
restore rows after.

### F-4 MEDIUM — Inspiration listing vs detail budget contradiction
Evidence: `inspiration/page.tsx:26` shows `budgetCents` ($9,800 for the BTO room);
`inspiration/[slug]/page.tsx:29` labels `total || room.budgetCents` as "Room
budget" where `total` is the listed-pieces sum ($2,047) — same term, two numbers.
Fix (ToDo-4): detail page shows BOTH honestly: "Room budget" (budgetCents) +
"Shop-the-look pieces" (total).

### F-5 MEDIUM — Fabricated feature/magnitude claims (Task-118 class, new sites)
Evidence: `help/page.tsx:9` "Member prices stack with promo codes — the best
combination wins automatically at checkout" (no member prices exist anywhere);
`family/page.tsx:19` "Member prices on 200+ icons" (catalogue = 24 products);
`stores/page.tsx:33` "MRT directions in the app" (no app); `help/page.tsx:28`
chat SLA "~2 min reply" (no chat).
Fix (ToDo-5): reword all four to what the system is/does.

### F-6 MEDIUM — Family "Join free" form is a silent no-op email harvest
Evidence: `family/page.tsx:24-28` — `onSubmit={(e) => e.preventDefault()}`,
uncontrolled input, zero feedback; contrast the business/planning-tools demo
disclosure pattern.
Fix (ToDo-6): sent-state confirmation + "Demo storefront: no request is actually
sent." (house pattern from Task 117).

### F-7 MEDIUM — ARIA radiogroup/tablist semantics without the keyboard pattern (5 surfaces)
Evidence: `shop/page.tsx:81-92` role="tablist"/tab + aria-selected, no tabpanels,
no arrows; `checkout/page.tsx:85-91,109-113` role="radiogroup"/radio;
`sustainability/page.tsx:37-42`, `planning-tools/page.tsx:37-42`,
`ReviewSection.tsx:59-63` same. Buttons stay Tab-reachable, but SRs announce a
broken widget pattern. (Task 117 deferred "roving focus" — the honest fix is to
drop the unimplemented widget roles, not to keep announcing them.)
Fix (ToDo-7): plain toggle buttons: `role="group"` + `aria-label` container,
`aria-pressed` on the buttons (e2e journey uses default options + label/button
locators — verified no role-based locators for these).

### F-8 MEDIUM — Rate limiter code duplicated 4× and its Maps never evict expired entries
Evidence: identical `throttled()` implementations in `reviews/route.ts:11-22`,
`checkout/route.ts:7-18`, `orders/track/route.ts:10-21`,
`promotions/validate/route.ts:9-20`; entries stay in the Map forever (unbounded
memory on a long-lived process).
Fix (ToDo-8): `src/lib/rate-limit.ts` — `createRateLimiter({ limit, windowMs })`
factory (pure seam, unit-TDD): fixed-window check, Retry-After seconds,
opportunistic purge of expired keys. Wire all four routes to one factory each.

### F-9 MEDIUM — Docs-count rot: live docs disagree with the actual suite
Evidence: `home-furnishing-store_SKILL.md` Appendix B: "Unit suite (50)" /
"E2E suite (23)" and quick-ref missing the task118 plan (actual: 58/27);
this is the exact failure class `skills/web-application` §14 prescribes the
neo-crm mechanism for ("a stale count anywhere fails the test run").
Fix (ToDo-9): `tests/unit/docs-counts.test.ts` — fs-computes the real counts
(`^\s*(test|it)\(` over `tests/unit/*.test.ts` = 58; `^\s*test\(` over
`tests/e2e/*.spec.ts` = 27 — both verified exact this run) and asserts every
live-tense count site in AGENTS/README/CLAUDE/SKILL matches; fix the stale
Appendix B. Future test changes without doc updates fail the unit gate.

### F-10 MEDIUM — `/order/[number]` (PII surface) has no `noindex` meta
Evidence: no metadata export (`order/[number]/page.tsx`); renders order number,
full name, masked email, totals. robots.txt disallows `/order/` but a
disallowed URL can still be indexed URL-only if externally linked.
Fix (ToDo-10): `export const metadata = { robots: { index: false } }` on the
page (belt-and-suspenders with the robots.txt disallow; the pinned robots/sitemap
policy stays unchanged — demo scope, no external links today).

### F-11 LOW — BuyBox "Added to bag" timer race + no unmount cleanup
Evidence: `BuyBox.tsx:21` `window.setTimeout(...)` never stored/cleared — a
second Add at t≈2.1s is wiped early; unmount leaves a pending setState.
Fix (ToDo-11): ref-stored handle; clearTimeout on re-set and unmount.

### F-12 LOW — Checkout API echoes the full inserted order row
Evidence: `checkout/route.ts:69` returns `order` (email/phone/address/postal);
`checkout/page.tsx:44-47` reads only `data.orderNumber`. Inconsistent with the
Task-118 track-route minimization.
Fix (ToDo-12): return `{ orderNumber }` only.

### F-13 LOW — Home hero hardcodes the MAKAN price
Evidence: `page.tsx:58` `formatSGD(79900)` literal while the page loads `all`.
Fix (ToDo-13): derive from the loaded catalogue row (`makan-extendable-table`).

### F-14 LOW — Dead code (grep-verified zero call sites)
Evidence: `server-data.ts:237-255` `getOrCreateCart`/`getCartLines` exported,
never referenced; `ProductCard.tsx:22` `Rating` `dark?: boolean` never passed;
`track-order/page.tsx:7` `Found.order.email` + `createdAt` fields the API never
returns.
Fix (ToDo-14): remove all three (dead-code retirement is the standing rule).

### F-15 LOW — Order/track pages render the raw store slug
Evidence: "Pickup at NORDHEM tampines" (`order/[number]/page.tsx:46`,
`track-order/page.tsx:70`); BuyBox keeps its own `STORE_LABEL` map.
Fix (ToDo-15): shared `storeName(slug)` helper over `STORES` in `catalog.ts`
(unit-pinned), rendered capitalized everywhere.

### F-16 LOW — PDP breadcrumb shows the raw category slug
Evidence: `product/[slug]/page.tsx:82` renders `p.categorySlug` ("living")
between Home and product name.
Fix (ToDo-16): `CATEGORIES` slug→name lookup ("Living room").

### F-17 LOW — ReviewSection announces errors with `role="status"`
Evidence: `ReviewSection.tsx:67` — one `msg` for success AND failure rendered
as status; cart page already splits alert/status correctly.
Fix (ToDo-17): `role={failed ? "alert" : "status"}`.

### F-18 LOW — Cart quantity stepper labels are indistinguishable
Evidence: `cart/page.tsx:96-98` — N identical "Decrease/Increase quantity"
labels (the adjacent Remove button names the line).
Fix (ToDo-18): include `l.name` in both labels.

### F-19 LOW — Search page form has no submit control
Evidence: `search/page.tsx:58-61` — Enter-only; header search has a Go button.
Fix (ToDo-19): add a labeled submit button.

### F-20 LOW — "3 payments" line rounds 1¢ up
Evidence: `product/[slug]/page.tsx:133` `Math.round(priceCents / 3)` →
$899.00 prints "$299.67 × 3 = $899.01".
Fix (ToDo-20): `Math.floor` + "from" phrasing.

### F-21 LOW — Hardcoded seasonal dates ("ends 28 Dec") on home + offers
Evidence: `page.tsx:22`, `offers/page.tsx:17` static strings, stale after Dec 28
(contrast the computed-date pattern in planning-tools).
Fix (ToDo-21): compute the campaign end date (28 Dec of the current year) via
the module-level constant pattern (purity-safe, Task 117 lesson).

### F-22 LOW — Checkout delivery slots don't adapt to the fulfilment method
Evidence: `checkout/page.tsx:99-103` one static slot list; Express orders persist
a "Standard (3–5 days)" slot.
Fix (ToDo-22): derive the slot options from the selected method.

### F-23 LOW — Sustainability ESG stats / demo framing
Evidence: `sustainability/page.tsx:22` "41,203 pieces re-homed", "73% recycled
materials", "100% renewable electricity" — invented precision NOT covered by the
footer's "product names, copy and prices are fictional" wording.
Fix (ToDo-23): add the concept-demo disclosure line (same class as the Task-117
lead-capture framing) so the page is honestly labeled demo content.

### F-24 LOW — TS strictness residue
Evidence: `inspiration/[slug]/page.tsx:15-16` filter without a type predicate
forcing `p!`; `shop/page.tsx:49` double cast through `unknown`;
`server-data.ts:241` `ins[0]!`.
Fix (ToDo-24): type-guard predicates; drop redundant casts (no behavior change).

### F-25 LOW/MEDIUM — placeOrder oversells (no qty-vs-stock validation) and decrements delivery orders from Tampines
Evidence: qty clamped 1–99 at the boundary, but a 99-qty line for a 78-stock
product succeeds and floors inventory at 0 (`server-data.ts:219` greatest(0,…))
while BuyBox prints "Only 3 left" scarcity copy; the decrement falls back to
`storeSlug || "tampines"` for delivery orders too.
Fix (ToDo-25): validate per-product qty against live inventory sum → 422
`LOW_STOCK` with the available count (RED e2e via crafted request-API checkout
qty 99 on a 78-stock product → currently 201; after: 422). Decrement-source
behaviour for delivery orders: documented in the register (best-effort demo).

### F-26 INFO — No Organization/WebSite JSON-LD
Evidence: only the PDP Product schema exists; a storefront with sitemap +
metadataBase warrants Organization + WebSite (no invented sameAs/logo fields).
Fix (ToDo-26): minimal Organization + WebSite JSON-LD in `layout.tsx` (name +
url only — honest).

### F-27 INFO — `placeOrder` delivery-order decrement drains Tampines C&C stock
Evidence: `server-data.ts:220`. Register row (no code change this cycle —
redistributing decrements is feature work).

Deferred (documented in the PAD register — do NOT "fix"):
- aggregateRating/ratingCount catalogue fiction (invented-content stance).
- Header store picker wiring (feature work, Open row).
- Wishlist full-catalogue fetch (demo scale).
- Unthrottled GET reads (limiter on /api/products risks e2e bucket
  contamination; POST surfaces covered — register row).
- drizzle.config.json local URL + wrapper default remote (existing Open rows).

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| `tests/unit/docs-counts.test.ts` (new) | unit | doc-count drift anywhere in the live docs |
| `tests/unit/rate-limit.test.ts` (new) | unit | window math, Retry-After, expiry purge |
| `tests/unit/store-name.test.ts` (new, in catalog.test.ts) | unit | storeName slug→label |
| SEO metadata spec additions (shop/inspiration/family/business/sustainability/planning-tools titles + order noindex + availability derivation) | e2e | the metadata blanket regressing |
| JSON-LD OutOfStock on zero inventory (DB-zero + restore in-spec) | e2e | availability ever deriving from the stale stockTotal |
| LOW_STOCK 422 on overselling (crafted 99-qty line) | e2e | the oversell path reopening |
| Rate-limit 429 specs (existing) | e2e | factory rewiring behaviour-preserving |
| Exact-money journey (existing, untouched) | e2e | F-2 consolidation behaviour-preserving |

## 4. Execution order (vertical slices, red → green each)

1. **Unit RED**: docs-counts test (fails on the stale SKILL Appendix B) +
   rate-limit factory tests (module absent) → apply ToDo-9 (SKILL.md B-row fix)
   + ToDo-8 (factory + 4-route rewiring) → GREEN (existing 429 e2e specs re-run
   as the rewiring pin).
2. **Server-truth slice**: ToDo-2 (placeOrder → priceTotals) + ToDo-3 (JSON-LD
   live-inventory derivation, RED e2e first) + ToDo-12 (checkout response
   minimize) + ToDo-25 (LOW_STOCK 422, RED e2e first) → journey re-run GREEN.
3. **SEO slice**: ToDo-1 (6 route layouts + home + inspiration generateMetadata)
   + ToDo-10 (order noindex) + ToDo-26 (Org/WebSite JSON-LD) + ToDo-16
   (breadcrumb name) → e2e metadata assertions added (RED observed on the
   missing titles first where practical) → GREEN.
4. **Honesty slice**: ToDo-5/6/13/20/21/23 (copy + hero price + payments floor +
   dynamic dates + demo framing) + ToDo-4 (inspiration budget) + ToDo-15
   (storeName helper + render sites).
5. **A11y + quality slice**: ToDo-7 (aria-pressed conversion ×5 surfaces) +
   ToDo-11/17/18/19/22 (BuyBox timer, alert role, stepper labels, search button,
   slot derivation) + ToDo-14/24 (dead code, TS hygiene).
6. **Docs lockstep**: worklog Task 119, AGENTS (counts + new notes), CLAUDE
   (a11y section: aria-pressed stance; rate-limit factory; SEO blanket),
   README (status + troubleshooting rows), PAD v1.4.0 (revision block +
   known-issues rows + register sweep), SKILL.md v1.3.0 (new lessons + Appendix
   B corrected by the docs-counts pin), this plan archived.
7. **Full gate**: lint → typecheck → typecheck:tests → unit (62 expected) →
   cold build (29 routes) → e2e (31 expected) → dev-server screenshots for
   changed surfaces into docs/screenshots/.
8. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py`
   with the mandatory `--remote` override.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and was read in full this run (directly or via
  the Explore-agent audit with headline findings re-verified by me at line level).
- The e2e journey uses `getByLabel`/`getByText`/default options — no role-based
  locators on the widgets F-7 touches (grep-verified); the aria-pressed conversion
  cannot break it.
- fs-computed counts verified exact: 58 unit (`^\s*(test|it)\(` per file:
  7/6/8/3/7/2/25) and 27 e2e (6+21) — the docs-counts pin is self-truthing,
  not tautological (the docs text is the failure surface).
- The 429 rate-limit e2e specs use per-probe fixed `x-forwarded-for` identities —
  a shared factory keyed the same way is behaviour-preserving.
- `priceTotals` already unit-pins `net===0 → free` (utils.test.ts) — F-2 is a
  Mode-D consolidation onto that pinned seam, characterization held by the
  exact-money journey.
- The inventory-zeroing e2e (F-3) runs against the live DB the webServer pins;
  rows are restored in a finally block; the product chosen is not the journey's
  MAKAN table.
- Metadata layouts for client pages are server files — no `"use client"` import
  violations (Next 16 allows a client page under a server layout).
- No new runtime dependencies; no schema changes; no new env variables; the
  `.env.example` single-variable contract is unchanged and stays in the commit.
- New expected totals (62 unit / 31 e2e) sweep every live-tense count site in
  the same commit (the docs-counts test then enforces them forever).

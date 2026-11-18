# Task 121 Remediation Plan — Client-State Robustness, Commerce Honesty, UX/SEO Completion

Date: 2026-11-19 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (§14–§16,
§18–§20) with the mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer
taxonomy at 390×844/1440×900 + hydration probe on the dev server), execution per
`skills/tdd` (red → green, one seam at a time). `skills/` excluded from
checking/testing/compilation (operator contract).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 on 127.0.0.1:5432, postgres/app_db — fresh sandbox, PG installed per skills/rootless-postgresql)

| Gate | Result |
|---|---|
| fresh clone → `046c4df` (delta since pushed Task-120 `eb7ec88`: docs-only — session_7.md log) | clean tree |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 86/86 |
| `npm run test:e2e` (Playwright, production build :3100) | 43/43 |
| DB contract | 9 tables (Task-120 retirement holds); seed 24/8/72/3/6/3/5 (products/categories/inventory/stores/inspirations/promotions/reviews) |
| `.env.example` | single-variable contract intact (matches `src/db/index.ts` + `drizzle.config.json`) |
| `next.config.ts` | `allowedDevOrigins: ["127.0.0.1"]` pinned (Task-118 fix holds) |
| Dev-server + hydration (127.0.0.1:3000 via agent-browser) | pages render + hydrate (drawer interactive, taxonomy pass) |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900) | open / navigate+auto-close (`/shop?cat=bedroom`) / Escape / toggle / hamburger hidden-≥1024 (`display:none`, 0×0 rect) ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact) |
| Sitemap/SEO check | sitemap = 12 static + 24 product + 6 room (42 URLs) indexable-only; robots coherent; metadata blanket complete — **but** every URL ships `lastModified: new Date()` (F-9), `/shop` SSR HTML carries zero product content (F-17), and the PDP JSON-LD `reviewCount` contradicts the live review list it sits beside (F-6) |
| Full-file audit | 50 `src/` files + 12 test files read by an Explore agent; every headline finding re-verified by me at line/byte level (incl. the `[m` display-layer false-alarm on checkout/page.tsx:25/113 — bytes verified intact via char codes, the documented Task-119 sandbox lesson, no action) |
| Reference repo | `homenest-store-s` reviewed (AGENTS/CLAUDE/PAD/SKILL + configs): same Next 16/React 19/TS-strict/Tailwind v4 CSS-first spine; its mobile-nav lesson (never JS-toggle display utilities — conditionally mount) matches this repo's implementation; its sitemap degrade pattern and test-architecture (pinned e2e DB, mobile-navigation project) already mirrored here |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — Search page announces "0 results for …" before the fetch starts
Evidence: `src/app/search/page.tsx:24` `loading` initializes `false` and only flips
`true` inside the 250 ms debounce callback (`:38-39`); the zero-results guards
(`!loading && !error && needle`, `:81-92`) are therefore all true during the initial
debounce window. Browser-verified this run: immediate load of `/search?q=sofa`
renders `role="status"` text `0 results for "sofa"` (assertively wrong), then
settles to `2 results`. Wishlist and Shop both initialize `loading=true` — search
is the outlier.
Fix (ToDo-1): a "settled" flag set in the effect's `finally`; zero-result blocks
gate on settled. RED e2e: delay `/api/products` via `page.route`, assert the
status region never shows a count/empty verdict while pending.

### F-2 MEDIUM — placeOrder stock check is island-wide but click-&-collect fulfils from ONE store
Evidence: `src/lib/server-data.ts:213-226` sums locked inventory across ALL stores
per product; `:264-270` decrements only `input.storeSlug || "tampines"`. A
click-&-collect order at Jurong passes the aggregate check with Jurong at 0
(Tampines carrying the stock) and the confirmation then promises "Ready for
pickup at NORDHEM Jurong" (`order/[number]/page.tsx:69`) — while the PDP BuyBox
honestly showed "Jurong: Out of stock". The Task-119 "refuses what it cannot
fulfil" claim is violated at the acceptance boundary. (Delivery-method aggregate
checking stays — any store can ship; the single-store decrement source remains
the documented deferral.)
Fix (ToDo-2): for `deliveryMethod === "click-collect"`, scope BOTH the
availability check and the decrement to the chosen store's rows. RED e2e: quiet
product, zero the chosen store's row (others stocked), checkout POST
click-collect at that store → expect 422 LOW_STOCK (today: 201); positive
control at a stocked store → 201.

### F-3 MEDIUM — ReviewSection/BuyBox keep the previous product's state on client-side PDP→PDP navigation
Evidence: `src/app/product/[slug]/page.tsx:172-175` renders
`<ReviewSection productId={p.id} initial={reviews…}>` (and `<BuyBox …>`)
without a `key`; App Router client navigation between two dynamic-segment values
preserves client-component state at the same tree position — the "Pairs well
with" grid (`:177-183`) is exactly such a path. Product B's page then renders
product A's review list ("Reviews (2)" of the wrong product) and a submitted
review posts to B's id while prepending into A's list. Every current e2e uses a
fresh `page.goto` — structurally blind to it (why this survived 8 cycles).
Fix (ToDo-3): `key={p.slug}` on both components (the sanctioned remount
pattern). RED e2e: goto PDP A, click a related card, assert the new page's
review section belongs to the new product and the BuyBox qty reset to 1.

### F-4 MEDIUM — createLocalStore accepts valid-JSON of the wrong shape → whole-app render crash
Evidence: `src/lib/local-store.ts:48-49` `JSON.parse(raw) as T` with no shape
check; `cart-store.tsx:87-88` immediately `lines.reduce(…)`. A persisted
`nordhem_cart_v1` of `{"lines":[]}` (or `"5"`) parses fine and throws during
render inside `CartProvider` — which wraps every route in the root layout; the
storefront is replaced by Next's generic error page for that browser. The
contract comment (`:11-12`) overclaims ("falls back … on corrupt/missing data").
There is also no `error.tsx` anywhere (glob-verified).
Fix (ToDo-4): optional `validate` predicate on `createLocalStore` (array checks
for cart/wishlist stores, string/null for promo, string for the store picker —
fall back to the initial value on failure); honest comment; a branded root
`error.tsx` bounds any future render crash. RED unit: wrong-shape payloads per
key (the current test pins only `"{not json"`).

### F-5 MEDIUM — Utility strip clips the focusable "Shop offers" link at 390px
Evidence: `src/components/Header.tsx:65-69` — the `<p className="truncate">`
flex child's `overflow:hidden` zeroes the auto-min-size and clips the line; the
Link is the last inline content. Browser-verified this run @390px: link rect
x=349 w=61 → clipped past the viewport while `tabIndex=0` (focusable but
invisible — WCAG 2.4.7/2.4.11), and the campaign copy is cut mid-sentence.
Fix (ToDo-5): restructure the strip — truncate the message `<p>`, keep the Link
a `shrink-0` flex sibling that never clips. RED e2e (mobile project): the
"Shop offers" link's bounding box lies fully inside the 390px viewport.

### F-6 MEDIUM — PDP review count contradicts itself (catalogue "412" beside a live list of 2)
Evidence: `src/app/product/[slug]/page.tsx:135` renders
`{p.ratingCount} reviews` (seed fiction, e.g. 412) linking to `#reviews`;
`ReviewSection.tsx:48` renders `Reviews ({list.length})` from live DB rows (seed
inserts ≤2 per product, `server-data.ts:47-53`); the Product JSON-LD
`aggregateRating.reviewCount` uses the same seed column. Two different numbers
on one page, and the structured-data count is unauditable fiction (Google
policy risk). Product cards keep the invented `(412)` stat — the documented
invented-content stance — but the PDP is the only surface where both figures
coexist.
Fix (ToDo-6): PDP header link drops the numeric claim (text becomes "reviews");
JSON-LD `aggregateRating` derives `reviewCount` from the live review rows and
is omitted entirely when there are none (ratingValue keeps the catalogue
average — the documented stance). RED e2e: JSON-LD reviewCount === the rendered
section count; header link carries no count.

### F-7 LOW — Checkout comment/code drift: silent `slice()` on deliverySlot/storeSlug; storeSlug never validated
Evidence: `src/app/api/checkout/route.ts:27-31` claims fields are "REFUSED,
never silently truncated", but `:69-70` slices `deliverySlot` (80) and
`storeSlug` (40); `storeSlug` is never checked against the three real stores
(`tampines/jurong/alexandra` — the UI default is the slug `tampines`), so a
crafted request persists an arbitrary slug that later renders as copy via
`storeName()` on the order/track pages.
Fix (ToDo-7): validate `storeSlug` against the three store slugs (422 on
unknown), refuse `deliverySlot` > 80 (422), align the comment. RED e2e: bogus
storeSlug → 422 (today: 201 persisted).

### F-8 LOW — The inventory-decrement `try/catch` inside the transaction cannot be "non-blocking"
Evidence: `src/lib/server-data.ts:264-271` — a failed UPDATE aborts the
surrounding Postgres transaction; the swallowed error is followed by COMMIT
which then fails, so the entire order 500s rather than succeeding with a
best-effort decrement. The comment promises semantics the code cannot deliver.
Fix (ToDo-8): remove the catch — decrement failure surfaces honestly
(fail-closed; the rows are locked, the statement is simple arithmetic, a
failure means something deeply wrong).

### F-9 LOW — Sitemap `lastModified` is always "now"
Evidence: `src/app/sitemap.ts:13-15` — every URL on every crawl reports fresh
modification, eroding the lastmod signal entirely.
Fix (ToDo-9): drop `lastModified` from all three lists (stable URLs, no false
freshness). Unit-pin: entries carry `url` only.

### F-10 LOW — Planning-tools `MIN_DATE` computed in UTC — off-by-one "tomorrow" for SGT users
Evidence: `src/app/planning-tools/page.tsx:10`
`new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)` — between
00:00–07:59 SGT the UTC date is still "today", contradicting the "Sessions book
from tomorrow onward" comment.
Fix (ToDo-10): extract a pure `sgTomorrowISO()` (UTC+8 arithmetic, no
`Intl` dependency in the hot path) into `src/lib/utils.ts`, rewire the page.
RED unit: a fixed UTC-evening instant → the SGT tomorrow date.

### F-11 LOW — BuyBox minus button is enabled-but-no-op at qty 1
Evidence: `src/components/BuyBox.tsx:39`
`onClick={() => setQty((q) => Math.max(1, q - 1))}` — the Task-120
"minus disabled at qty 1" fix landed on the cart page only; the PDP stepper
keeps a dead control at the floor (e2e pins only the cart,
`storefront.spec.ts:352`).
Fix (ToDo-11): `disabled={qty <= 1}` + `disabled:opacity-40` (match the cart
pattern). RED e2e: PDP minus disabled at qty 1 (today: enabled).

### F-12 LOW — Checkout renders every error inside the Payment section
Evidence: `src/app/checkout/page.tsx:134` — `{error && <p role="alert">…}`
lives inside section "3 · Payment", so a contact-field validation failure
(email/name/postal) surfaces far from the offending inputs.
Fix (ToDo-12): hoist the alert above the form grid (one shared error surface,
DOM-order before every section). RED e2e: invalid email submit → the alert
precedes the "2 · Fulfilment" heading (today: inside Payment).

### F-13 LOW — `aria-label` on generic elements (ignored by assistive tech)
Evidence: `src/app/shop/page.tsx:112` `<div aria-busy="true"
aria-label="Loading products">` and `src/app/product/[slug]/page.tsx:129`
`<p aria-label="Rated …">` — labels on role-less containers are unreliably
announced.
Fix (ToDo-13): `role="status"` on the shop loading block; `role="img"` on the
PDP star display (the Task-120 star pattern).

### F-14 LOW — Layout comment claims a "catalogue search pointer" the JSON-LD doesn't contain
Evidence: `src/app/layout.tsx:18-35` — the WebSite node has no
`potentialAction`; the comment overclaims.
Fix (ToDo-14): add a real `SearchAction`
(`/search?q={search_term_string}` — backed by the search page) to the WebSite
node. RED e2e: home page site-JSON-LD contains SearchAction.

### F-15 LOW — "Member prices this week" label contradicts the help FAQ
Evidence: `src/app/family/page.tsx:53` links `/offers` as "Member prices this
week" while `src/app/help/page.tsx:21` states "there are no separate member
prices in this store".
Fix (ToDo-15): relabel to "This week's offers".

### F-16 LOW — Copy claims an email/SMS that is never sent
Evidence: `src/app/order/[number]/page.tsx:66` "confirmation sent to …"
(no email subsystem exists — unlike sibling demo flows, no disclaimer);
`src/app/track-order/page.tsx:46` "from your confirmation email";
`src/app/services/page.tsx:18` "Live SMS tracking".
Fix (ToDo-16): order page → "order summary for {masked email}"; track page →
"from your order"; services → "SMS tracking updates" framed as the demo
concept, or the label softened to what the demo shows.

### F-17 LOW — `/shop` is sitemap-indexed but its SSR HTML carries zero product content
Evidence: `src/app/shop/page.tsx:1` is `"use client"` end-to-end — the grid
arrives only after the client fetch (`:32-57`); the shop layout's own comment
documents the gap. Non-JS crawlers and unfurlers see an empty grid behind a
fully-indexed URL.
Fix (ToDo-17): server-component wrapper fetches the initial (cat/sort-filtered)
list via the same lib seam (`searchProducts`) and passes it to `ShopInner` as
`initial` (skip the mount fetch when params match; skeletons only on subsequent
filter changes). RED e2e: `javaScriptEnabled: false` context loads `/shop` and
finds product cards in the SSR HTML (today: none).

### F-18 INFO — Home hero price fallback re-hardcodes the catalogue; home ships no og:image
Evidence: `src/app/page.tsx:87` `?? 79900` — the exact magic number the Task-119
F-13 fix removed; if the MAKAN product leaves the catalogue the hero shows a
price the PDP contradicts. Home metadata has no `og:image` (products do).
Fix (ToDo-18): fallback renders "Shop now" without a price when the product is
missing; home metadata gains `og:image` (the hero Pexels URL, absolute).

### F-19 INFO — "ends 28 Dec" goes stale Dec 29–31
Evidence: `src/app/page.tsx:13` `CAMPAIGN_END` is Dec 28 of the current year —
between Dec 29–31 the banner advertises a past end date.
Fix (ToDo-19): roll to next year when the computed date is already past
(module-load pure function, unit-pinnable).

### F-20 INFO — Checkout method-switching is unpinned (test gap)
Evidence: no e2e exercises the Fulfilment toggle; the Task-119 slot-derivation
behaviour (method switch resets the slot) has no pin since the ARIA conversion.
Fix (ToDo-20): e2e — switch delivery → click & collect, assert the slot
options re-derive and the selected method's aria-pressed state.

Deferred (documented in the PAD register — do NOT "fix"): header store-picker
wiring, unthrottled GET reads, delivery-order decrement source = tampines,
wishlist full-catalogue fetch, `drizzle.config.json` local URL, wrapper default
remote, orderNumber collision retry, PDP repeated catalogue reads (React.cache
at scale), cross-tab storage sync, cart standard-delivery preview label,
mixed-line payload drop semantics, aggregateRating ratingValue fiction
(the invented-content stance; only the COUNT is being made honest in F-6),
`hover:font-bold` glyph jitter, `[m` display-layer trap (sandbox lesson, not a
code defect — re-verified this run).

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| search: no verdict while pending (delayed API) | e2e (RED) | F-1 settle-flag regression |
| click-collect at a zeroed store → 422 LOW_STOCK | e2e (RED) | F-2 per-store acceptance gap reopening |
| PDP→PDP client navigation shows the NEW product's reviews + qty reset | e2e (RED) | F-3 key regression |
| local-store wrong-shape payloads per key | unit (RED) | F-4 shape-validation regression |
| utility-strip "Shop offers" fully inside 390px viewport | e2e (RED) | F-5 clipping regression |
| JSON-LD reviewCount === live section count; header link carries no count | e2e (RED) | F-6 contradiction returning |
| bogus storeSlug → 422; deliverySlot >80 → 422 | e2e (RED) | F-7 boundary drift |
| sitemap entries: url only, no fake lastModified | unit (RED) | F-9 regression |
| `sgTomorrowISO()` fixed-instant tests | unit (RED) | F-10 UTC/SGT edge |
| PDP stepper minus disabled at qty 1 | e2e (RED) | F-11 floor regression |
| checkout alert precedes the Fulfilment section | e2e (RED) | F-12 placement regression |
| home site-JSON-LD carries SearchAction | e2e (RED) | F-14 regression |
| /shop SSR HTML contains product cards with JS disabled | e2e (RED) | F-17 SSR-content regression |
| `campaignEndLabel(now)` past-date roll | unit (RED) | F-19 edge |
| checkout method-switch slot re-derivation | e2e | F-20 pin |
| existing pins re-run (unit+e2e) | both | money journeys, LOW_STOCK, TOCTOU pair, metadata blanket, docs-counts |

## 4. Execution order (vertical slices, red → green each)

1. **Client-state slice**: ToDo-3 (`key={p.slug}` on ReviewSection/BuyBox),
   ToDo-4 (shape validation + `error.tsx`) → unit + e2e GREEN.
2. **Commerce-honesty slice**: ToDo-2 (per-store click-collect check+decrement),
   ToDo-7 (storeSlug/deliverySlot validation), ToDo-8 (decrement catch removal),
   ToDo-6 (JSON-LD/header count reconciliation) → e2e GREEN; the exact-money
   journeys stay exact (delivery path untouched).
3. **UX/a11y slice**: ToDo-1 (search settle flag), ToDo-5 (utility strip),
   ToDo-11 (BuyBox minus), ToDo-12 (error placement), ToDo-13 (aria roles),
   ToDo-20 (method-switch pin) → e2e GREEN.
4. **SEO slice**: ToDo-9 (sitemap lastModified), ToDo-14 (SearchAction),
   ToDo-17 (/shop SSR content), ToDo-18 (hero fallback + og:image),
   ToDo-19 (campaign roll) → unit + e2e GREEN.
5. **Honesty copy slice**: ToDo-15 (member prices), ToDo-16 (confirmation
   email/SMS copy).
6. **Docs lockstep**: worklog Task 121, AGENTS/CLAUDE/README counts + notes,
   PAD v1.6.0 (revision block + register rows), SKILL.md v1.5.0 (new lessons
   via skills/distill-codebase-skill + skills/to-distill-project-into-skill),
   this plan archived, `.env.example` re-verified (unchanged contract, in
   commit).
7. **Full gate**: lint → typecheck → typecheck:tests → unit (new total) →
   cold build (`rm -rf .next`) → e2e (new total) → dev-server screenshots for
   changed surfaces into `docs/screenshots/`.
8. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py`
   with the mandatory `--remote` override.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this run
  (Explore-agent audit + my line-level re-reads of search/shop/checkout pages,
  server-data.ts placeOrder, local-store.ts, cart-store.tsx, Header.tsx,
  BuyBox.tsx, PDP, order/track/services copy sites, sitemap.ts, layout.tsx,
  planning-tools date, family/help labels; browser-verified F-1 and F-5 live).
- The `[m`-eating display layer produced a false "corruption" alarm on
  `checkout/page.tsx:25/113` this run — bytes verified intact via char codes
  (the documented Task-119 lesson; encoded as a debugging row, no code change).
- The click-collect spec manipulates the pinned DB directly (pg UPDATE in-spec
  with restore in `finally`), reusing the Task-119/120 quiet-product discipline
  (product chosen away from the journey/spec-owned slugs).
- `/shop` SSR conversion keeps the client filter bar and URL-derived state
  intact: the server wrapper only supplies `initial` items for the
  current cat/sort; the mount fetch is skipped exactly when params match the
  server-provided pair (q/max start empty/0 by construction).
- The F-6 reconciliation does not touch ProductCard (the invented `(412)` stat
  stays — documented stance); only the PDP coexistence and the structured-data
  count become live-derived.
- `storeName()` already maps the three real slugs; the checkout UI's default
  (`"tampines"`) and store picker values are slugs — the F-7 whitelist is
  compatible with every existing caller.
- No new runtime dependencies; no new env variables; `.env.example` contract
  unchanged; the docs-counts pin sweeps all five operator docs at final counts
  (count-lockstep, no exceptions).

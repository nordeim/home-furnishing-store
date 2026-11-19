# Task 123 Remediation Plan — Journey Residue, Promo-Display Truth, Boundary/Docs Honesty

Date: 2026-11-19 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (§14–§20) with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
+ hydration probe on the dev server), execution per `skills/tdd` (red → green, one seam at a
time). `skills/` excluded from checking/testing/compilation (operator contract). Reference
patterns cross-checked against `homenest-store-s` (its e2e stock-restore discipline, guarded
write boundaries, count-derived headings and envelope-consistency posture motivated F-1/F-3/
F-10/F-9; its mobile-nav conditional-mount lesson re-verified intact here).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 on 127.0.0.1:5432, postgres/app_db — pgdata restored from the previous session's snapshot, missing PG subdirectories recreated, WAL recovery clean)

| Gate | Result |
|---|---|
| fresh clone → `71b60d8` (delta since pushed Task-122 `09030d8` + session logs: docs-only — session_9.md + session_10.md) | clean tree |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 117/117 |
| `npm run test:e2e` (Playwright, production build :3100, chromium-1255 installed) | 71/72 → **environmental failure investigated and fixed pre-plan**: the restored pgdata snapshot PREDATES the Task-122 `inventory_product_store_uq` push — the F-12 unique-index pin failed because the index was absent from the live DB, not from the schema. `npx drizzle-kit push` recreated it; the spec now passes (re-run GREEN). |
| DB contract | 9 tables; seed 24/8/72/3/6/3/5; **baseline residue cleaned**: 8 probe/journey orders (7 from the prior session + 1 from this baseline run — the M-1 evidence) deleted, makan tampines restored 20→24 via the seed formula (`base=(id*37)%40`) |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | open / navigate+auto-close (`/shop?cat=bedroom`) / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact); hydration verified live (add-to-bag → header badge "Shopping bag, 1 item") |
| Utility strip @390 | "Shop offers" link x=313 w=61 right=374 < 390 — Task-121 F-5 fix holds |
| Sitemap/SEO | sitemap 42 URLs (12 static + 24 product + 6 inspiration), indexable-only, NO lastModified, no private routes; robots coherent; metadata blanket + JSON-LD pins green in the e2e baseline |
| Full-file audit | all 51 `src/` files + 11 test files read by an Explore agent; every headline finding re-verified by me at line/byte level; M-2 additionally **browser-reproduced live** (WELCOME10 applied at $258 → decrease to $129 → "WELCOME10 applied — 10% off your first order over $150" persists while the Discount row disappears) |
| Reference repo | `homenest-store-s` reviewed: same Next 16/React 19/TS-strict/Tailwind v4 CSS-first spine; its e2e stock-restore discipline (S14-4), method-scoped slot validation, count-derived review headings, and every-route envelope posture checked against this repo (deltas became findings F-1/F-3/F-10/F-9) |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — The flagship e2e journey leaves unbounded DB residue and permanently drains inventory (gotcha #13 violated by the oldest spec)
Evidence: `tests/e2e/storefront.spec.ts:245–295` — the bag → promo → checkout → track journey
places a real MAKAN delivery order and has NO cleanup, while the four sibling DB-touching
specs (oversell `:494–507`, concurrent `:770–783`, click-&-collect `:863–876`, JSON-LD
`:442–450`) all restore inventory + delete probe rows in `finally`. Live-observed this run:
the baseline e2e left order `NH-20261118-31J0A9` + decremented makan tampines 24→20 (the
restored DB carried 7 more such rows from the prior session — cleaned pre-plan). At ~24 runs
the PDP stock copy degrades; at ~42 the journey's own checkout fails LOW_STOCK.
Fix (ToDo-1): capture the order number (already read at the confirmation), and in a
`finally` restore the makan tampines row to its pre-spec value and delete the probe
order_items/orders (the F-12 cleanup pattern, verbatim). Verified by running the journey
twice and asserting the DB returns to identical state after each run.

### F-2 MEDIUM — Cart says "CODE applied" while the discount row is hidden below the minimum — the two halves of the Task-122 F-5 fix contradict each other on-screen
Evidence: `src/app/cart/page.tsx:25` — `promoMsg = applyMsg ?? (promoCode ? { ok: true,
text: \`${promoCode} applied\` } : null)`; the discount row gates on `effectivePromo`
(`:61`, `:120`). Browser-reproduced: WELCOME10 on a $258 bag → decrease to $129 → the green
"WELCOME10 applied — 10% off your first order over $150" message persists, the Discount
row vanishes with no explanation, and the code still submits to a server INVALID_PROMO at
the Pay step. Display and server refusal diverge again — the exact class F-5 existed to close.
Fix (ToDo-2): a `findPromoMinimumCents(code): number | null` pure seam in
`src/lib/catalog.ts` (PROMOS already carries `minSubtotalCents`; unit-RED: WELCOME10 →
15000, MAKAN15 → 40000, unknown → null); the cart's notice derivation becomes: when
`promoCode && !effectivePromo(promoCode, subtotalCents)` → honest notice "WELCOME10 needs a
$150.00 minimum — add more to use it" (replacing the stale "applied" message for the
current state); e2e RED: apply above the minimum, decrease below it, assert the notice
appears and "applied" is gone.

### F-3 LOW — `deliverySlot` is length-checked but not method-checked — crafted junk persists into customer-facing order copy
Evidence: `src/app/api/checkout/route.ts:81–83` — only `length > 80` is refused; any ≤80-char
string persists verbatim and renders on the confirmation ("Arriving {deliverySlot}") and
tracking pages. The UI only ever sends `SLOTS[method]` values (`src/app/checkout/page.tsx:15–19`)
— the boundary should enforce what the UI contract already is (the storeSlug whitelist
pattern at `route.ts:77–80`).
Fix (ToDo-3): promote the SLOTS map to the shared pure seam (`src/lib/utils.ts`:
`DELIVERY_SLOTS` + `isValidDeliverySlot(method, slot)`); the checkout page imports it
(single source); the route validates coherence (unknown method keeps the delivery set;
cross-method slots → 422 "Choose one of the offered time slots."). Unit pins for the
helper; e2e RED: express + "Junk slot" → 422 (today 201 persisted).

### F-4 LOW — Search-page stale error box not gated on the settled flag (the Task-121 F-1 discipline covers verdicts only)
Evidence: `src/app/search/page.tsx:96` — `{error && !loading && …}`; `setError(false)` runs
only inside the 250ms debounce callback. After a failed search, typing a new needle shows
the OLD "We couldn't load results" box through the debounce + fetch window (loading is
false during the window), while the result verdicts correctly gate on
`settledFor === needle` (`:103`, `:109`).
Fix (ToDo-4): gate the error box on `settledFor === needle` identically to the verdicts.
e2e RED via the documented frozen-debounce pattern (`storefront.spec.ts:967–987`) + route
abort for the failing needle: error box shows after the failed settle; type a new needle
with timers frozen → the box must be hidden; unfreeze → the new search lands clean.

### F-5 LOW — `/api/products` keyword filter omits `categorySlug` — recall diverges from the `searchProducts` seam
Evidence: `src/app/api/products/route.ts:17` filters on
`name tagline description sku`; `src/lib/server-data.ts:96` (shop SSR) also matches
`categorySlug`. Verified live: `GET /api/products?q=outdoor` → 0 results (the two
balcony & outdoor products are text-invisible) while the shop-SSR seam returns 2;
`q=bedroom` → 2 vs 3.
Fix (ToDo-5): add `p.categorySlug` to the API filter string (one seam defines recall —
or rather both seams now agree). e2e RED: `q=outdoor` returns the balcony/outdoor
products (today 0).

### F-6 LOW — The promo code survives order placement — the next bag silently inherits it
Evidence: `src/app/checkout/page.tsx` `clear()` on success;
`src/lib/cart-store.tsx:102` — `clear: () => linesStore.set([])` leaves `nordhem_promo`
persisted. The next bag auto-shows "CODE applied" + discount once above the minimum.
Fix (ToDo-6): `clear()` also resets the promo store (the code belongs to the order it was
used on). e2e RED: after the journey's checkout, `localStorage.nordhem_promo` is null
(today the MAKAN15 string persists).

### F-7 LOW — Error-digest text fails WCAG AA contrast
Evidence: `src/app/error.tsx:30`, `src/app/global-error.tsx:39` — `text-[#9a9a9a]` on
white ≈ 2.85:1 at 12px (the repo's own muted-token floor is #5b5b5b, Task 120).
Fix (ToDo-7): `#9a9a9a` → `#5b5b5b` in both boundaries. (No new pin — the crash pages
are probe-verified manually, not e2e'd; the value matches the established muted token.)

### F-8 LOW — CLAUDE.md/README claim ARIA roles the code deliberately removed, and a `cn` helper that does not exist
Evidence: `CLAUDE.md:96–97` ("`role=` `"tablist"/"radiogroup"`") + `README.md:47`
("radiogroups/tablists") vs the Task-119 ARIA stance (toggle-button groups use
`role="group"` + `aria-pressed`; widget roles only with the full APG keyboard pattern —
documented in CLAUDE.md:176 itself) and zero `radiogroup`/`tablist` in `src/`;
`CLAUDE.md:76` lists a `cn` helper — no such export exists in `src/lib/utils.ts`.
Fix (ToDo-8): reword both docs to the group/aria-pressed stance; drop `cn`. (Docs-only;
the docs-counts pin covers the test-count claims, this is the claim-accuracy sweep.)

### F-9 LOW — `/api/health` deviates from the documented "envelope everywhere" contract
Evidence: `src/app/api/health/route.ts` returns bare `{ ok: true }` / `{ ok: false }`;
AGENTS.md #4 / CLAUDE.md:62–63 / README.md:208 all claim "every route". The e2e pin
(`storefront.spec.ts:116–120`) pins the bare shape.
Fix (ToDo-9): align the route to the envelope — `{ ok: true, data: { db: "up" } }` /
`{ ok: false, error: { code: "DB_DOWN", message: "Database unreachable." } }` — and update
the e2e pin in the same commit (the webServer readiness probe only checks HTTP 200;
docker-compose healthcheck re-verified unaffected).

### F-10 LOW — PDP `aggregateRating.reviewCount` and the "Reviews (N)" heading silently saturate at 20
Evidence: `src/lib/server-data.ts:109` `getReviews(…).limit(20)` feeds
`src/app/product/[slug]/page.tsx:72–79` (`reviewCount: reviews.length`) and the
ReviewSection heading (`list.length`). Beyond 20 live reviews the JSON-LD and heading
understate the truth — the Task-121 F-6 "derives from live rows" honesty claim degrades
as data grows.
Fix (ToDo-10): `getReviewCount(productId)` — a `count(*)` query with its own degrade
catch; the PDP passes a `total` to ReviewSection (heading renders `total`, bumps on
successful POST) and uses it for the JSON-LD `reviewCount` (the rendered LIST stays
capped at 20 — a display cap, not a count cap). e2e RED with pg in-spec: insert 21
probe reviews for the quiet HAVBRIS product → JSON-LD reviewCount 21 (today 20); cleanup
in `finally` (the F-12 discipline).

### F-11 LOW — The "Reviews (2)" hard-count pin remains residue-fragile
Evidence: `storefront.spec.ts:791` — `getByRole("heading", { name: "Reviews (2)" })`.
Any successful review POST against SOLBAKKEN breaks it (gotcha #13's exact failure mode).
Fix (ToDo-11): accept `/^Reviews \(\d+\)$/` (the derived-count spec at `:889–897` already
does this); keep the "Mei L." author assertion as the real content pin.

### F-12 INFO — `orderNumber()` derives its date segment from server-local (UTC) time, not SGT
Evidence: `src/lib/utils.ts:78–83`. Between 00:00–07:59 SGT the order number carries the
prior calendar day. Uniqueness unaffected; cosmetic vs the store's locale — the same class
as (milder than) the Task-122 `sgTomorrowISO` fix, and the seam is already proven.
Fix (ToDo-12): derive YMD at UTC+8 (the `SGT_OFFSET_MS` pattern), accept an optional
`now` for unit-pinning; RED unit: fixed UTC-evening instant → the SGT date segment.

### F-13 INFO — The `nordhem_promo` persisted-state validator accepts unbounded strings
Evidence: `src/lib/cart-store.tsx:76` — `(v) => v === null || typeof v === "string"`; a
crafted 10k-char value loads into the store and rides to checkout until the server's
32-char cap refuses it.
Fix (ToDo-13): tighten the predicate to `length <= 32` (mirrors the write boundary);
unit RED: a 33-char persisted value degrades to null.

### F-14 INFO — Register notes (docs-only)
(a) Delivery-order accounting drift: the availability check is island-wide while the
decrement floors one store (`server-data.ts:221–238` vs `:279–284`) — a delivery order
for 10 units against a 2-unit decrement store passes and floors the row (8 sold units
never leave stock). Already covered by the "delivery decrement source = tampines"
deferral — the PAD register row gains the accounting-drift consequence explicitly.
(b) `/search` `autoFocus` noted in the a11y ledger as an accepted search-page pattern.

Deferred (documented in the PAD register — do NOT "fix"): header store-picker wiring,
unthrottled GET reads, xff first-hop spoofing posture, orderNumber collision retry, PDP
repeated catalogue reads, cross-tab storage sync, cart standard-delivery preview label,
mixed-line payload drop semantics, aggregateRating ratingValue fiction (invented-content
stance), `hover:font-bold` glyph jitter, `[m` display-layer trap (re-verified intact
this run on `checkout/page.tsx:25` — typecheck/e2e green, no action), SearchAction
decorative posture, offers bundle slug curation.

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| journey finally-cleanup restores makan tampines + deletes the probe order; suite run twice → identical DB state | e2e (discipline) | F-1 residue regression |
| `findPromoMinimumCents`: WELCOME10→15000, MAKAN15→40000, FLAT20→25000, unknown→null | unit (RED) | F-2 seam regression |
| cart: below-minimum notice replaces "applied"; discount row stays hidden | e2e (RED) | F-2 display/server divergence |
| `isValidDeliverySlot`: method-coherent pass, cross-method + junk refuse; DELIVERY_SLOTS === the page's map | unit (RED) | F-3 boundary drift |
| checkout POST express + "Junk slot" → 422 | e2e (RED) | F-3 junk persistence |
| search: stale error hidden during a new needle's window (frozen debounce + aborted fetch) | e2e (RED) | F-4 stale-error regression |
| `/api/products?q=outdoor` returns the balcony & outdoor products | e2e (RED) | F-5 recall divergence |
| journey: `nordhem_promo` null after checkout | e2e (RED) | F-6 promo carry-over |
| health: `{ ok: true, data: { db: "up" } }` exact shape | e2e (pin update) | F-9 envelope drift |
| 21 probe reviews on HAVBRIS → JSON-LD reviewCount 21 + heading "Reviews (21)" (cleanup in finally) | e2e (RED, pg in-spec) | F-10 count saturation |
| `orderNumber(now)` SGT date segment at fixed instants (UTC-evening → next SGT day) | unit (RED) | F-12 UTC/SGT edge |
| promo store validator: 33-char persisted value → null | unit (RED) | F-13 unbounded persisted state |
| "Reviews (N)" regex pin + existing author pin | e2e (hardening) | F-11 residue fragility |
| existing pins re-run (unit+e2e) | both | money journeys, LOW_STOCK, TOCTOU pair, metadata blanket, docs-counts |

## 4. Execution order (vertical slices, red → green each)

1. **Journey-residue slice**: ToDo-1 (journey finally-cleanup) + ToDo-11 (Reviews regex)
   + ToDo-6 (promo clear — RED first) — the test-tree slice; run the journey twice to
   verify zero residue.
2. **Promo-truth slice**: ToDo-2 (`findPromoMinimumCents` unit RED → cart notice e2e RED)
   → GREEN.
3. **Boundary slice**: ToDo-3 (SLOTS seam + unit RED + route validation + e2e RED),
   ToDo-9 (health envelope + pin update) → GREEN.
4. **Recall/resilience slice**: ToDo-5 (API categorySlug + e2e RED), ToDo-4 (search
   settled-gate + frozen-timer e2e RED) → GREEN.
5. **Honesty-counts slice**: ToDo-10 (`getReviewCount` + ReviewSection total + pg-in-spec
   e2e RED) → GREEN.
6. **Small seams slice**: ToDo-12 (`orderNumber` SGT unit RED), ToDo-13 (promo validator
   unit RED), ToDo-7 (digest contrast) → GREEN.
7. **Docs lockstep**: worklog Task 123, AGENTS/CLAUDE/README counts + claim fixes
   (ToDo-8: ARIA stance + `cn`), PAD revision block + register rows (ToDo-14), SKILL.md
   refresh via skills/distill-codebase-skill + skills/to-distill-project-into-skill,
   this plan archived, `.env.example` re-verified (contract unchanged, in commit).
8. **Full gate**: lint → typecheck → typecheck:tests → unit (new total) → cold build
   (`rm -rf .next`) → e2e (new total) → dev-server screenshots for changed surfaces into
   `docs/screenshots/`.
9. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py` with the
   mandatory `--remote` override; session log as the follow-up commit.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this run (audit
  agent + my line-level re-reads of the journey spec, cart page, checkout route + page,
  search page, products route, server-data, catalog, utils, cart-store, ReviewSection,
  PDP, error boundaries; browser-verified the mobile taxonomy, hydration, the utility
  strip, the M-2 contradiction, the API recall divergence and the sitemap/robots
  endpoints).
- F-1's cleanup pattern is proven in-repo (four sibling specs); the makan pre-spec value
  is read inside the spec (not assumed 24) so the cleanup is robust to future seed drift.
- F-2's `findPromoMinimumCents` is additive (no existing caller changes); PROMOS already
  carries `minSubtotalCents`; the cart notice reuses the existing message rendering path.
- F-3's SLOTS promotion is a move-to-shared-seam refactor: `checkout/page.tsx:15–19` is
  the only current definition; the route gains a whitelist identical in shape to
  STORE_SLUGS. The default-slot fallback (`?? "Standard (3–5 days)"`) stays valid (it is
  the delivery set's first member).
- F-9's health change is checked against its consumers: the Playwright webServer URL
  probe (HTTP 200 check only) and docker-compose healthcheck (curl status, re-verified).
- F-10's ReviewSection `total` prop defaults to `initial.length` (no other caller
  breaks); the JSON-LD omit-at-zero rule is preserved (`reviewCount > 0` gate).
- F-12's `orderNumber(now?)` default keeps every existing caller valid; the format
  `NH-YYYYMMDD-XXXXXX` is unchanged (only the date segment's timezone derivation).
- The e2e DB-manipulation specs reuse the Task-119/120/121/122 quiet-product discipline
  (pg in-spec with restore in `finally`; HAVBRIS is the established zero-review product).
- No new runtime dependencies; no new env variables; `.env.example` contract unchanged;
  the docs-counts pin sweeps all five operator docs at the final counts (count-lockstep,
  no exceptions). Expected new totals: unit 117 + ~9 (findPromoMinimumCents ×4,
  isValidDeliverySlot ×3, orderNumber ×1, promo-validator ×1) ≈ 126; e2e 72 + ~6
  (cart notice, junk slot, search stale-error, API outdoor, promo-cleared, reviewCount
  21) ≈ 78 — exact counts locked by the docs-counts pin at gate time.

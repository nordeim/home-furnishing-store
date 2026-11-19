# Task 128 Remediation Plan — Body-Shape Guards, Recall Parity, Derived-Pin Completion

Date: 2026-11-19 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
+ hydration probe on the dev server — 8/8 PASS incl. the F-7 param-navigation regression
check; **no Tailwind v4 bug**), execution per `skills/tdd` (red → green, one seam at a time).
`skills/` excluded from checking/testing/compilation (operator contract). Reference patterns
cross-checked against `homenest-store-s`: **quiescent since 2026-11-01 — zero new src/tests
material since 2026-10-23** (all 8 post-boundary commits touch `skills/` + two session logs
only; root docs frozen at `ff65bd2`; skills catalogs md5-identical between the repos) —
nothing new to port; the standing port candidates (HMAC receipt token, real-engine
integration harness) remain register rows.

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17 restored at
/home/z/my-project/pg after the sandbox snapshot lost the initdb runtime subdirectories
AGAIN — the SKILL lesson-31 class, fourth cycle running: restored by a recursive no-clobber
merge from a fresh `initdb` template, preserving `base/`/`pg_wal`; schema/DDL intact incl.
`orders_idempotency_key_unique`, `reviews_product_idx`, `inventory_product_store_uq`, no
redundant `products_slug_idx`)

| Gate | Result |
|---|---|
| fresh clone → `2a7f68b` (docs-only delta since pushed Task-127 `ac93496`: session_21 log) | clean tree |
| `npm install` | green (420 packages) |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 161/161 |
| `npm run test:e2e` (Playwright, cold production build :3100, chromium-1255 installed — the documented trap, fourth cycle running) | 108/108 |
| DB contract | 9 tables; **zero residue at baseline** (0 orders, 0 order_items, 5 seed reviews, 24 products, 72 inventory) AND **zero residue after the full 108-test e2e run** (direct SQL) — the Task-126/127 discipline holds |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | open (aria-expanded=true, label toggles Open→Close) / navigate+auto-close (`/` drawer → Bedroom → `/shop?cat=bedroom` + aria-expanded=false) / Escape / toggle / hamburger hidden-≥1024 (`display:none`, 0×0 rect — the `lg:` breakpoint renders) / **F-7 param-close regression check** (`/shop?cat=dining` → drawer Bedroom → `/shop?cat=bedroom` + `aria-expanded=false`) / hydration (`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item") / no horizontal overflow at 390px ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact) |
| Sitemap/SEO | sitemap 42 URLs (12 static + 24 product + 6 inspiration), indexable-only, NO lastModified; robots coherent (disallows cart/checkout/track-order/order/wishlist/search/api); home + PDP og:image declare 1200×627 — **inspiration detail pages do NOT** (F-8) |
| Full-file audit | all `src/` + test files read by an audit agent; every headline finding re-verified by me at line level (F-1 additionally browser-confirmed live with executed probes: `null` body → 500 on all four POST routes, primitive `5` → 500 on checkout; F-5 browser-confirmed: `?q=%20solbakken%20` → 0 results vs `?q=solbakken` → 1) |
| Reference repo | `homenest-store-s` reviewed: quiescent since 2026-11-01, zero src/tests changes since 2026-10-23; catalogs md5-identical; nothing new to port |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — A valid-JSON NON-OBJECT body (`null`; on checkout any primitive) crashes all four POST boundaries to a 500
Evidence: `src/app/api/checkout/route.ts:38` (`field in body` on the parsed value — `"email"
in null` and `"email" in 5` are TypeErrors), `src/app/api/reviews/route.ts:50` (`body.productId`
property access on `null`), `src/app/api/orders/track/route.ts:31`, `src/app/api/promotions/
validate/route.ts:28`. **Browser-confirmed live this run** (dev-server probes): `null` → 500
on all four routes; `5` → 500 on checkout (the three siblings correctly 422 on primitives —
property access on a primitive returns undefined, but `null` crashes them all). The Task-120
F-1 comment claims "a malformed payload is a client fault → 400" — the parse guard catches
malformed JSON but not valid-JSON-non-object. Client fault must never be a 500 ("failed on
our side" copy + console.error noise on the most sensitive write boundary).
Fix (ToDo-1): after `req.json()`, guard the shape — `typeof body !== "object" || body ===
null || Array.isArray(body)` → 400 `BAD_REQUEST` (checkout; arrays currently limp to 422
downstream — make the refusal a 400 at the parse guard, the "not a JSON object" class) and
`body === null || typeof body !== "object"` → 400 on the three siblings. e2e RED first: a
browser-fetch `null` body → 400 (today 500, live-verified), plus the checkout primitive case.

### F-2 MEDIUM — Task-127 F-9's gotoHydrated conversion is incomplete: 12 interaction-first bare `page.goto` sites remain; the docs claim "true for both files" is false
Evidence: `tests/e2e/storefront.spec.ts` — lines 376, 415, 520, 1491, 1501, 1512, 1550, 1582,
1661, 1689, 2197, 2375 — each a full navigation followed within lines by `.click()`/`.fill()`
(all 12 read in context this run; the method-switch family converts only the FIRST
navigation of the test and leaves mid-test full navigations bare). The claims at
`AGENTS.md:126-129`, `CLAUDE.md:331-332` and `helpers.ts:7-8` ("the interaction-first specs
navigate through gotoHydrated … true for both files") overstate: 21 call sites exist, but
these 12 interaction-first navigations race hydration bare. The DOM-assertion-only specs
(JSON-LD, metadata, SEO blanket, `javaScriptEnabled:false` pair) correctly stay bare.
Fix (ToDo-2): route the 12 sites through `gotoHydrated` (mechanical conversion,
GREEN-on-arrival — the sentinel stamps on every route; the Task-127 F-9/SITE_ORIGIN
invariant-pin precedent). After the conversion the docs claims become true WITHOUT rewording.

### F-3 LOW — The Task-127 claim "the GST + family e2e pins derive" is half false: the family voucher / shop $200 / offers FLAT20 pins do not exist
Evidence: greps of `tests/e2e/*.spec.ts` for `voucher|FAMILY_|FLAT20|over \$|free delivery`
return only comments — the code derives (family/page.tsx:22, family/layout.tsx:11, shop/
shop-inner.tsx:116, shop/layout.tsx:19, offers/page.tsx:37-39 all interpolate constants —
verified) but NO assertion pins any of it. A future edit to `FAMILY_VOUCHER_CENTS`/
`FAMILY_POINTS_PER_VOUCHER`/`FREE_DELIVERY_THRESHOLD_CENTS`/the FLAT20 PROMOS row can rot
the copy with no failing test while AGENTS/CLAUDE/commit `ac93496` tell a maintainer the
pins exist ("a rate edit self-corrects copy and pins together").
Fix (ToDo-3): add the three derived pins (the Task-124 F-14 pattern — import the constants
into the spec): (a) the family page renders `${FAMILY_VOUCHER_CENTS/100}` + the
`${FAMILY_POINTS_PER_VOUCHER.toLocaleString("en-SG")}` rule; (b) the shop strip renders
`free delivery over $${FREE_DELIVERY_THRESHOLD_CENTS/100}`; (c) the offers banner composes
the FLAT20 row (`$${flat20.value/100} off orders over $${flat20.minSubtotalCents/100}`
— derive from the imported PROMOS row). GREEN-on-arrival (the code already derives).

### F-4 LOW — `orderNumber()` is the one SGT seam still reading the server-LOCAL calendar
Evidence: `src/lib/utils.ts:138-144` — `sgt.getFullYear()/getMonth()/getDate()` on the
shifted instant. Its own comment claims "pure UTC+8 arithmetic" — but the shifted Date is
re-interpreted in the server's TZ by the LOCAL getters (a UTC−5 server mints "yesterday"
for the first 13 SGT hours). Every sibling is UTC-getter-pure (`availableDeliverySlots`
uses `getUTCHours()`, `campaignEnd` uses `getUTCFullYear()` — the Task-127 F-7 fix of the
identical pattern; `sgTomorrowISO` uses `toISOString()`).
Fix (ToDo-4): swap to `getUTCFullYear()/getUTCMonth()/getUTCDate()` — the existing
fixed-instant unit pins stay green on UTC machines and become TZ-independent everywhere.

### F-5 LOW — `/api/products?q=` is not trimmed: padded needles diverge recall between the "one recall definition" consumers
Evidence: `src/app/api/products/route.ts:11` (`.toLowerCase()`, no `.trim()`) vs
`src/lib/server-data.ts:89` (`q.trim().toLowerCase()`) and `search/page.tsx:42` (trims).
**Browser-confirmed live this run**: `?q=solbakken` → 1 result, `?q=%20solbakken%20` → 0
(SOLBAKKEN starts the product name — no leading space in the haystack; mid-sentence words
like " oak " coincide-match, hiding the divergence). The shop page's keyword box sends the
raw input (`shop-inner.tsx:78`).
Fix (ToDo-5): `.trim()` in the products route (the server-data seam's own normalization).
e2e RED first: `?q=%20solbakken%20` returns the same product as `?q=solbakken` (today 0).

### F-6 LOW — The checkout route inlines the idempotency-key regex instead of importing `IDEMPOTENCY_KEY_RE`
Evidence: `src/app/api/checkout/route.ts:50` (inline `/^[A-Za-z0-9-]{8,64}$/`) vs
`src/lib/utils.ts:35` (the exported seam, imported ONLY by tests — nothing in `src/` uses
it). The unit pin tests the constant, not the boundary: a future edit to
`IDEMPOTENCY_KEY_RE` keeps every unit test green while the route enforces the old shape
(the client would mint per the new shape → silently dropped to null → dedupe silently
disabled). The Task-127 derived-copy class, one file over.
Fix (ToDo-6): `import { IDEMPOTENCY_KEY_RE } from "@/lib/utils"` and `.test()` with it —
the constant's own comment ("the shape the checkout boundary accepts") becomes true.

### F-7 LOW — The overlong-write-fields refusal spec is the one write-capable checkout spec without a RED-run safety net
Evidence: `tests/e2e/storefront.spec.ts:940-966` — POSTs an otherwise-valid order with a
300-char address, asserts 422, with NO try/finally and NO `deleteProbeOrders`
(`caps-probe@nordhem.sg`). Every sibling refusal spec carries the net (the Task-126 F-2
discipline its own comments cite). A regressed cap boundary turns this spec into a writer
that strands a real order + tampines decrement — the gotcha-#13 residue class.
Fix (ToDo-7): wrap in `try { … } finally { await deleteProbeOrders("caps-probe@nordhem.sg"); }`.

### F-8 LOW — `inspiration/[slug]` ships `og:image` without declared dimensions (the Task-126 F-8 rollout missed it)
Evidence: `src/app/inspiration/[slug]/page.tsx:28` (`images: [{ url: room.imageUrl, alt:
room.title }]` — no width/height) vs `product/[slug]/page.tsx:31` and `page.tsx:38` (both
declare 1200×627). **Browser-confirmed live**: the inspiration page's head carries
og:image + og:image:alt but no og:image:width/height; home + PDP carry all three. Every
catalogue IMG url pins `h=627&w=1200`, so the declaration is simply absent. The e2e pin
(storefront.spec.ts:2465) tests only `/` and one PDP.
Fix (ToDo-8): add `width: 1200, height: 627` to the inspiration og:image; extend the
existing og-dimensions pin to include an inspiration route (same test — no count inflation).

### F-9 LOW (promoted from INFO) — The family earn rate and the business trade rate are hand-copied copy↔math pairs (the Task-127 F-4 drift class, adjacent cluster)
Evidence: `src/app/family/page.tsx:10` (`Math.floor(spend * 10)`) + `:22` ("10 points per
$1") + `family/layout.tsx:19` (metadata "earn 10 points per $1"); `src/app/business/
page.tsx:22` (`Math.round(subtotal * 0.12)`) + `:55` ("Trade saving (12%)"). The voucher
half derives (Task 127 F-4); the rate halves are file-local hand-copies — a rate edit rots
calculator and copy independently with every gate green.
Fix (ToDo-9): introduce `FAMILY_POINTS_PER_DOLLAR = 10` and `TRADE_RATE = 0.12` in
`src/lib/utils.ts` (beside their sibling constants); derive the math (×2) and the copy
(×3) from them; the F-3 family pin (ToDo-3a) covers the earn-rate copy too.

### F-11 INFO (fixing — one line, completes the discipline) — Footer copyright year reads the server-LOCAL calendar
Evidence: `src/components/Footer.tsx:71` — `new Date().getFullYear()`, the last bare
server-local calendar read in `src/` (grep-verified). Cosmetic (an 8-hour window at SGT
new-year on a non-SGT server), but it is the one line breaking the "no server-local
calendar reads" discipline the F-4/F-7 fixes enforce.
Fix (ToDo-10): derive the year on the UTC+8 clock (`new Date(Date.now() + SGT_OFFSET_MS)
.getUTCFullYear()` — the orderNumber/campaignEnd discipline).

### F-12 INFO (fixing — cheap fs-pin) — Nothing ties `createLocalStore` keys to `PERSISTED_STORAGE_KEYS`
Evidence: `src/lib/local-store.ts:100` is "the ONE recovery list" and the crash boundaries'
import is fs-pinned, but a FIFTH store created with a new key literal (as `cart-store.tsx:82-84`
and `Header.tsx:22` each carry their own literals today) without adding to the list leaves
the recovery buttons partially ineffective with no failing test. The comment claims the
seam is closed "by construction" — nothing enforces it.
Fix (ToDo-11): a unit fs-pin in `tests/unit/local-store.test.ts` — read `src/lib/
local-store.ts`, `src/lib/cart-store.tsx` and `src/components/Header.tsx` sources, extract
every `createLocalStore<…>("…"` first-argument key literal, and assert each is a member of
PERSISTED_STORAGE_KEYS (the SITE_ORIGIN fs-pin precedent).

### Evaluated and kept deferred / rejected (do NOT "fix" without an operator decision)
- **rate-limit.ts:31 corruption (reference-agent flag)**: DISPROVEN this run by direct
  read — the line is `return hops[hops.length - 1];` (clean); typecheck + 161/161 unit
  corroborate. The reference agent misread the file.
- **Magnitude bound on whole-number guards (audit F-10)**: DEFERRED to the register —
  `?productId=999…` (25 digits) passes `/^\d+$/` and degrades to a 200 `[]` via the
  documented read-fallback catch; harmless reads, the degrade is by design. The un-deferral
  path (a `Number.isSafeInteger` bound → 422) is recorded in the register.
- **Journey hardcoded amounts (audit F-13)**: DEFERRED — `$679.15` ×2 + `"1299.00"` fail
  LOUDLY on a catalogue edit (self-alerting, unlike the silent-rot class F-3 pins); the
  flagship journey spec is not touched this cycle beyond F-2's goto conversions.
- **The auditor's 9 self-disproved candidates** (JSX-text `&amp;` sites, NaN qty, absent
  deliverySlot, rate-bucket saturation, REPLAY_MISMATCH oracle, Math.round precision,
  ensureSeed insert-order, storeSlug array coercion, planning-tools MIN_DATE): verified
  fine, no action.
- **Standing register rows unchanged**: TRUST_PROXY, CSP, jsdom layer, delivery-decrement
  redistribution, store-picker wiring, React cache(), health-503, token codemod, bundle
  curation, unthrottled GETs, orderNumber collision retry (now with F-10's magnitude note).

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| `POST /api/checkout` body `null` → 400 (today 500); body `5` → 400 (today 500); `null` → 400 on reviews/track/promo-validate (today 500 ×3) | e2e (RED) | F-1 client faults as 500s |
| 12 interaction-first storefront gotos route through `gotoHydrated` | e2e (invariant) | F-2 pre-hydration clicks |
| family page renders the voucher rule from `FAMILY_VOUCHER_CENTS`/`FAMILY_POINTS_PER_VOUCHER` (incl. the earn-rate `FAMILY_POINTS_PER_DOLLAR`); shop strip renders `FREE_DELIVERY_THRESHOLD_CENTS/100`; offers banner composes the FLAT20 PROMOS row | e2e (derived, GREEN-on-arrival) | F-3/F-9 copy drift |
| `orderNumber` fixed-instant pins (existing) stay green under getUTC* internals | unit | F-4 TZ purity |
| `?q=%20solbakken%20` returns the same set as `?q=solbakken` (today 0 vs 1) | e2e (RED) | F-5 recall divergence |
| inspiration route carries og:image:width 1200 + og:image:height 627 (extend the existing og spec's route list) | e2e | F-8 the missing declaration |
| the checkout route's key check uses the imported `IDEMPOTENCY_KEY_RE` (fs-pin: no inline `/^[A-Za-z0-9-]{8,64}$/` literal in the route) | unit (fs-pin) | F-6 seam drift |
| overlong-fields spec carries `finally { deleteProbeOrders }` | e2e (invariant) | F-7 RED-run residue |
| every `createLocalStore<…>("…"` key literal in src/ ⊆ `PERSISTED_STORAGE_KEYS` | unit (fs-pin) | F-12 recovery coverage |
| existing pins re-run (unit + e2e) | both | money journeys, idempotent replay + ownership, LOW_STOCK/TOCTOU, settle discipline, metadata blanket, docs-counts |

## 4. Execution order (vertical slices, red → green each)

1. **Body-shape slice**: ToDo-1 (F-1 e2e RED with the raw-bytes browser-fetch discipline →
   object guards on all four POST routes → GREEN).
2. **Recall-trim slice**: ToDo-5 (F-5 e2e RED → `.trim()` in the products route → GREEN).
3. **Derived-pins slice**: ToDo-3 (F-3 pins ×3, GREEN-on-arrival) + ToDo-9 (F-9 constants
   first — the family pin then covers the earn-rate copy).
4. **SEO slice**: ToDo-8 (F-8 inspiration og dimensions + the extended pin).
5. **Seam-tightening slice**: ToDo-6 (F-6 import + fs-pin), ToDo-4 (F-4 getUTC*), ToDo-10
   (F-11 Footer SGT year).
6. **Test-integrity slice**: ToDo-2 (F-2 the 12 gotoHydrated conversions,
   GREEN-on-arrival), ToDo-7 (F-7 the finally net), ToDo-11 (F-12 fs-pin).
7. **Docs lockstep**: counts sweep (AGENTS/CLAUDE/README/PAD/SKILL to the new totals — the
   docs-counts pin enforces all five), PAD v1.13.0 (revision block + register incl. the
   F-10/F-13 deferral notes + the rate-limit disproof), SKILL v2.2.0 (new lessons), worklog
   Task 128, this plan archived, `.env.example` re-verified (contract unchanged — no new
   env variables).
8. **Full gate**: lint → typecheck → typecheck:tests → unit (new total) → cold build
   (`rm -rf .next`) → e2e (new total, zero residue verified by direct SQL) →
   dev-server screenshots of the changed surfaces into `docs/screenshots/`.
9. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py` with the
   mandatory `--remote` override; session log as the follow-up commit.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this run by direct
  read; F-1 and F-5 additionally browser-confirmed live on the dev server; F-8 confirmed
  in the rendered head of all three page classes.
- F-1's guard mirrors the existing parse-guard placement (the same try block, directly
  after `req.json()`); `Array.isArray` is included on checkout (an array body is "not a
  JSON object" — the 400 class, never a limping 422); the siblings' `null`/non-object
  check sits before the first property access. No behavior change for well-formed bodies.
- F-2's 12 sites were identified mechanically (goto followed by an interaction within the
  block) and re-read in context; the `javaScriptEnabled:false` pair and DOM-only specs are
  NOT in the list and stay bare.
- F-4's getUTC* swap is behavior-identical on UTC machines (the sandbox) and correct on
  every other; the existing pins (fixed UTC instants) stay green.
- F-5's trim makes the API seam identical to the server-data seam (`q.trim().toLowerCase()`)
  — one normalization across the "one recall definition" consumers.
- F-9's constants live in utils.ts beside `FAMILY_VOUCHER_CENTS`/`FAMILY_POINTS_PER_VOUCHER`;
  `FAMILY_POINTS_PER_DOLLAR = 10` (integer, points math `Math.floor(spend * …)`), 
  `TRADE_RATE = 0.12` (the page's `Math.round(subtotal * …)`); copy sites interpolate
  (`${FAMILY_POINTS_PER_DOLLAR} points per $1`, `Trade saving (${Math.round(TRADE_RATE*100)}%)`).
- No new runtime dependencies; no new env variables; the docs-counts pin sweeps all five
  operator docs at the final counts. Expected new totals: unit 161 + ~2 (F-6 fs-pin ×1,
  F-12 fs-pin ×1) ≈ 163; e2e 108 + ~5 (F-1 ×1, F-3 ×3, F-5 ×1) ≈ 113 — exact counts
  locked by the docs-counts pin at gate time.

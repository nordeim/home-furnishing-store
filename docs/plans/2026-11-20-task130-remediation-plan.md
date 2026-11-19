# Task 130 Remediation Plan — Fulfilment-Store Coherence, Boundary Parity Completion, Suite De-Flake

Date: 2026-11-20 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
on the dev server via 127.0.0.1 — 8/8 PASS: open (aria-expanded=true, label toggles) /
navigate+auto-close / param-close regression (F-7 class) / Escape / toggle / hamburger
hidden-≥1024 (display:none, 0×0 rect) / hydration (`data-hydrated=true` + add-to-bag → badge
"Shopping bag, 1 item") / no horizontal overflow at 390px — **no Tailwind v4 bug**; sitemap
42 indexable URLs, no lastmod; robots coherent; home + PDP + inspiration og:image all declare
1200×627 live-verified), execution per `skills/tdd` (red → green, one seam at a time).
`skills/` excluded from checking/testing/compilation (operator contract). Reference patterns
cross-checked against `homenest-store-s`: **still quiescent — zero src/tests changes since
2026-10-23** (`git log --since=2026-10-23 -- src/ tests/ prisma/` empty; HEAD `4771c3d`
2026-11-01 is skills-only; the two skills-catalog md5s MATCH) — nothing new to port (sixth
consecutive cycle).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 restored from the
recycled data dir via the lesson-31 initdb-template subdirectory recreation — `pg_notify`
and nine siblings were missing after the sandbox recycle, the class's first recurrence since
Task 129 went fully-fresh; 9 tables + the full DDL contract verified by direct SQL:
`orders_idempotency_key_unique`, `reviews_product_idx`, `inventory_product_store_uq`, no
redundant `products_slug_idx`; seed intact at 24/8/3/72/5/0/0/3/6)

| Gate | Result |
|---|---|
| fresh clone → `1e50682` (docs-only delta since pushed Task-129 `0e8772f`: session_24 log) | clean tree |
| `npm install` | green |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 163/163 |
| `npm run test:e2e` (Playwright, cold production build :3100; chromium-1255 installed — the cache held 1200, the documented trap, sixth cycle running) | 113/113 |
| DB contract | 9 tables; **zero residue at baseline AND after the full 113-test e2e run** (direct SQL: 0 orders, 0 order_items, 5 seed reviews, 24 products, 72 inventory) |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | 8/8 PASS — **no Tailwind v4 bug** (conditional mount, scan guard intact, `lg:` breakpoint renders) |
| Sitemap/SEO | sitemap 42 URLs (12 static + 24 product + 6 inspiration), indexable-only, NO lastModified; robots coherent (7 disallows); og:image dimensions declared on home + PDP + inspiration |
| Full-file audit | two audit agents (deep code audit + docs-truth/reference); every headline finding re-verified by me at line level (the Task-128 lesson-46 discipline) |
| Reference repo | `homenest-store-s`: quiescent, catalogs md5-identical, nothing to port |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — `storeSlug` is the last String()-coerced seam at the checkout write boundary (contract violation, unpinned)
Evidence: `src/app/api/checkout/route.ts:123` — `const storeSlug = String(body.storeSlug ?? "tampines");`
while its enum siblings `deliverySlot` (:130), `deliveryMethod` (:147-149), `paymentMethod`
(:172-174) and `promoCode` (:161) are all TYPE-strict. `storeSlug: ["tampines"]` coerces
through the whitelist and places a REAL 201 with the crafted type — the exact class Task 129
eliminated for the trio; the lesson-43 rule (audit boundary strictness by FIELD CLASS) applied
one field short. The checkout UI always sends a real string (`checkout/page.tsx:20` default
`store: "tampines"`, the select's own value), so there is no UI null-encoding to preserve
(unlike `promoCode: null`).
Fix (ToDo-1): mirror the deliveryMethod guard — `if ("storeSlug" in body && typeof body.storeSlug !== "string")` → 422 VALIDATION; absent keeps the documented default. Extend the Task-129 enum spec's probe rows with `["tampines"]`-array and numeric storeSlug (RED: 201 today — the shared `deleteProbeOrders` net already covers the email).

### F-2 MEDIUM — delivery availability checks island-wide stock but decrements ONE store: check and decrement are incoherent (phantom units)
Evidence: `src/lib/server-data.ts:289-306` — the lock/availability query scopes to the
fulfilment store ONLY for click-collect (`clickCollect ? and(..., eq(inventory.storeSlug, fulfilStore)) : inArray(...)`);
delivery sums ALL stores. The decrement (`:348-353`) always hits ONE row:
`where storeSlug = input.storeSlug || "tampines"` with `greatest(0, quantity - qty)` — a
delivery order of 17× hdb-kitchen-trolley (tampines 15, island-wide 18) passes the aggregate
check today, clamps tampines to 0, and 2 units materialise from nowhere; Jurong/Alexandra
stay untouched so the table permanently overstates stock (later LOW_STOCK refusals fire on
wrong numbers). Documented as the open register row "delivery decrement drains storeSlug ||
tampines only — accounting drift (open)".
Design decision (the register's "redistribution" alternative REJECTED): multi-store
decrement in id order was considered and rejected because the suite's RED-run safety net
(`deleteProbeOrders`) restores inventory POST-HOC by crediting `sum(oi.qty)` to
`(product_id, o.store_slug)` — a multi-store drain is NOT reconstructible after the fact
(the pre-drain per-row quantities are gone), so the net would itself become a residue
source. Scoping the CHECK to the chosen store keeps check/decrement/net symmetric by
construction, matches the click-collect semantics that already shipped (Task 121 F-7),
matches the PDP's per-store stock display, and converts the phantom-unit bug into an honest
LOW_STOCK refusal ("Only 15 left") that agrees with what the PDP shows for that store.
Fix (ToDo-2): in `placeOrder`, scope the lock/availability query to `fulfilStore` for EVERY
method (drop the `clickCollect` conditional — express/delivery/click-collect all fulfil from
the chosen store); update the Task-121 comment; PAD documents the semantic ("fulfilment is
store-scoped for every method — the island-wide aggregate check let a delivery order drain
phantom units; the greatest(0,…) clamp masked the arithmetic"). New e2e spec (RED): delivery
order qty 17 on hdb-kitchen-trolley (aggregate 18 ≥ 17 → 201 today) must be 422 LOW_STOCK;
positive control qty 15 → 201 with the tampines row exactly −15 and Jurong/Alexandra
untouched (SQL-asserted), netted via `deleteProbeOrders`.

### F-3 MEDIUM — latent e2e parallel flake: the saturation spec's 21-review HAVBRIS insert races the two "Reviews (0)" HAVBRIS assertions
Evidence: `tests/e2e/storefront.spec.ts:1163` and `:1265` assert `Reviews (0)` on
`/product/havbris-lounge-chair` while `:1284-1288` (the saturation spec) inserts 21 probe
reviews on the SAME product — and `playwright.config.ts:12` sets `fullyParallel: true`
(parallelises tests WITHIN a file too). If the saturation insert window overlaps the other
specs' havbris render, the zero-review assertions fail intermittently (CI is safe at
`workers: 1`; the local gate is the exposed one). 20 of 24 products have zero seed reviews —
the overlap is pure accident of product choice, not a necessity.
Fix (ToDo-3): move the saturation spec's product from `havbris-lounge-chair` to
`pandan-rug-200` (quiet, zero seed reviews, and untouched by every other spec — verified by
grep) — slug in the pid query + the PDP navigation + the comment; GREEN-on-arrival (the
relocation IS the fix; the pin's assertions are product-agnostic).

### F-4 LOW — an `orderNumber` collision surfaces as a customer-facing 500; the 23505 catch cannot tell WHICH unique constraint fired
Evidence: `src/lib/utils.ts:146` — 6 base36 chars ≈ 2^31 entropy; `src/db/schema.ts` —
`order_number … unique`; `src/lib/server-data.ts:202-205` — `isUniqueViolation` checks only
`code === "23505"` (the Task-127 F-10 register annotation anticipated exactly this
discrimination gap). A collision (birthday bound ≈ 46k orders/day for 50%) on the
`order_number` index either falls through to `throw err` → 500 CHECKOUT_FAILED, or — worse —
with an idempotency key present is misrouted into `resolveReplay` (finds nothing, throws
anyway). Register row "orderNumber collision retry" promoted.
Fix (ToDo-4): discriminate by constraint name — `isUniqueViolationOn(err, constraint)`
(checks `err.constraint`/`err.cause.constraint`); on `orders_order_number_unique` re-mint
`num` and retry the transaction once (bounded); the replay path narrows to
`orders_idempotency_key_unique`. Unit RED on the exported discriminator (fixture-shaped
errors both ways) before the placeOrder wiring.

### F-5 LOW — array bodies classify differently across the four POST routes (checkout 400 vs siblings 422)
Evidence: `src/app/api/checkout/route.ts:34` — `typeof body !== "object" || body === null ||
Array.isArray(body)` → 400 BAD_REQUEST; the three siblings (`reviews/route.ts:47`,
`orders/track/route.ts:27`, `promotions/validate/route.ts:27`) lack the `Array.isArray`
clause — `["a"]` passes the shape guard and limps to a 422 on the missing fields. Same
client-fault class, different status+code. (The Task-128 register row "array-body
asymmetry" documented the divergence as accepted; this cycle promotes it to parity — the
checkout guard already proved the honest classification.)
Fix (ToDo-5): add `|| Array.isArray(body)` to the three sibling shape guards; extend the
Task-128 body-shape spec's probe list with `["a"]` rows for the three siblings (RED: 422
today → 400).

### F-6 LOW — a fourth hand-duplicated store list survives in the Footer chips
Evidence: `src/components/Footer.tsx:54-56` — `<span …>Tampines</span> <span …>Jurong</span>
<span …>Alexandra</span>` while the Task-129 commit message claims "the last hand-duplicated
store list" was derived (route whitelist, checkout options, Header picker). A fourth store
still needs a coordinated Footer edit.
Fix (ToDo-6): derive the chips from the `STORES` seed via `storeName(s.slug)` (the exact
same labels — `storeName` capitalises the slug); add an e2e pin that derives the expected
chip set from the imported seed (the Task-128/129 derived-pin pattern), GREEN-on-arrival.

### F-7 LOW — `priceTotals` percent promos are unbounded: a >100% promo produces negative totals at the money seam
Evidence: `src/lib/utils.ts:97-101` — the `fixed` branch caps at
`Math.min(subtotalCents, value)`; the `percent` branch does not (`kind: "percent", value:
150` → discount > subtotal → negative net/GST/total). Unreachable today (promotions are
seed/DB-controlled, no admin API) but the seam is the money truth — defensive parity one
branch over.
Fix (ToDo-7): `discountCents = Math.min(subtotalCents, Math.round((subtotalCents * value) / 100))`
+ a unit RED at the seam (150% and 100% edges).

### F-8 LOW — the wishlist heading counts persisted slugs, not resolved items
Evidence: `src/app/wishlist/page.tsx:39` — `Your wishlist ({wishlist.length})` while the
grid (`:24`) filters to products that resolve from the catalogue — a persisted slug whose
product left the catalogue renders "(2)" above one card (the honesty class the project
polices elsewhere).
Fix (ToDo-8): derive the heading from the resolved count once loaded
(`loading || error ? wishlist.length : items.length` — error keeps the persisted count:
resolution is unknowable with the API down); e2e pin seeds one real + one ghost slug and
asserts the honest (1) heading + one card.

### F-9..F-15 LOW (docs-truth) — eleven stale live-tense claims outside the docs-counts pin's regexes
All re-verified at line level this run:
- **F-9** `AGENTS.md:159` "34 gotoHydrated call sites" — actual 38 (storefront) / 40 (both
  files); `CLAUDE.md:351` and the PAD v1.14.0 note already say 38/40.
- **F-10** PAD §7.1 "Current State" (:1424-1425) "138 tests / 78 tests" — Task-120-era
  freeze contradicting §1.2/§7.4/§9.2/§11 (all 163/113).
- **F-11** PAD §8.1 (:1473) + `docs/DEPLOYMENT.md:19` "29 routes" — actual 31 visible
  routes (icon + manifest added Task 125; the manifest's 32 minus Next's hidden
  `/_global-error` + `/favicon.ico`), and the Task-125 ledger's own "30" was off by one.
- **F-12** PAD §6.1 (:1385) "x-forwarded-for first hop, 'local' fallback" + §10 register
  row (:1639) describing the pre-Task-125 posture as current — the shipped seam
  (`rate-limit.ts:26-32`) is rightmost hop + `"direct"`.
- **F-13** SKILL Appendix B (:892-893): plans row lists 5 (actual 14); screenshots row
  "01…21" (actual 65 PNGs, 01–64 with a two-variant 05); the e2e row's "(113)" reads as
  storefront-only (actual: storefront 105 + mobile 8).
- **F-14** PAD ADR-003 (:970-977) still narrates the retired mount-effect hydration as
  "known debt" (external stores shipped Task 114; §10's own row says Fixed); §3.3 Pattern 3
  (:1229-1230) "decrement is best-effort (wrapped, non-blocking)" (fail-closed inside the
  transaction since Task 121 F-8); §3.2 (:1120) calls shop/search "client pages" (SSR grid
  shipped Task 121); SKILL §7 (:203-204) repeats the best-effort claim.
- **F-15** the PAD §3.2/§11 line-count tables — rotted in opposite directions (verified by
  `wc -l`: server-data 244/~312 vs 382 actual; catalog 142 vs 244; utils 98/~250 vs 308; et
  al). Per the Task-129 F-5 precedent ("line counts rot" — the SKILL's own claim was
  dropped, not re-derived), DROP the per-file line counts from both tables (keep the file
  inventories); also fix §1.2's postcss/`@tailwindcss/postcss` conflation (4.1.17 vs 8.5.23)
  and §3.2's "2 broken inherited scripts" + "(Vitest, 50) + (Playwright, 23)" notes.

### Evaluated and kept (deferrals — documented, unchanged or re-affirmed)
- Rate-limit XFF client-forgeability on a direct deploy (L-8): documented deployment
  caveat (TRUST_PROXY register row) — unchanged.
- planning-tools `MIN_DATE` module-load freeze (I-10), PDP double catalogue read (I-12),
  `ensureSeed` reviews-only partial-seed window (I-14), journey 1.5s settle wait (I-15),
  journey hardcoded amounts (self-alerting), whole-number magnitude bound — register rows,
  unchanged.
- `fullyParallel: true` itself: kept — the de-flake removes the known shared-product
  overlap; serialising the whole suite would cost more runtime than the flake it prevents.
- AGENTS.md structural suggestions from the reference cross-check (dedicated process-
  discipline section, header-level pin pointers): recorded in the worklog as adopted-next-
  cycle candidates, not this cycle (docs-lockstep scope is already large).

## 3. Test seams + execution order (TDD — RED observed before every behavior change)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-1 | checkout route storeSlug guard | enum-spec probe rows (RED: 201) | TYPE guard beside the whitelist |
| B | F-2 | placeOrder fulfilment scoping | NEW e2e spec (RED: delivery qty>store 201) | scope lock query to fulfilStore for all methods |
| C | F-3 | saturation spec product | relocation (GREEN-on-arrival) | havbris → pandan-rug-200 |
| D | F-4 | 23505 constraint discrimination | unit RED on the discriminator | `isUniqueViolationOn` + re-mint retry |
| E | F-5 | sibling shape guards | body-shape spec array rows (RED: 422) | `Array.isArray` on three routes |
| F | F-6 | Footer chips derivation | derived e2e pin (GREEN-on-arrival) | `STORES.map(storeName)` |
| G | F-7 | priceTotals percent cap | unit RED (150% promo) | `Math.min` cap |
| H | F-8 | wishlist heading count | e2e pin (ghost-slug seed) | resolved-count heading |
| I | F-9..15 | five operator docs + DEPLOYMENT.md | docs-counts lockstep reds (expected) | full docs sweep + PAD v1.15.0 + SKILL v2.4.0 |

Order: A → B → C → D → E → F → G → H (code), then the full gate (cold build, lint,
typechecks, unit, e2e, residue), then I (docs), then screenshots, `.env.example`
re-verification, session_25 log, worklog entry, commit + push.

Expected count deltas (to be fs-verified before the docs sweep): unit 163 → 165
(+2: percent-cap edges, constraint discriminator); e2e 113 → 116 (+1 delivery-scoping spec,
+1 footer derived pin, +1 wishlist honesty pin; the enum/array probe rows extend existing
specs; the saturation relocation adds none).

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint          # 0 errors expected
npm run test          # 165/165 unit (fs-verified)
npm run test:e2e      # 116/116 e2e (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory at seed quantities
```

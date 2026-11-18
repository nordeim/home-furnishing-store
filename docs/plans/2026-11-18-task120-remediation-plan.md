# Task 120 Remediation Plan — API-Boundary Hardening, SEO Blanket Completion, Docs-Truth Cycle

Date: 2026-11-18 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (§14–§16,
§18–§20) with the mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer
taxonomy at 390×844/1440×900 + dev hydration probe), execution per `skills/tdd`
(red → green, one seam at a time). `skills/` excluded from checking/testing/
compilation (operator contract).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17 on 127.0.0.1:5432, postgres/app_db — sandbox survived, PG live)

| Gate | Result |
|---|---|
| `git pull` → `5f32f93` (delta since pushed Task-119 `09f9485`: docs-only — session_6.md log + homepage.png) | clean tree |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 79/79 |
| DB contract | 11 tables; seed 24/8/72/3/6/3/5 (products/categories/inventory/stores/inspirations/promotions/reviews) |
| `.env.example` | single-variable contract intact (matches `src/db/index.ts`) |
| `next.config.ts` | `allowedDevOrigins: ["127.0.0.1"]` pinned (Task-118 fix holds) |
| Dev-server + hydration (127.0.0.1:3000 via agent-browser) | pages render + hydrate (cart persisted items visible; drawer interactive) |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900) | open / navigate+auto-close (`/shop?cat=bedroom`, drawer closed) / Escape / toggle / hamburger hidden-≥1024 (`display:none`, 0×0 rect) ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact) |
| Sitemap/SEO check | sitemap = 12 static + 24 product + 6 room (42 URLs) indexable-only; robots disallows utility/personal; **but** 6 of 12 static routes ship title-only metadata (F-6) and `/family` metadata contradicts the page math (F-4) |
| Full-file audit | 40+ files read by an Explore agent (all pages/components/lib/API) + every headline finding re-verified by me at line level; PAD + SKILL.md read via a second Explore agent with stale sites line-verified |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 HIGH — Checkout POST has no JSON-parse guard and leaks internal error strings
Evidence: `src/app/api/checkout/route.ts:18` `await req.json()` sits in the generic
try (sibling POST routes parse-guard → 400 `BAD_REQUEST`); `:71-74` the 500 path
returns `message` = raw `err.message` (parse errors, Postgres connection text) to an
unauthenticated caller while every sibling route returns fixed copy.
Fix (ToDo-1): parse-guard → 400 with fixed copy; 500 path → fixed
"Checkout failed on our side — please try again." (detail stays in `console.error`).

### F-2 HIGH — placeOrder check-then-decrement is not atomic (TOCTOU oversell)
Evidence: `src/lib/server-data.ts:176-189` availability SELECT → `:203-236` order +
items inserts → `:238-245` decrement `greatest(0, …)`. Two concurrent last-unit
orders both pass the check, both insert, both floor inventory at 0.
Fix (ToDo-2): wrap check + inserts + decrement in one `db.transaction()` with
`SELECT … FOR UPDATE` on the touched inventory rows (ordered by id to keep
lock acquisition deterministic); sums computed in JS from the locked rows.
RED e2e: quiet product pinned to exactly 1 total unit; two parallel checkout
POSTs → expect exactly one 201 + one 422 `LOW_STOCK` (today: both 201).

### F-3 MEDIUM — Unbounded unauthenticated writes at the checkout boundary
Evidence: `route.ts:19-23` `email`/`fullName`/`address` have minimum-length checks
only (`address.length < 6` at `:44`); reviews route slices 60/120/2000. A 5 MB
address is persisted verbatim (`server-data.ts:207-211`).
Fix (ToDo-3): caps at the boundary — email ≤ 254 (RFC 5321), fullName ≤ 80,
phone ≤ 20, address ≤ 200, promoCode ≤ 40 — 422 with field copy when exceeded.
RED e2e: 300-char address → expect 422 (today: 201 persisted).

### F-4 MEDIUM — /family metadata contradicts the page's own earn-rate math (20× off)
Evidence: `src/app/family/layout.tsx:10,15` "earn 5 points per $10 spent" (=0.5/$)
+ "members-only workshops" (none exist); `family/page.tsx:10` computes
`Math.floor(spend * 10)` and `:22` prints "10 points per $1".
Fix (ToDo-4): correct the layout metadata to the page rule (10 points per $1,
$5 voucher per 1,000 points — $50 per $1,000 spent); drop the workshops claim.

### F-5 MEDIUM — Fabricated "Nearest MRT listed on each store card above"
Evidence: `src/app/stores/page.tsx:33`; the cards (`:12-29`) render name/address/
hours/phone/facility chips — no MRT field anywhere.
Fix (ToDo-5): reword to what the cards actually show.

### F-6 MEDIUM — Six sitemap-indexed routes publish title-only metadata
Evidence: `/inspiration/page.tsx:7`, `/offers/page.tsx:8`,
`/services/page.tsx:3`, `/stores/page.tsx:4`, `/food/page.tsx:4`,
`/help/page.tsx:3` — all in the sitemap's INDEXABLE_STATIC list, none carry
`description`/`alternates.canonical`/OG; SSR ships the layout's generic
description for all six (curl-verified).
Fix (ToDo-6): extend each page's `metadata` export with description + canonical
+ OG (all six are server components — in place, no layout needed).
RED e2e: metadata blanket spec extension.

### F-7 MEDIUM — Focus indicators removed without replacement (4 surfaces)
Evidence: `BuyBox.tsx:40` qty input, `planning-tools/page.tsx:68-69` date+email,
`business/page.tsx:65` email, `family/page.tsx:36` email — all `outline-none`
with NO `focus:` substitute (checkout/track/search inputs all pair the removal
with focus styles).
Fix (ToDo-7): restore visible focus on all four (focus ring/border consistent
with the codebase's dark-panel + stepper patterns).
RED e2e: focus the family email → computed focus indication non-empty (today: none).

### F-8 MEDIUM — PAD live-tense test-count rot (the docs-counts pin blind spot)
Evidence: PAD `:174` "50 unit + 23 e2e, all green (§7)"; `:697-698` "58/58 unit /
27/27 e2e"; `:762` "Vitest unit (50) / Playwright e2e (23)"; `:888` "5 files |
58 unit tests" + "2 specs | 23 Playwright tests". Reality: 9 files / 79 unit /
34 e2e. The pin covers AGENTS/README/CLAUDE/SKILL — the PAD rots one file over
(the exact class `docs-counts.test.ts` was built to prevent).
Fix (ToDo-8): sweep the four live-tense sites to reality; extend
`tests/unit/docs-counts.test.ts` with PAD claim-site pins (RED on the stale
sites first — the pin then enforces the PAD forever).

### F-9 MEDIUM — PAD still documents the retired inline limiter
Evidence: PAD `:485` Pattern 4 shows the old `throttled()` "sliding window"
inline code; `:635` §6.2 cites "the `throttled()` limiter in the checkout route";
§6.4 threat row stale. Reality (Task 119): one `createRateLimiter` factory in
`src/lib/rate-limit.ts`, fixed window, Retry-After, purge.
Fix (ToDo-9): rewrite Pattern 4 + §6.2/§6.4 to the factory seam.

### F-10 MEDIUM — AGENTS.md gotcha #4 documents the retired limiter
Evidence: `AGENTS.md:65` "(`throttled()` in `src/app/api/checkout/route.ts`)".
Fix (ToDo-10): point at `src/lib/rate-limit.ts` (`createRateLimiter`).

### F-11 LOW — Dead schema: `carts`/`cart_items` + a comment that lies
Evidence: `src/db/schema.ts:75-94` — zero references in `src/` (grep-verified;
only 9 of 11 table objects are ever imported); comment claims "cookie-identified,
server truth for money" while AGENTS #6 documents the localStorage cart.
Fix (ToDo-11): retire both tables + their type exports (dead-code retirement is
the standing rule); `npx drizzle-kit push` syncs the local DB (11 → 9 tables);
sweep the 16 live "11 tables" doc sites (AGENTS/CLAUDE/README/PAD/SKILL/
DEPLOYMENT/docker-compose).

### F-12 LOW — Vestigial `totals` field on CheckoutInput
Evidence: `route.ts:59` passes zeros; `server-data.ts:141` declares it; never read
(placeOrder re-derives).
Fix (ToDo-12): drop from the interface + the call.

### F-13 LOW — Partial-seed lockout trap
Evidence: `server-data.ts:17-18` early-returns if ANY product row exists; a crash
between the products insert (`:21`) and the inventory insert (`:34`) leaves
inventory empty forever → every checkout refused "Only 0 left" — a permanent
outage described as a transient shortage.
Fix (ToDo-13): self-healing seed — also require non-empty inventory before the
early return; rebuild inventory rows when missing; seed-reviews stay first-time
only (no unique index → re-insert would duplicate). Verified manually against
the live DB (truncate inventory → read → rows restored); an e2e would have to
zero the whole inventory table and race every parallel spec — impractical
(register row: manual verification).

### F-14 LOW — Order page conflates a DB outage with not-found
Evidence: `order/[number]/page.tsx:26-36` one catch renders "We can't find that
order" for both `URIError` (fine) and Postgres-down.
Fix (ToDo-14): split — non-URIError failures render an outage message
("We can't check orders right now"), decode failures stay not-found.

### F-15 LOW — Cart "−" at qty 1 silently deletes the line
Evidence: `cart/page.tsx:96` `setQty(l.productId, l.qty - 1)` →
`cart-store.tsx:61-62` removes at qty ≤ 0; the dedicated Remove button exists.
Fix (ToDo-15): disable the minus button at qty 1 (`disabled` + visual state).
RED e2e: seeded bag line at qty 1 → minus disabled (today: enabled).

### F-16 LOW — Order status ladder duplicated
Evidence: `track-order/page.tsx:13-18` `stepOf()` + STEPS vs
`order/[number]/page.tsx:20,46` — two hand-rolled copies.
Fix (ToDo-16): shared seam in `src/lib/utils.ts` (`ORDER_STEPS`,
`orderStepIndex(status)`) — unit RED first, both pages rewire.

### F-17 LOW — Sustainability stat contradicts its own disclaimer
Evidence: `sustainability/page.tsx:25` "figures … are illustrative, not audited
claims" vs `:27` "73% recycled materials — … audited yearly."
Fix (ToDo-17): reword the card copy (illustrative framing).

### F-18 LOW — Cart promo errors announced as `role="status"`
Evidence: `cart/page.tsx:116`; ReviewSection already splits
(`msgIsError ? "alert" : "status"`).
Fix (ToDo-18): `role={promoMsg.ok ? "status" : "alert"}`.
RED e2e: failed promo apply → `getByRole("alert")` visible (today: status only).

### F-19 LOW — Star ratings put `aria-label` on non-semantic containers
Evidence: `ReviewSection.tsx:54` (`<p>`), `ProductCard.tsx:28` (`<span>`).
Fix (ToDo-19): `role="img"` on both star-display containers.

### F-20 LOW — `#8a8a8a` small text below WCAG AA (≈3.5:1 on paper tones)
Evidence: `Footer.tsx:69` 12px legal/disclaimer lines; sundry 12-13px captions
(cart sku line, order-step future states).
Fix (ToDo-20): darken to the `--color-muted` (`#5b5b5b`) family for body-size
captions (4.7:1); decorative aria-hidden glyphs stay.

### F-21 LOW — Inspiration listing overclaim
Evidence: `inspiration/page.tsx:15` "shop the exact pieces with live prices and
stock" — room pages render prices only, no stock signal.
Fix (ToDo-21): reword to what the destination shows.

### F-22 LOW/INFO — Header polish: "N items" grammar + mobile Go focus ring
Evidence: `Header.tsx:132` aria-label "Shopping bag, 1 items"; `:151` Go button
lacks `focus-ring`.
Fix (ToDo-22): pluralize + add the class.

Deferred (documented in the PAD register — do NOT "fix"): aggregateRating
catalogue fiction, header store picker wiring, wishlist full-catalogue fetch,
unthrottled GET reads, delivery-order decrement source = tampines,
drizzle.config.json local URL, wrapper default remote, orderNumber collision
retry (negligible probability), health envelope literalism, hardcoded "24
products / 8 categories" in metadata copy (true today; catalogue-derived when
the catalogue changes).

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| malformed-JSON checkout POST → 400 | e2e (RED) | the parse guard regressing / error leak |
| 300-char address → 422 VALIDATION | e2e (RED) | the write-boundary caps regressing |
| concurrent last-unit pair → exactly one 422 LOW_STOCK | e2e (RED) | the TOCTOU oversell reopening |
| `/family` meta description matches the page earn-rate | e2e (RED) | F-4 class metadata drift |
| six-route metadata blanket (description + canonical) | e2e (RED) | F-6 regressing |
| focus indication on family email (computed styles) | e2e (RED) | F-7 regressing |
| failed promo apply → role=alert | e2e (RED) | F-18 regressing |
| cart minus disabled at qty 1 | e2e (RED) | F-15 regressing |
| `orderStepIndex` seam tests | unit (RED) | the ladder drifting from shared truth |
| docs-counts PAD extension (4 claim sites) | unit (RED) | PAD count rot forever |
| existing pins re-run | unit+e2e | rate-limit factory, exact-money journey, SEO blanket, LOW_STOCK, JSON-LD derivation |

## 4. Execution order (vertical slices, red → green each)

1. **API-boundary slice (e2e RED first)**: ToDo-1 (parse guard + fixed 500 copy),
   ToDo-3 (length caps), ToDo-12 (drop vestigial totals), ToDo-2 (transaction +
   FOR UPDATE + ordered lock) → new specs GREEN; full e2e re-run (the $679.15 /
   $2,338.20 journeys stay exact — Mode D consolidation only at the seam edges).
2. **SEO slice (e2e RED first)**: ToDo-4 (family metadata truth) + ToDo-6 (six
   route descriptions/canonicals/OG) → blanket spec extension GREEN.
3. **A11y slice (e2e RED where practical)**: ToDo-7 (focus ×4) + ToDo-15 (minus
   disabled) + ToDo-18 (alert role) + ToDo-19 (role=img) + ToDo-22 (header
   polish) → GREEN.
4. **Docs-truth slice (unit RED first)**: docs-counts PAD extension (fails on the
   4 stale sites) → ToDo-8 (PAD sweep to 79/34/9-files) + ToDo-9 (Pattern 4 /
   §6.2 / §6.4 rewrite) + ToDo-10 (AGENTS limiter pointer) + ToDo-11's "11 → 9
   tables" doc sweep → GREEN.
5. **Honesty + dead-code slice**: ToDo-5 (MRT) + ToDo-17 (audited yearly) +
   ToDo-21 (inspiration copy) + ToDo-11 (schema retirement + push) + ToDo-13
   (self-healing seed, manual DB verification) + ToDo-14 (outage split) +
   ToDo-16 (ladder seam, unit RED first) + ToDo-20 (contrast sweep).
6. **Docs lockstep**: worklog Task 120, AGENTS/CLAUDE/README counts + new notes,
   PAD v1.5.0 (revision block + known-issues rows + register sweep + numbering-gap
   note), SKILL.md v1.4.0 (new lessons + Appendix B corrected by the extended pin),
   this plan archived, `.env.example` re-verified (unchanged contract, in commit).
7. **Full gate**: lint → typecheck → typecheck:tests → unit (new total) →
   cold build (`rm -rf .next`) → e2e (new total) → dev-server screenshots for
   changed surfaces into docs/screenshots/.
8. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py`
   with the mandatory `--remote` override.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this run
  (Explore-agent audit + my line-level re-reads of checkout/route.ts,
  server-data.ts placeOrder, family layout/page, stores/sustainability/
  inspiration copy sites, cart page, order page, schema.ts, docs-counts.test.ts).
- The e2e journey specs use label/text locators and default options — the
  stepper-disable and focus changes cannot break them (cart promo persistence
  spec clicks Apply/Remove buttons, unaffected by role changes).
- Malformed-JSON/oversell/caps/concurrency specs use the request API directly
  (`page.request.post`) — no UI coupling; the concurrency spec picks a QUIET
  product (not makan/nordlys/solbakken/blackout-curtain/katong used by other
  specs), pins its inventory to 1 unit (one store row = 1, others 0), fires two
  parallel POSTs, restores rows + deletes the order in `finally`.
- `db.transaction()` + `.for("update")` + `.orderBy(inventory.id)` is supported by
  the pinned Drizzle 0.45 / node-postgres stack (lock-ordered rows keep
  acquisition deterministic across overlapping carts).
- The docs-counts PAD patterns target the four live-tense sites uniquely
  (verified against the PAD text: historical ledgers use different phrasings —
  "Suite grew to …", "as of Task 118", slashed "50/23 against a 58/27 reality" —
  none match the live patterns).
- The six F-6 pages are server components (they already export `metadata`
  objects) — in-place extension, no client/layout violation.
- No new runtime dependencies; no new env variables; `.env.example` contract
  unchanged; `drizzle-kit push` on the local DB drops only the two never-written
  dead tables (no data of value).
- New expected totals (fs-computed at sweep time — the extended pin enforces
  them): unit ≈ 79 + 6-7 new (docs-counts PAD + ladder seam); e2e = 34 + 8 new;
  every live-tense count site in AGENTS/README/CLAUDE/SKILL/PAD swept in the
  same commit (count-lockstep, no exceptions).

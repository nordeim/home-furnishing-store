# Task 144 Remediation Plan — Money-Seam Negative-Discount Floor, Null-Body Fixed-Copy Guards, Shop Transport Copy, order_items Index, Doc-De-Drift Sweep

Date: 2026-11-21 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only

Method: fresh-clone workspace re-audit per `skills/web-application/SKILL.md` (sandbox reset —
`git clone https://github.com/nordeim/home-furnishing-store.git` at `cb40ef1` = Task-143
`787916b` + the post-push session_53 log; node_modules, `.env`, and the pinned Chromium 1255
rebuilt from zero). Rootless PostgreSQL 17.12 RECOVERED (the `pg/` tree survived the recycle
but lost its empty initdb subdirectories — the lesson-31 restore-set class: `pg_notify`,
`pg_serial`, `pg_snapshots`, `pg_stat`, `pg_stat_tmp`, `pg_tblspc`, `pg_twophase`,
`pg_replslot`, and the nested `pg_logical/snapshots` + `pg_logical/mappings` + `pg_commit_ts`
recreated, then the idempotent `docs/setup_pg_z.sh` restart); 9-table DDL intact + seed
quantities verified by direct SQL (24/8/3/72 products/categories/stores/inventory-rows,
promotions 3, inspirations 6, reviews 5, inventory 1379, orders/order_items 0). Baseline gates
re-run GREEN exactly as documented: lint 0/0 · typechecks ×2 · **218/218 unit × 3 TZ (UTC /
Asia/Singapore / America/New_York)** · **146/146 e2e (cold production build)** · zero residue
after the run. Mobile-navigation + Tailwind v4 taxonomy re-run LIVE on the production server
`:3200` (agent-browser, pinned `DATABASE_URL` + `TRUST_PROXY=1`): drawer conditional-mount
taxonomy **8/8 PASS** (T1 open: aria-expanded flip + label toggle + 390px full-width mount +
14 links; T2 category navigate + auto-close with the drawer confirmed UNMOUNTED; T3 the
Task-125 F-7 param-only-navigation close via the DRAWER's own link `/shop?cat=living` →
`/shop?cat=bedroom`; T4 Escape; T5 toggle ×2 cycle; T6 desktop 1440×900 hamburger
`display:none` at 0×0 with both category navs visible (5+10 links); T7 hydration
`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item" on a clean localStorage
clear + the Task-140 F-4 cursor pair live (Add to bag `pointer`, disabled qty-1 `−`
`default`); T8 no horizontal overflow across **19 routes** at 390px) — **no Tailwind v4
display-utility bug** (the drawer conditionally mounts; `lg:hidden` computes `display:none`
correctly at ≥1024). SEO/sitemap re-verified live: sitemap 42 indexable URLs (zero utility
routes), robots 7 disallows coherent, `noindex` meta on all six utility surfaces (5 pages +
the order page), og:image 1200×627, JSON-LD complete (Organization/WebSite+SearchAction on
home; Product/Offer/Brand/AggregateRating on PDP), security headers complete INCLUDING the
Task-141 reduced CSP, no `x-powered-by`, `icon.svg` + web manifest 200. Reference repo
`homenest-store-s` cross-checked at HEAD `4771c3df95c7` (zero src/tests changes since
`ff65bd2`): quiescent — the **twentieth** cycle of "nothing to port". The vitest/playwright
suites exist and are wired (Tasks 114/117/142/143 — `vitest.config.mts` + `playwright.config.ts`
with `reuseExistingServer: false`); this cycle adds NO config change (nothing in the audit
demands one — the user-requested "modify the respective config files" resolved at Task 143's
J-3 rename and needs no follow-up). Execution per `skills/tdd` (red → green, one seam at a
time). `skills/` excluded from checking/testing/compilation (operator contract).

## 1. Audit baseline (all Verified this run)

| Gate | Result |
|---|---|
| fresh clone → `cb40ef1` (Task-143 `787916b` + session_53 log) | clean tree |
| Rootless PostgreSQL 17.12 (recovered `pg/` tree: 8 empty initdb dirs + 3 nested recreated; `setup_pg_z.sh` restart) | up; seed verified (24/8/3/72/3/5/6/0/0, inventory 1379, zero residue) |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 218/218 × 3 TZ (UTC / Asia/Singapore / America/New_York) |
| `npm run test:e2e` (Playwright, cold production build :3100) | 146/146 |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 display bug; cursor pair live |
| SEO/sitemap live sweep | 42 URLs (indexable only) · robots coherent · noindex ×6 · OG/JSON-LD complete · security headers + reduced CSP · icon.svg + manifest 200 |
| Full-tree audit | one deep-code agent (0 CRITICAL / 0 HIGH / 0 MEDIUM / **4 LOW** / 3 INFO) + **9 doc-drift findings (D1–D9)**; every finding re-verified at line level (the lesson-46 discipline) |

## 2. Findings → ToDo (ordered by severity; every code finding carries file:line evidence re-verified this run)

### K-1 LOW — `priceTotals` has no LOWER bound on the discount: a negative DB promo INFLATES the order total
Evidence (line-verified): `src/lib/utils.ts:129-137` — Task 130 F-7 capped the TOP
(`Math.min(subtotalCents, …)` in both branches) but not the BOTTOM. `promotions.value` is a
plain `integer` with no CHECK constraint (`src/db/schema.ts:166`), and neither `validatePromo`
(`server-data.ts:182`) nor the in-tx `FOR UPDATE` re-read (`server-data.ts:336-364`) checks
positivity. A `value = -2000` row (admin/SQL-level data fault — no admin UI exists; seed is
clean) yields `discountCents = -2000` → `net = subtotal + 2000` → GST/total grow → the
customer is OVERCHARGED at the write boundary, silently — the exact "money seam never mints
nonsense cents" invariant the F-7 comment claims, one sign short. The existing unit pins
(`tests/unit/utils.test.ts:56-70`) cover only the `>100%` side; the negative side is unpinned.
Fix (ToDo-1): floor at zero in BOTH branches — `discountCents = Math.max(0,
Math.min(subtotalCents, …))` — plus the comment gains the negative rationale.
Pins: TWO new unit pins in the Task-130 F-7 describe — `kind:"fixed", value:-2000` →
`discountCents === 0`, `totalCents === 10000` (subtotal 10000, click & collect); the percent
parity sibling `value:-10` → same floor. TRUE RED today (current code mints
`discountCents = -2000`).

### K-2 LOW — a JSON-parseable `null` body defeats the Task-142 H-6 fixed-copy guarantee at all four POST seams
Evidence (line-verified at all four sites): `src/app/checkout/page.tsx:73-96`,
`src/app/track-order/page.tsx:29-49`, `src/components/ReviewSection.tsx:50-59`,
`src/app/cart/page.tsx:60-80` — the inner catch covers transport + JSON-*parse* failures,
but a body of literal `null` PARSES successfully (`Response.json()` returns `null`); the
subsequent `json.ok` read throws `TypeError: Cannot read properties of null (reading 'ok')`
into the OUTER catch, which renders `err.message` — the raw browser TypeError text, precisely
what Task-142 H-6 ("the transport failure renders FIXED copy (never the browser's TypeError
text)") claims is impossible. (`search/page.tsx` and `wishlist/page.tsx` are already safe —
their reads sit inside the fetching `try`.)
Fix (ToDo-2): after each inner catch, one guard line — `if (!json || typeof json !==
"object") throw new Error(<that seam's own fixed copy>);` — reusing each site's existing
string byte-for-byte (checkout "We couldn't reach the checkout service — please try again." /
tracking / reviews / promo).
Pins: FOUR new e2e probes in a `client POST null-body fixed copy (Task 144 K-2)` describe,
mirroring the Task-142 H-6 probes with `route.fulfill({ status: 200, contentType:
"application/json", body: "null" })` instead of `route.abort()` — each asserts the fixed copy
renders AND the raw `Cannot read properties of null` text does not. TRUE RED today.

### K-3 LOW — shop-inner renders raw browser error text on transport failure (the fixed-copy OUTLIER)
Evidence (line-verified): `src/app/shop/shop-inner.tsx:105-106` — the catch renders
`e instanceof Error ? e.message : …`, so a network failure displays the browser's
`TypeError: Failed to fetch` verbatim in the customer-facing error box. The two GET siblings
render fixed copy under the same condition (`search/page.tsx:115-118`, `wishlist/page.tsx`),
and Task-142 H-6 fixed the four POST seams — shop-inner is the one remaining surface. It also
inherits K-2's null-JSON hole (`json.ok` at `:103` throws into this catch).
Fix (ToDo-3): restructure to the POST-seam shape — fetch+parse inside an inner try/catch
throwing fixed copy ("We couldn't load products — the catalogue service didn't answer.
Please try again."), keep the envelope-refusal throw (`json.error?.message ?? "Failed to
load"`) OUTSIDE it (the server's honest 422 copy stays — pinned by the Task-136 F-1 probes),
and add the same null guard.
Pins: TWO new e2e probes — (a) transport: `route.abort("**/api/products*")` + the keyword
filter trigger (the Task-136 F-1 mechanism) → the "We could not load products" box + fixed
copy, NOT "Failed to fetch"; (b) null-body: `route.fulfill({ body: "null" })` + trigger →
fixed copy, NOT the TypeError text. TRUE RED today.

### K-4 LOW — `order_items.order_id` has no index: every order lookup seq-scans a monotonically growing table
Evidence (line-verified): `src/db/schema.ts:111-126` — the `orderItems` table has no index
callback; `trackOrder` (`server-data.ts:469`) and `getOrderByNumber` (`server-data.ts:491`)
filter on `orderId` for every confirmation/tracking view. The `reviews` sibling received
exactly this fix in Task 126 F-7 (`schema.ts:143-145`, `reviews_product_idx`); Postgres does
not auto-index FK columns.
Fix (ToDo-4): `(t) => [index("order_items_order_idx").on(t.orderId)]` + `drizzle-kit push`
(verify by direct SQL: `pg_indexes` gains exactly one row; no other DDL changes).
Pins: ONE new structural fs-pin in `tests/unit/server-data.test.ts` (the DB-funnel pin home):
`src/db/schema.ts` declares BOTH per-render FK indexes — `reviews_product_idx` AND
`order_items_order_idx` (lesson 67: pin the class, not the site). TRUE RED today (the
order_items index is absent).

### INFO findings (evaluated; DECISIONS recorded — no action this cycle)
- **INFO-1 `placeOrder` price snapshot outside the tx** (`getAllProducts` at
  `server-data.ts:273-284` vs the tx body `:330-432`): inventory rows locked + promo re-read
  in-tx, but `unitPriceCents` derives from the pre-tx snapshot — an admin price UPDATE racing
  a checkout commits at the stale price. Theoretical (ms window, admin-only writes, no admin
  flow exists). Registered: revisit when an admin/catalogue-write surface ever lands.
- **INFO-2 cart discount preview derives from the static seed** (`catalog.ts` `effectivePromo`)
  while apply-time label + committed totals derive from the DB: by-design ADR-005 divergence
  (catalog.ts:230-231 documents it); zero impact while DB == seed. Registered.
- **INFO-3 `isValidPhone` accepts punctuation-only tails** (`utils.ts:262-264`,
  `/^[+\d][\d\s-]{6,15}$/` accepts `"+-------"`): display-only persistence (phone never
  rendered publicly; track envelope omits it). Registered: cosmetic validator polish, batch
  with any future contact-field work.
- **D7 worklog session-log citation ambiguity**: each cycle's DOCS LOCKSTEP line cites the
  in-commit log (session_46/48/50/52) while the follow-up "update session log" commit adds
  the narrated twin (session_47/49/51/53) — both files document the same cycle. Per the
  history rule (Task-143 plan addendum #1: historical log lines stay as history), the ledger
  is NOT rewritten; the dual-file convention is documented in THIS cycle's worklog entry.

### Doc-drift findings D1–D9 (all line-verified; swept in the docs pass — ToDo-5)
- **D1** `docs/DEPLOYMENT.md:4-6` revision stamp "Tasks 115-139" → "115-143"; §1 (:31-35)
  security-header enumeration gains the Task-141 reduced CSP; §8 "Reverse proxy" (:294-301)
  gains the Task-141 fact the paragraph predates — the limiter reads XFF ONLY when
  `TRUST_PROXY` is exactly `"1"` (fail-closed otherwise; behind a proxy you MUST set it or
  every visitor shares one `"direct"` bucket).
- **D2** `PAD §3.2:1686-1694` — catalog.ts row lists retired `findProduct/productImage`
  (retired Task 138 F-4) → the live seams (`effectivePromo`, `findPromoMinimumCents`,
  `storeName`, `seedInventoryRows`, `matchesProductQuery`); server-data.ts row's "cart
  helpers" (no such exports — cart store is client-side) → `getOrderByNumber`,
  `submitReview` (Task 136 F-2).
- **D3** `SKILL.md` three live-tense retired-seam sites — §7 (:219-223) `findProduct` +
  `findPromo` → the promo display seams; §9 anti-pattern #7 (:277-278) → `effectivePromo()`;
  §16 (:1252) → `effectivePromo`. (§12 lesson 28's `findPromo` mention is historical
  narrative — stays.)
- **D4** `PAD:1702` + `PAD:1975` era labels "Tasks 114–138" → "114–143" (CLAUDE.md:141
  already reads 114–143).
- **D5** `PAD §8.3:2044-2047` "Docker Configuration: None" → the shipped postgres-only
  `docker-compose.yml` (postgres:17-alpine @5432, named volume, healthcheck; credentials
  matching `drizzle.config.json`; content pinned by `tests/unit/env-example.test.ts`).
- **D6** `CLAUDE.md:646` env-table row "the only variable the code reads" → the two-variable
  reality (`DATABASE_URL` required; `TRUST_PROXY` optional, exactly `"1"`, read by
  `src/lib/rate-limit.ts` — CLAUDE.md:159 and the PAD §8.2 table already carry it).
- **D8** `PAD §3.2:1686-1694` lib/ tree lists 4 of 7 `src/lib` files → add the three missing
  rows (`local-store.ts` external store, `mask.ts` PII policy, `rate-limit.ts` limiter +
  TRUST_PROXY-gated clientIp).
- **D9** `SKILL.md §9 #9 (:281-282)` + `§15 (:1245-1247)` teach the retired inline JSON-LD
  escape → the `jsonLdScript()` seam (`utils.ts:20-25`, escapes `<` + U+2028/U+2029, both
  live call sites use it since Task 125 G-3).

## 3. Test seams + execution order (TDD — RED observed before every behavior change)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | K-1 | `priceTotals` discount floor | 2 new unit pins in the Task-130 F-7 describe (fixed -2000 / percent -10 → discount 0, total 10000) | `Math.max(0, Math.min(subtotalCents, …))` both branches + comment |
| B | K-4 | schema index class | 1 new fs-pin in `server-data.test.ts` (both per-render FK indexes declared) | `order_items_order_idx` + `drizzle-kit push` + SQL verify |
| C | K-2 | null-body guards ×4 POST seams | 4 new e2e probes (route.fulfill body "null", mirroring the H-6 structure) | the `if (!json \|\| typeof json !== "object")` guard after each inner catch |
| D | K-3 | shop-inner fixed copy | 2 new e2e probes (transport abort + null body, keyword-filter trigger) | inner try/catch + null guard; envelope refusal keeps server copy |
| E | D1–D9 | six-doc sweep | the docs-counts lockstep fires on the count deltas (unit 221, e2e 152, gotoHydrated 67/69) | the corrected text per §2 + count sweep + SKILL v2.18.0 (lessons 77-78) + PAD v1.29.0 revision block |

Order: A → B → C → D (code, one slice per commit-intent), then screenshots (135–139, DEV
server per the operator request), then the six-doc sweep (E), then the full gate (cold build,
lint, typechecks, unit ×3 TZ, e2e, residue), session_54 log, worklog entry, commit + push
via the SSH wrapper (`--remote` override mandatory). The Task-140 addendum #5 gate-order
lesson applies: code → screenshots → docs → gate.

Expected count deltas (fs-verified after the code slices, before the docs sweep): unit 218 →
**221** (+2 K-1, +1 K-4); e2e 146 → **152** (+4 K-2, +2 K-3); gotoHydrated 59/61 → **67/69**
(+6 K-2 mirroring the H-6 journeys, +2 K-3); unit files stay 10; e2e specs stay 2; plans
28 → 29; screenshots 135 → 140 PNGs (135–139); XFF probes stay 39/36.

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint               # 0 errors expected
npm run test               # 221/221 (TZ=UTC host)
TZ=Asia/Singapore npm run test       # 221/221 — the three-TZ discipline
TZ=America/New_York npm run test     # 221/221
npm run test:e2e           # 152/152 (cold production build; live Postgres; TRUST_PROXY=1 via webServer.env)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at 1379
# + pg_indexes check: order_items_order_idx present (exactly one new index)
```

Six-doc count-lockstep in the SAME commit (AGENTS/README/CLAUDE/SKILL/PAD/DEPLOYMENT — the
docs-counts pin fails otherwise): unit 221, e2e 152, gotoHydrated 67/69, plans 29,
screenshots 135–139 (140 PNGs). `.env.example` contract unchanged (pin green; included in the
commit per the operator contract).

## 5. Post-execution addendum (what the execution itself discovered — recorded for the audit trail)

1. **The K-4 index callback initially landed INSIDE the columns object** — the
   first edit appended `(t) => [index(...)]` as if it were a column entry, and
   drizzle-kit's esbuild rejected it (`Expected identifier but found "("`). The
   fix: the callback is pgTable's THIRD argument (the reviews sibling's shape).
   The RED pin had already fired by name before the push, so the honesty
   vehicle was never at risk; the DDL push then verified exactly one new index
   with 9 tables unchanged.
2. **The K-3 restructure dropped the outer `try {` opener in its first
   edit** (the replacement covered the body but not the wrapper) — caught
   immediately by re-reading the edited block, restored, and the typecheck +
   both probes re-verified green. The lesson-7 parser rule in reverse: the
   reported structure error was at the true site, fixed by restoring the
   wrapper rather than touching the inner block.
3. **The K-2 RED run rendered the predicted TypeError VERBATIM** — the alert's
   literal text was `Cannot read properties of null (reading 'ok')` (checkout)
   and `We could not load productsFailed to fetchRetry` (shop, K-3) — the
   rare case where the RED evidence IS the finding's impact statement,
   screenshot-grade.
4. **A terminal rendering artifact masqueraded as source corruption**: a Bash
   `sed -n` dump showed `return hopsops.length - 1];` in rate-limit.ts — a
   syntax error that would have failed every gate that HAD passed. The Read
   tool showed line 43 clean (`return hops[hops.length - 1];`); the file was
   never touched. Lesson: a tool-output anomaly that contradicts a green gate
   is a rendering artifact until proven otherwise — re-read with a different
   tool before treating it as a finding (the lesson-13 discipline, tool-output
   edition).
5. **The docs-counts lockstep fired exactly as designed**: 16 count sites
   red across the six docs after the code slices (unit 218→221, e2e 146→152,
   gotoHydrated 59/61→67/69), all swept green in one pass. The D1–D9
   name/era/wording drifts were invisible to the pin (counts only) — which is
   precisely SKILL lesson 78's point: the retired-seam sweep is a discipline,
   not a gate.
6. **Count deltas landed exactly as planned**: unit 221 (+2 K-1, +1 K-4),
   e2e 152 (+4 K-2, +2 K-3), gotoHydrated 67/69 (+6 K-2 mirroring the H-6
   journeys, +2 K-3), unit files 10, e2e specs 2, plans 29, screenshots
   135–139 (140 PNGs), XFF probes 39/36 unchanged.

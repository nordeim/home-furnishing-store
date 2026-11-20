# Task 138 Remediation Plan — Shop Resync-Window Honesty, Store-Count Derivation, Discount-Seam Unification, Dead-Export Retirement, Fee-Copy Derivation, Starter-Kit Guard

Date: 2026-11-21 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (fresh clone after a sandbox reset — `1f57f0a` = Task-137 `62125b2` + the session_39 narrative; node_modules + `.env` rebuilt fresh; the pinned Playwright Chromium 1255 re-installed after the cache miss). Rootless PostgreSQL 17.12: the data dir survived the recycle but the postmaster process did NOT (ps confirmed dead, pid file stale at PID 17901 — the Task-137 addendum lesson applied: liveness checked BEFORE pid removal); the lesson-31 empty-subdirectory restore ran EXTENDED — the known set (pg_logical/snapshots, pg_logical/mappings, pg_notify, pg_serial, pg_snapshots) PLUS the first-observed pg_replslot, pg_commit_ts, pg_dynshmem, pg_stat, pg_stat_temp, pg_tblspc, pg_twophase (the startup log pinned pg_replslot as the fatal; the wider initdb set proactively restored) — then the 9-table DDL contract + seed quantities verified by direct SQL before any gate (4 named indexes, seed 24/8/3/72/5/0/0/6/3, inventory 1379 = the formula, zero residue). One environment trap handled pre-gate: an exported shell DATABASE_URL (a previous session's SQLite leftover) silently overrode `.env` — gotcha #10, unset + pinned per command. Mobile-navigation + Tailwind v4 taxonomies re-run on the dev server via 127.0.0.1 (agent-browser drawer taxonomy at 390×844 + 1440×900 — 8/8 PASS: open (aria-expanded=true, label toggles) / navigate+auto-close / the F-7 param-close regression / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) / hydration (`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item") / no horizontal overflow at 390px — **no Tailwind v4 bug**; the CSS-first `@theme` posture + the candidate-scan guard re-verified in `globals.css`; all `aspect-[…]` usages slash-form). Sitemap/SEO re-verified live: 42 indexable URLs no lastmod; robots 7 disallows coherent; og:image 1200×627 on home; noindex on the order page + all five utility routes; the 404 surface branded ("This page went flat-pack") + 404 status; the security-header set present (nosniff, DENY, strict-origin-when-cross-origin, HSTS) with no `x-powered-by`. Reference repo `homenest-store-s` cross-checked: **quiescent — HEAD still `4771c3d`, zero src/tests changes after `ff65bd2`** — the fourteenth cycle of "nothing to port". The vitest/playwright suites exist and are wired (`vitest.config.ts` + `tsconfig.tests.json` + `playwright.config.ts` :3100 production webServer; 190/131 baseline green); this cycle EXTENDS them with the new pins below (the config files need no modification — the suites are the repo's own). Execution per `skills/tdd` (red → green, one seam at a time; honest-RED by temporary mutation for every GREEN-on-arrival pin). `skills/clone-app-pat-pro` considered and set aside (a pixel-clone Chrome-extension workflow, not a remediation tool — the Task-137 stance). `skills/` excluded from checking/testing/compilation (operator contract).

## 1. Audit baseline (all Verified this run)

| Gate | Result |
|---|---|
| fresh clone → `1f57f0a` (Task-137 `62125b2` + session_39) | clean tree |
| Rootless PostgreSQL 17.12 (pid-liveness check + extended lesson-31 restore — see Method) | up; DDL contract + seed verified (24/8/3/72/5/0/0/6/3, inventory 1379, zero residue) |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 190/190 |
| `npm run test:e2e` (Playwright, cold production build :3100) | 131/131 |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 bug |
| Docs-truth sweep (gotoHydrated 44+2, 190/131, 105 PNGs, 22 plans — fs-verified) | ZERO mismatches across the six operator docs |
| Full-tree audit | one deep-code agent (0 CRITICAL / 0 HIGH / 0 MEDIUM / 6 LOW / 3 INFO); every actionable finding re-verified at line level by me (the lesson-46 discipline) |

## 2. Findings → ToDo (ordered by severity; every code finding carries file:line evidence re-verified this run)

### F-1 LOW (cycle headline) — the shop resync window renders the DEPARTED view's rows and count above the new heading
Evidence (line-verified, code-traced): `src/app/shop/shop-inner.tsx:54-61` — the adjust-during-render resync resets `items` ONLY when `atServerView` (`q === "" && max === 0`, `:45`); `:69-97` — `setLoading(true)` fires only INSIDE the 250 ms debounce timeout callback (`:97` — `q ? 250 : 0`), never during the window itself. Trace: on `/shop?cat=living` with the keyword "oak" typed and settled (2 living-room rows, strip "2 products"), clicking the Kitchen chip (`router.replace` → RSC delivers a fresh server `initial` with kitchen rows) → `viewChanged` fires but `atServerView` is FALSE (q="oak") → `items` NOT reset, `loading` stays `false` through the debounce → for 250 ms + the fetch duration the "Kitchen" heading renders above the LIVING-room oak rows and the Task-137 strip gate (`:129` — `!(loading || error)`) passes the stale `items.length` through as the new category's count. The exact honesty family Task 137 F-5 closed for loading/error — but the resync transition between server views was left outside the gate. No false TERMINAL verdict (self-corrects on settle), but the transient is user-visible on any slow network.
Fix (ToDo-1): in the sanctioned adjust-during-render block, a fresh server view under an active keyword/price filter flips `loading` — the strip makes no count claim and the grid renders skeletons until the refetch lands, never the departed view's rows (cat/sort-only and typing transitions keep their current behaviour: the else-if fires only when `prevView.cat !== cat || prevView.sort !== sort`). Pin: ONE NEW e2e probe (hold the `cat=kitchen` client-side `/api/products` refetch open forever via `page.route`; settle the oak view first; click the Kitchen chip; assert heading "Kitchen" + NO `\d+ products` claim + the `role=status` loading grid). TRUE RED today.

### F-2 LOW — the store COUNT is the last hand-duplicated store literal (the Task-129 derivation class, one tier over)
Evidence (line-verified): `src/app/page.tsx:85` — `<dt>3</dt><dd>SG stores</dd>` sits BESIDE the derived `${FREE_DELIVERY_THRESHOLD_CENTS / 100}+` stat; `:253` — `d: "Free at all 3 stores. We load your car."` beside the derived `Delivery from $${STANDARD_DELIVERY_FEE_CENTS / 100}`; `src/app/api/checkout/route.ts:130` + `:133` — `message: "Choose one of our three stores."` while the SAME route's whitelist derives from the seed (`:122` — `STORE_SLUGS = STORES.map(…)`). A fourth store in `STORES` (the seed the same files derive chips/options/whitelist from) leaves four literal sites lying with every gate green — the identical class the repo closed for the Header strip, Footer chips, checkout options and route whitelist (Task 129).
Fix (ToDo-2): interpolate `STORES.length` at both page sites + `Choose one of our ${STORES.length} stores.` in the two refusal messages. Pin: ONE fs-pin (catalog.test.ts) — `page.tsx` contains `STORES.length` at both count sites and NO bare `3 stores`/`three stores` literals; the checkout route's refusal copy derives from `STORES.length` with no `three stores` literal. TRUE RED today.

### F-3 LOW — the per-product discount-percent formula is triplicated with no shared seam (the one-seam discipline, one class short)
Evidence (line-verified): the IDENTICAL expression `p.compareAtCents && p.compareAtCents > p.priceCents ? Math.round(((p.compareAtCents - p.priceCents) / p.compareAtCents) * 100) : 0` at `src/lib/catalog.ts:238-242` (inside `catalogMaxDiscountPercent`), `src/components/ProductCard.tsx:47-49` (the card chip), `src/app/product/[slug]/page.tsx:56-58` (the PDP chip). Task 126 F-3 centralized the MAX variant; the per-product variant never got its seam — a rounding/edge-rule change must be edited in three places and a miss silently desynchronizes card chips, PDP chips and the marketing max claim.
Fix (ToDo-3): export `productDiscountPercent(p)` from `catalog.ts`; consume at ProductCard + PDP; `catalogMaxDiscountPercent` composes it. Pins: unit (percent math: compare-at 159900/price 129900 → 19; absent compareAt → 0; compare-at ≤ price → 0) + ONE fs-pin (the literal `compareAtCents - p.priceCents` formula occurs ONLY in `catalog.ts`). TRUE RED today.

### F-4 LOW — dead exports in `catalog.ts` (the Task-114 lesson-8 discipline "retire dead code when the replacement lands" — the replacement landed in Task 122 and the predecessor survived)
Evidence (line-verified): `findProduct` (`catalog.ts:160`) and `productImage` (`:212`) have ZERO consumers in `src/` AND `tests/` (ripgrep). `findPromo` (`:171`) has zero production consumers — the cart/checkout display gate moved to `effectivePromo` (`:186`, Task 122 F-5) and its 3 unit pins (`catalog.test.ts:38-61`) pin a seam no page reads; a future maintainer could "fix" display behaviour in `findPromo` believing it live.
Fix (ToDo-4): delete `findProduct` + `productImage`; delete `findPromo` and rewrite its 3 pins at the LIVE seams — kinds/values/trim/case/unknown through `effectivePromo` (at/above minimum), the exact-seed-drift loop through `effectivePromo` at each row's own minimum. Pin count unchanged (3 rewritten); the typecheck gate proves the deletions.

### F-5 INFO — the assembly + design-service fee copy is hand-copied literal pairs (the pre-Task-126 fee-rot class, miniature)
Evidence (line-verified): "$25" at `src/app/page.tsx:252` (services strip), `src/app/services/page.tsx:13` (metadata description), `:26` (Assembly card price), `src/app/product/[slug]/page.tsx:143` (the info-grid chip), `:202` (the details copy); "$190" at `page.tsx:176` (design-service card), `services/page.tsx:28`. Every SIBLING fee derives (`services/page.tsx:7-11` STD/FREE_OVER/EXPRESS from the utils constants — the Task 126 F-3 discipline these two never joined).
Fix (ToDo-5): `ASSEMBLY_FEE_CENTS = 2500` + `DESIGN_SERVICE_FEE_CENTS = 19000` in `utils.ts` beside the delivery constants; consume at all seven sites (`$/100` interpolation, the marketing-string idiom). Pin: ONE e2e pin (the Task-127 F-4 pattern — the services page + a PDP assert copy that interpolates the constants). TRUE RED today.

### F-6 INFO — the offers starter-kit copy asserts a hand-curated slug trio with no departure guard (the HERO_SLUG sibling, one guard short)
Evidence (line-verified): `src/app/offers/page.tsx:33` — `bundles` filters `all` by the 3-slug literal `["hdb-kitchen-trolley", "makan-extendable-table", "tampines-storage-bed"]`; `:65` — the copy "Bed + extendable table + kitchen trolley" renders unconditionally. A departed slug silently shrinks the chips while the copy still asserts the trio; the home page's HERO_SLUG sibling carries an explicit `find()`-guarded fallback (`page.tsx:105-106`).
Fix (ToDo-6): gate the set-copy on the resolved rows — all three present → the trio copy; else the neutral "our first-home picks". Pin: ONE fs-pin (the guard form present in `offers/page.tsx`). TRUE RED today.

### Registered (evaluated and kept — no action this cycle, with rationale)
- **N-2 LOW — the `categories`/`stores` tables are write-only** (seeded, never read; every consumer derives from the static seeds). Zero reachable behavioural delta today (the seed IS the DB content; nobody edits the DB out-of-band in the demo). Both options (funnel+derivation vs drop+document) are real architecture changes with root-layout blast radius; registered to the standing register beside "store-picker wiring" with the audit's options documented. The reachable-drift TIER of this finding (the hand-duplicated COUNT literals) IS fixed this cycle as F-2.
- **N-5 LOW — 3× full `getAllProducts()` scans per PDP request** (metadata + slug lookup + related; no `React cache` dedup). Perf-only, negligible at 24 catalogue rows; registered with the `cache()` suggestion.
- **N-7 INFO — `/order/[number]` answers HTTP 200 for unknown numbers** (inline friendly copy, by design; e2e pins `status < 500` + the heading; noindex + robots-disallowed). The documented stance — register row.

### Docs findings — ZERO
The docs-truth sweep re-verified all live-tense claims across the six operator docs (AGENTS/README/CLAUDE/PAD v1.22.0/SKILL v2.11.0/DEPLOYMENT) against fs-computed reality: test counts 190/131/10/2, gotoHydrated 44+2, health body, 105 PNGs, 22 plans, the pin-map rows, the standing register, the session narratives — all consistent; no corrections required this cycle beyond the count-lockstep sweep that accompanies the new tests below.

## 3. Test seams + execution order (TDD — RED observed before every behavior change; mutation-honest RED for every GREEN-on-arrival pin)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-1 | shop resync-window honesty | NEW e2e probe (held `cat=kitchen` refetch; settle oak view; click Kitchen chip; assert no `\d+ products` + loading grid + Kitchen heading) — TRUE RED (the tree renders the stale strip + departed rows) | the resync else-if flips `loading` for cat/sort transitions under an active keyword/price filter |
| B | F-2 | store-count derivation | NEW fs-pin (page.tsx `STORES.length` ×2 + checkout route derivation; no bare literals) — TRUE RED | interpolate `STORES.length` at the four sites |
| C | F-3 | productDiscountPercent seam | NEW unit pins (percent math ×2) + fs-pin (formula literal only in catalog.ts) — TRUE RED | export the seam; consume at ProductCard + PDP; catalogMaxDiscountPercent composes it |
| D | F-4 | dead-export retirement | pins REWRITTEN at the live seams first (effectivePromo/findPromoMinimumCents — the 3 findPromo tests become effectivePromo-at-minimum pins) — verify GREEN against the live seams, then delete the three dead exports (the typecheck proves the deletion) | delete `findProduct`/`findPromo`/`productImage` |
| E | F-5 | fee-copy derivation | NEW e2e pin (services Assembly card + PDP details copy interpolate the constants) — TRUE RED | `ASSEMBLY_FEE_CENTS`/`DESIGN_SERVICE_FEE_CENTS` in utils.ts; consume at the seven sites |
| F | F-6 | starter-kit guard | NEW fs-pin (the departure guard present in offers/page.tsx) — TRUE RED | gate the set-copy on the resolved bundles |

Order: A → B → C → D → E → F (code + pins), then the full gate (cold build, lint, typechecks, unit ×3 TZ, e2e, residue), then the docs lockstep sweep, then screenshots (105–109), `.env.example` re-verification, session_41 log, worklog entry, commit + push.

Expected count deltas (fs-verified after the code slices, before the docs sweep): unit 190 → **195** (+1 F-2 fs-pin, +2 F-3 percent-math unit pins, +1 F-3 derivation fs-pin, +1 F-6 fs-pin; F-4 rewrites 3 pins at the live seams — count unchanged); e2e 131 → **133** (+1 the F-1 resync probe, +1 the F-5 fee-copy pin). One new `gotoHydrated` call site in storefront.spec.ts (the F-1 probe navigates through it) → **45 storefront (47 across both files)** — the AGENTS/CLAUDE counts sweep with it. Unit files stay 10; e2e specs stay 2.

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint                # 0 errors expected
npm run test                # 195/195 unit (TZ=UTC host)
TZ=Asia/Singapore npm run test       # 195/195 — the three-TZ discipline
TZ=America/New_York npm run test     # 195/195
npm run test:e2e            # 133/133 (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at seed quantities (1379)
```

## 5. Post-execution addendum (what the execution itself discovered — recorded for the audit trail)

- **The F-1 probe's first draft FALSE-PASSED and was redesigned — the
  cycle's probe-design lesson (now SKILL lesson 65).** The first form used
  plain auto-retrying assertions (`toHaveCount(0)` on the strip, skeletons
  visible) after clicking the Kitchen chip — but Playwright retries them
  through the 250 ms debounce, and the UNFIXED tree flips `loading` inside
  the timeout callback, so the stale state self-healed before the
  assertions gave up: 1 passed against the unfixed tree. The corrected
  probe captures the DOM at the EXACT commit (a MutationObserver keyed on
  the "Kitchen" heading, resolving strip/skeleton/row-state into a window
  variable) with the kitchen refetch held open forever (`page.route` with
  a never-resolving handler). The corrected form's TRUE RED was then
  re-observed against the temporarily-reverted tree (Received: "1
  products · prices include 9% GST · free delivery over $200" at the
  strip assertion), the fix restored, GREEN re-verified.
- **A second probe-design trap caught during the F-1 redesign: the RSC
  flight payload poisons body-wide text searches.** `document.body
  .textContent.includes("HAVBRIS lounge chair")` was ALWAYS true — the
  initial SSR embeds the RSC flight payload as a `<script>` in body, whose
  text includes the living-view catalogue. The departed-rows check is
  scoped to rendered product-card links in main
  (`main a[href^="/product/"]`) instead.
- **Count deltas landed close to plan with one honest deviation**: unit
  190 → **198** (not the planned 195 — the F-4 pin rewrite consolidated
  the findPromo describe's 3 pins into 2 at the live seams, net −1: +2
  F-2 fs-pins, +3 F-3 pins, −1 F-4 consolidation, +3 F-5 fs-pins, +1
  F-6 fs-pin); e2e 131 → **133** exactly as planned (+1 the F-1 resync
  probe, +1 the F-5 fee pin); gotoHydrated 44 → **45 storefront (47
  across both files)**; unit files stay 10, e2e specs stay 2.
- **The PG lesson-31 restore set grew again (the third extension)**: this
  cycle's first `pg_ctl start` failed on a missing `pg_replslot`
  directory — the first time this empty initdb subdir was observed
  missing — and the wider sweep restored six more (`pg_commit_ts`,
  `pg_dynshmem`, `pg_stat`, `pg_stat_temp`, `pg_tblspc`, `pg_twophase`).
  The known set is now the full standard-initdb empty-dir family; future
  restores should proactively recreate ALL of them.
- **Gate outcome (the exact tree to be committed)**: cold build green ·
  typechecks + lint clean · unit **198/198** (the 17 mid-sweep
  docs-counts reds resolved by the six-doc sweep; identical under UTC /
  Asia/Singapore / America/New_York — the three-TZ discipline) · e2e
  **133/133** against the cold production build · zero DB residue (direct
  SQL: orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) ·
  screenshots 105–109 verified non-blank (PNG signatures, dimensions,
  byte-density 0.113–0.330 B/px) with live DOM verification of every
  captured state.

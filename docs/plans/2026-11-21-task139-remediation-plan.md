# Task 139 Remediation Plan — Store-Count Derivation Completion, gotoHydrated Docs-Claims Pin, Starter-Kit Guard Polarity Proof, Dead-Export Retirement

Date: 2026-11-21 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (fresh clone after a full sandbox reset → `be75b7d` = Task-138 `9e52cd5` + the session_42 narrative; node_modules rebuilt; the pinned Playwright Chromium 1255 re-installed after the fresh-clone cache miss). Rootless PostgreSQL 17.12: this cycle's sandbox carried NO surviving `pg/` tree at all (unlike the Tasks 135–138 restores) — the full `docs/setup_pg_z.sh` path ran from zero (apt-cache major resolution → deb extraction → initdb → scram hba → first start), then the 9-table DDL contract pushed via `npx drizzle-kit push` and the seed verified by direct SQL after the first gate read (24/8/3/72 products/categories/stores/inventory-rows, promotions 3, reviews 5, inspirations 6, inventory total 1379 = the formula, orders/order_items 0, 4+ named indexes incl. the inventory (product_id, store_slug) unique and both orders uniques). One environment trap handled pre-gate: an exported shell DATABASE_URL (a previous session's SQLite leftover, `file:/home/z/my-project/db/custom.db`) silently overrode `.env` — gotcha #10, unset + pinned per command. Mobile-navigation + Tailwind v4 taxonomies re-run on the dev server via 127.0.0.1 (agent-browser drawer taxonomy at 390×844 + 1440×900 — 8/8 PASS: open (aria-expanded=true, label toggles) / navigate+auto-close / the F-7 param-close regression / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) / hydration (`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item") / no horizontal overflow at 390px across seven key routes — **no Tailwind v4 bug**; the CSS-first `@theme` posture + the candidate-scan guard re-verified in `globals.css`; all `aspect-[…]` usages slash-form). Sitemap/SEO re-verified live: 42 indexable URLs no lastmod; robots 7 disallows coherent; og:image 1200×627 on home + twitter:card site-wide; noindex (`noindex, nofollow`) on the order page + all five utility routes; the 404 surface branded ("This page went flat-pack") + 404 status; the security-header set present (nosniff, DENY, strict-origin-when-cross-origin, HSTS) with no `x-powered-by`. Reference repo `homenest-store-s` cross-checked: **quiescent — HEAD `4771c3d`, zero src/tests changes after `ff65bd2`** — the fifteenth cycle of "nothing to port". The vitest/playwright suites exist and are wired (`vitest.config.ts` + `tsconfig.tests.json` + `playwright.config.ts` :3100 production webServer; 198/198 + 133/133 baseline green, zero DB residue after the run); this cycle EXTENDS them with the new pins below (the config files need no modification — the suites are the repo's own). Execution per `skills/tdd` (red → green, one seam at a time; mutation-honest RED for every GREEN-on-arrival pin). `skills/clone-app-pat-pro` considered and set aside (a pixel-clone Chrome-extension workflow, not a remediation tool — the Task-137/138 stance). `skills/` excluded from checking/testing/compilation (operator contract).

## 1. Audit baseline (all Verified this run)

| Gate | Result |
|---|---|
| fresh clone → `be75b7d` (Task-138 `9e52cd5` + session_42) | clean tree |
| Rootless PostgreSQL 17.12 (full fresh install — no data dir survived this reset; `setup_pg_z.sh` from zero) | up; DDL contract + seed verified (24/8/3/72/3/5/6/0/0, inventory 1379, 4+ named indexes, zero residue) |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 198/198 |
| `npm run test:e2e` (Playwright, cold production build :3100) | 133/133 |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 bug |
| Docs-truth sweep (unit 198, e2e 133, gotoHydrated 45+2, 110 PNGs, 23 plans — fs-verified by the audit agent) | ZERO mismatches across the six operator docs |
| Full-tree audit | one deep-code agent (0 CRITICAL / 0 HIGH / 0 MEDIUM / 2 LOW / 3 INFO); every finding re-verified at line level by me (the lesson-46 discipline) |

## 2. Findings → ToDo (ordered by severity; every code finding carries file:line evidence re-verified this run)

### F-1 LOW (cycle headline) — the store COUNT survives as hand-duplicated literals on /stores and /sustainability (the Task-138 F-2 derivation, one tier short)
Evidence (line-verified): `src/app/stores/page.tsx:7-8` — metadata description `"Three NORDHEM stores on one island — Tampines, Jurong and Alexandra, each with a restaurant, Småland play corner and As-Is bargain level."`; `:12` — og:description `"Three NORDHEM stores on one island — Tampines, Jurong and Alexandra."`; `:23` — the h1 `"Three stores, one island"`; `src/app/sustainability/page.tsx:27` — the stat card `"All 3 SG stores + warehouse since 2024."`. Task 138 F-2 retired the count at four OTHER sites (home hero stat, Click-&-Collect strip, checkout refusal ×2) and its fs-pin (`tests/unit/catalog.test.ts:197-215`) scans ONLY `src/app/page.tsx` + `src/app/api/checkout/route.ts` — the pin scoped itself to the files it fixed, so these four siblings kept the literal with every gate green. Compounding: the e2e metadata-blanket pin ASSERTS the hand-copied form (`tests/e2e/storefront.spec.ts:1209` — `["/stores", /Three NORDHEM stores/]`) — the inverse of the derivation discipline (a fourth store in `STORES` self-corrects every derived site while these four plus the pin keep asserting three). A repo-wide sweep confirms the blast radius is exactly these four sites (rg over `src/`: no other count-word/`3 stores` forms outside the already-derived `STORES.length` sites).
Fix (ToDo-1): interpolate `STORES.length` at all four sites (digit form — the Task-138 idiom: `` `${STORES.length} NORDHEM stores on one island — …` `` ×2, `` `${STORES.length} stores, one island` ``, `` `All ${STORES.length} SG stores + warehouse since 2024.` ``); `sustainability/page.tsx` gains the `STORES` import (a client component consuming the static seed — the Header precedent); the e2e pin derives (`new RegExp(`${STORES.length} NORDHEM stores`)` — `STORES` already imported in the spec at :9). Pins: ONE new fs-pin (catalog.test.ts, the store-count describe's third `it`) — both files contain `STORES.length`; the three literal forms (`Three NORDHEM stores`, `Three stores, one island`, `All 3 SG stores`) appear NOWHERE under `src/` (the blast-radius negative — the class-level form, so the next tier-over cannot land silently). TRUE RED today.

### F-2 LOW — the gotoHydrated count claims in the operator docs are live-tense but unpinned (the docs-counts pin's blind spot)
Evidence (line-verified): `AGENTS.md:131` — "45 storefront call sites now (47 across both files)"; `AGENTS.md:162-163` — "45 gotoHydrated call sites in the storefront spec (47 across both files…"; `CLAUDE.md:355-356` — "45 gotoHydrated call sites in the storefront spec … 47 across"; `Project_Architecture_Document.md:79` — "gotoHydrated 45+2". fs-reality is currently TRUE (rg: 45 `gotoHydrated(` in storefront.spec.ts + 2 in mobile-navigation.spec.ts = 47), but `tests/unit/docs-counts.test.ts` pins unit/e2e counts and the health body — no test pins the gotoHydrated counts. The next interaction-first spec added or removed changes fs-reality while every gate stays green — the copied-count drift class the docs-counts pin exists to kill (the repo's own "PIN THE COUNT WHERE IT LIVES" lesson).
Fix (ToDo-2): ONE new `test(...)` in docs-counts.test.ts — fs-compute `gotoHydrated(` per spec file (storefront + mobile-navigation; helpers excluded — it defines the helper), then assert each of the four doc claim sites contains its fs-computed form (`${storefront} storefront call sites now (${storefront + mobile} across both` / `${storefront} gotoHydrated call` / `gotoHydrated ${storefront}+${mobile}`). GREEN-on-arrival → mutation-honest RED by temporary docs edit (AGENTS "45" → "44" → the pin REDs → restore), the Task-132 F-2 discipline.

### F-3 INFO — the Task-138 F-6 starter-kit guard pin is presence-only (polarity-blind)
Evidence (line-verified): `tests/unit/catalog.test.ts:252-263` — `expect(offers).toContain("KIT_SLUGS")` + `expect(offers).toContain("bundles.length === KIT_SLUGS.length")` are both satisfiable by an INVERTED ternary (neutral copy when the trio IS complete, trio copy on departure — the exact falsehood F-6 fixed). The guard itself is correct today (`offers/page.tsx:37-41` read), but the pin proves existence, not polarity — the class the repo strengthened once before (Task 132 F-2: "the pin only asserted the file CONTAINED … SOMEWHERE — demonstrated by temporary mutation").
Fix (ToDo-3): strengthen the existing pin with the exact guarded form (`` bundles.length === KIT_SLUGS.length `` followed on the TRUE branch by the trio copy text `"Bed + extendable table + kitchen trolley` — the multiline joined-source assertion) plus the neutral-fallback presence (`"Our first-home picks."`) — an inverted ternary fails it. Mutation-honest RED by temporary polarity inversion in `offers/page.tsx` → the strengthened assertions RED → restore. No new test (the count is unchanged); the e2e rendered-copy question stays with the existing spec set.

### F-4 INFO — one dead `export` (the Task-138 F-4 class, miniature)
Evidence (line-verified): `src/lib/utils.ts:231` — `export const CLICK_COLLECT_TODAY_CUTOFF_SGT_HOUR = 14;` — consumed ONLY inside its own module (`:239`, `availableDeliverySlots`); zero imports in `src/` or `tests/` (per-symbol reference scan). Every sibling temporal constant (`SGT_CAMPAIGN_OFFSET_MS`) is module-private; the `export` implies a consumer that does not exist.
Fix (ToDo-4): drop the `export` keyword. The typecheck gate proves the deletion (no consumer breaks).

### F-5 INFO — registered (evaluated and kept — no action this cycle, with rationale)
**ReviewSection post-recovery understatement** (`src/components/ReviewSection.tsx:21`, `:47-49` — Reasoned, code-path traced): after a reviews-seam SSR outage (`count = total ?? 0`) a successful POST (which proves recovery) flips `sectionUnavailable` false and increments the count to 1 — the product's historical reviews are never refetched, so the heading can read "Reviews (1)" while the DB holds more. The visible list and the count agree with each other (the honesty rule the repo polices), the behaviour is the deliberately pinned Task-137 F-1 design, and it self-heals on the next navigation — an edge-of-edge. Registered beside the Task-137 pins with the refetch-on-recovery option documented for a future cycle.

Also registered (the audit's tier-beyond flags, no action): the editorial store-name ENUMERATIONS ("Tampines, Jurong and Alexandra" prose at `stores/page.tsx:8/:12`, `layout.tsx`, `page.tsx`, `services/page.tsx`) — editorial copy a tier beyond the pinned count class (a name edit is visible copy review, not a silent seed drift; the count is the lie-vector F-1 closes).

### Docs findings — ZERO
The audit's docs-truth sweep verified every live-tense count claim against fs-reality (unit 198, e2e 133, gotoHydrated 45+2, 110 PNGs, 23 plans, health body, gates) — all consistent; no corrections required this cycle beyond the count-lockstep sweep that accompanies the new tests below.

## 3. Test seams + execution order (TDD — RED observed before every behavior change; mutation-honest RED for every GREEN-on-arrival pin)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-1 | store-count derivation completion | NEW fs-pin (catalog.test.ts third `it`: stores + sustainability contain `STORES.length`; the three literal forms absent from `src/`) — TRUE RED (the literals are present today) | interpolate `STORES.length` at the four sites + the sustainability import; derive the e2e metadata pin from `STORES.length` |
| B | F-2 | gotoHydrated docs-claims pin | NEW docs-counts `test(...)` — GREEN-on-arrival → mutation-honest RED (AGENTS "45"→"44" temporarily, observe RED, restore) | none (the pin IS the deliverable; docs already true) |
| C | F-3 | starter-kit guard polarity | strengthened assertions in the EXISTING F-6 pin → mutation-honest RED (invert the ternary in offers/page.tsx temporarily, observe RED, restore) | none (the strengthened pin is the deliverable; the guard is correct) |
| D | F-4 | dead-export retirement | the typecheck gate proves the deletion | drop `export` on `CLICK_COLLECT_TODAY_CUTOFF_SGT_HOUR` |

Order: A → B → C → D (code + pins), then the full gate (cold build, lint, typechecks, unit ×3 TZ, e2e, residue), then the docs lockstep sweep, then screenshots (110–114), `.env.example` re-verification, session_43 log, worklog entry, commit + push.

Expected count deltas (fs-verified after the code slices, before the docs sweep): unit 198 → **200** (+1 the F-1 fs-pin, +1 the F-2 docs-counts pin; F-3 strengthens an existing test, F-4 adds none); e2e stays **133** (the F-1 change derives an existing pin's expectation — no new spec); gotoHydrated call sites stay **45 storefront (47 across both files)** (no new interaction-first blocks). Unit files stay 10; e2e specs stay 2.

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint                # 0 errors expected
npm run test                # 200/200 unit (TZ=UTC host)
TZ=Asia/Singapore npm run test       # 200/200 — the three-TZ discipline
TZ=America/New_York npm run test     # 200/200
npm run test:e2e            # 133/133 (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at seed quantities (1379)
```

## 5. Post-execution addendum (what the execution itself discovered — recorded for the audit trail)

- **Count deltas landed exactly as planned**: unit 198 → **200** (+1 the F-1
  blast-radius fs-pin, +1 the F-2 docs-counts pin); e2e stayed **133** (the
  F-1 change derives an existing pin's expectation — no new spec);
  gotoHydrated call sites stayed **45 storefront (47 across both files)**;
  unit files stay 10, e2e specs stay 2.
- **The F-2 pin's first run produced the expected 11 mid-sweep docs-counts
  reds** (every unit-count claim site: AGENTS/README/CLAUDE/SKILL/PAD/
  DEPLOYMENT at 198 vs fs 200) — the lockstep state the six-doc sweep
  resolved; after the sweep the full suite is green on the first re-run.
- **The F-3 mutation discipline earned its keep twice**: the obvious
  mutation (the `===`→`!==` operator inversion) REDed only the PRESENCE
  checks — it proves little about the strengthening; the honest demo is
  the BRANCH-SWAP (swap the two copy strings, leaving every original
  assertion green), which REDed exactly the new polarity assertion. Both
  were observed before the restore (recorded as SKILL lesson 68).
- **A sed display artifact almost manufactured a finding**: reading
  utils.ts through `sed -n` rendered `DELIVERY_SLOTSethod]` for
  `DELIVERY_SLOTS[method]` — re-verified with a direct read before
  treating the line as suspect (the reproduce-before-trusting rule).
- **The screenshots captured at 1170×2532 for the mobile shot** (DPR 3 —
  `set viewport 390 844 3`): the Task-138 mobile captures were the same
  form; the non-blank verification extended with a non-white-pixel-ratio
  check (45–80% across the five captures; the /sustainability page's
  0.089 B/px density is its large white space, verified content-bearing
  by the ratio check).
- **Gate outcome (the exact tree to be committed)**: cold build green ·
  typechecks + lint clean · unit **200/200** (identical under UTC /
  Asia/Singapore / America/New_York — the three-TZ discipline) · e2e
  **133/133** against the cold production build · zero DB residue (direct
  SQL: orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) ·
  screenshots 110–114 verified non-blank with live DOM verification of
  every captured state · `.env.example` tracked + clean (contract
  unchanged; the pin green within 200/200).

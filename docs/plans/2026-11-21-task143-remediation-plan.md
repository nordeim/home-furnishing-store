# Task 143 Remediation Plan — Order-Suffix Mint-Space Fold, Seed Store-Index Derivation, Vitest Config Loader Forward-Compat

Date: 2026-11-21 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only

Method: fresh-clone workspace re-audit per `skills/web-application/SKILL.md` (the sandbox was fully
reset — `git clone https://github.com/nordeim/home-furnishing-store.git` at `0a1519c` = Task-142
`889ee69` + the user-added session_51 log; node_modules, `.env` and the pinned Chromium 1255
rebuilt from zero). Rootless PostgreSQL 17.12 installed FRESH via the idempotent
`docs/setup_pg_z.sh` (deb extraction → initdb → scram hba → first start; the `pg/` tree did not
survive the recycle), 9-table DDL contract + seed quantities verified by direct SQL
(24/8/3/72 products/categories/stores/inventory-rows, promotions 3, inspirations 6, reviews 5,
inventory 1379, orders/order_items 0). Baseline gates re-run GREEN exactly as documented: lint 0/0 ·
typechecks ×2 · **213/213 unit × 3 TZ (UTC / Asia/Singapore / America/New_York)** · **146/146 e2e
(cold production build)** · zero residue after the run. Mobile-navigation + Tailwind v4 taxonomy
re-run LIVE on the production server `:3200` (agent-browser, pinned `DATABASE_URL` +
`TRUST_PROXY=1`): drawer conditional-mount taxonomy **8/8 PASS** (T1 open: aria-expanded flip +
label toggle + 390px full-width mount + 14 links; T2 category navigate + auto-close; T3 the
Task-125 F-7 param-only-navigation close via the DRAWER's own link; T4 Escape; T5 toggle ×2 cycle;
T6 desktop ≥1024 hamburger `display:none` at 0×0 with the 10-link category nav visible; T7
hydration `data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item" on a clean
localStorage-cleared reproduction; T8 no horizontal overflow across 18 routes at 390px) — **no
Tailwind v4 display-utility bug** (the drawer conditionally mounts; zero `classList` calls in
`src/`); the Task-140 F-4 cursor fix verified live (`Add to bag` computes `cursor: pointer`, the
disabled qty-1 `−` floor computes `default`). SEO/sitemap re-verified live: sitemap 42 indexable
URLs (zero utility routes), robots 7 disallows coherent, `noindex, nofollow` meta on all six
utility surfaces (5 layouts + the order page), og:image 1200×627, JSON-LD complete
(Organization/WebSite+SearchAction on home; Product/Offer/Brand/AggregateRating on PDP), security
headers complete INCLUDING the Task-141 reduced CSP, no `x-powered-by`, `icon.svg` + web manifest
200. Reference repo `homenest-store-s` cross-checked at HEAD `4771c3d` (zero src/tests changes
since `ff65bd2`): quiescent — the nineteenth cycle of "nothing to port". The vitest/playwright
suites exist and are wired (Task 114/117); this cycle's config touch is the vitest
`configLoader: 'native'` forward-compat rename below (the user-requested "modify the respective
config files" resolves to exactly that; `playwright.config.ts` needs no further change — its
Task-142 `reuseExistingServer: false` boot contract was re-verified green inside the 146/146 run).
Execution per `skills/tdd` (red → green, one seam at a time). `skills/` excluded from
checking/testing/compilation (operator contract).

## 1. Audit baseline (all Verified this run)

| Gate | Result |
|---|---|
| fresh clone → `0a1519c` (Task-142 `889ee69` + session_51 log) | clean tree |
| Rootless PostgreSQL 17.12 (fresh install via `setup_pg_z.sh`) | up; seed verified (24/8/3/72/3/5/6/0/0, inventory 1379, zero residue) |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 213/213 × 3 TZ (UTC / Asia/Singapore / America/New_York) |
| `npm run test:e2e` (Playwright, cold production build :3100) | 146/146 |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 display bug; cursor pointer live |
| SEO/sitemap live sweep | 42 URLs (indexable only) · robots coherent · noindex ×6 · OG/JSON-LD complete · security headers + reduced CSP · icon.svg + manifest 200 |
| Full-tree audit | one deep-code agent (0 CRITICAL / 0 HIGH / 0 MEDIUM / 1 LOW / 5 INFO); every finding re-verified at line level (the lesson-46 discipline) |

## 2. Findings → ToDo (ordered by severity; every code finding carries file:line evidence re-verified this run)

### J-1 LOW — `orderSuffix()` silently folds the top half of its uint32 mint space: the "~2^31 entropy" comment is false; mint collisions run ~10× the documented rate
Evidence (line-verified + arithmetically + empirically reproduced): `src/lib/utils.ts:195-204` —
4 bytes → uint32 `v` → `v.toString(36).padStart(6,"0").slice(0,6)`. A uniform uint32 exceeds
`36^6 = 2,176,782,336` **49.2% of the time**, producing a 7-char base36 string whose LAST digit
`slice(0, 6)` discards — dropping the last base-36 digit maps `v → floor(v/36)`, so the entire
top half folds onto values the bottom half also produces directly. Concrete collision (verified):
`v = 60,466,176 → "100000"` and `v = 2,176,782,341 → "1000000".slice(0,6) → "100000"` — 37
preimages for the heaviest suffix vs the uniform `2^32/36^6 ≈ 1.97`. Empirical: 98 collision
pairs in 200,000 random mints vs ~9.19 expected under uniform 36^6 (**~10× inflation**, observed
this run). The existing unit pins (`tests/unit/utils.test.ts:163-231`) hand-work only
small-value fills (`[1,0,0,0]`, `[0,1,0,0]`) and a 6-char REGEX on `[255,255,255,255]` — the
"exactly 6 chars" half of the Task-131 claim is pinned, the "~2^31 entropy" half is not.
Impact: the order number is half of the PII lookup pair (`/track-order` + the number-only
`/order/[number]`). Practical exploitability is contained (email pair required, 20/min/IP limits,
`orders_order_number_unique` + the clean one-retry path absorb mint collisions) but the birthday
bound effectively drops from ~55k to ~21k orders/day and the code's own security rationale
(Task 131 F-4: state recovery) is understated by ~4 bits of min-entropy.
Fix (ToDo-1): mask before base36 — `const v = (… >>> 0) & 0x7fffffff` — `2^31−1 = 2,147,483,647
< 36^6` so every masked value is ≤ 6 chars and uniform over ~2^31, making the existing "~2^31
entropy" comment TRUE. All existing pins stay green (verified by computation: `[1,0,0,0] →
"000001"`, `[0,1,0,0] → "000074"`, `[255,255,255,255]` → 6-char regex — all unchanged under the
mask). The comment gains the fold rationale.
Pins: ONE new deterministic-fill unit pin in the Task-131 describe — bytes `[0,0,0,0x90]`
(uint32 2,415,919,104, in the truncation region) → expect `"NH-20261119-4FTI4G"` (the masked
value 268,435,456 in base36) — TRUE RED today (the current code folds to `"13YDJ4"`).

### J-2 INFO — `ensureSeed` inventory rows are positionally pinned to exactly 3 stores (a 4th seed store gets zero rows; a removal throws inside the seed)
Evidence (line-verified): `src/lib/server-data.ts:52-54` — three literal `invRows.push` lines
indexing `STORES[0].slug` / `STORES[1].slug` / `STORES[2].slug` with hand-copied per-index depth
offsets (+8/−4/−10) and aisle-bin patterns (A%B/C%D/E%F, moduli 24/12, 20/10, 16/8). A 4th
seed store gets zero inventory rows → every checkout selecting it refuses `LOW_STOCK "Only 0
left"`; a store REMOVAL makes the seed throw on `undefined.slug` (swallowed by ensureSeed's
catch → reads degrade, but the write path is dead until manual repair). The Task-140 F-3 fs-pin
(`tests/unit/catalog.test.ts:339-349`) covers only the `STORES[0]` DEFAULT consumer; the seed's
positional trio is outside every pin. The Task-129/138/139 derivation discipline (lists derive
from the seed) stopped one tier short here.
Fix (ToDo-2): extract the per-product seed rows into an exported pure seam
`seedInventoryRows(productId)` in **`src/lib/catalog.ts`** (NOT server-data.ts — importing
server-data from the unit tree would pull in `@/db`, which throws at module load without
`DATABASE_URL`; the existing `tests/unit/server-data.test.ts` is fs-based BY DESIGN for exactly
that reason, and `catalog.test.ts` already imports `@/lib/catalog` directly). The seam maps over
`STORES` with index-derived parameters — depth offset `i === 0 ? 8 : -4 - 6*(i-1)`, aisle
prefix `String.fromCharCode(65 + 2*i)`/`String.fromCharCode(66 + 2*i)`, moduli
`Math.max(4, 24 - 4*i)`/`Math.max(2, 12 - 2*i)` — VERIFIED IDENTICAL for the current 3-store
seed (72 rows @ 1379 total; aisle patterns byte-identical), so the seeded DB contract is
unchanged. `ensureSeed` consumes the seam (`invRows.push(...seedInventoryRows(p.id))`);
`placeOrder`'s `STORES[0].slug` default (server-data.ts:328) keeps the Task-140 F-3 pin green.
Pins: TWO layers. (1) Behavioral — a NEW describe in `tests/unit/catalog.test.ts` (the catalog
pin home, importing the seam directly): rows.length === STORES.length with every seed slug
covered exactly once (a 4th store cannot strand); quantities ≥ 0 for every product id 1..24;
the DOCUMENTED total — sum over products 1..24 === 1379 — pins the seeded-DB contract (72 rows)
so the derivation can never drift the seed; the aisle-bin pattern well-formed.
(2) Structural — a NEW fs-pin in `tests/unit/server-data.test.ts`: the ensureSeed body consumes
the seam (`seedInventoryRows` present) and NO positional store index ≥ 1 exists anywhere in
server-data.ts (`/STORES\[[1-9]\d*\]/` must match zero — the Task-138 blast-radius fs-pin style;
`STORES[0]` stays sanctioned for the placeOrder default).
Mutation-honest RED: temporarily revert server-data to the positional 3-push form and observe
BOTH layers fail (the fs-pin sees the positional indices; the behavioral pin loses the seam);
plus a 4-store stub demonstration of the coverage gap (recorded in the session log).

### J-3 INFO — `vitest.config.ts` trips Vite's future-default native config loader (a standing warning on every unit run; forward-compat debt)
Evidence (observed this run): every `npm run test` prints *"Your Vite config uses features that
are unsupported by `configLoader: 'native'`, which is planned to become the default in a future
major version of Vite — ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a
`.mjs` extension or set `"type": "module"`."* The config uses `import.meta.dirname` (ESM-only),
and the package has no `"type": "module"` (adding one is a blast-radius change to every CJS
consumer — rejected).
Fix (ToDo-3): `git mv vitest.config.ts vitest.config.mts` (Vite loads `.mts` as ESM natively;
`vitest run` auto-discovers both). Update the four operator-doc references (README file
hierarchy, AGENTS TZ note, PAD §3.2/§7.x, CLAUDE testing note — `worklog.md`'s five historical
mentions stay as history). The warning disappears; the suite is byte-identical. This is this
cycle's "modify the respective config files" deliverable — `playwright.config.ts` needs NO
further modification (its Task-142 `reuseExistingServer: false` + `TRUST_PROXY: "1"` boot
contract re-verified green inside the 146/146 run).
Pins: no new pin (the warning's absence is the vehicle, observed in the gate run; over-pinning a
filename invites churn). Docs-counts covers the count claims, unchanged by a rename.

### J-4 INFO — uncommitted working-tree mode change on `docs/setup_pg_z.sh` (100644 → 100755)
Evidence: `git status` this run — the fresh install made the script executable (it SHOULD be; the
operator runs it directly). Fix (ToDo-4): commit the mode change with this cycle (one `git add`,
no content change).

### Registered (evaluated; DECISIONS recorded — no action this cycle)
- **J-5 ely-beauty_SKILL.md at repo root** (a foreign project's 5,223-line operator doc):
  ALREADY documented as non-authoritative in AGENTS.md §"Inherited ely-beauty artifacts"
  ("kept for provenance — do not treat as live") and excluded from every gate (Tailwind scan
  guard, docs-counts scope). Relocating it would churn the provenance record the AGENTS section
  deliberately curates. Registered: no action.
- **J-6 prose store-name enumerations** (stores/page.tsx ×2, page.tsx ×2, layout.tsx ×1 —
  "Tampines, Jurong and Alexandra" beside derived counts): the PAD-registered editorial-enumeration
  class (same posture as the Task-142 F-10 Footer links — degrade-never-fail prose curation;
  every COUNT and functional list already derives). Registered: revisit if the store catalogue
  ever actually changes.
- **Vitest `isolate: false` perf hint** (the run footer suggests ~0.8s savings): a worker-semantics
  change, not a defect; the suite runs in 1.5s. Registered: not worth the semantic risk.
- The prior cycles' standing register (full nonce CSP, GET throttling → edge layer, jsdom,
  store-picker wiring + predicate, schema seed-slug defaults, submitReview tx window) carries
  forward unchanged.

## 3. Test seams + execution order (TDD — RED observed before every behavior change; mutation-honest RED for every GREEN-on-arrival pin)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | J-1 | `orderSuffix` mint mask | NEW deterministic-fill pin in the Task-131 describe (`[0,0,0,0x90]` → `"4FTI4G"`; TRUE RED today — folds to `"13YDJ4"`) | `& 0x7fffffff` before base36 + the comment rewrite |
| B | J-2 | `seedInventoryRows(productId)` pure seam in `catalog.ts` | NEW behavioral describe in `catalog.test.ts` (coverage/total/pattern pins, importing the seam) + NEW structural fs-pin in `server-data.test.ts` (seam consumed; zero positional store indices ≥ 1) — mutation-honest RED by temporarily reverting to the positional 3-push form (recorded) | the STORES-mapped derivation (identical 72@1379 for the current seed) |
| C | J-3 | vitest config filename | the standing `configLoader: 'native'` warning (observed RED every run; the gate re-run shows it gone) | `git mv vitest.config.ts → .mts` + the four doc references |
| D | J-4 | git tree hygiene | — | commit the mode change |

Order: A → B → C → D (code, one slice per commit-intent), then screenshots (130–134, DEV server
per the operator request), the six-doc sweep (counts + the current-cycle narratives + SKILL
v2.17.0 lessons 75-76 + PAD v1.28.0 revision block + the register updates), then the full gate
(cold build, lint, typechecks, unit ×3 TZ, e2e, residue), session_52 log, worklog entry, commit +
push via the SSH wrapper (`--remote` override mandatory). The Task-140 addendum #5 gate-order
lesson applies: the docs-counts pin forces code → screenshots → docs → gate.

Expected count deltas (fs-verified after the code slices, before the docs sweep): unit 213 →
**218** (+1 J-1 truncation-region pin, +3 J-2 behavioral seed-seam pins, +1 J-2 structural
fs-pin); e2e stays **146**; gotoHydrated
stays 59 storefront / 61 across both files; unit files stay 10; e2e specs stay 2; plans 27 → 28;
screenshots 130 → 135 PNGs (130–134).

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint               # 0 errors expected
npm run test               # 218/218 (TZ=UTC host) — and the loader warning GONE
TZ=Asia/Singapore npm run test       # 218/218 — the three-TZ discipline
TZ=America/New_York npm run test     # 218/218
npm run test:e2e           # 146/146 (cold production build; live Postgres; TRUST_PROXY=1 via webServer.env)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at 1379
```

Six-doc count-lockstep in the SAME commit (AGENTS/README/CLAUDE/SKILL/PAD/DEPLOYMENT — the
docs-counts pin fails otherwise): unit 218, e2e 146, gotoHydrated 59/61, plans 28, screenshots
130–134 (135 PNGs).

## 5. Post-execution addendum (what the execution itself discovered — recorded for the audit trail)

1. **The `worklog.md` historical mentions of `vitest.config.ts` (5 sites) were left as history.**
   The Task-142 and earlier entries describe the file as it was named at the time; rewriting
   historical log lines would falsify the record. Only the four LIVE operator-doc references
   (README hierarchy, AGENTS TZ note, PAD ×2, CLAUDE testing note) were updated. Rule: the
   docs-counts lockstep discipline covers live-tense claims, not history.
2. **The J-2 mutation-honest RED demonstrated BOTH layers.** Reverting server-data to the
   positional 3-push form failed the structural fs-pin (positional indices present, the seam
   call gone); with a temporary synthetic 4th store appended to a local STORES copy, the
   behavioral coverage pin (rows.length === STORES.length) failed against the 3-row positional
   form — the exact stranded-store gap the finding describes. The honest-RED evidence is in
   the session log; the shipped seed is untouched (the stub lived only inside the RED
   demonstration, removed before the GREEN run).
3. **The J-1 pin's expected value was computed, then re-derived by hand.** `[0,0,0,0x90]` →
   uint32 2,415,919,104 → masked 268,435,456 (2^28) → base36 "4fti4g" → "4FTI4G"; the unmasked
   fold is "13YDJ4" (floor(v/36) = 67,108,864 → "13ydj4"). Both directions verified in node
   before the pin was written (the audit's empirical 98-collisions-in-200k observation
   corroborates).
4. **`git mv` on the config kept git's rename detection green** — `git status` shows
   `renamed: vitest.config.ts -> vitest.config.mts` with a 100% similarity score, so the
   provenance history is preserved.

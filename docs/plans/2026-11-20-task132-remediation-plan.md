# Task 132 Remediation Plan — TZ-Pure Test Gates, Fulfilment-Pin Structural Binding, Wishlist All-Ghost Honesty, Probe-Email Uniqueness, Docs Era-Range Truth

Date: 2026-11-20 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (fresh clone →
`3fb51c2`; the sandbox had been reset — node_modules/.env rebuilt, the rootless PostgreSQL
17 data dir needed its lesson-31 empty-subdirectory restore, then came up with the 9-table
DDL contract AND seed quantities verified by direct SQL: inventory 1379 = the formula, zero
residue) with the mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy
at 390×844/1440×900 on the dev server via 127.0.0.1 — 8/8 PASS: open (aria-expanded=true,
label toggles) / navigate+auto-close / param-close regression (F-7 class) / Escape / toggle /
hamburger hidden-≥1024 (display:none, 0×0 rect) / hydration (`data-hydrated=true` +
add-to-bag → badge "Shopping bag, 1 item") / no horizontal overflow at 390px — **no Tailwind
v4 bug**), execution per `skills/tdd` (red → green, one seam at a time). `skills/` excluded
from checking/testing/compilation (operator contract). Reference repo `homenest-store-s`
cross-checked: **quiescent — HEAD still `4771c3d` (2026-11-01, skills-only; fetch returned
nothing new), zero src/tests changes after `ff65bd2`** (the boundary-day commit evaluated
and rejected in Task 131) — eighth cycle of "nothing to port". Sitemap/SEO re-verified live:
42 indexable URLs no lastmod; robots 7 disallows coherent; og:image 1200×627 on home + PDP
+ inspiration; noindex on the order page + all five utility routes; the 404 surface branded
("flat-pack") with a 404 status.

## 1. Audit baseline (all Verified this run; fresh clone, cold caches)

| Gate | Result |
|---|---|
| `git clone` → `3fb51c2` (Task-131 `6fef812` + the session_28 log) | clean tree |
| `npm install` (fresh node_modules) + `.env` | green |
| Rootless PostgreSQL 17 (lesson-31 restore: 14 empty initdb subdirectories recreated, stale postmaster.pid removed) | up; DDL contract verified (incl. `orders_idempotency_key_unique`, `orders_order_number_unique`, `inventory_product_store_uq`, `reviews_product_idx`); seed 24/8/3/72/5/0/0/6/3, inventory 1379 = the seed formula |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 176/176 |
| `npm run test:e2e` (Playwright, cold production build :3100; chromium-1255 installed this cycle) | 116/116 |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 bug |
| Full-tree audit | two audit agents (deep code + docs-truth); every finding re-verified at line level by me (the lesson-46 discipline); the headline finding additionally proven live (TZ run) or browser-verified (all-ghost DOM) |
| One environment-trap re-hit | an exported shell `DATABASE_URL=file:/home/z/my-project/db/custom.db` (a previous session's SQLite leftover) silently overrode `.env` — gotcha #10, resolved by pinning per command (documented; no repo change) |
| Reference repo | `homenest-store-s`: quiescent after `ff65bd2`; eighth "nothing to port" |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — the unit gate is timezone-coupled: two pins in `tests/unit/utils.test.ts` fail on non-UTC hosts (the project's own locale included)
Evidence (both proven live this run, not speculated):
(a) `tests/unit/utils.test.ts:110-115` — the orderNumber "today's SGT date" pin derives its
expectation with **LOCAL getters** (`sgt.getFullYear()/getMonth()/getDate()` at :113) on the
+8h-shifted instant while the implementation (`src/lib/utils.ts:162-166`) correctly reads
`getUTC*`. Deterministic simulation: on an `Asia/Singapore` host the expectation and the
mint diverge 08:00–15:59 UTC every day (8h/day — the project's own locale); on
`America/New_York` 16:00–20:59 UTC. This is the incomplete-rollout sibling of Task 128 F-4
(the impl switched to `getUTC*`; the now-relative pin kept the old getters).
(b) `tests/unit/utils.test.ts:380-393` — the campaignEnd pins construct instants with
**Z-less date-time strings** (`new Date("2026-12-27T12:00:00")`), which ECMAScript parses
as LOCAL time. PROVEN LIVE: `TZ=America/New_York npx vitest run tests/unit/utils.test.ts`
fails today — `campaignEnd / campaignEndLabel (Task 121 F-19) > returns 28 Dec of the
current year before the campaign ends` goes RED (on UTC−5 the :381 instant is
17:00Z — past the Dec-27-16:00Z campaign end, so `campaignEnd` correctly answers 2027
while the pin demands 2026). The sibling Task-127 pins at :403-421 already use `Z`-suffixed
instants — the pre-127 idiom survived in the pre-127 block.
Why MEDIUM: AGENTS.md states "There is no hosted CI; the local gate is the only gate" — a
false-RED `npm run test` on every Americas host and hours-daily on SG/Asia/EU hosts blocks
remediation and erodes trust in the gate.
Fix (ToDo-1): (a) build the expectation with `getUTC*` on the shifted instant (mirroring the
impl — one line); (b) suffix all 8 Z-less instants at :380-393 with `Z` (matching the
sibling pins' discipline); (c) a NEW structural fs-pin in `tests/unit/utils.test.ts`
(the Z-less-instant recurrence guard): zero `new Date("…T…")` literals without a timezone
designator may exist under `tests/unit/` — after (b) the tree is clean, and the pin holds it
there (the fs-pin precedent: IDEMPOTENCY_KEY_RE, PERSISTED_STORAGE_KEYS). GREEN verification
is three-TZ: the full unit suite must pass under `TZ=UTC`, `TZ=Asia/Singapore` AND
`TZ=America/New_York`. No `TZ` pin in `vitest.config.ts` (deliberate: a pinned TZ would
convert any FUTURE TZ-coupled test into a silent always-pass — the honest gate fails loud
instead; the three-TZ run is the discipline).

### F-2 LOW — the Task-131 fulfilment-seam fs-pin does not bind the decrement: a drift past BOTH pins re-opens the Task-130 phantom-unit class
Evidence: `tests/unit/server-data.test.ts:29-34` — pin 2 asserts only
`SOURCE` matches `/eq\(inventory\.storeSlug, fulfilStore\)/`, which the **lock/availability
query** at `src/lib/server-data.ts:314` satisfies alone; it does not verify the decrement at
`:375` specifically. Pin 1 (:24-27) counts only the exact literal
`input.storeSlug || "tampines"`. So a decrement rewritten to
`eq(inventory.storeSlug, input.storeSlug)` (no default re-derivation) passes BOTH pins while
check (:299/:314, defaults empty to "tampines") and decrement drift apart — the phantom-unit
class Task 130 F-2 closed. Mitigants: unreachable through the HTTP route (storeSlug is
whitelist-strict, never empty) and the historical drift shape (re-pasting the default) IS
caught by pin 1 — hence LOW. But the AGENTS "pinned by structure" wording overclaims: the
current pin is still textual, and only for one drift shape.
Fix (ToDo-2): strengthen pin 2 to bind BOTH sites — `eq(inventory.storeSlug, fulfilStore)`
must occur EXACTLY TWICE in `src/lib/server-data.ts` (the lock at :314 AND the decrement at
:375; verified count = 2 today). RED proof by temporary mutation: rewrite the decrement's
clause to `eq(inventory.storeSlug, input.storeSlug)` → old pin 2 stays green (defect
demonstrated), new pin goes RED → revert → GREEN with both pins.

### F-3 LOW — wishlist all-ghost state renders contradictory copy: "N saved items are no longer available" beside "Nothing saved yet"
Evidence: `src/app/wishlist/page.tsx:52-58` renders the ghost note whenever
`!loading && !error && items.length < wishlist.length` (including `items.length === 0`), and
:65-70 render the empty state whenever `items.length === 0` with no guard on
`wishlist.length`. Browser-verified live this cycle (two ghost slugs persisted): the page
simultaneously renders the true "2 saved items are no longer available." and the false
"Nothing saved yet — Tap the heart on any product to keep it here" under
"Your wishlist (0)". The user HAS saved items (they departed) — the honesty class the
project polices (Task 130 F-8 / Task 131 F-1) missed the all-ghost corner of exactly the
state the F-8 spec family crafts.
Fix (ToDo-3): branch the empty state on `wishlist.length > 0` — the all-ghost case renders
an honest departed-copy panel ("Your saved items are no longer available" + a browse CTA)
instead of "Nothing saved yet". RED: a NEW e2e spec (two ghost slugs seeded, mirroring the
F-8 spec's addInitScript pattern) asserting the ghost note + the all-ghost copy and the
ABSENCE of "Nothing saved yet" — fails today on the contradictory copy. GREEN: the page
branch. e2e 116 → 117.

### F-4 LOW — three write-capable refusal specs share one probe email: a concurrent-RED double-restore window (the residue-net discipline's last theoretical overlap)
Evidence: `tests/e2e/storefront.spec.ts:1100/:1112`, `:1967/:1981`, `:1990/:2005` — three
write-capable refusal specs share `caps-probe@nordhem.sg` under `fullyParallel: true`. GREEN
paths place nothing (no-op nets), but if two ever RED simultaneously (a cap regression),
both `finally` nets can read the same order rows before either deletes → double inventory
restore → a flake cascading into the exact-stock specs. Confined to RED runs; never
observed.
Fix (ToDo-4): make each spec's probe email unique (`caps-lines-probe@…`,
`caps-free-text-probe@…`, `caps-enum-probe@…` — matched at both the POST and the
deleteProbeOrders call in each spec). GREEN-on-arrival (no behavior change; the Task-131 F-3
relocation precedent).

### F-5 INFO — wishlist heading/grid go briefly stale after an on-page heart-toggle (the refetch window)
Evidence: `src/app/wishlist/page.tsx:16-35` — the effect re-runs on every `wishlist` change
but `loading` is only ever set false and `items` is not cleared during the refetch, so the
removed card and the heading's count persist for the fetch-latency window. Cancelled-fetch
guarding is correct (no stale-override race); the window is transient only.
Evaluated and KEPT (register, no fix): the window is fetch-latency-only, cancelled-fetch-
safe, and has NO deterministic RED vehicle (a timing flash cannot be pinned without flaky
assertions) — a derive-don't-refetch refactor would be a behavior-preserving change without
a failing test, which the repo's TDD default rejects (the Task-127 rejected-with-evidence
posture). The F-8 pin family + the new all-ghost pin hold the page's contract.

### F-6 MEDIUM (docs) — DEPLOYMENT.md:31 claims `next.config.ts` "sets a single option — allowedDevOrigins"
Evidence: `docs/DEPLOYMENT.md:30-32` vs the real `next.config.ts` — which sets
`poweredByHeader: false`, a 5-header platform security set (X-Content-Type-Options,
X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS — Task 125 G-1, e2e-pinned)
AND `allowedDevOrigins`. True at the Task-115 rewrite, rotted when Task 125 G-1 landed;
Task 131's DEPLOYMENT truth pass (F-7..F-10) fixed counts/XFF/dotenv/origin but missed this
sentence. CLAUDE.md:260-261 documents the headers correctly — the doc set self-contradicts,
and an operator reconstructing config from §1 would silently drop the security posture.
Fix (ToDo-5): reword §1 to name all three surfaces (security-header set +
`poweredByHeader: false` + `allowedDevOrigins` as the dev-mode-only third).

### F-7 LOW (docs) — PAD era-range headers trail the Task-131 content (the Task-131 F-11 class, one cycle later)
Evidence: `Project_Architecture_Document.md:1570` — "§7.1 … Current State (Tasks 114–130…)"
above a table whose own row cites Task 131 F-7 and a distribution including the Task-131
tenth unit file; `Project_Architecture_Document.md:1297` — "§3.2 … tests/ ← NORDHEM-native
suite (Tasks 114–130…)".
Fix (ToDo-6): both → "Tasks 114–131" (this cycle's lockstep sweep keeps the range truthful
through Task 132's own additions where the sections gain them).

### F-8 LOW (docs) — SKILL preamble cycle enumeration ends at Task 129
Evidence: `home-furnishing-store_SKILL.md:11-24` — the "distilled engineering memory …
after the [cycles]" enumeration stops at the Task-129 cycle while the SKILL is v2.5.0 with
Task-130/131 lessons (49-52) present.
Fix (ToDo-7): append the Task-130 and Task-131 cycle names (part of this cycle's SKILL
v2.6.0 refresh).

### Evaluated and kept (deferrals — documented, unchanged)
- The standing register (TRUST_PROXY XFF posture, CSP, jsdom layer, store-picker wiring,
  unthrottled GETs, journey hardcoded amounts, whole-number magnitude bound, planning-tools
  MIN_DATE, PDP double catalogue read, ensureSeed reviews-only partial-seed window,
  wishlist full-catalogue fetch, ratingValue catalogue fiction, orderNumber-collision
  retry-wiring coverage) — verified present in the docs, unchanged.
- F-5 above (the refetch window) — register note with the no-RED-vehicle rationale.
- The wishlist badge as a saved-entry count BY DESIGN — unchanged (Task 131 F-1 stance).
- `vitest.config.ts` TZ pin — rejected (see F-1 fix rationale).

## 3. Test seams + execution order (TDD — RED observed before every behavior change)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-1 | TZ-pure unit pins | LIVE: `TZ=America/New_York` fails the campaignEnd pin today (observed); the orderNumber pin's window proven by deterministic simulation | `getUTC*` expectation at :113; `Z`-suffix ×8 at :380-393; NEW Z-less-instant fs-pin; three-TZ GREEN verification |
| B | F-2 | fulfilment-seam structural pin | temporary mutation of the decrement clause (old pin stays green = the defect; new pin RED) | pin 2 counts `eq(inventory.storeSlug, fulfilStore)` EXACTLY TWICE (lock + decrement) |
| C | F-3 | wishlist all-ghost copy | NEW e2e spec (two ghost slugs; "Nothing saved yet" must be absent) — fails on the contradictory copy today (browser-verified) | the `wishlist.length > 0` empty-state branch with honest departed-copy |
| D | F-4 | probe-email uniqueness | GREEN-on-arrival (no behavior change) | three unique probe emails, matched POST/net pairs |
| E | F-6 | DEPLOYMENT.md §1 config truth | reading (verified above) | the three-surface reword |
| F | F-7/F-8 | PAD ranges + SKILL preamble | reading | 114–130 → 114–131 ×2; preamble cycle names appended |
| G | lockstep | six operator docs + worklog + session_29 | docs-counts lockstep reds (expected mid-sweep) | AGENTS/CLAUDE/README/PAD/SKILL/DEPLOYMENT counts + Task-132 paragraphs; SKILL v2.6.0 (lesson: the TZ-coupled-test class); worklog Task 132 |

Order: A → B → C → D (code), then the full gate (cold build, lint, typechecks, unit ×3 TZ,
e2e, residue), then E → F → G (docs), then screenshots (75-79), `.env.example`
re-verification, session_29 log, worklog entry, commit + push.

Expected count deltas (fs-verified before the docs sweep): unit 176 → **177** (+1 Z-less
fs-pin); e2e **116 → 117** (+1 all-ghost spec); unit files stay 10.

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint                # 0 errors expected
npm run test                # 177/177 unit (TZ=UTC host)
TZ=Asia/Singapore npm run test       # 177/177 — the three-TZ discipline
TZ=America/New_York npm run test     # 177/177
npm run test:e2e            # 117/117 (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at seed quantities (1379)
```

# Task 135 Remediation Plan — Qty-Writer Clamp Parity, API Cat/Sort Boundary Stance, Envelope-Trust Gate, Docs Truth

Date: 2026-11-20 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (fresh clone → `db57ca8` = Task-134 `250e391` + the session_34 log; npm install green; rootless PostgreSQL 17.12 installed fresh via `docs/setup_pg_z.sh` — 9-table DDL contract verified by direct SQL: 4 named indexes, seed 24/8/3/72/5/0/0/6/3, inventory 1379 = the formula, zero residue) with the mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900 on the dev server via 127.0.0.1 — 8/8 PASS: open (aria-expanded=true, label toggles) / navigate+auto-close / the F-7 param-close regression (re-verified against the DRAWER's own link after a first probe mistakenly clicked the hidden desktop-nav sibling — a test artifact, not a code defect) / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) / hydration (`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item") / no horizontal overflow at 390px — **no Tailwind v4 bug**). Sitemap/SEO re-verified live: 42 indexable URLs no lastmod; robots 7 disallows coherent; og:image 1200×627 on home + PDP + inspiration (`renter-refresh-800`); noindex on the order page + all five utility routes; the 404 surface branded ("went flat") with a 404 status; the security-header set present with no `x-powered-by`. One environment trap handled pre-gate: an exported shell `DATABASE_URL` (a previous session's SQLite leftover) silently overrode `.env` — gotcha #10, unset + pinned per command. Playwright's pinned Chromium (1255) re-installed via `npm run test:e2e:install` after the fresh-clone cache miss (the Task-133 precedent). Reference repo `homenest-store-s` cross-checked: **quiescent — HEAD still `4771c3d`, zero src/tests changes after `ff65bd2`** — the eleventh cycle of "nothing to port". Execution per `skills/tdd` (red → green, one seam at a time; honest-RED by temporary mutation for every GREEN-on-arrival pin). `skills/` excluded from checking/testing/compilation (operator contract).

## 1. Audit baseline (all Verified this run; fresh clone, cold caches)

| Gate | Result |
|---|---|
| Fresh clone → `db57ca8` (Task-134 `250e391` + session_34 log) | clean tree |
| Rootless PostgreSQL 17 (fresh install via `docs/setup_pg_z.sh`) | up; DDL contract verified (`orders_idempotency_key_unique`, `orders_order_number_unique`, `inventory_product_store_uq`, `reviews_product_idx`); seed 24/8/3/72/5/0/0/6/3, inventory 1379 |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 180/180 |
| `npm run test:e2e` (Playwright, cold production build :3100) | 125/125 (after the chromium-1255 install) |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 bug |
| Full-tree audit | two audit agents (deep code + docs-truth); every finding re-verified at line level by me (the lesson-46 discipline) |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — `setLineQty` lacks the floor/NaN/fractional clamp its `addLine` siblings gained (the Task-134 F-4 class, one writer short)
Evidence (line-verified): `src/lib/cart-store.tsx:110-116` —
`qty: Math.min(99, Math.floor(qty))` (no floor/NaN guard). A fractional programmatic
`setQty(id, 0.5)` stores a qty-**0** line (violating the `isValidCartLine` 1–99
contract the load predicate enforces); `setQty(id, NaN)` passes `qty <= 0` as false
and stores `Math.min(99, NaN)` = **NaN** (NaN badge/subtotal until reload, where the
payload then fails the predicate and silently degrades to an empty bag). Task 134
fixed the identical class in `addLine`'s found-branch precisely because "no UI path
passes a negative qty… but hardening" — and the same hole survives in the shipped
`Math.max(1, …)` forms themselves: `Math.max(1, NaN)` is **NaN** and
`Math.max(1, 3.7)` is **3.7** (a fractional qty line). The fs-pin
(`tests/unit/local-store.test.ts:222-230`) asserts only `addLine`'s two branches —
the sibling writer is structurally invisible to the suite. No reachable UI path today
(sole production callers are `cart/page.tsx:114,116` with integer ±1; BuyBox uses
its own input clamp) — the exact hardening-parity class this project polishes.
Fix (ToDo-1): route ALL THREE cart-store qty writers through the shared NaN-safe
`clampInt` seam (`src/lib/utils.ts:101` — `typeof n === "number" && Number.isFinite(n)
? Math.floor(n) : fallback`, already the documented posture at `placeOrder`'s qty
seam and the checkout route): found-branch `qty: clampInt(l.qty + qty, 1, 99, 1)`,
new-line `qty: clampInt(qty, 1, 99, 1)`, `setLineQty`'s map branch
`qty: clampInt(qty, 1, 99, 1)` (the `qty <= 0 → remove` branch keeps its semantic).
Widen the Task-134 fs-pin to assert all three writers carry the `clampInt` form and
the unclamped forms are retired. TRUE RED first (the pin fails on the current
source — `setLineQty` lacks the form, `addLine` carries the literal forms).

### F-2 LOW — `/api/products` GET: unknown `cat`/`sort` silently pass while `?max` is 422-strict (the boundary-stance asymmetry)
Evidence (line-verified): `src/app/api/products/route.ts:16-17,28,39` —
`?cat=zzz` answers `200 {ok:true, data:[]}` (a typo'd category masquerading as a
legitimately empty catalogue); `?sort=zzz` falls through `sortProductList` as an
unsorted 200. The SAME route refuses `?max=abc` with 422 under the comment
"present-but-malformed is a 422, never a silent fallback" (Task 127 F-3) — the
route's own declared stance, applied to one param but not its siblings.
Fix (ToDo-2): validate at the boundary — `cat` against the `CATEGORIES` seed
slugs ∪ `"all"`, `sort` against a NEW exported `SORT_KEYS` seam in `src/lib/utils.ts`
(the six display sorts, beside `sortProductList` — the one-seam discipline; the
shop-inner display list must not drift from the route's whitelist), both refuse
with `422 VALIDATION` and fixed copy (the `?max` precedent). The shop PAGE keeps
its graceful URL-driven posture (degrade, never fail — a page rendering
`/shop?cat=zzz` shows the empty category grid; only the API boundary hardens).
Pins: two e2e probes (unknown cat → 422 envelope, unknown sort → 422 envelope) +
a unit fs-pin that every `v:` value in `shop-inner.tsx`'s SORTS list is a member
of `SORT_KEYS` (the storeName/store-list derivation precedent — a future sort key
added to the display list without the seam update would 422 a legitimately offered
option, the drift class). TRUE RED first (no validation exists today).

### F-5 LOW — wishlist + search treat an `ok:true` envelope WITHOUT `data` as a resolved-empty catalogue (the false-claim path)
Evidence (line-verified): `src/app/wishlist/page.tsx:26-27` —
`if (!cancelled && json.ok) { setItems((json.data ?? []).filter(…)) }` — a
well-formed-status but body-less envelope sets `items = []` while
`wishlist.length > 0`, rendering the FALSE "Your saved items are no longer
available" all-ghost note (the exact false claim the Task-132 F-3 branch was
built to prevent) instead of the error state. The search sibling carries the same
seam: `src/app/search/page.tsx:69` — `json.data ?? []` → a false "0 results for
X" + "No products found" verdict. Unreachable today (`/api/products` always ships
`data` on `ok:true`) — defensive depth at the envelope-trust seam, the same class
as the Task-128 body-shape guards.
Fix (ToDo-3): require `Array.isArray(json.data)` before treating the response as a
resolved catalogue; otherwise the error state (`setError(true)` — the fetch-failure
pair's copy and role=alert already exist on both pages). Two e2e probes mirroring
the Task-119 fetch-failure pair, but fulfilling a 200 `{ok:true}` body with NO
`data` (route.fulfill, not route.abort): the wishlist must render its ERROR state
(never the all-ghost note, never "Nothing saved yet"); search must render its error
box (never "0 results", never "No products found"). GREEN-on-arrival against the
unreachable path is provable only by mutation — honest-RED by temporarily
reverting the `Array.isArray` gate → the probes RED against the mutant.

### F-3 INFO — kept (already-registered deferral): the ensureSeed reviews-only partial-seed window
Evidence: the deep audit's finding (a first-boot crash between the inventory insert
and the review loop leaves the seed reviews permanently partial —
`src/lib/server-data.ts:52-65`, no transaction) is the REGISTERED deferral
"ensureSeed reviews-only partial-seed window" (PAD §10 register; the Task-134
plan's "Evaluated and kept" list). Cosmetic-only (review counts/JSON-LD derive from
live rows — the honesty chain stays coherent). KEPT — no code change; the register
row already carries it.

### F-4 INFO — kept (evaluated this run, register row): the checkout page's render-time wall-clock read for slot options
Evidence: `src/app/checkout/page.tsx:44-46,140` — `availableDeliverySlots(method)`
reads `new Date()` during render; a server render at 13:59:59 SGT hydrating at
14:00:01 SGT produces different option sets (a React 19 hydration
attribute/children mismatch in a seconds-wide daily window, self-healing via
client re-render). The alternative (freezing the options per mount) would create
REAL staleness — the Task-125 F-6 adjust-during-render discipline exists precisely
so a slot held past its cutoff is re-derived live (the display/payload coherence
pin depends on it). The e2e clock pins cover the pre/post-cutoff steady states.
KEPT — the current stance is the documented discipline; the hydration-straddle
window is the accepted trade. Register row extended with the reasoning.

### F-6 INFO — kept (conscious convention): typographic apostrophes in wishlist/search copy
Evidence: `src/app/wishlist/page.tsx:61-62`, `src/app/search/page.tsx:110-111` use
U+2019 (`couldn’t`/`didn’t`) while the order page uses `can&apos;t` (U+0027). The
e2e locators for the curly surfaces deliberately use tolerant regexes
(`/couldn.?t load your wishlist/i` — storefront.spec.ts:443,556) — the convention
is documented in the specs and the Task-134 F-2 fix made the order-page class
explicit. No broken locator exists (verified — the tolerant regexes match both
forms). KEPT.

### Docs findings (D-1..D-5) — the truth layer
- **D-1 MEDIUM** — `CLAUDE.md:150-151` (Testing Strategy, live text) — "count-lockstep
  is enforced across all **five** operator docs" — the pin's scope is SIX
  (`docs-counts.test.ts:16-17`: "AGENTS/README/CLAUDE/SKILL/PAD + DEPLOYMENT.md — the
  six live operator docs"); CLAUDE.md:410-411 itself says six. The exact D-3 class
  fixed in SKILL §11 last cycle, surviving in CLAUDE's live Testing Strategy section.
  Fix: "…in AGENTS/README/CLAUDE/SKILL/PAD/DEPLOYMENT disagrees — count-lockstep is
  enforced across all six operator docs, not remembered."
- **D-2 LOW** — `Project_Architecture_Document.md:1480` (§3.2 tree) —
  "`tests/` ← NORDHEM-native suite (**Tasks 114–133**…)" — one cycle trailing;
  every sibling range reads 114–134. Fix: 114–134.
- **D-3 LOW** — `AGENTS.md:127-128` + `:159-161`, `CLAUDE.md:350-352` — the
  gotoHydrated call-site counts read "38 storefront call sites (40 across both
  files)" while the fs-computed reality is **42 storefront + 2 mobile = 44** (the
  Task-131..134 probes grew it past the Task-129-era count; the surrounding
  "zero bare interaction-first gotos" claim remains true — mechanically
  re-verified). Fix: 42/44 at all three sites.
- **D-4 LOW** — `worklog.md:413` — the Task-134 entry begins at "Agent: run-134
  executor…" — the "Task ID: 134" header line every sibling entry (113–133) carries
  is missing. Fix: insert the header line.
- **D-5 LOW** — the six docs' command tables omit `npm run test:watch`
  (package.json:11 — one of 9 scripts; no phantom scripts exist); AGENTS' Commands
  table and CLAUDE's Build Commands table also lack the `typecheck:tests` and
  `test:e2e:install` rows (documented in every gate block and the other four docs).
  Fix: add the `test:watch` row to AGENTS' Commands table + CLAUDE's Build Commands
  table, plus the two missing rows where absent (README/PAD/SKILL/DEPLOYMENT carry
  the suites already — verified).
- **D-6 INFO — kept**: the "only variable the code reads" phrasing vs
  `process.env.NODE_ENV` in `src/db/index.ts:29` — framework-set, not operator
  config; the Task-134 plan's "Evaluated and kept" already covers it. No action.

### Evaluated and kept (deferrals — documented, unchanged)
- The standing register (TRUST_PROXY XFF posture, CSP, jsdom layer, store-picker
  wiring, unthrottled GETs, journey hardcoded amounts, whole-number magnitude bound
  on `?max=`, planning-tools MIN_DATE, PDP double catalogue read, ensureSeed
  reviews-only partial-seed window (F-3), wishlist full-catalogue fetch,
  ratingValue catalogue fiction, orderNumber-collision retry-wiring coverage,
  wishlist refetch window + shop-strip sibling, the raw malformed-percent URL
  platform-500 class) — verified present in the docs, unchanged; F-4's
  hydration-straddle window joins as this cycle's reasoned register row.

## 3. Test seams + execution order (TDD — RED observed before every behavior change; mutation-honest RED for every GREEN-on-arrival pin)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-1 | cart-store qty-writer parity | WIDEN the Task-134 fs-pin (all three writers must carry the `clampInt` form; the `Math.min(99, Math.floor(qty))` and literal `Math.max` forms retired) — TRUE RED (setLineQty + addLine carry the old forms today) | `clampInt` import + the three `qty: clampInt(…, 1, 99, 1)` forms |
| B | F-2 | API cat/sort boundary | NEW e2e probe pair (`?cat=zzz` / `?sort=zzz` → 422 VALIDATION envelope) — TRUE RED (200 today) + the unit fs-pin (shop-inner's `v:` values ⊆ SORT_KEYS) GREEN-on-arrival | `SORT_KEYS` export in utils.ts; the route's two whitelist gates |
| C | F-5 | envelope-trust gate ×2 pages | NEW e2e probe pair (route.fulfill 200 `{ok:true}` — no `data`): wishlist → error state (never the all-ghost note); search → error box (never "0 results") — GREEN-on-arrival, honest-RED by mutation (the `Array.isArray` gate commented out → the probes RED against the mutant) | `Array.isArray(json.data)` gate on both pages |
| D | D-1..D-5 | docs truth | reading (verified above) | CLAUDE five→six; PAD §3.2 range; AGENTS/CLAUDE gotoHydrated 42/44; worklog Task ID header; test:watch rows |
| E | lockstep | six operator docs + worklog + session_35 | docs-counts lockstep reds (expected mid-sweep) | counts 182/129 + Task-135 paragraphs; SKILL v2.9.0 (lessons 59-60); PAD v1.20.0 |

Order: A → B → C (code + probes), then the full gate (cold build, lint,
typechecks, unit ×3 TZ, e2e, residue), then D → E (docs), then screenshots
(90–94), `.env.example` re-verification, session_35 log, worklog entry, commit + push.

Expected count deltas (fs-verified before the docs sweep): unit 180 → **182** (+1 the
three-writer clampInt fs-pin; +1 the SORT_KEYS shop-inner derivation pin); e2e
**125 → 129** (+2 cat/sort 422 probes, +2 envelope-trust probes); unit files stay
10; e2e specs stay 2.

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint                # 0 errors expected
npm run test                # 182/182 unit (TZ=UTC host)
TZ=Asia/Singapore npm run test       # 182/182 — the three-TZ discipline
TZ=America/New_York npm run test     # 182/182
npm run test:e2e            # 129/129 (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at seed quantities (1379)
```

## 5. Post-execution addendum (what the execution itself discovered — recorded for the audit trail)

- **The unit delta landed one test richer than planned**: 180 → **183** (not
  182). The Task-134 fs-pin was REPLACED by the widened three-writer pin
  (1 test → 2 tests: the seam-routing assertions + the retired-forms
  assertions) plus the 2 SORT_KEYS pins = +3, not +2. The plan's estimate
  double-counted the retired Task-134 pin as staying; the fs-computed
  reality (183/129, confirmed via the docs-counts pin's own failure output
  before the sweep) is authoritative.
- **The plan's Slice-C probes were TRUE RED, not GREEN-on-arrival**: the
  plan classed the envelope-trust probes as GREEN-on-arrival (the input
  being "unreachable today" via the real API). The probes intercept the
  response with `route.fulfill` — the browser-reachable input — so both
  probes genuinely failed against the pre-fix pages (observed RED: no
  error state rendered; the wishlist showed the all-ghost note, search the
  false verdict). The honest-RED-by-mutation step was therefore not
  needed — the discipline was satisfied by the true RED.
- **The SORT_KEYS fs-pin was mutation-proven after all** (the drift class):
  a scratch `v: "bogus-mutation"` row appended to shop-inner's SORTS failed
  the pin by name (`the shop offers bogus-mutation — the seam must admit
  it`), then the revert restored GREEN (76/76 in file).
- **Gate outcome**: cold build green · typechecks + lint clean · unit
  **183/183** (docs-counts lockstep restored after the six-doc sweep; the
  mid-sweep showed the expected 17 reds, identical under UTC /
  Asia/Singapore / America/New_York — the three-TZ discipline) · e2e
  **129/129** against the cold production build · zero DB residue (direct
  SQL: orders 0, order_items 0, reviews 5, inventory 72 rows at 1379).

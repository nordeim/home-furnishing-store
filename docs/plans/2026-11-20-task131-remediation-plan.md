# Task 131 Remediation Plan — Wishlist Count Parity, Fulfilment-Seam Structural Pin, orderNumber Crypto Suffix, DEPLOYMENT.md Truth

Date: 2026-11-20 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
on the dev server via 127.0.0.1 — 8/8 PASS: open (aria-expanded=true, label toggles) /
navigate+auto-close / param-close regression (F-7 class) / Escape / toggle / hamburger
hidden-≥1024 (display:none, 0×0 rect) / hydration (`data-hydrated=true` + add-to-bag → badge
"Shopping bag, 1 item") / no horizontal overflow at 390px — **no Tailwind v4 bug**; sitemap
42 indexable URLs, no lastmod; robots coherent (7 disallows); og:image 1200×627
live-verified on home + PDP + inspiration; the 404 surface live-verified branded + hydrated),
execution per `skills/tdd` (red → green, one seam at a time). `skills/` excluded from
checking/testing/compilation (operator contract). Reference repo `homenest-store-s`
cross-checked: **quiescent in absolute terms — HEAD still `4771c3d` (2026-11-01, skills-only;
fetch returned nothing new), zero src/tests changes AFTER `ff65bd2`** (2026-10-23 03:39 UTC,
session-69/run-70). The Task-126..130 "nothing to port" conclusion survives re-verification,
but the prior cycles' "zero src/tests changes **since 2026-10-23**" wording was
boundary-imprecise (the filter's inclusive edge hides `ff65bd2` itself); its contents were
evaluated this cycle: the not-found CSP-nonce fix is NOT applicable (NORDHEM ships no CSP —
documented deferral; the 404 route is a pure static server component, works and is pinned),
the stripe docstring fix is Prisma-specific, nothing else post-dates it. Seventh cycle of
"nothing to port", now stated precisely.

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 survived the sandbox
recycle RUNNING — no lesson-31 restore needed this cycle, the first time since the class
appeared; DDL contract verified by direct SQL: `orders_idempotency_key_unique` +
`orders_order_number_unique` + `reviews_product_idx` + `inventory_product_store_uq`, no
redundant `products_slug_idx`; seed intact at 24/8/3/72/5/0/0/3/6, inventory total 1379 =
the seed-formula expectation, zero per-row drift)

| Gate | Result |
|---|---|
| `git pull` → `9e6ccc3` (docs-only delta since pushed Task-130 `3bd3c2f`: the session_26 log) | clean tree |
| `npm install` (node_modules present from the prior session) | green |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 169/169 |
| `npm run test:e2e` (Playwright, cold production build :3100; chromium-1255 present — both cached builds) | 116/116 |
| DB contract | 9 tables; **zero residue at baseline AND after the full 116-test e2e run** (direct SQL: 0 orders, 0 order_items, 5 seed reviews, 24 products, 72 inventory rows, total 1379 = seed expectation) |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | 8/8 PASS — **no Tailwind v4 bug** (conditional mount, scan guard intact, `lg:` breakpoint renders) |
| Sitemap/SEO | 42 indexable URLs, no lastmod; robots 7 disallows; og:image 1200×627 on home + PDP + inspiration; 404 route branded + working |
| Full-tree audit | two audit agents (deep code audit + docs-truth/reference); every finding re-verified by me at line level (the lesson-46 discipline); the headline code finding additionally browser-verified live pre-fix |
| Reference repo | `homenest-store-s`: quiescent after `ff65bd2` (boundary-day commit evaluated, not applicable); skills-catalog md5s MATCH |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — wishlist count split-brain: the Header badge still counts persisted slugs while the Task-130 F-8 heading counts resolved items
Evidence: `src/components/Header.tsx:138-141` renders the badge from `wishlist.length` (the
persisted store — "Wishlist, 2 items" + a visible "2") while `src/app/wishlist/page.tsx:45`
renders `Your wishlist ({loading || error ? wishlist.length : items.length})`. Browser-
verified live this cycle: with `nordhem_wish_v1 = ["havbris-lounge-chair","ghost-…"]`
persisted, the page renders the honest heading "(1)" over ONE card while the same viewport's
header badge says "Wishlist, 2 items" — the exact "(2) above one card" contradiction class
Task-130 F-8 called dishonest, one component over. The F-8 fix landed one count site of two
(the same incomplete-rollout shape as Task-129's Footer chips F-6).
Design decision (badge semantics): the Header CANNOT resolve slugs — resolution needs the
`/api/products` fetch the wishlist page performs; putting a catalogue fetch in the shared
layout header (every route) for a corner-case count is the wrong trade, and a cross-page
resolved-count store would make the badge flip 2→1→2 across navigation (worse than the
defect). The badge therefore stays the persisted SAVED-entry count BY DESIGN — but the page
must explain the difference instead of silently contradicting the badge (the honest-
explicit-state pattern).
Fix (ToDo-1): a muted note under the wishlist heading when resolution has settled and
`items.length < wishlist.length`: "N saved item(s) is/are no longer available" (the
departed-slug difference, pluralised). Extend the Task-130 F-8 e2e pin
(`storefront.spec.ts:407-425`): assert the badge label ("Wishlist, 2 items") AND the note
beside the existing heading/card assertions; comment the badge semantics at the Header site;
document the stance in the PAD register (badge = saved entries by design, page = resolved
truth + the difference note).

### F-2 LOW — placeOrder's decrement re-derives the fulfilment store instead of using the `fulfilStore` seam: Task-130 F-2's check/decrement coherence rests on textual duplication
Evidence: `src/lib/server-data.ts:291` defines `const fulfilStore = input.storeSlug ||
"tampines"` (consumed by the Task-130 F-2 lock/availability query at `:305-308`) but the
decrement at `:362` re-derives `input.storeSlug || "tampines"` verbatim instead of reading
`fulfilStore`. The coherence guarantee (check reads exactly the rows the decrement writes)
currently holds only because the two expressions are textually identical — a one-site edit
to either silently reintroduces the phantom-unit bug F-2 just closed (the exact drift class
this repo's audits keep finding; F-1 of Task 130 itself was "the rule applied one field
short").
Fix (ToDo-2): one-token change — `eq(inventory.storeSlug, fulfilStore)` in the decrement
(behavior identical; the helper closes over `fulfilStore`). Structural fs-pin in the
established style (the IDEMPOTENCY_KEY_RE / PERSISTED_STORAGE_KEYS producer-pin precedent):
a new `tests/unit/server-data.test.ts` (fs-based, no DB) asserting `input.storeSlug ||
"tampines"` occurs EXACTLY ONCE in `src/lib/server-data.ts` (the `fulfilStore` definition —
re-derivation inside the transaction re-opens the phantom-unit class) and that the
decrement's where-clause reads the `fulfilStore` identifier. RED: the current file carries
two occurrences. Unit files 9 → 10 (AGENTS' file-count claim updates in lockstep).

### F-3 LOW — e2e residue window: the Task-119 oversell spec and the 500-class spec both touch katong-bedside-table under `fullyParallel`; the "quiet product" comment is stale
Evidence: `tests/e2e/storefront.spec.ts:756-769` (the Task-119 oversell spec) snapshots
katong-bedside-table with the comment "katong-bedside-table: quiet, no other spec touches
it" — false since the Task-126-era 500-class spec at `:1035-1037` zeroes the SAME product's
rows for its POST window (katong carries 10 references across the two spec files). The
residue path: if the oversell spec's snapshot read (orig) lands inside the 500-class spec's
zero window and its `finally` runs after the 500-class spec's restore, the zeroed rows are
re-written as the "original" state — the shared-DB-state overlap class Task-130 F-3
eliminated for havbris (never observed — "zero residue" held across runs — hence LOW).
Fix (ToDo-3): relocate the Task-119 oversell spec's product to `wokhey-cookware-5pc` (zero
references in either spec file — grep-verified this run; per-store stock far below the
99-qty probe) and fix the stale comment. GREEN-on-arrival (the relocation IS the fix — the
Task-130 F-3 precedent; the spec's assertions are product-agnostic LOW_STOCK checks).

### F-4 LOW — orderNumber's suffix mints from Math.random: state-recoverable, occasionally short, and inconsistent with the crypto posture of its sibling seam
Evidence: `src/lib/utils.ts:166` — `Math.random().toString(36).slice(2, 8).toUpperCase()`
while `mintIdempotencyKey()` (Task 127 F-6) consumes `crypto.getRandomValues` bytes with
Math.random only as the both-primitives-absent last resort. The order number is half of the
PII lookup pair on `/track-order`; V8's xorshift128+ `Math.random` is state-recoverable
from observed outputs, so the "~2^31 entropy" comments (`server-data.ts:386`, the Task-130
plan F-4) hold only against a naive adversary. A second, mechanical defect: a mantissa with
trailing zero bits yields FEWER than 6 slice chars (`Math.random()` returning exactly 0.5 →
`(0.5).toString(36)` = `"0.i"` → slice = `"I"` — a 1-char suffix, ~2⁻²⁶ of mints), shrinking
the space and the format both.
Fix (ToDo-4): mint the suffix from `crypto.getRandomValues` bytes (6 bytes → base36 →
exactly 6 chars, 48 bits) with the Math.random path as the both-absent last resort (now
`padStart`ed to exactly 6) — mirroring `mintIdempotencyKey`'s structure. Unit pins (3):
(a) the crypto path derives the suffix from stubbed bytes (independent expected value
computed from the stub) — charset + length; (b) the fallback path with both primitives
stubbed absent + `Math.random` pinned to exactly 0.5 still mints EXACTLY 6 chars (RED on
the current code: `"I"`); (c) the crypto path never reads `Math.random` (spy throws →
still green — the priority order pinned).

### F-5 INFO→fixed — placeOrder's inline qty clamp is NaN-unsafe while the shared `clampInt` seam (the seam its own comment cites) is not
Evidence: `src/lib/server-data.ts:241` — `qty: Math.min(99, Math.max(1, Math.floor(l.qty)))`:
`Math.floor(NaN)` is NaN and rides the chain into the integer column (a 500 on a
write-path). Unreachable today (the route's finite-type filter at `checkout/route.ts:95` is
the only caller's gate) — the Task-130 F-7 "defensive parity at the seam" class.
Fix (ToDo-5): swap to `clampInt(l.qty, 1, 99, 1)` (identical for every finite input —
floor-then-clamp; NaN/Infinity → the fallback 1). The seam itself is already unit-pinned ×N
(`utils.test.ts` clampInt block); no new pin — the swap is behavior-identical on all
reachable inputs.

### F-6 INFO→fixed — ensureSeed's "Safe for concurrent first requests" comment overclaims (per-process only)
Evidence: `src/lib/server-data.ts:12-16` — the single-flight is the module-level
`seedPromise`; two PROCESSES racing a cold start could duplicate the `firstTime` reviews
insert (no unique constraint on reviews). Single-process `next start` makes this
theoretical, but the comment asserts more than the code guarantees.
Fix (ToDo-6): qualify the comment ("safe for concurrent first requests **within the
process**"; multi-process cold starts are the documented single-node posture). Comment
only.

### F-7 MEDIUM (docs) — DEPLOYMENT.md's gate chain rotted to 79/79 + 34/34 (reality 169/116) — outside the docs-counts pin's scope
Evidence: `docs/DEPLOYMENT.md:328-329` — `npm run test # 79/79 unit` / `npm run test:e2e #
34/34 e2e` against the fs-computed 169/116; the revision stamp at `:5` still reads
"This revision (2026-11-18, Task 115)". The pin (`tests/unit/docs-counts.test.ts:19`)
covers only "AGENTS/README/CLAUDE/SKILL/PAD" — DEPLOYMENT.md rotted unchecked through five
count bumps. An operator following §10 "run it before every deploy" would expect the wrong
totals; `:9`'s "Every claim below is verified against the remediated tree" is falsified by
it.
Fix (ToDo-7): update the gate chain to the live counts (which this cycle's changes move to
175/175 + 116/116) + refresh the revision stamp to Task 131; **extend the docs-counts pin
to DEPLOYMENT.md** (two new literal tests: the gate-chain unit fraction and the e2e
fraction) so the D-1 class cannot recur — scope comment updated to the six live operator
docs. Unit 169 → 175 (+6 total; these are +2).

### F-8 MEDIUM (docs) — DEPLOYMENT.md's reverse-proxy guidance keys the limiter on the WRONG XFF hop (twice)
Evidence: `docs/DEPLOYMENT.md:290-293` (§8) — "The checkout limiter keys on the **first
entry** of `X-Forwarded-For` … run exactly one trusted proxy hop" and `:365` (§11's 429
row) — "(first `X-Forwarded-For` hop)". The shipped seam since Task 125 G-2
(`src/lib/rate-limit.ts:26-32`) keys on the **rightmost** hop with a `"direct"` fallback —
the client-forgeable form is the LEFTMOST hop. These two sites teach an operator the exact
misconfiguration the fix removed (the PAD §6.1 twins of the same claim were fixed in Task
130 F-12; the DEPLOYMENT.md twins were outside that sweep's scope).
Fix (ToDo-8): rewrite both sites to the shipped semantics (rightmost hop + "direct"
fallback, mirroring PAD §6.1's wording).

### F-9 LOW (docs) — DEPLOYMENT.md still attributes env precedence to `dotenv` (removed Task 126)
Evidence: `docs/DEPLOYMENT.md:69-70` — "(dotenv never overrides existing environment
variables)"; the package was removed in Task 126 and five operator-doc sites were swept to
"Next's own env loader" in Task 127 — DEPLOYMENT.md was not in that sweep's scope.
Fix (ToDo-9): reword to the five-doc form ("Next's own env loader never overrides an
existing env").

### F-10 LOW (docs) — DEPLOYMENT.md claims the canonical origin is hardcoded in layout/robots/sitemap (the pre-Task-125 posture)
Evidence: `docs/DEPLOYMENT.md:63-64` — "the canonical origin `https://nordhem.sg` is
hardcoded in `src/app/layout.tsx`, `robots.ts` and `sitemap.ts`"; since Task 125 G-4 the
origin is single-sourced as `SITE_ORIGIN` (`src/lib/utils.ts:10`) and COMPOSED at every
site (no raw literal in `src/app` — fs-pinned by `robots-sitemap.test.ts`).
Fix (ToDo-10): reword to the SITE_ORIGIN seam.

### F-11 LOW (docs) — era-range headers in AGENTS/CLAUDE went stale when Task 130 appended content without bumping them
Evidence: `AGENTS.md:29` — "extended in Tasks 117–129" above a pin list that runs through
Task 130 (`:186-211`); `CLAUDE.md:138` — "Current state (Tasks 114–129, extended this
cycle)" above the Task-130 seams paragraph (`:374-393`); `AGENTS.md:126-127` — "The
storefront spec's 21 interaction-first blocks now navigate through `gotoHydrated`" (the
Task-127 milestone count; the same doc carries "38 gotoHydrated call sites" at `:159-161`).
Fix (ToDo-11): bump the ranges through Task 131 as part of this cycle's lockstep sweep
(both docs gain Task-131 content anyway); rephrase the 21-blocks sentence to the milestone
form ("Task 127's 21 blocks — 38 storefront call sites now").

### F-12 LOW (docs, adopted candidate) — the Task-130-recorded AGENTS.md structure adoption: a pin map
Evidence: the Task-130 plan/worklog recorded "AGENTS-structure adoption candidates
(dedicated process-discipline section, header-level pin pointers)" as adopted-next-cycle.
This is that cycle.
Fix (ToDo-12): a compact "Pin map" block in AGENTS.md (≤12 lines) mapping each
documentation/contract claim to its enforcing test file (docs-counts → the six-doc count
claims; env-example → the single-variable contract + compose + allowedDevOrigins;
scan-guard → the `@source not` guard; robots-sitemap → SEO policy + SITE_ORIGIN;
tailwind-scan-guard → the guard's presence; local-store → PERSISTED_STORAGE_KEYS producers;
server-data → the fulfilment-seam structural pin; utils → the pure seams incl.
isUniqueViolationOn + the crypto-suffix). Header-level pointers, no restructure.

### F-13 INFO (register, docs) — precision notes for the record
- The reference-repo boundary wording (R-1): this cycle's worklog/session entries state
  "no src/tests changes AFTER `ff65bd2` (2026-10-23 03:39 UTC); the ten subsequent commits
  through `4771c3d` are session-logs/docs/skills only" — the precise form.
- I-2 (orderNumber-collision retry wiring has no automated coverage through the public
  interface — the mint is random; a real collision cannot be forced): PAD register row.
- I-5 (the EMPTY_BAG early-exit precedes the enum guards — both 4xx; the e2e probes all
  carry lines): PAD register note, no change.
- R-2's optional 404-branded-heading pin: not adopted (no known failure class; the 404
  status + content are live-verified this cycle).

### Evaluated and kept (deferrals — documented, unchanged)
- The standing register (TRUST_PROXY XFF posture, CSP, jsdom layer, store-picker wiring,
  unthrottled GETs, journey hardcoded amounts, whole-number magnitude bound, planning-tools
  MIN_DATE, PDP double catalogue read, ensureSeed reviews-only partial-seed window,
  wishlist full-catalogue fetch, ratingValue catalogue fiction) — verified present in the
  docs, unchanged.
- The wishlist badge as a saved-entry count BY DESIGN (F-1's decision above) — documented +
  pinned rather than "fixed" (cross-page resolution inconsistency would be worse).
- `fullyParallel: true` itself: kept (the two known shared-product overlaps are both
  eliminated after F-3 — pandan-rug-200 for saturation, wokhey for the oversell probe).
- I-4's per-process seed comment and I-5's classification order: qualified/noted, not
  restructured.

## 3. Test seams + execution order (TDD — RED observed before every behavior change)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-4 | orderNumber suffix mint | unit pins (b)/(c): 0.5-stub → 1-char suffix "I"; spy-throw priority | `getRandomValues` bytes → base36 ×6, padStarted Math.random last resort |
| B | F-2 | placeOrder decrement seam | NEW fs-pin (2 occurrences of the re-derivation today) | `eq(inventory.storeSlug, fulfilStore)` — one token |
| C | F-3 | oversell spec product | relocation (GREEN-on-arrival) | katong → wokhey-cookware-5pc + comment fix |
| D | F-1 | wishlist page note | extended F-8 pin (note absent today) | the difference note + badge assertion + Header comment |
| E | F-5/F-6 | clampInt swap + seed comment | behavior-identical (gates stay green; clampInt already pinned) | `clampInt(l.qty, 1, 99, 1)`; comment qualified |
| F | F-7 | docs-counts pin scope | pin extension (RED: DEPLOYMENT claims 79/34) | DEPLOYMENT gate chain 175/175 + 116/116 + revision stamp |
| G | F-8/F-9/F-10 | DEPLOYMENT.md truth | (docs — verified by reading; F-7's pin holds the counts) | XFF rightmost-hop reword ×2; dotenv → Next loader; SITE_ORIGIN seam |
| H | F-11/F-12/F-13 + lockstep | five operator docs + DEPLOYMENT.md + worklog + session_27 | docs-counts lockstep reds (expected mid-sweep) | AGENTS (117–131, pin map, counts, file count 10), CLAUDE (114–131, seams paragraph), README (counts + cycle paragraph), PAD v1.16.0 (revision block, register rows, badge-stance row), SKILL v2.5.0 (frontmatter, Appendix B, lessons 51–52) |

Order: A → B → C → D → E (code), then the full gate (cold build, lint, typechecks, unit,
e2e, residue), then F → G → H (docs), then screenshots, `.env.example` re-verification,
session_27 log, worklog entry, commit + push.

Expected count deltas (fs-verified before the docs sweep): unit 169 → **175** (+3 crypto
suffix, +1 fs-pin in a NEW 10th file, +2 DEPLOYMENT pin extension); e2e **116 unchanged**
(the F-1 pin extends an existing spec's assertions; the F-3 relocation adds none); unit
files 9 → 10 (AGENTS' file-count claim updates in lockstep).

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint          # 0 errors expected
npm run test          # 175/175 unit (fs-verified)
npm run test:e2e      # 116/116 e2e (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at seed quantities (1379)
```

# Task 134 Remediation Plan — Cart-Duplicate E2E Parity, Order-URL Decode Pin, Stepper Ceiling State, addLine Floor Clamp, TZ-Pin Widening, Docs Gate Truth

Date: 2026-11-20 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (git pull → `246bf8c` — HEAD = Task-133 `601e7f3` + the session_32 log; node_modules/.env intact; the rootless PostgreSQL 17.12 data dir survived the recycle RUNNING — no lesson-31 restore needed, the DDL contract AND seed quantities verified by direct SQL before any gate: 9 tables, 24/8/3/72/5/0/0/6/3, inventory 1379 = the formula, 4 indexes, zero residue) with the mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900 on the dev server via 127.0.0.1 — 8/8 PASS: open (aria-expanded=true, label toggles) / navigate+auto-close / param-close regression (F-7 class) / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) / hydration (`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item") / no horizontal overflow at 390px — **no Tailwind v4 bug**), execution per `skills/tdd` (red → green, one seam at a time; honest-RED by temporary mutation for every GREEN-on-arrival pin). `skills/` excluded from checking/testing/compilation (operator contract). One environment trap handled pre-gate: an exported shell `DATABASE_URL` (a previous session's SQLite leftover) silently overrode `.env` — gotcha #10, unset + pinned per command. Reference repo `homenest-store-s` cross-checked: **quiescent — HEAD still `4771c3d`, zero src/tests changes after `ff65bd2`** — the tenth cycle of "nothing to port". Sitemap/SEO re-verified live: 42 indexable URLs no lastmod; robots 7 disallows coherent; og:image 1200×627 on home + PDP + inspiration (`renter-refresh-800`); noindex on the order page + all five utility routes; the 404 surface branded ("went flat") with a 404 status.

## 1. Audit baseline (all Verified this run; workspace refresh, cold caches)

| Gate | Result |
|---|---|
| `git pull` → `246bf8c` (Task-133 `601e7f3` + session_32 log; docs-only delta) | clean tree |
| Rootless PostgreSQL 17 (survived RUNNING; no restore needed) | up; DDL contract verified (`orders_idempotency_key_unique`, `orders_order_number_unique`, `inventory_product_store_uq`, `reviews_product_idx`); seed 24/8/3/72/5/0/0/6/3, inventory 1379 |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 179/179 |
| `npm run test:e2e` (Playwright, cold production build :3100) | 120/120 |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 bug |
| Full-tree audit | two audit agents (deep code + docs-truth); every finding re-verified at line level by me (the lesson-46 discipline) |
| Reference repo | `homenest-store-s`: quiescent after `ff65bd2`; tenth "nothing to port" |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — the cart duplicate-payload seam ships unit-only coverage while its wishlist sibling got the e2e probe (the coverage-symmetry gap of the Task-133 F-3 rollout)
Evidence (line-verified): `src/lib/cart-store.tsx:64-72` — both predicates carry the
Task-133 uniqueness layer (Set-size equality; cart keyed on productId). The wishlist half
is pinned at BOTH tiers: unit (`tests/unit/local-store.test.ts` — the F-3 pins) AND e2e
(`tests/e2e/storefront.spec.ts:506-524` — "a DUPLICATE persisted slug degrades to the
honest empty state"). The cart half has the unit pin only
(`local-store.test.ts` — `isValidCartPayload([validLine, validLine]) === false`); the only
`nordhem_cart_v1` seeding site in the e2e tree (`storefront.spec.ts:2028`) writes a single
VALID line (the unknown-promo spec) — no probe of a duplicated cart payload exists. The
cart was the more severe consequence of the two (duplicate `key={productId}` React keys +
a doubled subtotal display — the cart-store comment's own words) yet carries the weaker
tier. The Task-133 commit message says "unit-pinned + e2e-probed" — true for the wishlist
half only.
Fix (ToDo-1): a NEW e2e spec mirroring the 506-524 sibling — `addInitScript` seeding
`nordhem_cart_v1` with `[validLine, validLine]` (the solbakken shape the 2028 site
already uses, qty 1) → `gotoHydrated("/cart")` → assert the degraded honest state:
"Your bag is empty" heading (`cart/page.tsx:85`), zero article/li cards, and NO doubled
subtotal (the pre-fix page would render "Your bag (2)" with two identical lines). Honest
RED by mutation: comment out the Set check in `isValidCartPayload` → the probe must
fail against the mutant → restore (the Task-133 F-2 mutation discipline; the predicate
change is already shipped, so the pin is GREEN-on-arrival against the real tree).

### F-2 LOW — the `/order/[number]` malformed-percent-encoding corner (URIError) is unpinned — and Task 133 rewrote exactly that line
Evidence: `src/app/order/[number]/page.tsx:34` — `const decoded = decodeURIComponent(number)
.trim().toUpperCase();` — the Task-133 F-5 normalization. The decode sits INSIDE the try
(lines 25-43) with `if (!(err instanceof URIError)) outage = true;` at :38-42 — the
Task-120 F-14/Task-118 F-15 guard: `/order/%ZZ` (malformed percent-encoding) throws
URIError → the friendly not-found state ("We can't find that order"), never the error
boundary. Correct in code — but `rg "URIError|%ZZ|%E0|decodeURI" tests/` returns ZERO
matches: the decode-throw corner has no pin anywhere, and the Task-133 rewrite of this
exact line was pinned only for the case corner (the lowercase-URL probe at
`storefront.spec.ts:1065-1100`). A future refactor that hoists the decode above the try
500s the confirmation page on crafted URLs with every gate green.
Fix (ToDo-2): a one-line e2e probe beside its case sibling — `page.goto("/order/%ZZ")` →
assert the "We can't find that order" heading renders and the response is NOT a 5xx.
Honest RED by mutation: temporarily hoist the decode above the try block → the probe
must observe the 500 → restore byte-identical.

### F-3 LOW — the "+" steppers are enabled-but-inert at their ceilings while every "−" is disabled-and-pinned at its floor (the asymmetric control-state class)
Evidence: `src/app/cart/page.tsx:115` — the cart `+` (`setQty(l.productId, l.qty + 1)`)
carries no `disabled`, silently clamped by `cart-store.tsx` `Math.min(99, …)`; the sibling
`−` at :114 is `disabled={l.qty <= 1}`. `src/components/BuyBox.tsx:41` — the PDP `+`
(`Math.min(99, q + 1)`, no `disabled`) against the `−` at :40 (`disabled={qty <= 1}`).
`src/app/business/page.tsx:42` — the quote `+` (`Math.min(200, …)`, no `disabled`)
against the `−` at :41 (`disabled={… === 0}`). The floor discipline is e2e-pinned at all
three sites (the Task-120 F-15 cart spec at `storefront.spec.ts:752-764`, the Task-121
F-11 PDP spec at `:1856-1868`, the Task-122 F-15 business spec at `:2544-2555`); the
ceiling has neither the attribute nor a pin — an enabled control that silently no-ops
(the interactive-dead-end class).
Fix (ToDo-3): mirror the floor — `disabled={l.qty >= 99}` (cart), `disabled={qty >= 99}`
(BuyBox), `disabled={(qty[u.id] ?? 0) >= 200}` (business) + three ceiling pins:
(a) cart — `addInitScript` seeds a qty-99 solbakken line (the `isValidCartLine` contract
admits 1-99, `cart-store.tsx:47`), assert `+` disabled and the badge reads "Shopping bag,
99 items" (payload integrity at the ceiling); (b) PDP — fill the qty input with 99 (the
input's own onChange clamps, `BuyBox.tsx:40`), assert `+` disabled; (c) business — drive
the Staff locker tower to 200 (198 `+` clicks from its default 2), assert `+` disabled.
TRUE RED (the attributes don't exist today — all three pins fail first), then the
one-attribute-per-site GREEN.

### F-4 INFO — `addLine`'s found-branch lacks the floor clamp its new-line branch carries
Evidence: `src/lib/cart-store.tsx:102` — `qty: Math.min(99, l.qty + qty)` (found) vs
`:106` — `qty: Math.min(99, Math.max(1, qty))` (new). A programmatic `add(line, -5)` on
an existing line stores a negative qty (in-memory negative badge/subtotal until reload,
where `isValidCartLine` degrades the payload). No UI path passes a negative qty
(BuyBox/ProductCard pass ≥ 1) — console-only self-harm; hardening.
Fix (ToDo-4): `Math.min(99, Math.max(1, l.qty + qty))` + an fs-pin in
`tests/unit/local-store.test.ts` asserting the cart-store source carries BOTH clamped
forms (the `server-data.test.ts` fulfilment-seam fs-pin precedent — `addLine` is a
module-internal function, not an exportable pure seam). RED first (the source lacks the
clamped form today), then the one-token GREEN.

### F-5 INFO — the `MAX_INT4` comment overstates its rollout by one verb (docs-truth inside code)
Evidence: `src/lib/utils.ts:39` — "One shared bound; every id-taking verb refuses above
it with 422." Reality: the reviews boundary refuses (both verbs, `reviews/route.ts:28,79`)
but `/api/checkout`'s `lines[].productId` DROPS an out-of-range id via the catalogue
`byId.get` (`server-data.ts:242-250`, unknown products dropped → EMPTY_BAG when alone) —
the documented stance, verified safe (no int4 comparison is ever reached), but a
different answer to the same fault class. The comment teaches the wrong totalization.
Fix (ToDo-5): amend the comment to name the exception ("checkout's lines drop unknown
ids via the catalogue before any DB touch — the drop, not a 422, is that boundary's
documented answer"). No behavior change.

### F-6 INFO — the TZ-pure fs-pin's quote-class and fractional-seconds blind spots (the Task-132/133 pin-hardening class, one notch further)
Evidence: `tests/unit/utils.test.ts:673` — the zless regex
`/new Date\("[^"\n]*T\d{2}:\d{2}:\d{2}(?![Zz]|[+-]\d{2}:?\d{2})[^"\n]*"\)/g` matches
only DOUBLE-quoted literals: a single-quoted/backtick Z-less date-time literal escapes
entirely (verified by regex execution — zero current violations, but nothing enforces
the double-quote style). And the lookahead fires BEFORE a fractional-seconds component:
a legitimate Z-suffixed `new Date("2026-01-01T00:00:00.500Z")` FALSE-POSITIVES (the char
after seconds is `.`) — again zero current occurrences (verified), but the pin would
wrongly fail the first future fractional-seconds literal.
Fix (ToDo-6): widen once — quote class `["'\`]` and `(?:\.\d+)?` before the lookahead.
GREEN-on-arrival + mutation-proven (a scratch single-quoted Z-less literal and a scratch
`.500Z` literal must respectively fail and pass the pin; both removed after the demo).
Self-match safety: the pattern source's own text has `new Date\(` followed by `[`/`/` —
not a quote — so the regex cannot match its own source (the existing escaped-paren
discipline).

### Docs findings (D-1..D-4) — the truth layer
- **D-1 MEDIUM** — `README.md:638` (Contributing) — "Gate before every push: cold build +
  typecheck + lint" — omits `typecheck:tests` AND both test suites. The other five live
  docs all carry both typecheck scopes (AGENTS:424, CLAUDE:79/131/272, PAD §7.4:1728,
  SKILL §3:102 + §11:396, DEPLOYMENT §10:334). Downstream, this falsifies the Task-133
  "the 5-of-6 outlier closed" claim — README was, and remains, the sixth doc without it.
  Fix: "cold build + typecheck + typecheck:tests + lint + unit + e2e; never weaken a
  rule to pass one."
- **D-2 LOW** — `README.md:259` — the Task-133 cycle paragraph says "baseline gates green
  at 177/116" — the baseline was 177/**117** (worklog Task 133: "117/117 e2e cold";
  README's own Task-132 block: "Suite grew to 177 unit + 117 e2e"). Fix: 177/117.
- **D-3 LOW** — `home-furnishing-store_SKILL.md:403` (§11 Pre-Ship) — the docs-lockstep
  list names five docs + worklog; the live operator set is SIX (docs/DEPLOYMENT.md
  joined in Task 131 and is pin-enforced). An agent following only §11 can fail the run
  on DEPLOYMENT.md. Fix: add `docs/DEPLOYMENT.md` to the list.
- **D-4 INFO** — `AGENTS.md:25` + `PAD §7.1` (line 1697) — both unit-suite enumerations
  name 9 of the 10 unit files (omitting `tests/unit/server-data.test.ts`, the
  fulfilment-seam fs-pin; AGENTS' Pin map and PAD §11 DO name it). Fix: add the
  server-data fs-pin to both summaries.

### Evaluated and kept (deferrals — documented, unchanged)
- `drizzle.config.json`'s hardcoded local URL — documented local-dev tool (README env
  table notes it); the audit's INFO stands as a known local-only trade.
- `process.env.NODE_ENV` in `src/db/index.ts:29` — framework-set, not operator config;
  DEPLOYMENT.md's precise phrasing already covers it.
- The standing register (TRUST_PROXY XFF posture, CSP, jsdom layer, store-picker
  wiring, unthrottled GETs, journey hardcoded amounts, whole-number magnitude bound on
  `?max=`, planning-tools MIN_DATE, PDP double catalogue read, ensureSeed reviews-only
  partial-seed window, wishlist full-catalogue fetch, ratingValue catalogue fiction,
  orderNumber-collision retry-wiring coverage, wishlist refetch window + shop-strip
  sibling) — verified present in the docs, unchanged.
- The docs-counts pin's scope (gate-block completeness not pinned) — recorded as a
  future-cycle candidate; this cycle's D-1 fix is the manual sweep.

## 3. Test seams + execution order (TDD — RED observed before every behavior change; mutation-honest RED for every GREEN-on-arrival pin)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-1 | cart duplicate e2e parity | NEW e2e probe; honest-RED by mutation (Set check commented out → probe fails against the mutant) | the pin IS the fix (coverage completion; predicate already shipped) |
| B | F-2 | order-URL decode corner | NEW e2e probe (`/order/%ZZ` → not-found, never 5xx); honest-RED by mutation (decode hoisted above the try → 500 observed) | the pin IS the fix (guard already shipped) |
| C | F-3 | stepper ceilings ×3 | TRUE RED — the three ceiling pins fail (no `disabled` attrs exist) | `disabled={…}` on cart:115 / BuyBox:41 / business:42 |
| D | F-4 | addLine floor clamp | TRUE RED — the fs-pin fails (source lacks the clamped form) | `Math.max(1, …)` in the found-branch |
| E | F-5 | MAX_INT4 comment truth | reading (verified above) | comment names the checkout drop exception |
| F | F-6 | TZ fs-pin widening ×2 | GREEN-on-arrival + mutation-proven (scratch single-quote Z-less literal fails; scratch `.500Z` literal passes) | quote class + `(?:\.\d+)?` |
| G | D-1..D-4 | docs truth | reading (verified above) | README gate + baseline count; SKILL §11 list; AGENTS/PAD summaries |
| H | lockstep | six operator docs + worklog + session_33 | docs-counts lockstep reds (expected mid-sweep) | AGENTS/CLAUDE/README/PAD/SKILL/DEPLOYMENT counts + Task-134 paragraphs; SKILL v2.8.0 (lessons appended); PAD v1.19.0; worklog Task 134 |

Order: A → B → C → D (code + probes), E → F (comment + pin widening), then the full
gate (cold build, lint, typechecks, unit ×3 TZ, e2e, residue), then G → H (docs), then
screenshots (85–89), `.env.example` re-verification, session_33 log, worklog entry,
commit + push.

Expected count deltas (fs-verified before the docs sweep): unit 179 → **180** (+1 addLine
fs-pin; the F-6 widening modifies an existing pin, +0); e2e **120 → 125** (+1 cart
duplicate, +1 order %ZZ, +3 stepper ceilings); unit files stay 10; e2e specs stay 2.

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint                # 0 errors expected
npm run test                # 180/180 unit (TZ=UTC host)
TZ=Asia/Singapore npm run test       # 180/180 — the three-TZ discipline
TZ=America/New_York npm run test     # 180/180
npm run test:e2e            # 125/125 (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at seed quantities (1379)
```

## 5. Post-execution addendum (what the execution itself discovered — recorded for the audit trail)

- **F-2 reframed by live platform evidence**: the probe as planned
  (`page.goto("/order/%ZZ")`) drew a REAL 500 against the production build —
  not the app guard failing, but Next 16's routing layer rejecting the raw
  malformed-percent request before any app code runs (the route matcher's
  own decodeURIComponent throws DecodeError; prod: bare platform 500 with
  no log; dev: 400; verified by direct curl on both). Browser URL parsers
  normalize a lone `%` to `%25` before sending, so the raw class is
  curl/craft-only — REGISTER ROW, not app-fixable (no middleware/page code
  runs). The pin landed on the browser-reachable normalized form
  (`/order/%25ZZ` → not-found, never a 5xx). A hoist-mutation of the
  in-page decode kept the probe GREEN — proving the page-level URIError
  guard (Task-118 F-15) is unreachable defensive depth on this Next version
  (any input that would throw it already threw the router's decode first).
  The Task-133 case-sibling's negative assertion was repaired in passing:
  it quoted a typographic apostrophe (U+2019) the rendered `can&apos;t`
  (U+0027) never matches — a permanent no-op, the Task-131 broken-locator
  class.
- **F-6 caught a second backtracking split the plan's naive fix missed**:
  adding `(?:\.\d+)?` before the lookahead alone still false-positived a
  legitimate `.500Z` literal — the optional group backtracks to EMPTY and
  lets the lookahead test the `.`, and separately `\d+` gives back digits
  (".500" → ".50") and lets it test a stray `0`. The executed lookahead
  rejects `.` AND digits (`(?![Zz.\d]|…)`), closing both splits — proven by
  the mutation demo run against a scratch `.500Z` literal (the demo was run
  precisely to bind the fix, and caught the hole).
- **Gate outcome**: cold build green · typechecks + lint clean · unit
  **180/180 identically under TZ=UTC / Asia/Singapore / America/New_York**
  (the 17 mid-sweep docs-counts reds resolved by the lockstep sweep) · e2e
  **125/125** against the cold production build · zero DB residue (direct
  SQL: orders 0, order_items 0, reviews 5, inventory 72 rows at 1379).

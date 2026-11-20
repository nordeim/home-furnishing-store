# Task 133 Remediation Plan — Reviews Int4-Overflow Boundary, Residue-Net Completion, Persisted-Payload Uniqueness, Lookup-Normalization Parity, Pin-Hardening Batch, Docs Era-Range Truth

Date: 2026-11-20 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (fresh clone →
`d93c15d` — HEAD = Task 132 `4ad8ec3` + the session_29 log commit; npm install + `.env`
rebuilt; the rootless PostgreSQL 17 data dir survived but needed the lesson-31 restore
EXTENDED this cycle — 10 top-level empty initdb subdirectories + the STALE postmaster.pid +
the first observed NESTED pair `pg_logical/snapshots` + `pg_logical/mappings`, which the
top-level-only restore list missed — the checkpoint process itself failed on them; after the
full restore the 9-table DDL contract AND seed quantities verified by direct SQL: inventory
1379 = the formula, zero residue) with the mobile-navigation + Tailwind v4 taxonomies
(agent-browser drawer taxonomy at 390×844/1440×900 on the dev server via 127.0.0.1 — 8/8
PASS: open (aria-expanded=true, label toggles) / navigate+auto-close / param-close
regression (F-7 class) / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect)
/ hydration (`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item") / no
horizontal overflow at 390px — **no Tailwind v4 bug**), execution per `skills/tdd` (red →
green, one seam at a time). `skills/` excluded from checking/testing/compilation (operator
contract). One environment trap re-hit and resolved pre-gate: an exported shell
`DATABASE_URL=file:…custom.db` (a previous session's SQLite leftover) silently overrode
`.env` — gotcha #10, unset + pinned per command. Reference repo `homenest-store-s`
cross-checked: **quiescent — HEAD still `4771c3d` (2026-11-01, skills-only), zero src/tests
changes after `ff65bd2`** — the ninth cycle of "nothing to port". Sitemap/SEO re-verified
live: 42 indexable URLs no lastmod; robots 7 disallows coherent; og:image 1200×627 on home
+ PDP + inspiration (`renter-refresh-800`); noindex on the order page + all five utility
routes; the 404 surface branded ("flat-pack") with a 404 status.

## 1. Audit baseline (all Verified this run; fresh clone, cold caches)

| Gate | Result |
|---|---|
| `git clone` → `d93c15d` (Task-132 `4ad8ec3` + the session_29 log) | clean tree |
| `npm install` (fresh node_modules) + `.env` from `.env.example` + `drizzle-kit push` | green |
| Rootless PostgreSQL 17 (lesson-31 restore EXTENDED: 10 top-level empty subdirs + stale postmaster.pid + the nested `pg_logical/snapshots` + `pg_logical/mappings` — the checkpoint ERROR named them) | up; DDL contract verified (`orders_idempotency_key_unique`, `orders_order_number_unique`, `inventory_product_store_uq`, `reviews_product_idx`); seed 24/8/3/72/5/0/0/6/3, inventory 1379 |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 177/177 |
| `npm run test:e2e` (Playwright, cold production build :3100; chromium-1255 re-installed) | 117/117 |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 bug |
| Full-tree audit | two audit agents (deep code + docs-truth); every finding re-verified at line level by me (the lesson-46 discipline); F-1 additionally PROVEN LIVE on the dev server (curl → 500) |
| Reference repo | `homenest-store-s`: quiescent after `ff65bd2`; ninth "nothing to port" |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — POST /api/reviews 500s on a crafted `productId ≥ 2^31` (the int4-overflow corner of the Task-118 F-6 class); the GET sibling silently degrades
Evidence (line-verified + PROVEN LIVE this cycle):
(a) `src/app/api/reviews/route.ts:68-70` — the gate demands `typeof productId === "number"`,
`Number.isInteger`, `> 0` — but no UPPER bound. `2147483648` passes every check, reaches
`eq(products.id, productId)` at `:78`, and Postgres rejects the parameter for the `integer`
(int4) column (`22003 value out of range` — probed directly against the pinned DB). The
generic catch answers **500 REVIEW_FAILED for a pure client fault** — live on the dev
server: `curl POST {"productId":2147483648,…}` → `500 {"ok":false,"error":{"code":"REVIEW_FAILED"}}`.
The route's own comment (`:64-67`) claims "a non-existent or negative id is a client error
(422), not an FK-crash 500" — the upper int4 bound is the one boundary value the Task-118
F-6 rollout never probed.
(b) The GET at `:22-25` — `/^\d+$/.test("2147483648")` passes and `Number(raw) > 0` passes,
so the same value hits `getReviews()` and silently degrades to `{ok:true,data:[]}` via the
degrade-never-fail catch — inconsistent with the same route's own `?productId=1.5` → 422
stance (live: GET → 200 `[]`).
Not in the standing register: no deferral covers it. `/api/checkout` is NOT affected
(unknown productIds drop via the catalogue `byId.get` before any DB touch → EMPTY_BAG —
verified); `/api/products?max=` is JS-side only (verified — no int4 parameter).
Fix (ToDo-1): a shared `MAX_INT4 = 2_147_483_647` constant in `src/lib/utils.ts` (the
single seam discipline); the POST gate adds `|| productId > MAX_INT4` → the existing 422
VALIDATION; the GET adds `Number(raw) > MAX_INT4` → its existing 422 VALIDATION. RED: a
NEW e2e probe pair in the storefront spec (POST `productId: 2147483648` → expect 422,
today 500; GET `?productId=2147483648` → expect 422, today 200) with its own probe author
+ a `finally` net (the RED path of the POST inserts a review once the bound is absent —
write-capable spec discipline; the 500 path inserts nothing today, but the net guards the
GREEN-path regression shape). GREEN: both 422.

### F-2 MEDIUM — the `typeqty` e2e RED-run net deletes order rows but never restores the inventory decrement (the residue-net uniformity claim is not true for this spec)
Evidence: `tests/e2e/storefront.spec.ts:2102-2105` — the finally net runs two manual
`delete from …` queries (order_items, orders) but NOT the inventory restore; contrast the
shared `deleteProbeOrders` helper (`:40-65`) which re-derives `sum(qty)` per
`(product_id, store_slug)` from the order rows and restores it. On a RED run (the qty TYPE
check reverted), the four probes place real orders for product 1 (qty 1+5+3+1 = 10 units)
and the decrement is stranded forever — gotcha #13's exact failure mode. The spec's own
comment (`:2077`) says "The RED path of this probe WRITES — safety-net cleanup", and
AGENTS/CLAUDE claim every write-capable refusal spec carries the full net — this Task-124-era
relic predates the helper and both uniform-net sweeps passed it by because it *has* a
finally. Not in the register — the docs claim the opposite.
Fix (ToDo-2): replace the manual queries with `await deleteProbeOrders("typeqty-probe@nordhem.sg")`
and drop the local `Client`. RED proof by the Task-126 F-2 discipline: temporarily revert
the route's qty TYPE check (re-coerce), run the spec with the OLD net → observe product-1
tampines stock short by 10 after the run (the stranded decrement demonstrated), restore
stock, apply the NEW net, re-run the same mutation → stock restored to pre-run value.
Revert the mutation; the source tree ends byte-identical.

### F-3 LOW — the persisted-payload element validators accept DUPLICATE entries (the third layer of the shape → element → uniqueness chain): a false "N saved items are no longer available" note on the wishlist
Evidence: `src/lib/cart-store.tsx:55-57` (`isValidCartPayload`) and `:59-61`
(`isValidWishPayload`) — `Array.isArray(v) && v.every(…)` accepts `["solbakken-3-seat-sofa",
"solbakken-3-seat-sofa"]`. The UI's `toggleWish`/`addLine` can never produce duplicates, but
the F-4→F-3 lineage (Task 121 shape → Task 122 elements) explicitly polices crafted
persisted payloads. Deterministic consequence (UI trace): `/api/products` returns unique
slugs so `items.length = 1 < wishlist.length = 2` → `src/app/wishlist/page.tsx:52-57`
renders **"1 saved item is no longer available."** directly above the available product's
card — a false statement on the exact honesty surface Tasks 130–132 polished. The cart
layer: a duplicated valid line produces duplicate `key={l.productId}` React keys, a
doubled badge/subtotal, and stepper/remove acting on both copies (display-level; the server
re-derives). Not in the register (no wishlist/cart row covers duplicate-entry validation).
Fix (ToDo-3): uniqueness as part of both predicates — wish: `new Set(v).size === v.length`;
cart: `new Set(v.map(l => l.productId)).size === v.length` (a duplicate LINE is a duplicate
productId). A crafted duplicate payload degrades to the fallback (the `[null]` precedent —
the honest empty state, not a false note). RED: unit pins in
`tests/unit/local-store.test.ts` — `expect(isValidWishPayload(["a","a"])).toBe(false)`
(today true) and `expect(isValidCartPayload([validLine, validLine])).toBe(false)` (today
true; the existing different-productId pair at `:168` stays true). Plus an e2e wishlist
probe (the F-8 spec family's addInitScript pattern): seed a duplicated real slug → assert
the ghost note does NOT render and "Nothing saved yet" DOES (the degraded honest state).
GREEN: the predicate change.

### F-4 LOW — `priceTotals`' `net === 0` free-delivery branch is unpinned (the historically load-bearing corner of the server-truth money seam)
Evidence: `src/lib/utils.ts:126` — `deliveryFeeCents = net >= FREE_DELIVERY_THRESHOLD_CENTS
|| net === 0 ? 0 : STANDARD_DELIVERY_FEE_CENTS;`. `placeOrder`'s own comment
(`server-data.ts:270-273`) records that the previous hand-rolled copy "had already drifted
from it **on the net===0 delivery edge**" — the reason this shared seam exists. None of the
priceTotals pins exercises `deliveryMethod: "delivery"` with a zero net (the two cap tests
at `utils.test.ts` use `click-collect`, where the fee is 0 regardless — verified). A
regression deleting `|| net === 0` would charge $12 delivery on a fully-discounted order
and pass all 177 unit tests. Not in the register.
Fix (ToDo-4 — the pin IS the fix, GREEN-on-arrival): add
`priceTotals({ subtotalCents: 1500, promo: { kind: "fixed", value: 2000 }, deliveryMethod: "delivery" })`
→ `{ deliveryFeeCents: 0, totalCents: 0 }` (the zero-net delivery corner locked before
anyone edits the seam; the F-7 percent-cap precedent — Task 130 pinned the >100% corner,
this pins its zero-net sibling).

### F-5 LOW — `/order/[number]` lookup is case/whitespace-sensitive while `/track-order` normalizes (two surfaces, one identifier, two disciplines)
Evidence: `src/app/order/[number]/page.tsx:29-30` — raw `decodeURIComponent(number)` into
the `eq`, vs `src/lib/server-data.ts:411` — `orderNumberInput.trim().toUpperCase()`. A
shopper who hand-types the order number lowercase (or with trailing whitespace) into the
URL gets "We can't find that order" for an order the tracking page *finds with the same
input* — and the not-found copy then directs them to /track-order, where it works. Manual-
typing corner only (the confirmation redirect always uses the canonical mint); no security
effect (the number is unguessable either way). Not in the register.
Fix (ToDo-5): mirror the track discipline — `const decoded = decodeURIComponent(number)
.trim().toUpperCase();` before the `eq`. RED: a NEW e2e probe (place a probe order via the
API with its own probe email + `deleteProbeOrders` finally net, then
`page.goto(\`/order/${number.toLowerCase()}\`)`) → assert the confirmation heading renders
(today: the not-found copy).

### F-6 INFO — pin-hardening batch (the Task-132 F-2 "satisfied without truly binding" class; three GREEN-on-arrival strengthenings)
(a) `tests/e2e/storefront.spec.ts:2479-2480` — the inspiration-index pieces-total pin
hardcodes `"667.00"`/`"800.00"` while `src/app/inspiration/page.tsx:30-34` derives the
total from the live catalogue and the business sibling (`:956`) recomputes
`DEFAULT_LIST_CENTS` inline. A price edit on pandan-rug-200/blackout-curtain-pair/
hygge-pendant-cluster false-REDs the pin. Not the journey-amounts register row (that row
is the checkout journey spec). Fix: derive the expectation from `INSPIRATIONS` +
`PRODUCTS` in the spec (the Task-126 F-3 derivation pattern).
(b) `tests/unit/utils.test.ts:658` — the TZ-pure fs-pin matches only double-quoted string
literals: `/new Date\("[^"\n]*T\d{2}:\d{2}:\d{2}(?!…)/`. A host-TZ-coupled
`new Date(2026, 10, 19, 12, 0, 0)` (numeric args = LOCAL-time constructor, the same
false-RED class Task 132 closed) escapes the pin entirely. Zero current violations
(verified by grep). Fix: widen the fs-pin — any `new Date(` whose first argument is a
numeric literal must fail (the numeric-args constructor has no legitimate use in the unit
tree).
(c) `tests/unit/local-store.test.ts:270` — the PERSISTED_STORAGE_KEYS producer pin's
regex `/createLocalStore(?:<[^>]*>)?\(\s*("[^"]+"|[A-Z][A-Z0-9_]*)/g` silently SKIPS a call
whose first argument is a template literal / lowercase const / expression — a future store
minted that way escapes the scan with the pin green. Fix: count ALL `createLocalStore(`
call sites and require every one to match the conforming pattern; a mismatch fails with
the file + argument (the fail-closed scan — the Task-129 producer-widening posture).

### Docs findings (D-1..D-8) — the truth layer
- **D-1 MEDIUM** — `Project_Architecture_Document.md:1598` (§6.1 input-bounding row)
  claims review fields are "`slice()`-capped (60/120/2000)" and a "store slug (40)" cap —
  BOTH false: reviews REFUSE overlong fields with 422 (`reviews/route.ts:84-86`, the
  Task-122 F-11 refuse-never-truncate rule, e2e-pinned) and store slug is enforced by the
  `STORES` whitelist (checkout `:122,129-133`). Sibling: `home-furnishing-store_SKILL.md:480-481`
  (lesson 18) — "slicing is for cheap display fields (reviews)". An operator adding a
  write boundary from the PAD's security table would reintroduce silent truncation.
  Fix: reword the PAD row (REFUSED at caps + whitelist); drop "(reviews)" from lesson 18.
- **D-2 MEDIUM** — `AGENTS.md:384-390` gate block omits `npm run typecheck:tests` (the
  5-of-6 outlier; every other doc's gate chain includes both scopes, and AGENTS' own
  commands table says the app-scope typecheck does NOT cover the test tree). An agent
  gating on AGENTS.md alone never typechecks the test tree.
  Fix: add the line to the gate block.
- **D-3 LOW** — PAD era ranges "Tasks 114–131" at `:1356` (§3.2 tests/ tree) and `:1629`
  (§7.1 test distribution) — one cycle trailing (Task 132 extended the suite; the PAD's
  own §1.2 says 117–132). Fix: → "Tasks 114–133" in this cycle's lockstep (the sections
  gain Task-133 content).
- **D-4 LOW** — SKILL Appendix B plans row (`:972`): "through task131 (16 plans)" vs the
  committed 17 (through task132); this cycle's plan makes 18. Fix: → task133, 18 plans.
- **D-5 LOW** — SKILL Appendix B screenshots row (`:973`): "01…74 — 75 PNGs" vs the
  committed 80 (Task 132 added 75–79); this cycle adds 80–84. Fix: → 01…84, 85 PNGs.
- **D-6 LOW** — SKILL preamble cycle enumeration stops at Task 131 (the Task-132 F-8 fix
  appended 130/131 but stopped there — the trailing class recurred one cycle later).
  Fix: append the Task-132 AND Task-133 cycle names.
- **D-7 LOW** — PAD §3.2 directory tree (`:1347-1348`) lists a `cn` helper in utils.ts —
  no `cn` exists anywhere in `src/` (verified; retired in Task 118, swept from
  CLAUDE/README in Task 123 — the PAD tree survived both sweeps). Fix: drop ", cn".
- **D-8 INFO** — README cycle-block ordering: the Task-129 block sits above Task-132
  (nine blocks share the "Current cycle" header). Fix: move the Task-132 block above
  Task-129 and insert Task-133 on top (newest-first; no retitling churn for older blocks).

### Evaluated and kept (deferrals — documented, unchanged)
- The standing register (TRUST_PROXY XFF posture, CSP, jsdom layer, store-picker wiring,
  unthrottled GETs, journey hardcoded amounts, whole-number magnitude bound on `?max=`,
  planning-tools MIN_DATE, PDP double catalogue read, ensureSeed reviews-only partial-seed
  window, wishlist full-catalogue fetch, ratingValue catalogue fiction,
  orderNumber-collision retry-wiring coverage, wishlist refetch window) — verified present
  in the docs, unchanged.
- The shop page's `{items.length} products` strip during a client filter refetch — the
  same fetch-latency-flash class as the register's wishlist refetch-window row (no
  deterministic RED vehicle; register note appended in this cycle's worklog, no code
  change).
- F-6(a) is a spec derivation, F-6(b)/(c) are pin widenings — all GREEN-on-arrival
  (no behavior change; the Task-131 F-3 relocation precedent).

## 3. Test seams + execution order (TDD — RED observed before every behavior change)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-1 | reviews int4 bound | NEW e2e probe pair (POST 500→422 today; GET 200→422 today) — observed RED against a quick build | `MAX_INT4` in utils.ts; POST gate `|| productId > MAX_INT4`; GET gate `Number(raw) > MAX_INT4` |
| B | F-2 | typeqty residue net | temporary route mutation (re-coerce qty TYPES) + the OLD net → stranded 10-unit decrement observed by direct SQL; the NEW net restores on the same mutation | `deleteProbeOrders` swap; revert mutation; tree byte-identical |
| C | F-3 | payload uniqueness | unit pins (`["a","a"]` / `[validLine, validLine]` → false; today true) + NEW e2e wishlist probe (duplicated slug seeded; ghost note must not render — today it does) | `new Set` uniqueness in both predicates |
| D | F-4 | priceTotals net===0 | pin-only (GREEN-on-arrival; the F-7 percent-cap precedent) | the new pin locks the corner |
| E | F-5 | order-page lookup parity | NEW e2e probe (probe order + lowercase URL → confirmation must render; today not-found) | `.trim().toUpperCase()` mirror |
| F | F-6 | pin hardening ×3 | GREEN-on-arrival (a: derive 667.00 from the catalogue; b: numeric-arg constructor fs-pin; c: fail-closed producer scan) | the three pin strengthenings |
| G | D-1..D-8 | docs truth | reading (verified above) | PAD §6.1 + §3.2 + era ranges; SKILL lesson 18 + preamble + Appendix B ×2; AGENTS gate line; README block order |
| H | lockstep | six operator docs + worklog + session_31 | docs-counts lockstep reds (expected mid-sweep) | AGENTS/CLAUDE/README/PAD/SKILL/DEPLOYMENT counts + Task-133 paragraphs; SKILL v2.7.0 (lessons 55–56); PAD v1.18.0; worklog Task 133 |

Order: A → B → C → D → E (code + probes), F (pin hardening), then the full gate (cold
build, lint, typechecks, unit ×3 TZ, e2e, residue), then G → H (docs), then screenshots
(80–84), `.env.example` re-verification, session_31 log, worklog entry, commit + push.

Expected count deltas (fs-verified before the docs sweep): unit 177 → **180** (+2
uniqueness pins, +1 net===0 pin; the F-6(b)/(c) widenings modify existing pins, +0); e2e
**117 → 120** (+1 int4 probe pair, +1 wishlist duplicate probe, +1 lowercase-order-URL
probe); unit files stay 10.

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint                # 0 errors expected
npm run test                # 180/180 unit (TZ=UTC host)
TZ=Asia/Singapore npm run test       # 180/180 — the three-TZ discipline
TZ=America/New_York npm run test     # 180/180
npm run test:e2e            # 120/120 (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at seed quantities (1379)
```

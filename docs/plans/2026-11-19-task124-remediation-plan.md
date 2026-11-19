# Task 124 Remediation Plan — Docs-Truth Completion, Settle-Discipline Completion, Boundary Strictness

Date: 2026-11-19 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
+ hydration probe on the dev server — ALL PASS, no Tailwind v4 bug), execution per
`skills/tdd` (red → green, one seam at a time). `skills/` excluded from
checking/testing/compilation (operator contract). Reference patterns cross-checked against
`homenest-store-s` (its per-page noindex belt-and-suspenders posture, identity-based e2e
cleanup and shared-seam recall hygiene motivated F-17/F-2/F-12; its Prisma/SQLite spine is
not applicable here — the disciplines are ORM-agnostic).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 on 127.0.0.1:5432, postgres/app_db — restored snapshot needed only the initdb empty-subdirectory recreation of SKILL lesson 31; schema/DDL intact this time incl. inventory_product_store_uq)

| Gate | Result |
|---|---|
| fresh clone → `681c4cc` (delta since pushed Task-123 `c3c1fb3`: docs-only — session_11 + session_12 logs) | clean tree |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 128/128 |
| `npm run test:e2e` (Playwright, production build :3100, chromium-1255 installed — the first run raced the browser download and failed 54 on a missing headless-shell; re-run after install) | 78/78 |
| DB contract | 9 tables; seed 24/8/72/3/6/3/5; **zero residue at baseline** (0 orders, 5 seed reviews, inventory at the seed formula incl. alexandra `base−10`) AND **zero residue after the full 78-test e2e run** — the Task-123 cleanup discipline holds |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | open / navigate+auto-close (`/shop?cat=bedroom`) / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact); hydration verified live (add-to-bag → header badge "Shopping bag, 1 item") |
| Utility strip @390 | "Shop offers" link right edge 374 < 390 — Task-121 F-5 fix holds |
| Sitemap/SEO | sitemap 42 URLs (12 static + 24 product + 6 inspiration), indexable-only, NO lastModified; robots coherent (disallows cart/checkout/track-order/order/wishlist/search/api); order pages carry page-level noindex (Task 119 F-10); metadata blanket + JSON-LD pins green in the e2e baseline |
| Full-file audit | all 51 `src/` files + 11 test files read by an Explore agent; every headline finding re-verified by me at line/byte level |
| Reference repo | `homenest-store-s` reviewed: Next 16/React 19/TS-strict/Tailwind v4 CSS-first spine matches; its Prisma 6 + SQLite data layer is NOT applicable (this repo is Drizzle + PostgreSQL — the disciplines translate, the idioms do not). Ported as findings: per-page noindex on every private surface (F-17), identity-based cleanup (F-2), shared filter seam (F-12) |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — Three live-tense doc sites still document the pre-Task-123 `/api/health` body
Evidence: `CLAUDE.md:301` (API table row "`{ ok: true }` iff DB reachable"), `README.md:147`
(Quick-Start curl line "`{"ok":true}` with a live DB"), `README.md:206` (API table row) — vs the
shipped `src/app/api/health/route.ts:14` `{ ok: true, data: { db: "up" } }` and the SAME
documents' corrected narrative claims (CLAUDE.md:221, README.md:271). The Task-123 F-9 sweep
fixed DEPLOYMENT.md but missed these three sites; the docs-counts pin guards test counts,
not envelope claims.
Fix (ToDo-1): update all three sites to the envelope truth; add a docs-truth unit pin
(in `tests/unit/docs-counts.test.ts`, the established home of docs-vs-reality pins)
asserting each of the three sites carries `data: { db: "up" }` / `db":"up"` — RED first.

### F-2 MEDIUM — The journey e2e `finally` cleanup is conditional on post-placement assertions passing — a RED/flake run still strands the order row
Evidence: `tests/e2e/storefront.spec.ts:311–318` — `placedOrder` is captured from the URL only
after `toHaveURL(/\/order\/NH-/)`, the order-number text assertion AND the masking assertions;
a 201 that commits the order + decrements makan Tampines, followed by any of those assertions
failing, leaves `placedOrder = null` and the `finally` deletes nothing (the inventory restore
runs unconditionally, so the DB lands in a half-cleaned state). This is the one remaining hole
in gotcha #13's discipline — the spec whose residue motivated Task-123 F-1.
Fix (ToDo-2): make the `finally` deletion identity-based — delete `order_items`/`orders` by
the probe-owned email (`journey@nordhem.sg`) and a spec-start timestamp, independent of the
captured number (the homenest identity-cleanup pattern). Honest-RED verification: inject a
temporary `expect(false)` after the Pay click, run the spec, observe the stranded order row,
then fix and re-run the failing probe to observe zero residue; remove the probe.

### F-3 MEDIUM — The search results grid is not gated on the settled needle — a failed re-search renders the PREVIOUS query's products beneath the "We couldn't load results" box
Evidence: `src/app/search/page.tsx:52` (`shown = needle ? items : []`), `:96–119` — the error
box and both verdicts gate on `settledFor === needle` (Task-123 F-4), but `items` is never
cleared on error and the grid renders `shown` unconditionally. After a successful search for
A and a failed search for B, A's full grid renders below B's error box — the mirrored half of
the F-4 class, on the same surface F-4 just touched.
Fix (ToDo-3): gate the grid like the verdicts (`!error && settledFor === needle`); e2e RED:
search a needle with results, then route-abort a second needle, assert the grid holds 0
product cards under the alert (today it holds A's cards).

### F-4 LOW — The cart's below-minimum notice quotes "$0.00 minimum" for unknown persisted promo codes
Evidence: `src/app/cart/page.tsx:36–40` — `formatSGD(promoMinCents ?? 0)`;
`findPromoMinimumCents("BOGUSCODE")` returns null → "BOGUSCODE needs a $0.00 minimum — add
more to use it" while the server answers "This code is not valid." The exact display/server
truth class F-2 (Task 123) closed, reachable via the same crafted-localStorage vector F-13
(Task 123) addressed (a ≤32-char unknown string passes the predicate).
Fix (ToDo-4): branch on `promoMinCents === null` → "X isn't a valid code — remove it and try
again" (the Remove affordance already exists); e2e RED via `addInitScript` seeding
`nordhem_promo` with an unknown code.

### F-5 LOW — The checkout qty boundary still coerces `true`/arrays/numeric strings into real quantities (Task-122 F-8 closed only null/undefined)
Evidence: `src/app/api/checkout/route.ts:55–61` — `Number(rawQty)` accepts `true`→1, `[5]`→5,
`"3"`→3; `Number(line.productId)` likewise coerces `"7"`/`true`. A crafted
`{ productId: 1, qty: true }` line places a quiet single-unit order — the outcome class the
F-8 pin was written to forbid.
Fix (ToDo-5): require `typeof rawQty === "number" && Number.isFinite(rawQty)` (and the same
for `productId`) before coercion — drop non-number TYPES, not just non-finite values; e2e RED:
`qty: true` → 422 (today 201; the probe carries its own safety-net cleanup per gotcha #13).

### F-6 LOW — README's live API reference documents the superseded Task-121 `deliverySlot ≤ 80` rule
Evidence: `README.md:203` ("`deliverySlot` ≤ 80 (refuse, never truncate)") vs the shipped
`isValidDeliverySlot` coherence boundary (Task-123 F-3) and README's own :263 narrative.
Fix (ToDo-6): reword to the DELIVERY_SLOTS coherence contract.

### F-7 LOW — CLAUDE.md claims `tests/` is "inherited … from the predecessor repo … not part of the app compile"
Evidence: `CLAUDE.md:78–79` vs the NORDHEM-native suite (Task 114+), `typecheck:tests`
(`package.json:14`) and CLAUDE.md's own Testing section (:138+). AGENTS.md:153 states it
correctly.
Fix (ToDo-7): reword to the app-scope/typecheck:tests split; drop the stale "inherited"
framing from the Anti-Patterns entry (:327).

### F-8 LOW — Click-&-collect slot labels are time-relative but static — "Today 2pm" is sold at 23:00
Evidence: `src/lib/utils.ts:95–99` (`DELIVERY_SLOTS["click-collect"] = ["Today 2pm",
"Tomorrow 10am"]` — fixed strings offered regardless of wall clock), rendered in the checkout
options, the confirmation ("Ready for pickup … Today 2pm") and tracking. The codebase solved
the sibling problem twice with SGT discipline (`sgTomorrowISO`, `orderNumber(now?)`); the
slots have none.
Fix (ToDo-8): a pure seam `availableDeliverySlots(method, now?)` in `utils.ts` — click-collect
"Today 2pm" is offered only before 14:00 SGT (the slot's own time; the SGT_OFFSET_MS pattern);
delivery/express sets are timeless and unaffected. The checkout page consumes the helper for
its options; the API boundary keeps validating against the full `DELIVERY_SLOTS` sets
(a stale tab submitting a just-expired slot is grace, not junk — method coherence is the
boundary's contract). Unit RED at fixed SGT instants (13:59 → both; 14:00 → Tomorrow only);
clock-pinned e2e (`page.clock`) if it proves stable, else unit-only per the orderNumber
precedent.

### F-9 LOW — WCAG 2.2 AA 1.3.5: the card fields and the review "Your name" field lack `autocomplete` purpose tokens
Evidence: `src/app/checkout/page.tsx:130–132` (Card number / Expiry / CVC carry no
`autoComplete` — `cc-number`/`cc-exp`/`cc-csc` are standard tokens) while every contact field
on the same page carries its token (:85–89); `src/components/ReviewSection.tsx:68` ("Your
name" lacks `autocomplete="name"`).
Fix (ToDo-9): add the four tokens; pin the three checkout tokens via a small e2e assertion
(getAttribute on the labeled inputs).

### F-10 LOW — WCAG 2.2 AA 1.4.11: star-rating buttons convey pressed state by color alone, both states below 3:1
Evidence: `src/components/ReviewSection.tsx:70–74` — selected/unselected differ only by
`text-[#e5a000]` vs `text-[#ccc]` (≈2.0:1 / ≈1.4:1 on `#f5f3ee`); `aria-pressed` covers AT,
not low-vision sighted users.
Fix (ToDo-10): add a non-color cue to the selected star (ring); e2e pin via computed style
(`boxShadow !== "none"` on the selected button — the Task-120 computed-focus precedent).

### F-11 LOW — ProductCard still publishes the invented seed `ratingCount` ("(412)") beside PDPs that now honestly say "Reviews (2)"
Evidence: `src/components/ProductCard.tsx:34` (`<span>({count})</span>`), `:28` (aria-label
"from N reviews"), `:80` — the only `Rating` consumer. Task-121 F-6 removed the count from
the PDP header (same-page contradiction); the shop/home/offers/related/search grids still
quote the seed fiction, so the same product shows "(412)" on its card and "Reviews (2)" on
its PDP.
Fix (ToDo-11): drop the count from the `Rating` display + aria-label (stars remain — the
`ratingAvg` fiction stays a documented deferral); no spec pins "(412)" today (verified);
add a small absence pin.

### F-12 INFO — `/api/products` duplicates the `searchProducts` filter expression — the F-5 recall drift can reopen
Evidence: `src/app/api/products/route.ts:22` vs `src/lib/server-data.ts:93` carry the identical
literal `${p.name} … ${p.categorySlug}`.toLowerCase().includes(needle)` with a parity comment;
one e2e case (`q=outdoor`) is the only equivalence guard.
Fix (ToDo-12): extract `matchesProductQuery(p, needle)` into `catalog.ts` (the pure-data
home, importable by both — and by the e2e tree); both consumers import it; unit pins for the
seam (GREEN-on-arrival per the sortProductList precedent — a test-gap finding, the behavior
is correct).

### F-13 INFO — Search "Try again" keeps the error box on screen through the ~250ms debounce window
Evidence: `src/app/search/page.tsx:57–59` — `setLoading(true)` runs inside the 250ms timeout
(the lint rule forbids it sync in the effect body), so after Try again (retry++) the
`error && !loading && settledFor === needle` gate still holds until the debounce fires.
Fix (ToDo-13): extend the settle discipline to the retry axis — a `settledRetry` state set
when the fetch settles; the error box gates on `settledRetry === retry && settledFor ===
needle`. e2e via the established frozen-debounce pattern (click Try again with timers frozen
→ the box must hide; unfreeze → the retry settles).

### F-14 INFO — e2e hygiene: the sitemap spec hardcodes 42, and four request-context POSTs ride the shared `"local"` limiter identity
Evidence: `storefront.spec.ts:107–109` (hardcoded 42 while the unit suite derives its count
from PRODUCTS/INSPIRATIONS — a catalogue edit breaks the e2e first); `:148/:158/:168/:197`
(checkout/promo/reviews POSTs without `x-forwarded-for` — ~9 posts/min against the 20/min
per-route cap today; headroom, not a break, but the per-probe-identity discipline is applied
inconsistently).
Fix (ToDo-14): derive the expected count from `@/lib/catalog` (PRODUCTS/INSPIRATIONS lengths
+ the 12 statics) in the spec; give the four riders their own XFF identities.

### F-15 INFO — CLAUDE.md cosmetics: a `ˋ` (U+02CB) wraps `data-scroll-behavior` and the Testing section header says "Current state (Task 121)"
Evidence: `CLAUDE.md:104`, `:138`.
Fix (ToDo-15): backtick + drop the stale task tag (fold into the ToDo-1 docs sweep).

### F-16 INFO — The header store-picker predicate accepts any string (no whitelist mirror of the checkout `storeSlug` pattern)
Evidence: `src/components/Header.tsx:22` — `createLocalStore("nordhem_store", "Tampines",
(v) => typeof v === "string")`; a crafted value renders a blank `<select>`. The cart/promo
predicates got element/length mirrors in Tasks 122–123; this one didn't.
Fix (ToDo-16): move `storePick` + an exported `isValidStorePick` predicate to
`cart-store.tsx` (the persisted-client-state module — the unit-test surface; Header imports
it), predicate whitelists the three real names; unit RED ×3 (bogus → false, "Tampines" →
true, non-string → false).

### F-17 INFO (NEW, from the homenest reference posture) — utility client pages rely on robots.txt alone; no page-level noindex
Evidence: `robots.txt` disallows `/cart`, `/checkout`, `/track-order`, `/wishlist`,
`/search` — but those client pages carry no `robots: { index: false }` metadata, unlike
`/order/[number]` (Task 119 F-10's belt-and-suspenders: a disallowed URL can still enter the
index URL-only if externally linked). The five routes are single `page.tsx` files with no
`layout.tsx` (verified).
Fix (ToDo-17): add a server `layout.tsx` carrying `robots: { index: false, follow: false }`
to each of the five routes (the order-page stance, the shop-layout pattern for client
pages); e2e pin mirroring the order-page noindex assertion in the metadata blanket block.

Deferred (documented in the PAD register — do NOT "fix"): header store-picker wiring into
checkout, delivery decrement redistribution/accounting drift, unthrottled GET reads, xff
first-hop spoofing posture, orderNumber collision retry, PDP repeated catalogue reads,
cross-tab storage sync, aggregateRating ratingValue fiction (invented-content stance — now
explicitly including the card star display per F-11's line), `hover:font-bold` glyph jitter,
`[m` display-layer trap, SearchAction decorative posture, offers bundle slug curation,
/search autoFocus.

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| docs-truth: the three health sites carry the envelope body | unit (RED) | F-1 regression |
| journey `finally` deletes by email + spec-start window (honest-RED probe: injected failure strands the order pre-fix, not post-fix) | e2e (discipline) | F-2 residue window |
| search: after a settled failure, the grid holds 0 cards (route-abort pattern) | e2e (RED) | F-3 stale grid |
| search: Try-again hides the error box during the debounce window (frozen timers) | e2e (RED) | F-13 retry settle |
| cart: unknown persisted code → "isn't a valid code", never "$0.00 minimum" (addInitScript seed) | e2e (RED) | F-4 notice honesty |
| checkout POST `qty: true` → 422 (safety-net cleanup on the probe) | e2e (RED) | F-5 type coercion |
| `availableDeliverySlots`: 13:59 SGT both / 14:00 SGT Tomorrow-only / delivery+express unaffected / `now` injection | unit (RED) | F-8 temporal honesty |
| checkout card inputs carry cc-number/cc-exp/cc-csc tokens | e2e (pin) | F-9 autocomplete |
| selected star button: computed boxShadow ≠ none | e2e (pin) | F-10 non-color cue |
| product cards: no "(412)" count, no "from N reviews" label | e2e (pin) | F-11 card honesty |
| `matchesProductQuery`: name/tagline/description/sku/categorySlug + case-insensitivity | unit (GREEN-on-arrival) | F-12 seam regression |
| sitemap count derived from PRODUCTS/INSPIRATIONS (no hardcoded 42) | e2e (hardening) | F-14 catalogue-edit drift |
| the four "local" POSTs get own XFF identities | e2e (hygiene) | F-14 limiter headroom |
| `isValidStorePick`: bogus/non-string/Tampines | unit (RED) | F-16 persisted-state whitelist |
| five utility routes carry page-level noindex (metadata blanket) | e2e (RED) | F-17 index defense |
| existing pins re-run (unit+e2e) | both | money journeys, LOW_STOCK, TOCTOU, metadata blanket, docs-counts |

## 4. Execution order (vertical slices, red → green each)

1. **Docs-truth slice**: ToDo-1 (three health sites + docs-truth unit pin RED→GREEN) +
   ToDo-6/7/15 (README checkout row, CLAUDE inherited-tests claim + cosmetics).
2. **Search-settle slice**: ToDo-3 (grid gate e2e RED) + ToDo-13 (settledRetry +
   frozen-timer e2e RED) → GREEN together (same file, same settle concept).
3. **Boundary-strictness slice**: ToDo-5 (qty type-strict + e2e RED w/ cleanup) +
   ToDo-4 (unknown-promo notice e2e RED) + ToDo-16 (storePick move + unit RED) → GREEN.
4. **Temporal-honesty slice**: ToDo-8 (`availableDeliverySlots` unit RED ×4 → page wiring;
   clock e2e if stable, else unit-only precedent).
5. **A11y slice**: ToDo-9 (autocomplete tokens + pin) + ToDo-10 (star ring + computed-style
   pin).
6. **Card-honesty slice**: ToDo-11 (Rating count drop + absence pin).
7. **SEO slice**: ToDo-17 (five noindex layouts + blanket pin RED).
8. **Test-hygiene slice**: ToDo-2 (journey identity cleanup + honest-RED probe) +
   ToDo-14 (sitemap derivation + XFF identities) + ToDo-12 (matchesProductQuery extraction
   + unit pins).
9. **Docs lockstep**: AGENTS/CLAUDE/README counts + Task-124 paragraphs, PAD v1.9.0
   (revision block + register rows), SKILL v1.8.0 (lessons), worklog Task 124, this plan
   archived, `.env.example` re-verified (contract unchanged).
10. **Full gate**: lint → typecheck → typecheck:tests → unit (new total) → cold build
    (`rm -rf .next`) → e2e (new total, zero residue verified by direct SQL) → dev-server
    screenshots for changed surfaces into `docs/screenshots/`.
11. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py` with the
    mandatory `--remote` override; session log as the follow-up commit.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this run (audit agent
  + my line-level re-reads of the three doc sites, the health route, the journey finally,
  the search page grid/error/retry flow, the cart notice derivation + findPromoMinimumCents,
  the checkout route qty mapping + clampInt, DELIVERY_SLOTS + the checkout options, the card
  fields, the star buttons, Rating/ProductCard + zero "(412)" pins in the specs, the
  duplicated filter expression, the four XFF-less POST sites, Header storePick + its
  consumers (error-boundary key lists only — display-only state), and the five layout-less
  utility routes).
- F-1's pin home is proven (`tests/unit/docs-counts.test.ts` already fs-reads the operator
  docs; the health-body assertion is the same mechanism extended to envelope claims).
- F-2's identity cleanup keys on the probe email + a spec-start timestamp — both already
  available in the spec (the email is filled at :303; `new Date()` at spec start), and the
  sibling oversell/race/cc/slot specs demonstrate the pg-in-spec pattern.
- F-3/F-13's e2e patterns are proven in-tree: the route-abort + frozen-debounce disciplines
  (`storefront.spec.ts:967–987` + the Task-123 F-4 spec at :1172).
- F-4's reachability needs only `addInitScript` (the documented localStorage seeding path —
  SKILL §10) with a code that passes the 32-char predicate.
- F-5 keeps the boundary shape (filter→null) — the F-8 e2e pin (`qty: null` → EMPTY_BAG
  path) stays valid; the new probe adds `qty: true` → 422 with its own cleanup.
- F-8's helper is additive; `DELIVERY_SLOTS` stays the boundary contract (probes and the
  page's method-switch derivation keep consuming it); the 14:00 SGT cutoff uses the proven
  SGT_OFFSET_MS arithmetic; unit-only pinning has the orderNumber/sgTomorrowISO precedent.
- F-11's change is display-only (Rating's single caller is ProductCard — verified; the
  ratingCount DATA stays for sortProductList, which is data, not display).
- F-16's move is import-only for Header (cart-store.tsx is the established unit-test
  surface; the error-boundary key lists are string literals, unaffected).
- F-17's layouts mirror the order-page noindex + shop-layout patterns; the metadata blanket
  spec block already contains the order-page noindex pin to extend.
- No new runtime dependencies; no new env variables; `.env.example` contract unchanged;
  the docs-counts pin sweeps all five operator docs at the final counts (count-lockstep,
  no exceptions). Expected new totals: unit 128 + ~12 ≈ 140; e2e 78 + ~9 ≈ 87 — exact
  counts locked by the docs-counts pin at gate time.

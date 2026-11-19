# Task 126 Remediation Plan — Idempotent Checkout, Test-Residue Parity, Derived Copy

Date: 2026-11-19 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
+ hydration probe on the dev server — 6/6 PASS incl. the F-7 param-navigation regression
check; no Tailwind v4 bug), execution per `skills/tdd` (red → green, one seam at a time).
`skills/` excluded from checking/testing/compilation (operator contract). Reference patterns
cross-checked against `homenest-store-s` (its idempotent-checkout discipline became F-1; its
twitter-card + priceValidUntil SEO posture became F-8; its non-deterministic-orderBy trap
became F-7; its Prisma/SQLite spine is not applicable — the disciplines translate, the
idioms do not). One audit finding was **DISPROVEN by insert-order analysis** (AUD-3 below).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17 on 127.0.0.1:5432, postgres/app_db — fresh install per `docs/setup_pg_z.sh` + `skills/rootless-postgresql/SKILL.md`; schema pushed, 9 tables)

| Gate | Result |
|---|---|
| fresh clone → `cbb6131` (docs-only delta since pushed Task-125 `6bd5ae9`: session_16 + session_17 logs) | clean tree |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 145/145 |
| `npm run test:e2e` (Playwright, production build :3100, chromium-1255 installed) | 97/97 |
| DB contract | 9 tables; **zero residue at baseline** (0 orders, 5 seed reviews, inventory 0 mismatches vs the seed formula) AND **zero residue after the full 97-test e2e run** — the Task-125 discipline holds |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | open / navigate+auto-close (`/shop?cat=bedroom`) / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) / **F-7 param-close regression check** (`/shop?cat=bedroom` → drawer Dining → `/shop?cat=dining` + aria-expanded=false) ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact, `lg:` breakpoint renders) |
| Hydration probe | `html[data-hydrated]="true"` on a PDP; add-to-bag → header badge "Shopping bag, 1 item" live; `nordhem_cart_v1` persisted |
| Utility strip @390 | "Shop offers" link right edge 374 < 390 — the Task-121 fix holds |
| Sitemap/SEO | sitemap 42 URLs (12 static + 24 product + 6 inspiration), indexable-only, NO lastModified; robots coherent (disallows cart/checkout/track-order/order/wishlist/search/api); Organization/WebSite JSON-LD via the escaped `jsonLdScript` seam |
| Full-file audit | all `src/` + test files read by an audit agent; every headline finding re-verified by me at line/byte level (incl. the M-3 insert-order disproof below) |
| Reference repo | `homenest-store-s` reviewed: no src/tests changes since the Task-125 snapshot (all post-2026-10-23 commits touch `skills/` only — verified by commit stat); ported as findings: idempotent checkout (F-1), twitter-card + priceValidUntil + OG-dimension SEO posture (F-8), non-deterministic orderBy trap (F-7); its temp-SQLite harness family, HTML reporter (F-9) and health-503 noted |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — Double-submit places two orders and burns stock twice: no idempotency at checkout (homenest session-70 discipline, not yet adopted)
Evidence: `src/app/api/checkout/route.ts:101-117` accepts no idempotency key;
`placeOrder` (`src/lib/server-data.ts:231-301`) decrements stock per call — the FOR UPDATE
locks serialize two concurrent same-cart POSTs but do not dedupe them. The Pay button
disables during `busy` (`src/app/checkout/page.tsx:171`) but a network retry, a
double-click racing the state update, or an impatient second click after a
response-timeout places a SECOND real order (row + decrement). homenest: schema
`idempotencyKey @unique` + replay fast-path + P2002 race recovery + client key minted
once per mount (+ the `random-id.ts` secure-context fallback — plain-HTTP LAN kills
`crypto.randomUUID()`).
Fix (ToDo-1): `orders.idempotencyKey` (nullable text, unique — Postgres allows multiple
NULLs, so existing orders and key-less POSTs are unaffected); `placeOrder` grows an
optional `idempotencyKey` input with (a) a pre-transaction replay fast-path, (b) a
unique-violation (pg `23505`) catch around the transaction that re-selects by key and
returns the winner (the loser's transaction — insert included — rolled back, so no
double decrement); the route validates the key shape (`/^[A-Za-z0-9-]{8,64}$/`) and
drops malformed keys to null (dedupe is an enhancement, never a persisted field); the
checkout page mints once per mount (`useState(() => mintIdempotencyKey())` with the
`crypto.randomUUID` try/catch fallback — SSR mints a different key than hydration, which
is fine: the key is never rendered, only submitted) and includes it in the POST body.
Replay returns 200 with the SAME orderNumber (create stays 201) — the client treats both
identically. e2e RED: same payload + key POSTed twice → today two 201s with DIFFERENT
order numbers (the route ignores the field) + two decrements; GREEN: 201 then 200 with
the same number, single decrement, one cleanup.

### F-2 MEDIUM — Five e2e refuse-expectation specs lack the RED-run safety net: a boundary regression strands orders/decrements (gotcha #13 applied inconsistently)
Evidence: `tests/e2e/storefront.spec.ts` — **:810-855** (500-class/LOW_STOCK probe: zeroes
katong inventory — restored in its finally — but a 201 regression strands the ORDER row),
**:1112-1131** (unknown storeSlug → a regression places the order, no cleanup),
**:1133-1152** (overlong deliverySlot → same), **:1669-1683** (overlong promoCode → same),
**:1685-1699** (101-line bag → a 101-row insert across 20 products on regression, no
cleanup). Siblings DO carry nets: the slot-coherence spec's `if (res.status() === 201)`
cleanup (:1179-1195), the method-coherent order spec (:1215-1229), the typeqty email-keyed
finally (:1757-1761). With `fullyParallel: true` + CI `retries: 2`, attempt-1 residue can
poison the retry or a parallel spec.
Fix (ToDo-2): backfill the safety net on all five (email-keyed order_items/orders delete
+ inventory restore — the typeqty/coherence pattern). Honest-RED per the Task-124 F-2
injected-probe precedent: temporarily remove the storeSlug whitelist → run the
unknown-storeSlug spec → observe the failure AND the stranded row (SQL) → add the nets →
re-run with the boundary still reverted → spec still fails but ZERO residue (the net
proven live) → restore the boundary → green.

### F-3 LOW — "Up to 24% off" is a hardcoded literal at five copy surfaces; nothing derives it (the Task-122/124/125 hardcoded-value class, remaining member)
Evidence: `src/components/Header.tsx:76`, `src/app/page.tsx:69`, `src/app/offers/page.tsx:12,16,35`
vs the catalogue math (NORDLYS −24%). The e2e pins assert the literal
(`storefront.spec.ts:686,1948,1958`). Editing NORDLYS's compareAtCents turns five
marketing claims — two of them metadata — into lies with every gate green. Same class,
lower stakes: the delivery-fee/threshold literals ($12/$29/$200) re-quoted as static copy
at ~6 marketing sites (services CARDS, help FAQ, PDP delivery note, checkout method
sublabels, home band, Footer) while the constants live in `utils.ts:28-30`.
Fix (ToDo-3): `catalogMaxDiscountPercent()` in `src/lib/catalog.ts` (pure, unit-pinnable)
+ interpolate the five discount sites; derive the fee/threshold copy strings from the
utils constants at the quoted sites; the e2e pins derive their expectations from the
imported helper (the Task-124 F-14 sitemap-derivation pattern). Unit RED first
(function does not exist).

### F-4 LOW — Four stale docs/comments sites survive the Task-124 docs-truth sweep (the exact class it eradicated)
Evidence: (a) `.env.example:22-24` still claims the origin "is hardcoded in
src/app/layout.tsx metadataBase, robots.ts and sitemap.ts" — stale since Task-125 G-4
single-sourced it into `src/lib/utils.ts:10` (a domain-mover is sent to the wrong files);
(b) `tests/e2e/storefront.spec.ts:390-392` comment says the limiter "keys on the first
XFF hop" under a "shared 'local' bucket" — G-2 made it the RIGHTMOST hop and the bucket
"direct"; (c) `docker-compose.yml:18` + `tests/unit/env-example.test.ts:80` claim
"ilike search" — there is no ilike anywhere in `src/` (search is in-JS
`matchesProductQuery` after a full-table read); (d) `dotenv` sits in `dependencies` but
nothing in `src/`, `scripts/`, or configs imports it (Next's own env loader reads `.env`).
Fix (ToDo-4): update all four sites to current truth; remove `dotenv` via
`npm uninstall` (package-manager-operated, never hand-edited); extend
`tests/unit/env-example.test.ts` to pin the corrected origin claim (the docs-truth pin
pattern) so the note cannot rot again.

### F-5 LOW — Read-boundary TYPE-strictness parity gap: track + promo-validate + reviews GET still coerce crafted types (the Task-124/125 F-5/F-2 stance, unmirrored)
Evidence: `src/app/api/orders/track/route.ts:29-30` (`String(body.orderNumber ?? "")` —
a numeric/object orderNumber coerces into the lookup instead of a 422);
`src/app/api/promotions/validate/route.ts:28,32` (`String(body.code ?? "")`,
`Number(body.subtotalCents) || 0`); `src/app/api/reviews/route.ts:16` (GET
`Number(productId)` accepts `1.5`/`"3"` → floor → another product's reviews).
Fix (ToDo-5): mirror the checkout/reviews-POST typeof guards — track: non-string
orderNumber/email → 422 VALIDATION; promo-validate: non-string code or non-number
subtotalCents → 422 VALIDATION; reviews GET: non-integer-string productId → 422
VALIDATION. e2e RED: track with `orderNumber: 12345` (today 404), promo with
`code: 123` (today INVALID_PROMO), reviews GET `?productId=1.5` (today 200).

### F-6 LOW — The persisted-key list is duplicated across the two crash boundaries (the seam class)
Evidence: `src/app/error.tsx:43` and `src/app/global-error.tsx:18` carry the identical
literal `["nordhem_cart_v1", "nordhem_wish_v1", "nordhem_promo", "nordhem_store"]`. A
fifth persisted store requires remembering both sites; a miss leaves the recovery button
partially ineffective.
Fix (ToDo-6): export `PERSISTED_STORAGE_KEYS` from `src/lib/local-store.ts` (the natural
home — the stores live there) and import it in both boundaries; an fs-pin unit test
asserts both boundary files reference the constant (the invariant-pin pattern —
GREEN-on-arrival, the pin is the deliverable).

### F-7 LOW — Schema hygiene: redundant unique index on products.slug, no index on reviews.productId, a default(0) footgun on orderItems.productId (homenest trap-log adjacent)
Evidence: `src/db/schema.ts:28` (`slug().notNull().unique()` — a unique CONSTRAINT)
**plus** `:52` (`uniqueIndex("products_slug_idx").on(t.slug)` — a second unique index on
the same column); `:119-130` (reviews has no productId index though `getReviews` /
`getReviewCount` filter on it every PDP render); `:110` (`productId .default(0)` — can
never be a real product; orderItems is deliberately denormalized but the default invites
junk). homenest's S51-1 class (non-deterministic ordering on same-timestamp rows) also
applies: `server-data.ts:109` orders reviews by `desc(createdAt)` alone — the seed loop
inserts get practically-distinct `now()` stamps today, but the order is not guaranteed.
Fix (ToDo-7): drop the redundant `products_slug_idx`; add
`index("reviews_product_idx").on(t.productId)`; drop the `.default(0)`; tie-break the
reviews ordering `desc(createdAt), desc(id)` (the D-1 prophylaxis — one line, comment).
`drizzle-kit push` verified by direct SQL (index present/absent, defaults) — the
GREEN-on-arrival invariant pattern; the tie-break gets a same-timestamp SQL-insert pin.

### F-8 LOW — SEO completion: no twitter:card metadata; OG images carry no width/height; the PDP Offer lacks priceValidUntil (homenest posture)
Evidence: zero `twitter` keys in `src/` (grep); `src/app/page.tsx:37` and the PDP
(`product/[slug]/page.tsx:29`) ship bare `{ url }` OG images — yet EVERY catalogue +
hero image URL pins `h=627&w=1200` (catalog.ts:35+, verified), so declaring
`width: 1200, height: 627` is true; the PDP Offer node
(`product/[slug]/page.tsx:84-93`) has price/currency/availability/condition but no
`priceValidUntil` (Google's rich-result recommendation). homenest: root-layout
`twitter: { card: "summary_large_image" }` + per-page inheritance + a pure
`priceValidUntil()` helper.
Fix (ToDo-8): add `twitter: { card: "summary_large_image" }` to the root layout
metadata (Next's metadata resolution inherits it to every page; PDP title/description/
images fall back to its own openGraph) + `width`/`height` on the two OG image sites +
`priceValidUntil: campaignEnd().toISOString().slice(0, 10)` on the Offer (the EXISTING
rolling campaign seam — no invented date; the offers page's own "refreshed with the
season" copy is the site's price-refresh claim). e2e RED first: no twitter:card meta
today, no priceValidUntil in the PDP JSON-LD.

### F-9 INFO — Playwright reporter is list-only (homenest ships an HTML report)
Evidence: `playwright.config.ts:16` vs homenest's `reporter: [["list"], ["html", …]]`.
Fix (ToDo-9): add `["html", { open: "never" }]` (zero CI cost). Config-only.

### AUD-3 DISPROVEN — The "ensureSeed partial-seed blind spot for non-inventory tables" claim (audit M-3) does not survive insert-order analysis
The audit claimed a first-seed crash between the products insert and the promotions/
inspirations/stores/categories inserts leaves those tables empty forever (the
products+inventory early return skips them). Program order says otherwise:
`server-data.ts:31-35` inserts categories → stores → products → promotions →
inspirations and `:46` inventory LAST — the early return at `:26-28` requires products
AND inventory, so any state with both present necessarily already completed the
promotions/inspirations/stores/categories inserts; any crash before inventory leaves the
early-return un-satisfied and the next read re-seeds everything (onConflictDoNothing).
The genuine remaining window — a crash between the inventory insert and the seed-reviews
loop — strands the five seed REVIEWS, which is the documented first-time-only design
(the comment at :23-24 explains why re-inserting would duplicate: no unique constraint).
No code change; the disproof is recorded (the Task-124 F-16 precedent: audit claims get
disproven with evidence, not patched on authority).

### Evaluated and kept deferred (the PAD register — do NOT "fix" without an operator decision)
- **XFF TRUST_PROXY gate** (audit H-1): rightmost-hop parsing is still client-controlled
  in a no-proxy deploy — true, and already the documented deferral ("xff trusted-proxy
  posture beyond rightmost-hop"). The named un-deferral path (a `TRUST_PROXY` env gate
  defaulting to "direct") changes the single-variable env contract pinned across five
  operator docs — a design decision for the operator, recorded in the register with the
  design sketch. The stale spec comment claiming the old posture is fixed in F-4.
- **Delivery decrement redistribution** (audit M-1, documented deferral), **header
  store-picker wiring** (L-2, documented), **PDP repeated catalogue reads** (L-7 — the
  React `cache()` one-liner noted in the register), **CSP** (G-8, trap log recorded),
  **jsdom/real-DB component layer** (G-9/C-5), **Tailwind token codemod** (L-3 — 79
  arbitrary-value sites are the DOCUMENTED convention in CLAUDE/AGENTS; a codemod
  contradicts it — register note), **health 503** (C-6 — one-line semantic alignment,
  ripples the pinned 500 claims across docs; register note), **orderNumber collision
  retry** (prior register), **unthrottled GETs** (prior register).
- **Rejected after evaluation** (audit L-5): the "Today 2pm cutoff contradicts the
  2-hour ready promise" claim — the copy reads "ready in 2 hrs" as a within-2-hours
  maximum; an order at 13:59 for a 14:00 slot satisfies it. Not a bug; no change.

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| same-key double-POST: 201 then 200 with the SAME orderNumber; tampines decremented exactly once | e2e (RED) | F-1 duplicate orders |
| storeSlug boundary temporarily reverted → spec fails AND zero residue (the net proven live) | e2e (injected probe) | F-2 residue on regression |
| `catalogMaxDiscountPercent()` = 24 from the catalogue; hero/strip/offers copy + pins derive | unit RED + e2e (derived) | F-3 copy/catalogue drift |
| track: numeric orderNumber → 422 VALIDATION (today 404); promo: numeric code → 422 VALIDATION (today INVALID_PROMO); reviews GET `?productId=1.5` → 422 (today 200) | e2e (RED) | F-5 type coercion |
| both error boundaries import PERSISTED_STORAGE_KEYS (fs-pin) | unit (invariant) | F-6 seam drift |
| reviews same-timestamp pair renders id-desc (SQL-seeded) | e2e (invariant) | F-7 non-determinism |
| `meta[name=twitter:card]` on / and a PDP; og:image width/height; PDP JSON-LD `offers.priceValidUntil` = campaignEnd | e2e (RED) | F-8 SEO completion |
| env-example origin claim pins the SITE_ORIGIN truth | unit (pin extension) | F-4 docs rot |
| existing pins re-run (unit + e2e) | both | money journeys, LOW_STOCK/TOCTOU, settle discipline, metadata blanket, docs-counts |

## 4. Execution order (vertical slices, red → green each)

1. **Test-residue parity slice**: ToDo-2 (five safety nets; honest-RED via the temporary
   storeSlug-whitelist revert, residue verified by direct SQL before/after).
2. **Idempotent-checkout slice**: ToDo-1 (e2e RED → schema column + unique → placeOrder
   fast-path/23505 replay → route key validation → client mint → GREEN; journey +
   oversell + boundary siblings re-run green; zero residue).
3. **Derived-copy slice**: ToDo-3 (unit RED → `catalogMaxDiscountPercent` → five sites +
   fee-copy derivation → e2e pins derive → GREEN).
4. **Read-boundary parity slice**: ToDo-5 (three e2e REDs → typeof guards → GREEN).
5. **Seam + schema hygiene slice**: ToDo-6 (PERSISTED_STORAGE_KEYS + fs-pin) + ToDo-7
   (schema DDL via `drizzle-kit push`, SQL-verified; reviews tie-break + pin).
6. **SEO completion slice**: ToDo-8 (e2e RED → twitter card + OG dimensions +
   priceValidUntil → GREEN).
7. **Docs-truth + reporter slice**: ToDo-4 (.env.example note, spec comment, ilike
   claims, dotenv removal, env-example pin extension) + ToDo-9 (HTML reporter).
8. **Docs lockstep**: counts sweep (AGENTS/CLAUDE/README/PAD/SKILL to the new totals —
   the docs-counts pin enforces all five), PAD v1.11.0 (revision block, AUD-3 disproof
   row, register updates incl. the TRUST_PROXY design sketch + the L-3/L-5/C-6 notes),
   SKILL v2.0.0 (new lessons), worklog Task 126, this plan archived, `.env.example`
   re-verified (contract unchanged — no new env variables; idempotencyKey is a payload
   field, not an env var).
9. **Full gate**: lint → typecheck → typecheck:tests → unit (new total) → cold build
   (`rm -rf .next`) → e2e (new total, zero residue verified by direct SQL) →
   dev-server screenshots of the changed surfaces into `docs/screenshots/`.
10. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py` with the
    mandatory `--remote` override; session log as the follow-up commit.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this run (my own
  line-level reads of the five spec blocks + the sibling net patterns, the checkout
  route + placeOrder transaction + checkout page submit, the track/promo/reviews routes,
  utils.ts constants, schema.ts, both error boundaries, the offers/hero/Header copy
  sites, the PDP JSON-LD + metadata, layout.tsx, playwright.config.ts, .env.example,
  docker-compose.yml, the env-example test).
- F-1's replay design: the unique index makes the loser's INSERT fail inside its
  transaction → rollback (no decrement) → the 23505 catch re-selects by key. The
  pre-transaction fast-path covers the sequential case; the 23505 catch covers the
  concurrent case; the FOR UPDATE lock order is unchanged. The e2e webServer boots the
  production build with the pinned DB — `drizzle-kit push` runs before the suite.
- F-1's client mint: `useState(() => mint())` re-runs the initializer on hydration —
  the SSR-minted and client-minted keys differ, which is safe (the key is never
  rendered; only the submitting client's key matters). `crypto.randomUUID` exists on
  secure contexts + Node 20; the try/catch fallback (homenest's D-4 lesson) covers
  plain-HTTP LAN.
- F-2's injected-RED follows the Task-124 F-2 precedent (temporarily revert a boundary,
  observe the stranded row, prove the net, restore).
- F-3's interpolation sites: Header.tsx (client) already imports from catalog.ts
  (`effectivePromo` is imported by checkout page — the module is client-safe); the
  offers metadata is a module-level const in a server module — template at module scope.
  Fee-copy derivation uses the cent-divided form (`$${FEE / 100}`) to preserve the
  marketing-string style ("$12", "$200+"), NOT formatSGD (which renders "$200.00").
- F-5's caps from Task-125 F-3 stay (length checks after the typeof guards).
- F-7's DDL: dropping a redundant INDEX and a COLUMN DEFAULT, adding one INDEX — no
  data change; `drizzle-kit push` on the live pinned DB; verified by direct SQL.
- F-8's OG dimension declarations are TRUE for every current URL (all pin h=627&w=1200
  — grep-verified in catalog.ts); twitter:card inherits via Next's metadata resolution;
  priceValidUntil composes the existing rolling `campaignEnd()` (no new invented date).
- No new runtime dependencies (dotenv is REMOVED); no new env variables; the
  docs-counts pin sweeps all five operator docs at the final counts. Expected new
  totals: unit 145 + ~5 ≈ 150; e2e 97 + ~7 ≈ 104 — exact counts locked by the
  docs-counts pin at gate time.

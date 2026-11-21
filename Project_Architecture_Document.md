# NORDHEM Singapore — Master Project Architecture Document (PAD) v1.28.0

**Classification:** Internal Engineering Reference
**Status:** DEFINITIVE, PRODUCTION-LOCKED BLUEPRINT
**Companion Documents:** `docs/implementation-plan.md` (build decision record) · `docs/reference-investigation.md` (reference-site evidence dossier) · `AGENTS.md` / `CLAUDE.md` (agent instructions) · `README.md` (product view) · `home-furnishing-store_SKILL.md` (distilled engineering memory)
**Last Updated:** 2026-11-21
**Audience:** Senior Engineers, Tech Leads, DevOps, and Onboarding Engineers (human and AI)
**Rule:** Every architectural decision in this document traces to a specific rationale.
Nothing is here "because it's popular."

#### Revision Block — v1.19.0 (Task 134 — cart-duplicate e2e parity, order-URL decode pin, stepper ceiling state, addLine floor clamp, TZ-pin widening, docs gate truth)

- `[TST]` **The cart duplicate-payload seam shipped unit-only coverage (F-1,
  MEDIUM — the cycle's headline)**: Task 133's uniqueness fix pinned the
  wishlist half at BOTH tiers (unit + the e2e probe) while the cart half —
  the more severe consequence of the two (duplicate `key={productId}` React
  keys + a doubled subtotal display, the predicate's own comment) — carried
  the unit pin alone; the only `nordhem_cart_v1` e2e seeding site wrote a
  single VALID line. The sibling probe now exists (duplicated payload → the
  degraded honest empty bag, never doubled lines/subtotal), honest-RED by
  mutation (the Set check disabled → the probe REDs against the mutant).
- `[TST]` **The `/order/[number]` decode-throw corner was unpinned — and
  pinning it surfaced a live platform truth (F-2, MEDIUM→reframed)**: a RAW
  malformed-percent request (`/order/%ZZ` byte-for-byte, or valid-percent
  malformed-UTF-8 `%E0%A4%A`) is rejected INSIDE Next 16's routing layer
  before any app code runs (the route matcher's own decodeURIComponent
  throws DecodeError — prod: bare platform 500 with no log; dev: 400),
  un-interceptable by pages/middleware, and browser URL parsers normalize a
  lone `%` to `%25` first — so the raw class is curl/craft-only (register
  row). The page-level URIError guard (Task-118 F-15) is defensive depth on
  this Next version — proven by hoist-mutation (the probe stayed GREEN, so
  the guard never fires through the public interface). The pin landed on
  the browser-reachable normalized form: `/order/%25ZZ` → not-found, never
  a 5xx, never the outage copy. The Task-133 case-sibling's negative
  assertion was repaired in passing (its typographic apostrophe never
  matched the rendered `can&apos;t` — a permanent no-op, the Task-131
  broken-locator class).
- `[COR]` **The stepper ceilings were the un-pinned mirror of the pinned
  floors (F-3, LOW)**: every `−` control was floor-disabled and e2e-pinned
  (Tasks 120/121/122) while the three `+` controls — cart, BuyBox, business
  quote — stayed enabled-but-inert at their 99/99/200 caps (the setQty
  clamp is invisible to the shopper). All three now carry the mirrored
  `disabled={…}` + ceiling pins (cart: seeded qty-99 payload; PDP: the qty
  input's own clamp; business: 198-click drive), TRUE-RED first.
- `[COR]` **addLine's found-branch lacked the floor clamp its sibling had
  (F-4, INFO)**: `Math.min(99, l.qty + qty)` — a programmatic negative-qty
  add stored a negative line (no UI path passes one; hardening). Both
  branches now clamp 1–99, fs-pinned (the server-data fulfilment-seam
  precedent — addLine is module-internal).
- `[DOC]` **The MAX_INT4 comment overstated its rollout (F-5, INFO)**:
  "every id-taking verb refuses above it with 422" — checkout's lines[]
  DROP out-of-range ids via the catalogue `byId.get` (EMPTY_BAG) — the
  documented stance, now named in the comment as the deliberate exception.
- `[TST]` **The TZ zless fs-pin's two blind spots (F-6, INFO — both
  mutation-proven, the second caught ONLY because the demo was run)**: the
  scan now covers all three quote forms (a single-quoted/backtick Z-less
  literal escaped the double-quoted-only regex) and fractional-seconds
  literals — where the naive fix false-positives: the optional fraction
  group backtracks to empty (lookahead tests `.`) and `\d+` gives back
  digits (lookahead tests a stray `0`); the lookahead now rejects `.` AND
  digits, closing both backtracking splits — a legitimate `.500Z` never
  flags while a Z-less `.500` still does.
- `[DOC]` **Docs-truth pass (D-1..D-4, 1 MEDIUM + 2 LOW + 1 INFO)**:
  README's push-gate line omitted `typecheck:tests` AND the suites — the
  real sixth-doc outlier (the Task-133 "5-of-6" claim was 4-of-6 before
  its fix and README stayed short after it); README's Task-133 baseline
  count 177/116 → 177/117; SKILL §11's lockstep list omitted
  `docs/DEPLOYMENT.md`; the AGENTS/PAD unit-suite summaries omitted the
  server-data fulfilment-seam fs-pin (the tenth unit file).

#### Revision Block — v1.28.0 (Task 143 — orderSuffix mint-space fold fix, seedInventoryRows store-derivation, vitest config .mts rename)

- `[SEC]` **The orderSuffix mint silently folded the top half of its uint32 mint space (J-1, LOW — the cycle's headline)**: 4 crypto bytes → uint32 → `toString(36).padStart(6,"0").slice(0,6)` — but a uniform uint32 exceeds 36^6 (2,176,782,336) **49.2% of the time**, and slicing the 7-char string drops the LAST base36 digit, mapping `v → floor(v/36)`: the entire top half folded onto values the bottom half also produces directly (37 preimages for the heaviest suffix; 98 collision pairs observed in 200k mints vs ~9.19 expected — ~10× the uniform rate) while the seam comment claimed "~2^31 entropy". The order number is half of the PII lookup pair (`/track-order` + the number-only `/order/[number]`); exploitability stays contained (email pair, 20/min/IP, the unique index + clean retry) but the birthday bound effectively dropped ~55k → ~21k orders/day. Fix: the `& 0x7fffffff` mask before base36 — 2^31−1 < 36^6, so every masked value is ≤ 6 chars, uniform over ~2^31, and the comment is now TRUE. Pin: the deterministic truncation-region fill (`[0,0,0,0x90]` → uint32 2,415,919,104 → MUST mint the masked `4FTI4G`, never the folded `13YDJ4`), TRUE RED observed. All pre-existing pins stay green (verified: `[1,0,0,0]→000001`, `[0,1,0,0]→000074`, the 6-char regex on `[255,255,255,255]`).
- `[COR]` **The inventory seed was positionally pinned to exactly 3 stores (J-2, INFO — the derivation discipline one tier short)**: ensureSeed's three hand-written pushes indexed `STORES[0..2]` — a 4th seed store would seed ZERO inventory rows (every checkout selecting it refuses LOW_STOCK "Only 0 left"), and a store REMOVAL threw on `undefined.slug` inside the seed (swallowed — reads degrade, the write path dies). The rows now derive from the STORES catalogue via the `seedInventoryRows(productId)` pure seam in `src/lib/catalog.ts` (index-derived depth offsets +8/−4/−10…, aisle letters A/C/E… + B/D/F…, bin moduli 24/20/16… + 12/10/8… — byte-identical 72 rows @ 1379 for the current seed, so the seeded-DB contract is unchanged). Pins: behavioral (every seed slug covered exactly once; the documented 72@1379 total; well-formed aisle-bin pairs) + the structural fs-pin (ensureSeed consumes the seam; ZERO positional `STORES[≥1]` indices — `STORES[0]` stays sanctioned for the placeOrder default the Task-140 F-3 pin requires). Mutation-honest RED on both layers (the positional revert fails the fs-pin; a 4-store stub demonstrates the stranded-store gap).
- `[HYG]` **The vitest config joined Vite's native-config-loader future (J-3, INFO)**: every unit run printed the `configLoader: 'native'` warning (ESM syntax — `import.meta.dirname` — in a file loaded as CommonJS; the native loader is planned as Vite's future default). Renamed `vitest.config.ts` → `vitest.config.mts` (ESM-native); the warning is gone, the suite is byte-identical, and the four live operator-doc references follow. `playwright.config.ts` needed NO change — its Task-142 boot contract (`reuseExistingServer: false` + `TRUST_PROXY: "1"`) re-verified green inside the 146/146 run.
- `[REG]` **Registered (evaluated; DECISIONS recorded)**: `ely-beauty_SKILL.md` at the repo root stays (already documented as historical in AGENTS.md §"Inherited ely-beauty artifacts" — provenance curation, excluded from every gate); the prose store-name enumerations (stores/page ×2, home ×2, layout — "Tampines, Jurong and Alexandra" beside derived counts) stay the PAD-registered editorial-enumeration class (every count and functional list already derives; revisit if the store catalogue ever actually changes); the vitest `isolate: false` perf hint stays unadopted (a worker-semantics change for ~0.8s on a 1.5s suite). The prior cycles' standing register (full nonce CSP, GET throttling → edge layer, jsdom, store-picker wiring + predicate, schema seed-slug defaults, submitReview tx window, footer editorial links) carries forward unchanged.
- `[DOC]` **Docs-truth: zero mismatches at audit; count-lockstep swept** (unit 218 / e2e 146 / gotoHydrated 59+2 across the six live-tense doc sites; the historical "Suite grew to" ledgers keep their era counts per the history rule).

#### Revision Block — v1.27.0 (Task 142 — track-order full-field gate, reviews POST field gate, XFF docs-truth pin, e2e boot-contract pin, fetch-failure fixed copy, dead-export retirement)

- `[COR]` **The track-order nested gate reached `orderNumber` + the items ARRAY but not the FIELDS the success render interpolates (H-1, LOW — the Task-141 F-3 class one level deeper)**: a contract-violating `{ok:true, data:{order:{orderNumber}, items:[]}}` (a sibling scalar absent) passed the gate and crashed the render inside `storeName(found.order.storeSlug)` — `slug.trim()` on undefined → TypeError → the error boundary; a `null` items element crashed `items.map` the same way. The gate now covers the FULL interpolated set (orderNumber/fullName/status/deliveryMethod/deliverySlot/storeSlug strings, totalCents number, items element shape id/name/qty/unitPriceCents). Pin: the order-present-but-degenerate e2e probe, TRUE RED before the fix.
- `[COR]` **The ReviewSection POST gate was truthiness-only (H-2, LOW — the Task-140 F-5 class at its last POST consumer)**: a well-formed `200 {ok:true, data:{}}` prepended a BLANK review card (`key={undefined}`), bumped "Reviews (N)" to a number the list disavowed, and rendered the success note. The gate now reaches the interpolated fields (`id` number, `author`/`body` strings, `rating` number — title/verified/createdAt keep their graceful fallbacks). Pin: the fieldless-envelope e2e probe (scoped alert, count unchanged, no card), TRUE RED before the fix.
- `[DOC]` **The "16 XFF-identity probes" claim was wrong ON ARRIVAL — nothing computed the number (H-3, LOW)**: the fs reality was 39 `x-forwarded-for` sites / 36 distinct identities (already 39 at the Task-141 base). The four claim sites corrected (AGENTS ×2, PAD, the playwright.config comment) AND the docs-counts pin now fs-computes both numbers and holds the claims — the class cannot rot again. GREEN-on-arrival after the corrections (mutation-honest).
- `[HYG]` **The e2e boot contract is pinned — `reuseExistingServer: false` (H-4, LOW)**: the old `!process.env.CI` form silently reused a stale `:3100` server WITHOUT the pinned env — every XFF identity collapsed into the shared "direct" bucket and unrelated specs 429'd mid-suite (newly load-bearing since the Task-141 gate). The suite now ALWAYS boots its own pinned server; a stale `:3100` fails immediately with EADDRINUSE (`pkill -f next-server` — the documented pattern). Pin: the rate-limit fs-pin on playwright.config.ts (both `TRUST_PROXY: "1"` AND `reuseExistingServer: false` — the previously-unpinned Task-141 env declaration closed too), TRUE RED before the flip.
- `[HYG]` **Four more dead `export` keywords retired (H-5, INFO — the Task-141 F-7 residue outside its six-file scope)**: `Totals` (utils), `ReviewVM` (ReviewSection), `StockRow` (BuyBox), `ShopInitial` (shop-inner) — internal-only, 0 external references each (census-verified across src/ AND tests/); the typecheck gate is the vehicle.
- `[COR]` **The four client POST consumers rendered RAW BROWSER ERROR TEXT on a transport failure (H-6, INFO — the Task-119 fixed-copy class completed to the POST seams)**: checkout/track-order/reviews/cart-promo interpolated `err.message` — correct for envelope refusals (the server's honest 422 copy) but a transport failure leaked "Failed to fetch" (browser-dependent TypeError text) into the customer-facing alert. The fetch+json-parse seam now throws FIXED service copy; the envelope refusals keep the server copy. Pins: four route-abort e2e probes, all TRUE RED before the fix.
- `[REG]` **Registered (evaluated; DECISIONS recorded)**: the schema seed-slug defaults (`default("living")`/`default("tampines")` in db/schema.ts) are DORMANT — every insert path names the columns explicitly; dropping them means a DDL re-push for unreachable behavior (revisit when a DDL cycle lands for cause); the `nordhem_store` type-only predicate tightens WITH the registered store-picker wiring (feature work); the `submitReview` check-then-insert window is theoretical (no product-deletion flow exists — wrap in a transaction or catch FK 23503 if one ever lands); the footer's editorial category links stay curated (a departed slug degrades to an empty grid — degrade-never-fail holds; same kept decision as the prose store-name enumerations).
- `[DOC]` **Docs-truth: zero mismatches at audit; count-lockstep swept** (unit 213 / e2e 146 / gotoHydrated 59+2 across the six live-tense doc sites; the historical "Suite grew to" ledgers keep their era counts per the history rule).

#### Revision Block — v1.26.0 (Task 141 — Header store-default derivation, checkout/track-order envelope field gates, reduced CSP, no-store recovery refetch, dead-export retirement, TRUST_PROXY rate-limit gate)

- `[COR]` **The checkout success path interpolated an ungated field — a contract-violating envelope cleared the bag and navigated to `/order/undefined` (F-2, LOW — the Task-140 F-5 class at its last consumer)**: the submit gate stopped at `!json.data` truthiness while the very next statements ran `clear()` + `router.push(/order/${json.data.orderNumber}/)`. A well-formed-status `200 {ok:true, data:{}}` emptied the cart and landed the shopper on "We can't find that order" after a SUCCESSFUL order. The gate now reaches the field the success path consumes (`typeof json.data.orderNumber !== "string"` joins the refusal — the refusal fires BEFORE `clear()`/navigation; the Task-128 boundary discipline at the final client-side coercing seam). Pin: the route-fulfilled e2e probe (scoped alert, URL stays /checkout, bag preserved), TRUE RED before the fix.
- `[COR]` **The track-order success render gated on `json.data` truthiness while interpolating NESTED fields (F-3, LOW — the F-2 sibling one level deeper)**: `setFound(json.data)` accepted a `{ok:true, data:{}}` envelope and the render threw a TypeError on `found.order.orderNumber` (the error boundary, not the page's own scoped-error path). The gate now reaches the nested shape (`order?.orderNumber` string + `items` array join the refusal). Pin: the route-fulfilled e2e probe (scoped alert, form still rendered, no order card), TRUE RED before the fix.
- `[COR]` **The Header store-picker default was the last hand-copied store literal (F-1, LOW — the Task-140 F-3 class at its sixth site)**: `createLocalStore("nordhem_store", "Tampines", …)` — the capitalized DISPLAY label, invisible to the Task-140 pin's case-sensitive lowercase-slug ban across its three consumers. A store rename/reorder strands the picker's default on no `<option>` while every other surface self-corrects. The default now derives through the display seam (`storeName(STORES[0].slug)` — byte-identical today, zero behavior change). Pin: the 4th-consumer fs-pin in the Task-140 F-3 describe (label banned, derivation present), TRUE RED before the fix.
- `[SEC]` **The reduced CSP joined the platform header set — the register's CSP split, promoted half (F-4, INFO promoted)**: `Content-Security-Policy: object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` on every response (object-src closes the plugin/object embed vector; base-uri defeats `<base>`-injection URL hijacking; frame-ancestors complements XFO; form-action pins submissions to self — no cross-origin form targets exist). Deliberately NO default-src/script-src/img-src: Next.js hydration needs inline flight scripts; the FULL nonce CSP stays deferred (the per-request-nonce + `await connection()` discipline on prerendered hydrating shells — the homenest silent-no-hydration trap). Pin: the security-headers e2e spec extension (four directives asserted on a page and an API route), TRUE RED before the fix (header absent).
- `[SEC]` **TRUST_PROXY — the rate-limit IP derivation now trusts XFF only behind an explicit, fail-closed operator declaration (G — the register promotion, the cycle's headline)**: `clientIp()` took the rightmost `x-forwarded-for` hop unconditionally — correct behind exactly one appending proxy, but on a DIRECT deploy (this repo's documented single-node posture) the client's own spoofed XFF IS the rightmost hop: rotating the header minted a fresh 20/min bucket per request (the register's verified bypass class). The gate: no XFF is read unless `TRUST_PROXY` is exactly `"1"`; every other value (unset, `"0"`, `"true"`, garbage) fails closed to the shared `"direct"` bucket — honest direct-deploy visitors (who send no XFF) see no change, spoofers lose the rotation. Coordinated: the e2e webServer pins `TRUST_PROXY=1` (the suite's 39 x-forwarded-for probe sites (36 distinct identities) keep their buckets), `.env.example` documents the commented gate (never an active assignment — the copy-paste default stays fail-closed), and the env-doc unit pin holds the block against drift. Pins: the three-test gate matrix in rate-limit.test.ts (unset → direct even with XFF; non-"1" values → direct; "1" → rightmost hop), the two TRUE-RED members observed before the fix.
- `[HYG]` **The recovery refetch is now `cache: "no-store"` (F-5, INFO)**: the post-write truth fetch must never be answered from an HTTP-cache heuristic (theoretical today — force-dynamic route, no prior GET on the URL in-page — but one word makes the contract explicit). Pin: the no-store fs-pin, TRUE RED before the fix. **Eleven dead `export` keywords retired** (F-7, INFO — the Task-138 F-4 class, miniature): `SeedCategory/SeedProduct/SeedStore/SeedInspiration/PromoLike` (catalog), `CheckoutInput/PlaceOrderResult` (server-data), `TotalsInput/ProductSortKey` (utils), `RateLimiter/RateLimiterOptions` (rate-limit), `LocalStore` (local-store), `CartLine` (cart-store) — all internal-only (0 external references each, census-verified); the typecheck gate is the vehicle.
- `[REG]` **Registered (evaluated; DECISIONS recorded)**: the FULL nonce CSP stays deferred (the promoted half above covers the no-risk directives); GET throttling stays deferred with verified rationale (no expensive/unbounded GET exists — every response row-capped, no pagination surface; the catalogue PAGES are equally unthrottled force-dynamic reads, so an /api-only limiter is partial coverage; fullyParallel e2e would contaminate a shared GET bucket; the correct full fix is edge/proxy rate limiting); the jsdom component-test layer stays deferred (zero component tests by design; every settle-discipline window already deterministically e2e-pinned; a second tier costs two dev deps + config + count churn for one theoretical cross-tab race); the store-picker wiring stays registered (feature work); the globals.css cursor-rule layer placement (unlayered today — stronger than `@layer base`, zero conflicting usage) and the checkout route's method-blind absent-slot default (fail-closed with honest copy; the UI always sends the slot) both evaluated and registered without churn.
- `[DOC]` **Docs-truth: zero mismatches at audit; count-lockstep swept** (unit 213 / e2e 146 / gotoHydrated 59+2 across the six live-tense doc sites; the historical "Suite grew to" ledgers keep their era counts per the history rule).

#### Revision Block — v1.25.0 (Task 140 — recovery-count honesty, wishlist removal settle, checkout default derivation, Tailwind v4 button cursor, promo label gate, PDP scan dedup)

- `[COR]` **The ReviewSection post-recovery count claim was minted from zero (F-1, MEDIUM — the cycle's headline; the Task-139 registered item, promoted and fixed)**: under the PARTIAL-outage branch (`reviews === null`, `reviewCount === 42`) the PDP's `total={reviewsUnavailable ? undefined : liveCount}` ternary discarded a count the page provably KNEW at SSR time — the section seeded `count = 0`, and the first successful POST (the Task-137 F-1 recovery flip) rendered "Reviews (1)" while the DB held 43. Three coordinated changes: the PDP passes `total={liveCount}` UNCONDITIONALLY (the outage honesty is owned by the `sectionUnavailable` heading gate — the claim is suppressed while unavailable, so the partial branch resumes at `liveCount + 1`); the reviews GET route gains an additive `count` field (the TRUE row count via `getReviewCount` beside the capped `data` array; a null count joins the null list in the DB_DOWN envelope — the unified-signal discipline); and ReviewSection, on a successful POST that recovers an unavailable section, refetches the GET envelope and adopts the server truth (`setCount(json.count ?? data.length)` — the full-outage branch's understatement now lives only for the refetch's own in-flight window; a failed refetch keeps the POST-applied state — degrade-never-fail). Pins: the e2e GET-count probe (`count === data.length` below the 20-row cap) + two unit fs-pins (the page's unconditional `total={liveCount}` form; the component's refetch consumption), all TRUE RED before the fix.
- `[COR]` **The wishlist removal window quoted the departed view's count (F-2, LOW — the Task-130 F-8 honesty class on the axis it missed)**: `loading` starts true and only ever settles false, so a heart-removal left the heading rendering the STALE resolved count ("2") above the departed card while the Header badge already said the truth (1), for one fetch duration. A `resolvedFor` settle marker (the wishlist signature the current items were resolved FOR) now gates the heading: while it disagrees with the live wishlist the heading quotes the persisted `wishlist.length` (the same honest fallback loading/error use). The grid keeps the departed card for the window (pessimistic-refetch UX, no layout jump — the deliberate scope line). Pin: the route-delayed e2e probe (deterministically widens the window), TRUE RED before the fix.
- `[COR]` **The checkout default literals were hand-copied at five sites with a click-collect-only stale-slot guard (F-3, LOW)**: the default slot literal existed at three sites and the default store slug at three (page form state, API route `??` fallbacks, the `placeOrder` `||` default) — none derived from the seams, unlike the pinned `SORT_KEYS`/`storeName`/`STORES.length` disciplines. A slot-label rename would drift the page default: the controlled `<select>` displays the renamed first option while `form.slot` submits the departed literal, and the adjust guard covered click-collect only — every default delivery checkout would 422 on its own default (fail-closed, but a real drift trap). Every default now derives from the seams (`DELIVERY_SLOTS.delivery[0]`, `STORES[0].slug` — page + route + server-data default + the ensureSeed inventory rows), the guard covers EVERY method (safe by construction: the delivery set is unfiltered, a valid held slot never resets), and the existing e2e `toHaveValue` pin derives its expectation from the imported seam. Pins: two unit fs-pins (the literals banned from the three consumer files while the derivations are present at all five sites) + the Task-131 F-2 fulfilStore pin updated in lockstep (intent preserved: derived exactly once), all TRUE RED before the fix.
- `[COR]` **Tailwind v4's preflight ships buttons without `cursor: pointer` (F-4, LOW — the v4 trap log's known change, live in this codebase)**: browser-verified at audit — every `<button>` in the storefront computed `cursor: default` (hamburger, Add to bag, Search, Go, steppers, star rating, Publish review). The v3→v4 preflight dropped the base rule (the same revision that changed `outline-none`'s computed shape — already pinned at Task 120 F-7). One base rule in `globals.css` restores it for enabled controls (`button:not(:disabled) { cursor: pointer; }`); disabled controls keep the default (correct semantics); no `[role="button"]` usage exists in `src/` (verified). Pin: the computed-cursor e2e probe on the PDP's Add-to-bag CTA, TRUE RED before the fix ("default").
- `[COR]` **The cart promo apply gate stopped at `json.data` truthiness (F-5, INFO — the Task-137 F-2 class, one field short)**: a contract-violating `200 {ok:true, data:{}}` passed the gate and rendered "WELCOME10 applied — undefined". The gate now reaches the FIELD the success copy interpolates (`typeof json.data.label !== "string"` joins the refusal set — the Task-128 boundary discipline mirrored at the last client-side coercing seam). Pin: the route-fulfilled labelless-envelope e2e probe (scoped alert, no "applied" copy, no Remove button), TRUE RED before the fix.
- `[PERF]` **Three `getAllProducts()` table scans per PDP request collapsed into one (F-6, INFO — the Task-139 registered candidate)**: `generateMetadata` → `getProductBySlug` (#1), the page body → `getProductBySlug` (#2), and the related-products rail → `getAllProducts` (#3). The seam is now React `cache()`-wrapped (the Next.js-documented RSC request-scope dedup): identical results within one request including the degrade fallback, route handlers share the scope. Pin: the unit fs-pin on the wrapped export form, TRUE RED before the fix.
- `[REG]` **Registered (evaluated; DECISIONS recorded)**: the stores/categories read-funnel question is CLOSED — the static catalogue stays the read truth (`CATEGORIES`/`STORES` are consumed synchronously by client components; an async DB read would restructure every consumer for zero behaviour gain at this catalogue size; the tables remain the `ensureSeed` projection, write-only by design); CSP stays deferred (the per-request-nonce + `await connection()` discipline on prerendered hydrating pages — the homenest trap log's silent-no-hydration failure mode); the store-picker wiring (PAD register) is new feature work, not a bug fix; TRUST_PROXY / GET throttling / jsdom layer unchanged.
- `[DOC]` **Docs-truth: zero mismatches at audit; count-lockstep swept** (unit 205 / e2e 137 / gotoHydrated 48+2 across the six live-tense doc sites; the historical "Suite grew to" ledgers keep their era counts per the history rule).

#### Revision Block — v1.24.0 (Task 139 — store-count derivation completion, gotoHydrated docs-claims pin, starter-kit guard polarity proof, dead-export retirement)

- `[COR]` **The store COUNT survived as hand-drawn literals on /stores and /sustainability (F-1, LOW — the cycle's headline)**: the Task-138 F-2 pin scoped its negative checks to the two files it fixed (`src/app/page.tsx` + the checkout route), so four sibling sites kept hand-drawn counts with every gate green — the /stores metadata description + og description ("Three NORDHEM stores on one island…") + the h1 ("Three stores, one island") and the /sustainability stat card ("All 3 SG stores + warehouse since 2024."); compounding, the e2e metadata-blanket pin ASSERTED the hand-copied form (`["/stores", /Three NORDHEM stores/]`). All four interpolate `STORES.length` now (digit form, the Task-138 idiom), the e2e expectation derives from the seed, and the new fs-pin is BLAST-RADIUS-scoped — the three literal forms must not exist anywhere under `src/` (readdir walk), so the next tier-over cannot land silently. TRUE RED observed before the fix ("expected 0 to be greater than or equal to 3").
- `[TST]` **The gotoHydrated count claims were live-tense but unpinned (F-2, LOW)**: AGENTS ×2 + CLAUDE + PAD carried 45/47/45+2 claims no test enforced — the next interaction-first spec added or removed would drift every claim with all gates green (the copied-count drift class the docs-counts pin exists to kill). docs-counts now fs-computes the per-spec `gotoHydrated(` counts (helpers excluded — it defines the helper) and fails the run if any of the four claim sites drifts. GREEN-on-arrival (the docs were true); mutation-honest RED demonstrated by a temporary AGENTS "45"→"44" edit, then byte-clean restore.
- `[TST]` **The Task-138 F-6 starter-kit pin was presence-only (F-3, INFO — polarity-blind)**: its three assertions were satisfiable by an INVERTED ternary (neutral copy when the trio IS complete — the exact falsehood F-6 fixed). The strengthened form pins POLARITY: the joined source must contain the guard expression followed on its TRUE branch by the trio copy with the neutral fallback on the FALSE branch. Mutation-proven twice — the `===`→`!==` inversion AND the subtler branch-swap (which leaves every original presence assertion green) each REDed the pin.
- `[COR]` **One dead `export` retired (F-4, INFO)**: `CLICK_COLLECT_TODAY_CUTOFF_SGT_HOUR` in `utils.ts` was consumed only inside its own module (`availableDeliverySlots`) — the keyword implied a consumer that never existed (the Task-138 F-4 class, miniature). Module-private now; the typecheck gate proves the deletion.
- `[REG]` **Registered (evaluated and kept)**: the ReviewSection post-recovery understatement (after a reviews-seam SSR outage a successful POST flips `sectionUnavailable` false and increments the count to 1 — the historical reviews are never refetched, so the heading can read "Reviews (1)" while the DB holds more; the visible list and count agree with each other — the honesty rule the repo polices — and the behaviour is the pinned Task-137 F-1 design; refetch-on-recovery documented as a future option), and the editorial store-name ENUMERATIONS ("Tampines, Jurong and Alexandra" prose — a name edit is visible copy review, not a silent seed drift; the count is the lie-vector F-1 closes).
- `[DOC]` **Docs-truth: zero mismatches at audit; count-lockstep swept** (unit 200 / e2e 133 / gotoHydrated 45+2 across the six live-tense doc sites; the historical "Suite grew to" ledgers keep their era counts per the history rule).

#### Revision Block — v1.23.0 (Task 138 — shop resync-window honesty, store-count derivation, discount-seam unification, dead-export retirement, fee-copy derivation, starter-kit guard)

- `[COR]` **The shop resync window rendered the departed view's rows and count above the new heading (F-1, LOW — the cycle's headline)**: the Task-137 F-5 strip gate closed the `loading || error` states, but the resync window BETWEEN server views stayed outside it — the resync resets `items` only on the server view (`q === "" && max === 0`), and `setLoading(true)` fired only inside the 250 ms debounce callback, so a category/sort navigation under an active keyword/price filter rendered the fresh "Kitchen" heading above the PREVIOUS living/oak view's rows with the strip quoting their count (code-traced; browser-reproducible on any slow network). The resync block now flips `loading` for cat/sort transitions (the sanctioned adjust-during-render pattern's own branch) — skeletons + no count claim at the transition itself; typing/slider changes keep the show-previous-results debounce. Pinned by a commit-time DOM capture (MutationObserver keyed on the heading): auto-retrying assertions would bridge the 250 ms window — the probe's first draft false-passed exactly that way, and the corrected form's TRUE RED was re-observed against the temporarily-reverted tree (Received: "1 products · prices include 9% GST · free delivery over $200").
- `[COR]` **The store COUNT was the last hand-duplicated store literal (F-2, LOW)**: the Task-129 derivation closed the store LIST (whitelist, checkout options, Header picker, Footer chips) but the COUNT stayed hand-copied at four sites — the "3" SG-stores hero stat (beside the derived `${FREE_DELIVERY_THRESHOLD_CENTS / 100}+`), "Free at all 3 stores", and the checkout refusal's "Choose one of our three stores." ×2 (beside the seed-derived `STORE_SLUGS` whitelist). All four interpolate `STORES.length` now (fs-pinned): a fourth store in the seed self-corrects every claim.
- `[COR]` **The per-product discount-percent formula was triplicated with no shared seam (F-3, LOW)**: the identical expression lived at the ProductCard chip, the PDP chip and the `catalogMaxDiscountPercent` body — the Task-126 F-3 max-seam landed without its per-product sibling, so a rounding/edge-rule change was a three-place edit whose miss silently desynchronized card chips, PDP chips and the marketing max claim. `productDiscountPercent(p)` in `catalog.ts` is the ONE seam now (the max derivation composes it; both chips consume it), fs-pinned that the formula literal lives only in `catalog.ts`.
- `[TST]` **Three dead `catalog.ts` exports retired (F-4, LOW)**: `findProduct` + `productImage` had zero consumers anywhere; `findPromo` had zero PRODUCTION consumers since Task 122 F-5 moved the display gate to `effectivePromo` (the pins kept pinning a seam no page reads — a maintainer could "fix" display behaviour in dead code). Retired per the Task-114 lesson-8 discipline; the pins' uncovered intent (the seed-drift loop + the empty-code case) repointed at the live seams.
- `[COR]` **The $25 assembly + $190 design-service fee copy was a hand-copied literal pair (F-5, INFO — the pre-Task-126 fee-rot class, miniature)**: seven sites across home/services/PDP while every sibling fee derived from the utils constants. `ASSEMBLY_FEE_CENTS` + `DESIGN_SERVICE_FEE_CENTS` now drive all seven (fs-pinned + the e2e value-level sibling, mutation-proven by a drifted page literal).
- `[COR]` **The offers starter-kit copy asserted the curated slug trio unconditionally (F-6, INFO)**: a departed slug silently shrank the chips while the copy kept asserting "Bed + extendable table + kitchen trolley" (the home HERO_SLUG sibling carries an explicit departure guard). The set-copy now derives from the resolved rows (`KIT_SLUGS` + `bundles.length === KIT_SLUGS.length` → the trio copy or the neutral picks copy, fs-pinned).
- `[DOC]` **Docs-truth: zero mismatches at audit; count-lockstep swept** (unit 198 / e2e 133 / gotoHydrated 45+2 across the six live-tense doc sites; the historical "Suite grew to" ledgers keep their era counts per the history rule).
- `[REG]` **Registered (evaluated and kept)**: the `categories`/`stores` tables are write-only (seeded, never read — zero reachable behavioural delta at the seed=DB invariant; the reachable COUNT-drift tier was fixed as F-2; joins the standing register with both options documented), the 3× `getAllProducts()` scans per PDP request (perf, negligible at 24 rows; the `React cache` suggestion noted), and the `/order/[number]` 200-by-design stance (documented, e2e-pinned `status < 500`).

#### Revision Block — v1.22.0 (Task 137 — PDP unified-outage-signal unification, ReviewSection recovery state, cart-promo envelope-trust completion, outage-branch pin coverage, shop-strip honesty)

- `[COR]` **The PDP reviews-outage signal was SPLIT, not unified (F-1,
  MEDIUM)**: the two review seams degrade independently (separate
  try/catch; a transient per-query failure — pool exhaustion,
  `query_timeout` — can hit one and not the other), and the page ORs the
  nulls into `reviewsUnavailable` — but the JSON-LD `aggregateRating` gate
  trusted `reviewCount` ALONE and the section's `initial` passed the live
  list through. The partial-outage branches contradicted themselves:
  reviews-ok/count-null rendered the "Reviews are unavailable right now"
  note DIRECTLY ABOVE the live reviews, and reviews-null/count-ok
  published an aggregateRating the visible page disavowed (the exact
  Task-121 F-6 rule the code's own comment quotes). The signal is now ONE
  combined rule — EITHER null suppresses the list, the count claim AND the
  structured-data rating together — and `ReviewSection`'s unavailable state
  is RECOVERABLE client state (`useState(!!unavailable)` flipped `false`
  on a successful POST: the note unmounts and the heading resumes its
  count when the write provably landed — the SSR note used to stay frozen
  above the recovered list). Two fs-pins (TRUE RED against the split forms).
- `[COR]` **The cart's promo-apply was the fourth envelope-trust laggard
  (F-2, MEDIUM — the only POST consumer without a data gate)**: a
  well-formed `200 {ok:true}` with NO `data` was treated as success — the
  code persisted into `nordhem_promo` and the false "X applied — discount"
  message rendered. The Task-135/136 class closed at its last sibling:
  `if (!json.ok || !json.data) throw` (e2e-pinned: the route-fulfilled
  probe asserts the scoped alert, no applied copy, and no Remove button).
- `[TST]` **The Task-136 outage branches shipped unpinned (F-3, LOW)**: a
  regression swapping `getOrderByNumber`'s `"outage"` for `null`, or the
  order outage copy for the not-found copy, or the reviews-GET `DB_DOWN`
  envelope for a false empty list would pass every existing gate. The
  seam's URIError-vs-outage discrimination and the four rendered surfaces
  are now fs-pinned — mutation-proven (the Task-131 F-2 precedent for
  DB-touching branches not e2e-reachable without killing the live server).
- `[COR]` **The shop strip quoted a stale count above the error state
  (F-5, LOW — the wishlist-heading honesty sibling, Task 130 F-8)**:
  `items.length` rendered unconditionally, so during the error state the
  strip quoted the PREVIOUS view's rows above the error box. The count
  claim is now gated on `!(loading || error)`; the GST/free-delivery tail
  is static truth and stays (e2e-pinned by the Task-136 probe extension).
- `[DOC]` **Docs-truth: zero mismatches this cycle** (the six-doc audit
  re-verified all live-tense claims against fs reality). Suite grew to
  190 unit + 131 e2e (44 gotoHydrated storefront sites, 46 across both
  files).

#### Revision Block — v1.21.0 (Task 136 — shop-grid envelope-trust completion, DB-funnel golden-rule restoration, reviews degrade honesty, promo in-tx coherence, docs truth)

- `[COR]` **The shop grid was the third client consumer of `/api/products`
  still reading `json.data ?? []` (F-1, MEDIUM)**: Task 135 F-5 gated the
  wishlist + search siblings; the primary catalogue funnel kept the pre-fix
  expression, so a well-formed `200 {ok:true}` with NO data rendered the
  FALSE "0 products" + "Nothing matches those filters" verdict with a
  Clear-filters CTA — indistinguishable from a legitimately empty filter
  result. The grid now gates on `Array.isArray(json.data)`, else the error
  state — the client-resilience class closed across ALL THREE consumers,
  e2e-pinned by the route-fulfilled probe driven by the LOCAL keyword
  filter (the one path that fires the client-side refetch — cat/sort land
  in the atServerView skip via RSC navigation; TRUE RED first).
- `[COR]` **Three sites imported `@/db` directly, contradicting §3.1's
  golden rule (F-2, MEDIUM — the oldest unregistered debt in the tree)**:
  the order page (the literal case the rule names — it hand-rolled the
  decode guard, the trackOrder-normalization parity, and the outage
  authority since Tasks 118/122/133), the reviews POST (the only write
  path outside the funnel — its product-existence read and insert lived
  in the route), and the health route (the infra probe). The order page
  now funnels through the new `getOrderByNumber` seam, the reviews POST
  through the new `submitReview` seam (boundary validation stays at the
  route — PAD §3.1 layering); health stays the DOCUMENTED infra-probe
  exception (it must bypass the degrade by design — it reports DB status
  itself), now named in §3.1 and fs-pinned so only `src/db/**`,
  `server-data.ts`, and `api/health` may import `@/db`.
- `[COR]` **The reviews surface degraded to a FALSE "No reviews yet"
  under Postgres outage (F-3, LOW)**: `getReviews` degraded to `[]` and
  `getReviewCount` to `0` — a product with LIVE reviews rendered
  "Reviews (0)" + the "be the first" invitation, while the seam's own
  comment claimed "the reviews section hides on outage either way" (it
  renders). Both seams now degrade to `null` (the outage signal): the PDP
  renders the honest "Reviews are unavailable right now" note with NO
  count claim, the JSON-LD omits `aggregateRating`, and the API GET
  answers the `DB_DOWN` envelope instead of the false empty list — the
  server-side twin of the fetch-failure ≠ empty-state class, and the
  BuyBox degrade-honesty sibling.
- `[COR]` **The promo was validated OUTSIDE the order transaction (F-4,
  LOW)**: `validatePromo` ran before `createOrder()`'s transaction opened,
  so the committed order carried a `discountCents` derived from promo
  state that could change under the order (row deactivated / min raised) —
  the exact Task-130 F-2 check/act class, applied to the other
  money-shaping input. The re-read is now `FOR UPDATE` INSIDE the
  transaction with the totals derived after it; a promo that went
  inactive under the order refuses with INVALID_PROMO and the whole
  transaction rolls back. The early `validatePromo` stays (fail-fast UX +
  the outage static fallback).
- `[DOC]` **Docs-truth pass (D-1 MEDIUM + D-2 LOW)**: CLAUDE.md's
  gotoHydrated claim mis-scoped 42 as "across the two files" (42 is
  storefront-only; 44 was both) and mis-attributed "three conversions" to
  the mobile spec's 2 sites; the `typecheck:tests` row was a parenthetical,
  not a table row, in AGENTS' Commands + CLAUDE's Build Commands tables.
  Suite grew to 186 unit + 130 e2e (43 gotoHydrated storefront sites, 45
  across both files).

#### Revision Block — v1.20.0 (Task 135 — qty-writer clamp parity, API cat/sort boundary stance, envelope-trust gate, docs truth)

- `[COR]` **The cart-store qty writers were the last qty seams outside the
  shared NaN-safe clamp (F-1, MEDIUM)**: Task 134's F-4 floor fix pinned
  `addLine` while `setLineQty` still read `Math.min(99, Math.floor(qty))` —
  a programmatic `setQty(id, 0.5)` stored a qty-0 line (violating the
  `isValidCartLine` 1–99 contract the load predicate enforces) and
  `setQty(id, NaN)` stored NaN — and the shipped Task-134 literal forms
  themselves never covered the non-finite/fractional class
  (`Math.max(1, NaN)` is NaN; `Math.max(1, 3.7)` is 3.7). All three
  cart-store qty writers (addLine found + new-line + setLineQty) now route
  through the shared `clampInt` seam — the placeOrder/checkout-route
  posture — fs-pinned as the three-writer form with the pre-135 literal
  forms retired (TRUE RED first; no reachable UI path, the hardening-parity
  class this project polices).
- `[COR]` **The `/api/products` boundary applied its `?max` stance to only
  one of its three filter params (F-2, LOW)**: `?cat=zzz` answered
  `200 {ok:true, data:[]}` — a typo'd category masquerading as a
  legitimately empty catalogue — and `?sort=zzz` fell through
  `sortProductList` as an unsorted 200, while `?max=abc` was 422-strict on
  the same route. `cat` now validates against the `CATEGORIES` seed ∪
  `"all"` and `sort` against the exported `SORT_KEYS` seam (utils.ts,
  `satisfies ProductSortKey[]` — the runtime whitelist backing the
  ProductSortKey union) → 422 VALIDATION; the shop PAGE keeps its graceful
  URL-driven posture (degrade, never fail). E2e-pinned with the full
  legitimate-key sweep, and the shop display list is fs-pinned as a subset
  of the seam (the storeName-derivation discipline — the UI can never
  offer what the boundary refuses; mutation-proven).
- `[COR]` **The wishlist and search pages trusted the envelope's `ok`
  without its `data` (F-5, LOW)**: `json.data ?? []` turned a
  well-formed 200 `{ok:true}` with NO `data` into a "resolved empty
  catalogue" — the wishlist rendered the FALSE all-ghost note ("Your saved
  items are no longer available" — the exact false claim the Task-132 F-3
  branch was built to prevent) and search rendered the false "0 results" +
  "No products found" verdict for a resolution that never happened. Both
  pages now gate resolution on `Array.isArray(json.data)`, else the error
  state — the Task-128 body-shape discipline mirrored client-side,
  e2e-pinned by route-fulfilled body-less envelopes beside the Task-119
  fetch-failure pair (TRUE RED first — the probes failed against the
  pre-fix pages).
- `[TST]` **Evaluated and kept (register rows)**: the checkout page's
  render-time wall-clock read for slot options (a server render at
  13:59:59 SGT hydrating at 14:00:01 self-heals a hydration mismatch in a
  seconds-wide daily window — freezing the options per mount would create
  REAL staleness, defeating the Task-125 F-6 adjust-during-render reset);
  the ensureSeed reviews-only partial-seed window (already registered);
  the typographic-apostrophe copy convention (tolerant locators
  documented in the specs).
- `[DOC]` **Docs-truth pass (D-1..D-5, 1 MEDIUM + 4 LOW)**: CLAUDE.md's
  live docs-lockstep claim said "five operator docs" (the pin's scope is
  six — the D-3 class fixed in SKILL §11 last cycle surviving in CLAUDE's
  Testing Strategy); PAD §3.2's era range one cycle trailing (114–133 →
  114–135); the AGENTS/CLAUDE gotoHydrated call-site counts at the
  Task-129-era 38/40 vs the fs-computed 42/44; worklog's Task-134 entry
  missing its `Task ID:` header line; `npm run test:watch` documented in
  none of the six docs' command tables (now in AGENTS/CLAUDE/README).
  Suite grew to 183 unit + 129 e2e.

#### Revision Block — v1.18.0 (Task 133 — reviews int4-overflow bound, typeqty residue-net completion, persisted-payload uniqueness, order-lookup normalization parity, pin-hardening batch)

- `[SEC]` **The reviews boundary 500'd on an int4-overflow productId (F-1,
  MEDIUM — the cycle's headline, proven live)**: a crafted
  `productId: 2147483648` passed every JS gate (number, integer, > 0) but
  the Postgres driver rejects the parameter for the int4 products.id column
  (22003) — the POST answered **500 REVIEW_FAILED for a pure client fault**
  (the exact misclassification the route's own Task-118 F-6 comment claims
  closed; only the UPPER bound was never probed) while the GET silently
  degraded to `{ok:true,data:[]}`, inconsistent with the same route's
  `?productId=1.5` → 422 stance. Fix: the shared `MAX_INT4` constant in
  `utils.ts` bounds BOTH verbs → 422 VALIDATION, e2e-pinned on the pair
  (checkout unaffected — unknown ids drop via the catalogue `byId.get`
  before any DB touch; `/api/products?max=` is JS-side only — both
  verified). This cycle also reworded §6.1's input-bounding row, which
  still documented the retired reviews `slice()` truncation and a phantom
  "store slug (40)" cap (the STORES whitelist is the bound) — the docs
  claim the e2e suite pins.
- `[TST]` **The typeqty e2e RED-run net stranded the inventory decrement
  (F-2, MEDIUM)**: the Task-124-era spec's finally deleted order rows with
  two manual queries but never restored the decrement — the suite's
  "every write-capable refusal spec carries the full net" claim was not
  true for this one relic (both uniform-net sweeps passed it by because it
  *had* a finally). Honest-RED by temporary route mutation: the old net
  stranded the decrement live (product-1 tampines 45→44 with the rows
  deleted); the `deleteProbeOrders` swap restores it on the same mutation
  run; the route reverted byte-identical.
- `[COR]` **The persisted-payload validators accepted duplicates (F-3,
  LOW)**: the shape → element → uniqueness chain lacked its third layer —
  a crafted `["slug","slug"]` wishlist passed the Task-122 element
  predicate while the catalogue returns unique slugs, so the page rendered
  the FALSE "1 saved item is no longer available." above the available
  product's card (the cart sibling: duplicate React keys + a doubled
  subtotal display). Both predicates now reject duplicates (Set-size
  equality; cart keyed on productId) — the payload degrades to the
  fallback like every other wrong shape, unit-pinned + an e2e probe of
  the degraded honest state.
- `[TST]` **`priceTotals`' `net === 0` free-delivery corner was unpinned
  (F-4, LOW)**: the sibling cap pins all used click-collect (fee 0
  regardless) while placeOrder's own comment records the pre-Task-119 copy
  "had already drifted from it on the net===0 delivery edge" — the
  historically load-bearing corner of the money seam. Pinned now (the pin
  is the fix, GREEN-on-arrival).
- `[COR]` **The `/order/[number]` lookup was case/whitespace-sensitive
  while `/track-order` normalized (F-5, LOW)**: a hand-typed lowercase
  order number got "We can't find that order" for an order the tracking
  page found with the SAME input — and the not-found copy then directed
  the shopper to /track-order, where it worked. The page now mirrors the
  track discipline (`.trim().toUpperCase()`), e2e-pinned with a probe
  order + lowercase URL (write-capable spec, full net).
- `[TST]` **The pin-hardening batch (F-6, INFO — three
  GREEN-on-arrival strengthenings, the Task-132 F-2 "satisfied without
  truly binding" class)**: the inspiration-index pieces-total pin derives
  from `INSPIRATIONS`+`PRODUCTS` like the page (was the hardcoded
  "667.00"); the TZ-pure fs-pin also fails on numeric-args Date
  constructors (the string-literal-only scan was blind to the
  year-first-args form — same LOCAL-time class; proven by mutation); the
  PERSISTED_STORAGE_KEYS producer scan is fail-closed (a computed-key
  `createLocalStore` call previously escaped the scan silently — now
  fails by name; proven by mutation). This cycle also corrected two PAD
  §3.2/§7.1 era ranges (114–131 → 114–133) and dropped the phantom `cn`
  helper from the §3.2 tree (retired in Task 118; the CLAUDE/README
  sweeps missed the PAD).

#### Revision Block — v1.17.0 (Task 132 — TZ-pure test gates, fulfilment-pin structural binding, wishlist all-ghost honesty, probe-email uniqueness)

- `[TST]` **The unit gate was timezone-coupled (F-1, MEDIUM — the cycle's
  headline)**: two pins had survived the Task-127/128 getUTC\* swaps as the
  OLD idiom — the orderNumber "today" pin derived its expectation with LOCAL
  getters on the shifted instant (`utils.test.ts:113`) while the impl
  (`utils.ts:162-166`) reads `getUTC*` (a false RED 8h/day on Asia/Singapore
  hosts — the project's own locale — and 16:00–20:59 UTC on
  America/New_York, deterministic simulation), and the campaignEnd pins
  built instants from Z-less date-time literals (parsed as LOCAL time; the
  `2026-12-27T12:00:00` pin went RED on `TZ=America/New_York` this cycle —
  observed live, a deterministic false RED on every host UTC−5 and further
  west). "There is no hosted CI; the local gate is the only gate" — a
  false-RED gate on most of the world's hosts. Fix: the expectation reads
  `getUTC*` (mirroring the impl), all 8 literals Z-suffixed (the sibling
  Task-127 pins' discipline), and a NEW fs-pin holds the whole unit tree to
  Z-suffixed date-time literals. The GREEN discipline is the three-TZ run
  (UTC/Singapore/New_York pass identically); deliberately NO `TZ` pin in
  `vitest.config.mts` — a pinned TZ would convert any future TZ-coupled test
  into a silent always-pass.
- `[TST]` **The Task-131 fulfilment-seam fs-pin did not bind the decrement
  (F-2, LOW)**: the presence-only regex was satisfied by the availability
  lock alone — a decrement rewritten to any other expression passed BOTH
  pins while check and decrement drifted apart (the Task-130 F-2
  phantom-unit class; demonstrated by temporary mutation this cycle — the
  old pin stayed green on the mutated tree). The strengthened pin binds
  BOTH sites: `eq(inventory.storeSlug, fulfilStore)` must occur EXACTLY
  TWICE (lock AND decrement).
- `[COR]` **The wishlist all-ghost state rendered contradictory copy (F-3,
  LOW)**: the Task-131 note rollout handled singular/plural/loading/error/
  partial-ghost but not the all-ghost corner — with every persisted slug a
  ghost, the page rendered the true "2 saved items are no longer
  available." directly above the false "Nothing saved yet — Tap the heart
  on any product…" (browser-verified live pre-fix). The all-ghost branch
  now explains the state ("Your saved items are no longer available" + a
  browse CTA); "Nothing saved yet" stays reserved for a truly empty
  wishlist; e2e-pinned (116 → 117).
- `[TST]` **The three checkout-caps refusal specs shared one probe email
  (F-4, LOW)**: two concurrent RED runs (a cap regression) could read the
  same order rows before either `finally` deletes and double-restore the
  inventory through the shared `deleteProbeOrders` nets. Each spec now
  mints its own (`caps-fields-probe@` / `caps-promo-probe@` /
  `caps-lines-probe@`) — GREEN-on-arrival, no behavior change.
- `[REG]` **The wishlist refetch window stays a register row (F-5, INFO —
  evaluated and kept)**: after an on-page heart-toggle the removed card and
  the heading count persist for the fetch-latency window (cancelled-fetch
  safe; no stale-override race). No deterministic RED vehicle exists (a
  timing flash cannot be pinned without flaky assertions) — a
  derive-don't-refetch refactor would be a behavior-preserving change
  without a failing test, which the repo's TDD default rejects (the
  Task-127 rejected-with-evidence posture).
- `[DOC]` **Docs-truth pass (F-6/F-7/F-8, 1 MEDIUM + 2 LOW)**:
  DEPLOYMENT.md §1's "next.config.ts sets a single option" claim was false
  since Task 125 G-1 (the security-header set + `poweredByHeader: false` —
  an operator reconstructing config from §1 would silently drop the
  security posture; reworded to name all three surfaces); the PAD's two
  "Tasks 114–130" era ranges (§3.2/§7.1) trailed the Task-131 content; the
  SKILL preamble's cycle enumeration stopped at Task 129 — all corrected.

#### Revision Block — v1.16.0 (Task 131 — wishlist count parity, fulfilment-seam structural pin, orderNumber crypto suffix, DEPLOYMENT.md truth)

- `[COR]` **The Task-130 F-8 heading fix landed one count site of two
  (F-1, MEDIUM — the cycle's headline)**: the wishlist page honestly
  showed "Your wishlist (1)" over one card while the SAME viewport's header
  badge said "Wishlist, 2 items" (browser-verified live at audit with one
  real + one ghost slug persisted) — the exact "(2) above one card"
  contradiction class F-8 called dishonest, one component over (the
  Task-129 Footer-chips incomplete-rollout shape). Design decision: the
  badge stays the persisted SAVED-entry count BY DESIGN — the Header cannot
  resolve slugs without a catalogue fetch on every route (resolution is
  unknowable there, the same degrade posture as the error state), and a
  cross-page resolved-count store would flip the badge 2→1→2 across
  navigation. The page instead EXPLAINS the difference once resolution has
  settled ("N saved item(s) no longer available") — e2e-pinned together
  with the badge label; the F-8 pin's broken ghost-card locator (a `main
  aref=…]` text that matched nothing — a permanent no-op) was repaired in
  the same pass.
- `[COR]` **The placeOrder decrement re-derived the store default instead
  of reading the `fulfilStore` seam (F-2, LOW)**: the Task-130 F-2
  check/decrement coherence (the phantom-unit fix's whole point) held only
  because two expressions were textually identical — a one-site edit to
  either silently reintroduced the bug. One-token fix (`eq(inventory.
  storeSlug, fulfilStore)`), structurally fs-pinned by a NEW tenth unit
  file (`tests/unit/server-data.test.ts` — the default derives exactly
  once; the decrement reads the seam).
- `[SEC]` **orderNumber's suffix minted from Math.random (F-4, LOW)**: the
  order number is half of the /track-order PII lookup pair, and V8's
  xorshift128+ state is recoverable from observed outputs — the "~2^31
  entropy" comments held only against a naive adversary; a trailing-zero
  mantissa also minted FEWER than 6 chars ((0.5).toString(36) → "0.i" → a
  1-char suffix). The mint now reads 4 getRandomValues bytes → uint32 →
  base36 (32 bits ≈ the 31-bit 6-char space; exactly 6 chars every path),
  with Math.random only as the both-primitives-absent last resort — the
  mintIdempotencyKey posture (Task 127 F-6) applied to its sibling seam.
  Deterministic-stub trio unit-pinned (hand-worked byte expectations, the
  0.5-stub exactly-6 fallback, the spy-throw priority).
- `[TST]` **A latent fullyParallel residue window closed (F-3, LOW)**: the
  Task-119 oversell spec and the 500-class fixed-copy spec both touched
  katong-bedside-table (10 references across the two files) while the
  oversell spec's comment claimed it was "quiet, no other spec touches it"
  — a snapshot landing in the sibling's zero window could re-write zeroed
  rows as the "original" state. The oversell probe moved to
  wokhey-cookware-5pc (zero references; the Task-130 F-3 relocation
  pattern, GREEN-on-arrival).
- `[MNT]` **Defensive-parity + comment-truth completions (F-5/F-6,
  INFO→fixed)**: placeOrder's inline qty clamp swapped for the NaN-safe
  `clampInt` seam its own comment cited (identical on every reachable
  input); ensureSeed's "safe for concurrent first requests" qualified to
  within-the-process (the single-flight promise is module-level).
- `[DOC]` **DEPLOYMENT.md truth pass (F-7..F-10, 2 MEDIUM + 2 LOW)**: the
  §10 gate chain had rotted to a five-count-bumps-old 79/79 + 34/34
  outside the docs-counts pin's five-doc scope — the pin now covers
  DEPLOYMENT.md (six live operator docs, the class unrecurrable); §8 +
  §11's 429 row taught the "first X-Forwarded-For hop" posture — the exact
  client-forgeable configuration Task 125 G-2 removed (rightmost hop +
  "direct" fallback now); the dotenv attribution (package removed Task 126)
  and the hardcoded-origin claim (the SITE_ORIGIN seam since Task 125 G-4)
  swept; the revision stamp refreshed.
- `[REG]` **Register additions**: the orderNumber-collision retry wiring
  carries no automated coverage through the public interface (the mint is
  random; a real collision cannot be forced — the pure discriminator is
  unit-pinned; a swap of the two constraint checks' order would pass every
  test) recorded as a documented seam choice; the checkout route's
  EMPTY_BAG early-exit preceding the enum guards (both 4xx; the e2e probes
  all carry lines) noted for future boundary audits; AGENTS.md gained the
  Pin map section (the Task-130 recorded adoption candidate). Reference
  repo: quiescent after the boundary-day commit ff65bd2 (2026-10-23 03:39
  UTC — the prior cycles' "since 2026-10-23" wording was
  boundary-imprecise; its not-found CSP-nonce fix evaluated and NOT
  applicable: no CSP, the 404 surface live-verified branded + working).
- `[SAN]` **Environment**: the rootless PostgreSQL 17.12 data dir survived
  the sandbox recycle RUNNING (no lesson-31 restore for the first time
  since the class appeared); 9 tables + DDL contract verified by direct
  SQL before any gate; baseline green at 169/116 with zero residue.
  Gates after remediation: lint 0/0 · typechecks clean · **176/176 unit** ·
  **116/116 e2e (cold)** · zero DB residue (inventory 1379 = seed).

#### Revision Block — v1.15.0 (Task 130 — fulfilment-store coherence, boundary parity completion, suite de-flake)

- `[COR]` **Delivery availability checked island-wide stock while the
  decrement floored ONE store row (F-2, MEDIUM — the cycle's headline,
  the register's "delivery decrement accounting drift" row promoted)**:
  a 17-unit delivery order on hdb-kitchen-trolley (tampines 15, jurong 3,
  alexandra 0) passed the any-store-can-ship aggregate, clamped tampines
  to 0 through `greatest(0,·)`, and 2 units materialised from nowhere —
  dev-server-verified live pre-fix (201 + the phantom signature in the
  row dump). The lock/availability query now scopes to the CHOSEN store
  for every method — check and decrement read the same rows, the LOW_STOCK
  refusal agrees with the PDP's per-store display, and the e2e RED-run
  nets stay symmetric (the register's redistribution alternative was
  rejected: a multi-store drain is not reconstructible post-hoc from the
  order rows the nets restore by). E2e-pinned (the 422 LOW_STOCK probe +
  the qty-exact-drain positive control).
- `[COR]` **`storeSlug` was the last String()-coerced seam at the checkout
  boundary (F-1, MEDIUM)**: `storeSlug: ["tampines"]` String()-coerced
  through the whitelist into a REAL 201 (dev-verified live pre-fix) while
  its enum siblings were TYPE-strict — the lesson-43 field-class rule
  applied one field short in Task 129. Present-non-string now 422s
  (absent keeps the documented "tampines" default; no UI null-encoding to
  preserve — the store select always sends a real string). Probe rows
  added to the Task-129 enum spec.
- `[TST]` **The saturation spec's 21-review HAVBRIS insert raced the two
  "Reviews (0)" HAVBRIS assertions under fullyParallel (F-3, MEDIUM)**:
  parallel-within-file meant the insert window could fail sibling specs
  intermittently (CI safe only at workers: 1). The probe product moved to
  pandan-rug-200 (quiet + untouched by every other spec) — the overlap
  was an accident of product choice, not a necessity.
- `[COR]` **orderNumber collisions were customer-facing 500s; the 23505
  catch could not tell WHICH unique index fired (F-4, LOW — the register's
  "orderNumber collision retry" row promoted)**: `isUniqueViolationOn(err,
  constraint)` (pure, unit-pinned) discriminates by constraint name; the
  replay path narrows to `orders_idempotency_key_unique`, and an
  `orders_order_number_unique` collision re-mints and re-runs the (fully
  rolled-back) transaction once.
- `[COR]` **Array bodies classified differently across the four POST
  routes (F-5, LOW — the Task-128 register row promoted to parity)**:
  reviews/track/promo-validate let `["a"]` past the shape guard into a 422
  on fields the array never carried; all three now join checkout's
  `Array.isArray` → 400 BAD_REQUEST, e2e-pinned.
- `[MNT]` **Derived-copy + honesty completions (F-6/F-8, LOW)**: the
  Footer store chips derive from the STORES seed via `storeName` (the
  fourth hand-duplicated store list — e2e-pinned against the seed); the
  wishlist heading counts RESOLVED items once loaded (a departed
  product's slug no longer renders "(2)" above one card; the error state
  keeps the persisted count — e2e-pinned).
- `[COR]` **`priceTotals` percent promos were unbounded (F-7, LOW)**: the
  fixed branch capped at the subtotal, the percent branch did not —
  `kind:"percent", value:150` minted negative net/GST/total cents
  (unreachable today; defensive parity at the money seam). Both branches
  now cap; unit-pinned at the 150% and 100% edges.
- `[DOC]` **Eleven stale live-tense claims swept (F-9..F-15, docs-truth
  audit)**: AGENTS' "34 gotoHydrated" (actual 38/40); §7.1's Task-120-era
  138/78 freeze; §8.1 + DEPLOYMENT.md "29 routes" (31 — icon + manifest
  since Task 125); §6.1's pre-Task-125 "first hop/local" rate-limit row;
  ADR-003's retired mount-effect narrative; Pattern 3 + SKILL §7's
  "best-effort non-blocking decrement" (fail-closed since Task 121);
  §3.2's "client pages" shop/search note; the Appendix B plans/screenshots
  rows; the §1.2 postcss conflation; and the §3.2/§11 per-file line
  counts — DROPPED per the Task-129 "line counts rot" precedent (both
  tables had rotted in opposite directions).

#### Revision Block — v1.14.0 (Task 129 — residue-net completion, enum-boundary parity, business derived pin)

- `[TST]` **The "every write-capable refusal spec carries its RED-run finally
  net" claim was half false (F-1, MEDIUM — the cycle's headline)**: three
  write-capable refusal specs carried no net — the nullqty order probe
  (storefront.spec.ts:1902-era; a qty-boundary regression places a real
  order), the overlong-review-body probe (:2101-era; a cap regression
  inserts the 3000-char row) and the bad-rating/short-name probe (:293-era;
  a compound-validation regression inserts the junk review) — while four
  operator docs claimed the discipline was complete. The Task-126 F-2 /
  Task-128 F-7 program had stopped at the ORDER-refusal half; the review
  probes and the nullqty spec fell outside its sweep. All three netted
  (order nets via `deleteProbeOrders`; review nets author/title-scoped in
  their `finally`), plus the one positive-control writer (the slot-coherence
  spec) whose cleanup moved from an if-block into a finally (a `json()`
  throw between the 201 and the cleanup used to strand the row).
- `[COR]` **The checkout enum trio still String()-coerced (F-3, LOW — the
  Task-127 F-2 field-class audit one class over)**: `deliveryMethod` and
  `paymentMethod` coerced via `String()` (`paymentMethod: ["card"]` →
  `String(["card"]) === "card"` → a REAL 201 on a crafted type,
  dev-server-verified this cycle) and unknown strings silently rode the
  documented defaults, while their enum siblings storeSlug (Task 121 F-7)
  and deliverySlot (Task 123 F-3 / 127 F-2) refuse. The trio is now
  TYPE-strict + whitelist-strict (present-but-invalid → 422; absent keeps
  the documented default); `promoCode` refuses present-non-string-non-null
  while `promoCode: null` STAYS accepted — it is the checkout UI's own
  "no promo" encoding (checkout/page.tsx always sends the key; cart-store
  types it `string | null`).
- `[TST]` **The business half of Task-128 F-9 got the constant but not the
  pin (F-4, LOW)**: `TRADE_RATE` drove calculator and copy (verified) with
  zero test references — a revert to a hand-copied 0.12/"12%" pair passed
  every gate. The business panel's label/saving/estimate rows now carry a
  derived e2e pin (the family-pin pattern; the default-quantity list total
  recomputed spec-side, self-alerting on a unit-price edit).
- `[TST]` **One genuinely racy interaction-first bare goto remained (F-2,
  LOW)**: the search-freeze spec's phase-1 navigation was gated only by a
  900ms sleep before a React-dependent form-submit click — the exact race
  `gotoHydrated` exists to close (a slow machine no-ops the click). It and
  its two letter-violating freeze-spec siblings (self-gating via positive
  error-box assertions) are converted; the claim now holds under the broad
  "any interaction later" reading (38 gotoHydrated call sites in the
  storefront spec, 40 across both files).
- `[TST]` **The Task-128 checkout array-body guard was implemented but
  unpinned (F-7, INFO→fixed)**: the `Array.isArray` → 400 branch now carries
  an e2e probe (`["a"]` on checkout, inside the Task-128 body-shape spec).
- `[TST]` **The producer-side createLocalStore fs-pin was enumeration-
  scoped (F-6, INFO→fixed)**: the pin scanned two hardcoded producer files
  — a fifth store minted in any other file escaped it. The scan now walks
  every `.ts/.tsx` under `src/` (recursive) with a ≥4 floor guarding the
  regex against silent zero-matches.
- `[COR]` **The three-store list was the last hand-duplicated store literal
  (F-11, INFO→fixed)**: the checkout route's `STORE_SLUGS` whitelist, the
  checkout page's `<option>`s and the Header picker's list now derive from
  the `STORES` seed via `storeName()` (behavior-preserving — identical
  values, pinned by the existing storeSlug-refusal and checkout specs). The
  adjacent "store-picker wiring" register row is unchanged (the wiring
  itself — persisted display-name keys — remains deferred).
- `[MAN]` **fs-pin path normalization (F-9, INFO→fixed)**: the
  IDEMPOTENCY_KEY_RE route pin and the docs-counts pin resolve from
  `import.meta.dirname` (the local-store precedent), not cwd — a
  subdirectory vitest run no longer ENOENTs. Plus the stale
  `catalog.ts` "~160 lines" claim in the SKILL (244; dropped, line counts
  rot) and an 18-chars comment fix (NH-YYYYMMDD-XXXXXX).
- `[REG]` **Register notes**: the ensureSeed reviews-only partial-seed window
  (a first-seed crash between the products+inventory commit and the review
  inserts leaves the 5 seed reviews unlanded — the narrower sibling of the
  Task-126 AUD-3 disproof; honest degrade, unreachable in practice via
  single-flight + reset-on-failure) recorded as a documented tradeoff. The
  array-body asymmetry (checkout 400 vs siblings 422) kept — both 4xx
  client-fault envelopes, the Task-128 documented scope, the checkout guard
  now pinned. Standing deferrals unchanged (TRUST_PROXY, CSP, jsdom layer,
  delivery-decrement redistribution, store-picker wiring, React cache(),
  health-503, token codemod, bundle curation, unthrottled GETs,
  orderNumber collision retry, whole-number magnitude bound, journey
  hardcoded amounts).
- `[SAN]` **Environment**: a FRESH rootless PostgreSQL 17 install via
  `docs/setup_pg_z.sh` (the workspace snapshot was fully absent this cycle —
  no lesson-31 subdirectory restore needed for the first time since the
  class appeared); 9 tables + the full DDL contract verified by direct SQL
  before any gate ran. Gates after remediation: lint 0/0 · typechecks
  clean · **163/163 unit** · **113/113 e2e (cold)** · zero DB residue.

#### Revision Block — v1.13.0 (Task 128 — body-shape guards, recall parity, derived-pin completion)

- `[COR]` **Valid-JSON NON-OBJECT bodies crashed all four POST boundaries to a
  500 (F-1, MEDIUM — the cycle's only user-visible defect)**: `req.json()`
  parses `null` (and, on checkout, any primitive) cleanly, but the first
  `field in body` / property access on it is a TypeError — the outer catch
  answered a pure client fault with 500 "failed on our side" copy
  (browser-verified live at audit: `null` → 500 on checkout/reviews/track/
  promo-validate; `5` → 500 on checkout). The shape guard now sits beside
  the Task-120 parse guard (400 BAD_REQUEST; checkout also refuses array
  bodies — they used to limp to a 422 "bag" of nothing).
- `[TST]` **The Task-127 F-9 gotoHydrated conversion was incomplete (F-2,
  MEDIUM)**: 13 interaction-first bare `page.goto` sites remained in
  storefront.spec.ts (12 found by the audit + one /cart site its sweep
  missed, re-identified mechanically this cycle) while three docs claimed
  the interaction-first discipline was "true for both files" — the
  method-switch family converted only each test's FIRST navigation and left
  mid-test full navigations bare. All 13 converted (GREEN-on-arrival); the
  claim is now true without rewording (34 gotoHydrated call sites).
- `[REL]` **Derived-pin completion (F-3, LOW)**: the Task-127 claim "the GST
  + family e2e pins derive" was half false — the family voucher, shop $200
  and offers FLAT20 pins did not exist (the code derived; nothing pinned
  it). Three pins added, all deriving from the imported constants/PROMOS
  row — a rate/threshold edit self-corrects copy and pins together.
- `[COR]` **`orderNumber`'s server-local calendar (F-4, LOW)**: the one SGT
  seam still reading LOCAL getters on the shifted instant (its own comment
  claimed "pure UTC+8 arithmetic") — the campaignEnd Task-127 F-7 fix of
  the identical pattern, one seam over. getUTC* swap; the fixed-instant
  pins become TZ-independent.
- `[COR]` **Recall-needle parity (F-5, LOW)**: `/api/products?q=`
  lowercased but never trimmed while searchProducts and /search trim — a
  padded needle missed words that START a field (browser-verified:
  `?q=%20solbakken%20` → 0 vs `?q=solbakken` → 1; mid-sentence words
  coincide-match, hiding the divergence). One recall definition now has
  one normalization.
- `[MNT]` **Seam wiring + the Footer year (F-6/F-11, LOW)**: the checkout
  route inlined the idempotency-key regex while `IDEMPOTENCY_KEY_RE` sat
  exported-but-unimported (a shape edit would keep every unit green while
  the boundary enforced the old shape — now imported + fs-pinned), and the
  Footer's copyright year was the last bare server-local calendar read in
  `src/` (now the SGT clock).
- `[SEC]` **Test-residue parity completion (F-7, LOW)**: the overlong-fields
  refusal spec was the one write-capable checkout spec without a RED-run
  net — wrapped in `try/finally { deleteProbeOrders }` (a regressed cap
  boundary would have stranded a real order + tampines decrement).
- `[SEO]` **OG-dimension completion (F-8, LOW)**: `inspiration/[slug]`
  shipped `og:image` without declared dimensions (home + PDP declare
  1200×627; every catalogue IMG url pins h=627&w=1200 — the declaration
  was simply absent, browser-confirmed). Declared + the og pin's route
  list extended to an inspiration page.
- `[DSE]` **Earn/trade-rate derivation (F-9, LOW)**: the family earn rate
  (10 pts/$, calculator + 3 copy/metadata sites) and the business trade
  rate (12%, calculator + copy) were hand-copied pairs — the adjacent
  cluster of the Task-127 F-4 drift class. `FAMILY_POINTS_PER_DOLLAR` +
  `TRADE_RATE` now drive math and copy together.
- `[TST]` **Producer-side store-key pin (F-12, LOW)**: PERSISTED_STORAGE_KEYS
  was pinned at its CONSUMERS (both crash boundaries) but nothing tied the
  `createLocalStore` producers to the list — a fifth store with a new key
  would leave the recovery buttons partially ineffective with no failing
  test. fs-pin added (literal AND constant keys resolved).
- `[REG]` **Register updates**: the whole-number magnitude bound (absurd
  digit strings pass `/^\d+$/` and degrade to 200 `[]` via the documented
  read-fallback — the un-deferral path is a `Number.isSafeInteger` bound →
  422) and the journey's hardcoded `$679.15`/`"1299.00"` expectations
  (self-alerting: they fail LOUDLY on a catalogue edit, unlike the silent
  rot class) recorded as accepted residues. One reference-agent claim
  DISPROVEN by direct read (rate-limit.ts "corruption" — the line is
  clean; typecheck + 161-unit green corroborated). Standing deferrals
  unchanged (TRUST_PROXY, CSP, jsdom, delivery-decrement redistribution,
  store-picker wiring, React cache(), health-503, token codemod, bundle
  curation, unthrottled GETs).
- `[SAN]` Gates: lint 0/0 · typechecks clean · **163 unit / 111 e2e** ·
  cold build green · zero DB residue after the full suite (verified by
  direct SQL against the seed formula) · counts pinned across all five
  operator docs.

#### Revision Block — v1.12.0 (Task 127 — boundary-type parity, replay ownership, derived-copy completion)

- `[COR]` **The Task-126 entity regression (F-1, MEDIUM — the cycle's only
  user-visible bug)**: Task 126's fee-derivation moved the PDP delivery line
  into a JS template literal, where `&amp;` no longer decodes — every PDP
  rendered the literal text "Click &amp; Collect" (browser-confirmed on the
  dev server at audit; JSX entities decode only in text children, never
  inside `{`…`}` string expressions). Plain `&` in the literal + an e2e pin
  asserting the rendered ampersand and the absence of the raw entity.
  Lesson: a JSX-text→template-literal refactor silently changes entity
  semantics — grep the migrated string for `&amp;`.
- `[SEC]` **Checkout free-text TYPE parity (F-2, MEDIUM)**: `String(body.x
  ?? "").trim()` on email/fullName/phone/postal/address + deliverySlot let a
  single-element ARRAY payload coerce past every validator and place a real
  201 order (executed proof at audit) — the exact crafted-TYPE class Tasks
  124/125/126 refused at lines, reviews POST and the read boundaries, but
  the primary write boundary's free-text fields were missed. Present-but-
  non-string fields are now 422 VALIDATION (absent fields still fall to the
  documented defaults/min-length refusals); e2e probe with the finally-net.
- `[SEC]` **Read-boundary completion (F-3, LOW)**: `/api/products?max=`
  Number()-coerced (`?max=abc` → NaN → silently no filter; `?max=1.5` →
  fractional dollars) — the Task-126 F-5 whole-number discipline extended to
  the sibling GET: `/^\d+$/` guard → 422.
- `[COR]` **Derived-copy completion (F-4, LOW — 13 sites in 4 clusters)**: the
  Task-126 F-3 rollout missed the `$200` threshold (shop metadata + visible
  strip — one SERP-facing), the `9% GST` rate (×7 incl. two metadata + the
  e2e pin — all now `Math.round(GST_RATE * 100)`), FLAT20's `$20/$250`
  hand-copy on /offers (derives from the same PROMOS row the cards render),
  and the family voucher rule (×3 — `FAMILY_VOUCHER_CENTS`/
  `FAMILY_POINTS_PER_VOUCHER` now feed page + metadata; the e2e family pin
  derives). A rate/threshold edit self-corrects copy and pins together.
- `[SEC]` **Replay ownership + canonical order (F-5, LOW — the homenest
  S6-8/S7-2 discipline, the last un-ported piece of the Task-126 F-1
  triad)**: possession-only replay let a key leaked via logs/XSS disclose
  the victim's order number (the PII lookup key for /track-order). Both
  replay paths (fast + 23505 race) now require `existing.email ===
  input.email` (case-insensitive; mismatch → 422 `REPLAY_MISMATCH`, never
  disclosure); the fast path hoists ABOVE bag/promo validation (a
  post-success resubmit with an emptied bag replays instead of
  EMPTY_BAG-refusing — the Stripe-canonical posture); the route defers its
  empty-bag refusal to placeOrder when a key is present.
- `[SEC]` **Mint fallback hardening (F-6, LOW — homenest session-7 S7-10)**:
  the `mintIdempotencyKey` non-secure-context fallback consumed the
  predictable `Date.now + Math.random` pair where `crypto.getRandomValues`
  is available (only `randomUUID` is secure-context-gated) — the fallback
  now mints a 128-bit crypto hex; Math.random survives only as the
  both-primitives-absent last resort (deterministic-stub unit pins).
- `[COR]` **campaignEnd on the Singapore calendar (F-7, LOW)**: the one SGT
  seam reading the server-LOCAL calendar — a UTC server rolled
  `priceValidUntil` to next year from Dec 28 08:00 SGT (the campaign's final
  day). The year and the end instant now derive on the UTC+8 clock (Dec 28
  00:00 SGT = Dec 27 16:00 UTC); the label formats with
  `timeZone: "Asia/Singapore"` ("28 Dec" on any server); the PDP's
  priceValidUntil renders the SGT calendar date (en-CA YYYY-MM-DD) instead
  of the UTC ISO slice (which was a day early on any non-SGT server).
- `[TST]` **Hydration gating completed (F-9, LOW)**: the storefront spec's
  21 interaction-first blocks used bare `page.goto` + immediate click — the
  exact pre-hydration no-op race `gotoHydrated` exists for (Task 125 G-5
  had gated the mobile spec only; the docs claimed "the interaction-first
  specs navigate through gotoHydrated" against 0 storefront call sites).
  Mechanically identified (goto followed by an interaction within the
  block) and converted; the DOM-assertion-only specs (JSON-LD, metadata,
  javaScriptEnabled:false pair) stay bare by design.
- `[DOC]` **Docs-truth (F-8)**: five operator-doc sites still named the
  removed `dotenv` package in the env-precedence guidance (Task 126 F-4
  fixed `.env.example` only) — swept to "Next's own env loader never
  overrides an existing env".
- `[REG]` **Register annotation (F-10)**: the orderNumber-collision deferral
  is slightly wider than "no retry" — the 23505 catch keys on the ERROR
  CLASS, so an orderNumber unique violation (random 6-char suffix) runs the
  futile replay lookup before rethrowing; the un-deferral path is pg's
  `err.constraint` name discrimination (idempotency_key vs order_number).
  Rejected this cycle: qty clamp-vs-refuse (L-8 — the clamp IS the
  documented AGENTS contract, a different class from crafted-TYPE
  coercion); deploy-order note (I-4 — DEPLOYMENT.md §4→§5→§6 already
  sequences it). Standing deferrals unchanged (TRUST_PROXY, CSP, jsdom,
  delivery-decrement redistribution, store-picker wiring, React cache(),
  health-503, token codemod, bundle curation, unthrottled GETs).
- `[SAN]` Gates: lint 0/0 · typechecks clean · **161 unit / 108 e2e** ·
  cold build green · zero DB residue after the full suite (verified by
  direct SQL) · counts pinned across all five operator docs.

#### Revision Block — v1.11.0 (Task 126 — idempotent checkout, test-residue parity, derived copy)

- `[FEA]` **Idempotent checkout (F-1, MEDIUM — the homenest session-70
  discipline ported ORM-agnostically)**: a double-click on Pay, a network
  retry after a response-timeout, or an impatient re-submit re-POSTs the
  same bag and used to place a SECOND real order (row + inventory
  decrement — the FOR UPDATE locks serialize concurrent POSTs, they do not
  dedupe them). `orders.idempotency_key` (nullable text, UNIQUE — Postgres
  allows unlimited NULLs, so pre-existing orders and key-less POSTs are
  unaffected); the client mints ONE key per checkout-page mount
  (`useState(() => mintIdempotencyKey())` — hydration re-runs the
  initializer but the key is never rendered; a remount mints fresh = a new
  intent; kept across error-path retries) with the crypto.randomUUID
  try/catch fallback (non-secure contexts crash randomUUID — the homenest
  D-4 lesson); the route validates the shape (`/^[A-Za-z0-9-]{8,64}$/`)
  and DROPS malformed keys to null (dedupe is an enhancement, never a
  persisted field); `placeOrder` returns `{ order, replayed }` — the
  pre-transaction fast-path replays a key that already has its order, and
  the pg-23505 catch covers the concurrent same-key race (the loser's
  transaction, insert and decrement included, rolled back). Replay answers
  200 (nothing created) with the SAME order number; create stays 201.
- `[TST]` **RED-run safety nets on every refusal spec (F-2, MEDIUM)**: five
  e2e specs that pin a checkout refusal place a REAL order when their
  boundary regresses, and had no cleanup (the gotcha-#13 discipline was
  applied inconsistently). The shared `deleteProbeOrders(email)` helper
  deletes by email and restores the inventory re-derived from the inserted
  order_items (the payload's lines may have been dropped/normalized by the
  boundary — the inserted rows are the only truth). Honest-RED: the lines
  cap was temporarily reverted, the 101-line spec failed with a stranded
  101-row order (observed by SQL), then the net cleaned it to zero with the
  boundary still broken. En route discovery: the Task-123-era
  `if (res.status() === 201)` net was DEAD CODE on exactly the RED runs it
  existed for (the failed `expect` throws past the if-block) — every net
  now lives in a `finally`.
- `[SEC]` **Read-boundary TYPE parity (F-5)**: track + promo-validate +
  reviews GET still coerced crafted types (`String(12345)` sailed into the
  parameterized lookup as a silent 404; `Number("15000")` rode the promo
  math; `?productId=1.5` floored into a real product's reviews). The
  Task-124 F-5 / Task-125 F-2 typeof-guard stance now spans every
  boundary; caps unchanged.
- `[DSE]` **Derived marketing copy (F-3)**: `catalogMaxDiscountPercent()`
  in `catalog.ts` is the ONE max-discount derivation (the hero, the header
  strip, the offers metadata ×2 and the offers copy interpolated the
  literal "24%" — a catalogue edit turned five claims, two of them
  metadata, into lies with every gate green); the e2e pins derive from the
  same seam. The delivery-fee/threshold copy (~8 marketing sites) derives
  from the `*_DELIVERY_*` constants (`$${cents / 100}` preserves the
  marketing-string style; formatSGD is for money displays).
- `[SEO]` **SEO completion (F-8, the homenest posture)**: root-layout
  `twitter.card = "summary_large_image"` (inherits to every page via
  Next's metadata resolution; page title/description/images fall back to
  their own openGraph), OG images declare their TRUE 1200×627 (every
  catalogue + hero Pexels URL pins h=627&w=1200 — verified), and the PDP
  Offer carries `priceValidUntil` composed from the EXISTING rolling
  `campaignEnd()` seam (no invented date — the festive market is the
  site's own price-refresh claim).
- `[DB]` **Schema hygiene (F-7)**: the redundant `products_slug_idx`
  dropped (slug already carries a unique CONSTRAINT — two unique indexes
  on one column), `reviews_product_idx` added (getReviews/getReviewCount
  filter on productId every PDP render), the `order_items.product_id`
  `.default(0)` footgun removed (a silent 0 productId is junk data; the
  denormalized-no-FK choice is now documented at the column), and the
  reviews ordering ties-breaks on `desc(id)` (the homenest S51-1 trap:
  createdAt alone is not a total order — same-timestamp rows are
  physically ordered; SQL-seeded pathological pin).
- `[MNT]` **Seam + docs-truth batch**: `PERSISTED_STORAGE_KEYS` exported
  from `local-store.ts` (the two crash boundaries carried the identical
  4-key literal — a fifth persisted store required remembering both sites;
  fs-pinned), the stale `.env.example` origin note corrected (it still
  sent a domain-mover to layout.tsx/robots.ts/sitemap.ts after G-4
  single-sourced the origin into SITE_ORIGIN — now pinned by the
  env-example test), the ilike claims corrected (search is in-JS
  `matchesProductQuery`), the stale XFF spec comment fixed (rightmost
  hop, not first), `dotenv` REMOVED from dependencies (unused since the
  lineage — Next's own env loader reads `.env`), and the playwright HTML
  reporter added (`open: "never"`).
- `[DIS]` **AUD-3 DISPROVEN — the ensureSeed "partial-seed blind spot"**:
  the audit claimed a first-seed crash between the products insert and the
  promotions/inspirations/stores/categories inserts leaves those tables
  empty forever (the products+inventory early return skips them). Insert
  order says otherwise: categories → stores → products → promotions →
  inspirations → inventory LAST — any state with products+inventory
  present necessarily completed the earlier inserts; any crash before
  inventory leaves the early-return unsatisfied and the next read re-seeds
  everything (onConflictDoNothing). The genuine remaining window (a crash
  between the inventory insert and the seed-reviews loop) strands the five
  seed REVIEWS — the documented first-time-only design (no unique
  constraint; re-inserting would duplicate). No code change; the disproof
  is the Task-124 F-16 precedent applied (audit reachability claims get
  traced through program order, not taken on authority).
- `[REG]` **Register updates**: the XFF TRUST_PROXY gate (audit H-1 —
  rightmost-hop parsing is still client-controlled in a no-proxy deploy;
  the named un-deferral path is an env-gated `TRUST_PROXY` defaulting to
  the shared "direct" bucket, which changes the single-variable env
  contract pinned across all five operator docs — an operator decision,
  design sketch recorded), the Tailwind token codemod (79 arbitrary-value
  sites are the DOCUMENTED convention — a codemod contradicts it; noted),
  the "ready in 2 hrs" cutoff-vs-promise claim REJECTED (the copy reads as
  a within-2-hours maximum; an order at 13:59 for 14:00 satisfies it),
  health-503 (one-line semantic alignment, ripples the pinned 500 claims —
  register note), and the prior deferrals unchanged (delivery decrement
  redistribution, header store-picker wiring, PDP repeated catalogue reads
  via React `cache()`, CSP, jsdom layer, orderNumber collision retry).
- `[SAN]` Gates: lint 0/0 · typechecks clean · **156 unit / 104 e2e** ·
  cold build green · zero DB residue after the full suite (verified by
  direct SQL) · counts pinned across all five operator docs.

#### Revision Block — v1.10.0 (Task 125 — test integrity, boundary parity, identity/origin seams)

- `[REL]` **The time-bombed method-switch pin (F-1)**: the Task-121 F-20
  e2e spec asserted the click-collect slot set with the REAL clock while
  Task-124 F-8 made that exact set clock-sensitive — any post-14:00-SGT
  run went red with zero code change (the baseline green runs simply
  happened before the cutoff). Honest-RED via a temporary 23:00 SGT pin
  (both assertions failed exactly as predicted); the spec now pins 10:00
  SGT like its F-8 siblings. Lesson: when a seam becomes temporal, every
  pin that touches it becomes temporal too.
- `[SEC]` **Reviews POST type-strictness (F-2)**: `Number(true)===1` and
  `String(1e19)`-as-name persisted crafted junk at the last coercing
  write boundary — the checkout Task-124 F-5 posture mirrored (non-number
  productId/rating and non-string author/title/body → 422, never a row);
  the probe carries identity-keyed cleanup.
- `[SEC]` **Track/promo field caps (F-3)**: order number ≤32, email ≤254,
  promo code ≤32 — the checkout cap discipline mirrored at the PII-lookup
  pair (unbounded strings previously reached the parameterized lookups).
- `[SEC]` **Rate-limit identity (G-2)**: `clientIp(headers)` in
  `rate-limit.ts` is the ONE derivation — rightmost XFF hop → shared
  `"direct"` bucket. The four routes' inline leftmost-hop reads were the
  client-forgeable form (a direct-deploy client rotates its own buckets
  by sending changing fake XFF values); homenest session-6's fix ported.
- `[SEC]` **Platform security headers (G-1)**: `next.config.ts` now ships
  nosniff / X-Frame-Options DENY / Referrer-Policy /
  Permissions-Policy (camera, microphone, geolocation, payment locked
  out) / HSTS, with `poweredByHeader: false` — e2e-pinned on a page AND
  an API route (the `x-powered-by` absence included).
- `[COR]` **Discount-attribution completion (F-4/F-5)**: the header strip
  and the /offers metadata kept attributing the catalogue's max (−24%,
  NORDLYS lighting) to dining (max −17%) after the Task-122 F-19 hero
  fix — both now carry the honest lighting/cookware/decor set, and the
  offers pin holds the ATTRIBUTION (regex tightened), not just the
  number.
- `[COR]` **Slot clock-coherence (F-6)**: a checkout opened before 14:00
  SGT could display "Tomorrow 10am" (controlled-select fallback) while
  POSTing the already-past "Today 2pm" after any post-cutoff re-render.
  Adjust-during-render reset when the held slot leaves
  `availableDeliverySlots(method)`; the e2e pin captures the intercepted
  POST payload (no DB write) and asserts display/payload agreement.
- `[COR]` **Drawer param-navigation (F-7)**: browser-reproduced — a
  category tap from `/shop?cat=bedroom` kept the drawer open over the
  re-filtered grid (the close guard compares pathname only). The drawer
  links close on click; the pathname guard stays for browser-nav.
- `[COR]` **Origin/JSON-LD single-sourcing (G-3/G-4)**: `SITE_ORIGIN`
  (utils.ts) replaces the literal in 17 files (fs-pinned: no raw literal
  in `src/app`); `jsonLdScript()` escapes `<`, U+2028 and U+2029 (the
  line terminators legal in JSON strings that break script elements) —
  both JSON-LD sites wired, unit-pinned with hostile payloads.
- `[COR]` **Metadata derivation (F-8/F-10/F-12)**: home ("N products
  across N room categories"), planning-tools ("N shoppable room
  stories") and the shop category-name enumeration derive from the
  catalogue constants (the Task-122 F-13 pattern completed); the home
  pin derives too.
- `[FEA]` **Web manifest + app icon (G-6)**: `app/icon.svg` (brand
  wordmark chip) + `app/manifest.ts` — every browser's /favicon.ico
  404'd before; both resolve and are linked, e2e-pinned.
- `[TST]` **Hydration sentinel (G-5)**: CartProvider stamps
  `html[data-hydrated]` on mount; `tests/e2e/helpers.ts` `gotoHydrated`
  gates interaction-first navigation; the sentinel is pinned on /, /shop
  and a PDP. Gotcha #11's "the e2e suite is blind to this" admission is
  retired. The mobile project now runs `devices["iPhone 13"]` (G-7) —
  same 390×844 viewport plus touch, DPR 3 and a real UA, so
  hover-gated Tailwind v4 variants render the way phones hit them.
- `[DOC]` **§11 truth fix (F-9/F-11)**: the key-files table's rotted
  "11 Drizzle tables" row (actual: 9 since Task 120's dead-table
  retirement) and stale line counts corrected; CLAUDE's task-range
  header updated.
- `[REG]` **Register additions**: CSP via proxy.ts deferred (needs the
  per-request-nonce + `await connection()` prerender discipline — the
  homenest trap log recorded with it); jsdom component-test layer
  deferred (the e2e coverage is strong; the one candidate pin is covered
  by the settle specs).
- `[SAN]` Gates: lint 0/0 · typechecks clean · **156 unit / 104 e2e** ·
  cold build 30 routes (icon + manifest routes added) · zero DB residue
  after the full suite (verified by direct SQL) · counts pinned across
  all five operator docs.

#### Revision Block — v1.9.0 (Task 124 — docs-truth completion, settle discipline, boundary strictness)

- `[REL]` **Docs-truth pins extended beyond counts (F-1)**: three operator-doc
  sites still documented the pre-Task-123 `/api/health` body (CLAUDE API
  table, README quick-start curl, README API table) — the Task-123 F-9 sweep
  fixed DEPLOYMENT.md only. All three now carry the shipped envelope and
  `tests/unit/docs-counts.test.ts` pins the BODY claims (three new tests),
  so envelope claims rot no more silently than counts.
- `[REL]` **Search settle discipline completed (F-3/F-13)**: the Task-123 F-4
  gate covered the error box on changed needles; the product grid still
  rendered the previous query's cards beneath a failed re-search's error
  box, and the Try-again window kept the box through the 250ms debounce.
  The grid now gates on the settle discipline and a `settledRetry` marker
  covers the retry axis (both e2e-pinned, the retry via the frozen-debounce
  pattern).
- `[REL]` **Journey cleanup made identity-based (F-2)**: the Task-123 F-1
  cleanup captured the order number only after the confirmation assertions —
  a 201 followed by any assertion failure stranded the row (browser-
  reproduced with an injected failure; the settle wait covers the immediate
  post-click race where the POST is still in flight). The finally deletes by
  probe email + spec-start window.
- `[REL]` **Checkout type-strictness (F-5)**: `Number(true)===1`,
  `Number([5])===5`, `Number("3")===3` — the Task-122 F-8 value-level fix
  let crafted TYPES place quiet single-unit orders. Non-number types now
  drop the line (EMPTY_BAG), e2e-pinned with a self-cleaning probe.
- `[REL]` **Recall seam unified + a real bug it exposed (F-12)**:
  `matchesProductQuery` in `catalog.ts` is the ONE recall definition (API +
  shop SSR consumed duplicated literals since Task-123 F-5 re-synced them by
  hand). Its pins caught a live bug: the needle was never lowercased, so
  capitalized queries ("Outdoor") returned 0 results on both seams. Fixed
  in the seam; capitalized recall e2e-pinned.
- `[COR]` **Unknown-promo notice honesty (F-4)**: `findPromoMinimumCents`
  returns null for unknown codes and the `?? 0` fallback rendered
  "BOGUSCODE needs a $0.00 minimum" while the server refuses the code —
  the null branch now says "isn't a valid code" (e2e-pinned via the
  crafted-localStorage vector).
- `[COR]` **Click-&-collect temporal honesty (F-8)**: the "Today 2pm" slot
  was offered around the clock (an order at 23:00 persisted a 9-hours-past
  pickup promise). `availableDeliverySlots(method, now?)` (utils.ts, the
  SGT discipline of `sgTomorrowISO`/`orderNumber`) drives the checkout
  options; the API boundary keeps the full `DELIVERY_SLOTS` sets (stale
  tabs get grace; method coherence unchanged). Unit-pinned ×4 +
  clock-frozen e2e ×2.
- `[COR]` **Card rating honesty (F-11)**: product cards quoted the invented
  seed `ratingCount` ("(412)") beside PDPs that honestly say "Reviews (2)"
  since Task-121 F-6. Cards show stars only now (ratingAvg stays the
  documented invented-content deferral; ratingCount remains DATA for
  sortProductList).
- `[COR]` **A11y floor additions (F-9/F-10)**: cc-number/cc-exp/cc-csc +
  name autocomplete tokens (WCAG 1.3.5) and a ring + chip on the selected
  review star (WCAG 1.4.11 — selected/unselected differed by text color
  alone, both states under 3:1).
- `[COR]` **Utility-route noindex (F-17)**: cart/checkout/track-order/
  wishlist/search relied on robots.txt alone; each now carries a route
  layout with `robots: { index: false, follow: false }` (the Task-119 F-10
  belt-and-suspenders stance, the homenest posture). Sitemap policy
  unchanged (indexable only).
- `[DIS]` **One finding disproven by browser evidence (F-16)**: the crafted
  `nordhem_store` value was claimed to render a blank select — React
  renders the first option as the fallback (browser-verified with a valid-
  value control proving the seeding path). Spec kept as a pin; no code
  change (the Task-121 lesson-21 precedent).
- `[HYG]` **Test hygiene (F-14)**: the sitemap e2e count derives from the
  catalogue constants (hardcoded 42 broke on the first catalogue edit) and
  the four request-context POSTs that rode the shared "local" limiter
  identity got their own XFF identities.
- `[SAN]` Gates: lint 0/0 · typechecks clean · **138 unit / 89 e2e** · cold
  build 29 routes · zero DB residue after the full suite (verified by
  direct SQL) · counts pinned across all five operator docs.

#### Revision Block — v1.8.0 (Task 123 — journey residue, promo-display truth, boundary/docs honesty)

- `[REL]` **Flagship e2e journey residue closed (F-1)**: the bag → promo →
  checkout → track spec placed a real order on every run and never cleaned
  up — the pinned DB accumulated rows and the makan Tampines stock drained
  24 → 20 across sessions (live-observed at this cycle's baseline: 8 stale
  orders + the fresh one). The spec now reads its pre-run stock and restores
  it + deletes the probe order in a `finally` (the oversell pattern); every
  RED-capable probe carries its own safety-net cleanup; the "Reviews (2)"
  hard pin became regex-accepted (F-11). The suite runs residue-free.
- `[COR]` **Promo-display truth completed (F-2)**: the Task-122 F-5 gate hid
  the discount row below the minimum, but the message half kept advertising
  "WELCOME10 applied" beside it (browser-reproduced) and the code still
  submitted to a server INVALID_PROMO. `findPromoMinimumCents()` (pure seam,
  unit-pinned) feeds the cart's honest notice — "needs a $150.00 minimum —
  add more to use it" — the current bag state owns the message.
- `[SEC]` **Checkout slot-coherence boundary (F-3)**: `deliverySlot` was
  length-checked only — any ≤80-char crafted string persisted into
  customer-facing copy ("Arriving {slot}"). The SLOTS map moved to
  `utils.ts` as the shared `DELIVERY_SLOTS` seam; the API validates
  coherence with `isValidDeliverySlot` (the storeSlug whitelist pattern).
  The four legacy e2e probes that carried a slot the UI never offers were
  aligned to the real contract.
- `[COR]` **Search stale-error discipline (F-4)**: the error box gated on
  `error && !loading` while the verdicts gated on the settled needle — a
  failed search's error box survived into the next needle's debounce window.
  It now gates on `settledFor === needle` identically (frozen-debounce e2e
  pin with route abort).
- `[COR]` **API keyword recall parity (F-5)**: `/api/products` matched
  name/tagline/description/sku only while the shop-SSR seam also matched
  `categorySlug` — q=outdoor returned 0 from the API and 2 from the shop
  grid. The filter now includes `categorySlug` (one catalogue, one recall).
- `[UX]` **Promo dies with its order (F-6)**: `clear()` left `nordhem_promo`
  persisted after checkout — the next bag silently re-applied the previous
  order's code. `clear()` now drops the promo with the lines (e2e-pinned
  inside the journey).
- `[A11Y]` **Error-digest contrast (F-7)**: the "Ref: {digest}" line on both
  crash boundaries used #9a9a9a on white (≈2.85:1) — now the #5b5b5b muted
  token (the Task-120 floor).
- `[DOC]` **Docs claim accuracy sweep (F-8)**: CLAUDE/README claimed
  `radiogroup`/`tablist` widget roles the Task-119 stance deliberately
  removed (zero in `src/`) and a `cn` helper that never existed — both now
  state the real `role="group"` + `aria-pressed` posture and the real helper
  list.
- `[COR]` **Health envelope alignment (F-9)**: `/api/health` was the one
  route deviating from the documented every-route envelope (bare
  `{ ok: true }`) — it now returns `{ ok: true, data: { db: "up" } }` /
  the DB_DOWN error envelope (consumers check HTTP status only).
- `[COR]` **PDP review-count saturation (F-10)**: the rendered review list
  caps at 20 rows, but the JSON-LD `reviewCount` and the "Reviews (N)"
  heading derived from `reviews.length` — both understated the truth beyond
  20 live reviews. `getReviewCount()` (true `count(*)`, degrade-to-0) feeds
  both; the rendered LIST stays capped (a display cap, not a count cap);
  e2e-pinned with 21 probe reviews + restore.
- `[COR]` **Order-number SGT date (F-12)**: `orderNumber(now?)` derives its
  date segment at UTC+8 (the `sgTomorrowISO` pattern) — Singapore-morning
  order numbers carried the prior calendar day between 00:00–07:59 SGT.
- `[SEC]` **Promo-store predicate (F-13)**: `isValidPromoPayload` mirrors
  the checkout write boundary (≤32 chars) — a crafted 10k-char persisted
  promo degraded to null instead of riding to checkout.
- `[REG]` **Register updates (F-14)**: the delivery-decrement deferral row
  now records the accounting-drift consequence explicitly (an aggregate
  pass can floor the single decrement store — sold units never leave
  stock); /search `autoFocus` recorded as an accepted search-page pattern.

#### Revision Block — v1.7.0 (Task 122 — skipped-fix debt, crash-boundary truth, display/money honesty)

- `[SAN]` **Task-121 F-10 landed late + count corrected**: the SGT "tomorrow"
  fix was planned and claimed ("19 fixed TDD-first") but never implemented —
  `sgTomorrowISO()` (pure UTC+8 arithmetic) now exists in `utils.ts`, rewires
  the planning-tools booking floor, unit-pinned against fixed UTC-evening
  instants. The true Task-121 record: 18 fixed + 1 disproven (F-3) + 1
  silently skipped (F-10 — landed here). Corrected forward in this block and
  the worklog; the plan file and Task-121 worklog body are history, untouched.
- `[REL]` **Crash-boundary truth (F-2)**: `src/app/global-error.tsx` now
  bounds root-layout crashes — CartProvider renders ABOVE `error.tsx`'s
  route boundary, so the Task-121 "safety net" could not catch its own
  historical crash class (Next's unbranded default page shipped instead).
  Recovery is remove-keys + `window.location.reload()` (a poisoned
  module-level store snapshot survives `reset()`); `error.tsx` gains
  `console.error` + digest render and the same reload semantics. Both
  boundary classes browser-verified via temporary-throw probes (root-layout
  probe → global-error with own `<html lang="en">`; page probe → error.tsx
  inside the surviving layout).
- `[COR]` **Element-level persisted-state validation (F-3)**:
  `isValidCartPayload`/`isValidWishPayload` (cart-store.tsx) — the Task-121
  validators were container-shallow (`Array.isArray([null]) === true`), so a
  poisoned `nordhem_cart_v1` of `[null]` still crashed CartProvider's
  reduce and `[42]` NaN'd every total. Every line now validates
  (positive-int productId, int qty 1–99, int price, string identity
  fields); unit-pinned ×8.
- `[CA]` **Promo display/server honesty (F-5)**: `effectivePromo(code,
  subtotalCents)` gates the cart + checkout previews on the promo minimum —
  WELCOME10 previously kept rendering its 10% on an $89 bag after item
  removal while `placeOrder` refused it (INVALID_PROMO). Unit-pinned + e2e
  (apply on $1388, remove to $89 → the discount row disappears).
- `[COR]` Order page honours the outage state when the order row arrived but
  the items query failed (F-4 — "confirmed order, Items (0)" was the most
  alarming possible read); browser-verified with PG down.
- `[SEC]` Checkout payload bounds (F-7/F-8): `promoCode` ≤ 32, `lines` ≤ 100
  (422, never a 101-row insert), and `qty: null` DROPS the line (Number(null)
  === 0 min-clamped to a real qty-1 order before); e2e-pinned.
- `[COR]` Reviews refuse overlong fields (F-11) — the Task-120
  refuse-never-truncate rule now spans every write boundary (was the sole
  silent-slicer); e2e-pinned.
- `[DATA]` `inventory` unique (product_id, store_slug) index (F-12) — the
  seed's `onConflictDoNothing` finally has a conflict target; duplicates
  (multi-process first-seed race) can no longer double-hit the decrement.
  RED e2e proved the insert previously succeeded; drizzle-kit push applied.
- `[REL]` pg pool degrade time bound (F-9): `connectionTimeoutMillis: 5000`
  + `query_timeout: 8000` — a blackholed (not refused) Postgres previously
  hung every force-dynamic page indefinitely; browser-verified bounded
  degrade (~10s worst case, static-catalogue content). Source-pinned unit
  (scan-guard precedent).
- `[COR]` Campaign label per-render (F-10 — module-load froze it for the
  process lifetime); search page syncs `?q=` via replaceState on
  submit/chips (F-17 — refresh/share restores the search; the SearchAction
  target is no longer theoretical); inspiration index quotes the pieces
  total, not the editorial budget (F-16 — the Task-119 detail-page
  conflation, missed on the index); business-stepper floor + checkout GST
  line (F-15, cart/PDP parity); hero + offers discount copy honestly
  attribute the 24% max (F-19 — the old copy led with the one discounted-set
  member carrying NO deal); shop layout derives catalogue counts from the
  constants and drops the stale "client component" comment (F-13/F-14);
  ShopInner's tautological guard clauses removed (F-18).
- `[SAN]` **Deferred (documented, unchanged)**: rate-limiter `x-forwarded-for`
  first-hop spoofing (F-20 — single-trusted-proxy posture; upgrade path =
  the reference repo's cf-connecting-ip → rightmost-hop → "direct" grid),
  offers bundle slug curation, and the standing deferrals from prior
  registers.
- `[SAN]` Gates: lint 0/0 · typechecks clean · **128 unit / 78 e2e** · cold
  build green (29 routes). The docs-counts pin swept all five operator docs
  in the same commit. RED e2e runs leave DB residue (probe orders/reviews)
  — cleaned this cycle; the discipline is encoded in AGENTS.md gotcha #13.

#### Revision Block — v1.6.0 (Task 121 — client-state robustness, click-&-collect stock honesty, shop SSR content, search settle discipline, SEO completion)

- `[CA]` **Persisted-client-state shape validation**: `createLocalStore` gained
  an optional `validate` predicate — `JSON.parse` only rejects invalid JSON,
  so a valid-JSON wrong-shape payload in `nordhem_cart_v1` (e.g. an object)
  sailed past the corrupt-data guard and crashed `CartProvider`'s
  `lines.reduce` at render, taking every route down with it. All four stores
  carry validators; a branded root `error.tsx` (with a "clear saved bag"
  recovery path) bounds any future render-crash class. Unit-pinned ×4.
- `[CA]` **Click-&-collect stock honesty**: the availability check summed
  inventory island-wide while fulfilment is single-store — a Jurong pickup
  passed on Tampines stock while the PDP BuyBox honestly showed "Jurong: Out
  of stock". Pickup now validates (and decrements) the chosen store's rows
  only; delivery keeps the aggregate (any store can ship — the single-store
  decrement source remains the documented deferral). E2e-pinned with a
  zeroed-store 422 + stocked-store 201 control.
- `[SYN]` **/shop SSR content**: the sitemap-indexed listing was a
  client-fetch island (zero product content for non-JS crawlers/unfurlers).
  Now a server component ships the initial cat/sort-filtered grid in the
  HTML (degrade-fallback intact); the client `ShopInner` takes over
  filtering. Two structural discoveries encoded: `useSearchParams` forces
  the CSR bailout (empty SSR shell), and streamed Suspense content lands in
  a `<div hidden>` only JS can reveal — the params are read server-side and
  passed as props, no Suspense boundary. The display sort moved to a shared
  `sortProductList` seam (API + SSR render the identical order). E2e-pinned
  with a `javaScriptEnabled: false` pair.
- `[CA]` **Search settle discipline**: `loading` initialized `false` and only
  flipped inside the 250ms debounce callback — the primary entry path
  (`/search?q=…` from the header) announced "0 results for …" (role=status)
  before the fetch started. Verdict blocks now gate on a settled-for-query
  flag; the e2e proves the negative by freezing the debounce-class timeout
  in an init script (a polling assertion sleeps through a 250ms flash).
- `[SYN]` **PDP review-count honesty**: the header rendered the seed column
  ("412 reviews") beside a live section rendering "Reviews (2)", and the
  Product JSON-LD `aggregateRating.reviewCount` claimed the same fiction.
  The JSON-LD count now derives from the live review rows (node omitted at
  zero — never publish an aggregate you cannot back); the header link
  publishes the anchor, not a second number; the star display is
  `role="img"` with an honest aria-label. Product cards keep the invented
  `(412)` stat (the documented invented-content stance). E2e-pinned ×2.
- `[CA]` **Checkout boundary completion**: `storeSlug` validated against the
  three real stores (a crafted slug used to persist verbatim and render as
  junk copy via `storeName()`), `deliverySlot` refused overlong (the last
  silent `slice()` — the "refuse, never truncate" rule now has no
  exceptions), and the decrement's swallowing catch was removed (a failed
  UPDATE aborts the surrounding transaction anyway — the comment promised
  semantics the code could not deliver; fail-closed is honest). E2e-pinned.
- `[CA]` **A11y/UX batch**: the utility strip's `truncate` clipped its only
  mobile CTA past the viewport while it stayed focusable (WCAG 2.4.7 — the
  link is now a shrink-0 flex sibling that can never clip); the PDP BuyBox
  minus is disabled at qty 1 (Task-120 fixed the cart page only); checkout
  errors render above the form (contact-field failures used to surface
  inside "3 · Payment"); the shop loading skeleton announces via
  `role="status"`. All e2e-pinned.
- `[SYN]` **SEO completion**: sitemap `lastModified` dropped (permanently
  "now" = pure lastmod noise; unit-pinned); the WebSite JSON-LD gained the
  `SearchAction` its comment always claimed; home ships an absolute
  `og:image`; the hero price card hides its price if the hero product is
  missing (the `?? 79900` fallback re-hardcoded the exact magic number the
  Task-119 fix removed). `campaignEnd`/`campaignEndLabel` roll the Dec-29–31
  stale window (unit-pinned ×3).
- `[CA]` **Honesty copy batch**: the order page's "confirmation sent to…"
  and the track page's "from your confirmation email" claimed an email that
  is never sent (now "order summary for…" + an explicit demo note); the
  services "Live SMS tracking" softened to what the demo shows; the family
  "Member prices this week" link relabelled (the help FAQ states there are
  no member prices).
- `[SAN]` **Disproven finding (RED-first discipline)**: the audit's
  PDP→PDP stale-review-state finding (Medium, plausible mechanism) passed
  its RED spec immediately — the App Router remounts the page subtree on
  dynamic-param navigation. The spec stayed as a regression pin; no dead-key
  "fix" was added. Lesson encoded in SKILL.md #21.
- `[SAN]` Gates: lint 0/0 · typechecks clean · **128 unit / 78 e2e** · cold
  build green (29 routes). The docs-counts pin swept all five operator docs
  in the same commit.

#### Revision Block — v1.5.0 (Task 120 — API-boundary hardening, atomic checkout, SEO blanket completion, a11y floor, docs-truth cycle)

- `[CA]` **Checkout boundary hardened**: `req.json()` is parse-guarded into a
  400 `BAD_REQUEST` envelope with fixed copy (the only route without one), and
  the 500 path ships fixed copy — the raw `err.message` (parse text, driver
  connection strings) never reaches an unauthenticated caller. Order fields
  are REFUSED at length caps (email 254 / name 80 / phone 20 / address 200)
  rather than silently truncated: a truncated delivery address is a broken
  order. e2e-pinned (malformed-JSON 400, cap 422, fixed-copy 422).
- `[CA]` **placeOrder is now atomic**: the availability check, the order/item
  inserts and the inventory decrement run in ONE `db.transaction()` over
  `SELECT … FOR UPDATE` row locks (ordered by id). The Task-119
  check-then-decrement gap was a real TOCTOU — two concurrent last-unit
  orders both passed the check and both floored the store row. Demonstrated
  RED at the function level (pre-warmed pool: 2 fulfilled / 0 refused), now
  exactly one 201 + one 422 `LOW_STOCK`; e2e-pinned with a quiet product
  pinned to one unit. The vestigial client `totals` field was retired with it.
- `[SYN]` **SEO blanket completed**: the six remaining sitemap-indexed routes
  that shipped title-only metadata (inspiration, offers, services, stores,
  food, help) now carry description + canonical + OG; the `/family` metadata
  earn-rate was corrected to the page's own calculator (it claimed 5 pts/$10
  against a 10 pts/$1 reality — a 20× crawler-facing contradiction — plus
  "members-only workshops" that do not exist). e2e-pinned.
- `[CA]` **a11y floor**: the four `outline-none`-without-replacement form
  inputs (family/business/planning-tools emails + dates, BuyBox qty) gained
  visible focus rings; the cart promo error announces via `role="alert"`
  (success stays `status`); the cart minus disables at qty 1 (Remove stays the
  only destructive path); star displays are `role="img"`. e2e-pinned.
- `[SYN]` **Docs-truth cycle**: the docs-counts pin now covers the PAD (its
  blind spot — the rot class lived one file over: §1.2 said 50/23, §7.4
  58/27, §9.2 50/23, §11 5 files/58); the stale inline-limiter Pattern 4,
  §6.2 and the §6.4 threat row were rewritten to the factory seam; the dead
  `carts`/`cart_items` schema was retired (9 live tables — the localStorage
  cart is the documented architecture); the seed self-heals a partial first
  seed (inventory rebuild, reviews stay first-time-only); the order page
  splits outage from not-found; the status ladder is one `orderStepIndex`
  seam (unit-pinned); `#8a8a8a` captions moved to the AA-passing muted token.
- `[CA]` **Honesty batch**: the fabricated "Nearest MRT listed on each store
  card" pointer, the "audited yearly" stat contradicting its own illustrative
  disclaimer, and the inspiration "live prices and stock" overclaim were
  reworded to what the surfaces actually show.
- `[CA]` Gates: lint 0/0 · typechecks clean · **86 unit / 43 e2e** · cold
  build green (29 routes). Versioning note: the v1.2/v1.3 numbers were
  consumed by the Task-118/119 SKILL.md version sequence — this block resumes
  the PAD's own line at v1.5.0 to stay ahead of SKILL v1.4.0.

#### Revision Block — v1.4.0 (Task 119 — server-truth consolidation, SEO metadata blanket, ARIA honesty, rate-limit seam, docs-counts pin)

- `[CA]` **Server money truth consolidated**: `placeOrder()` now calls
  `priceTotals()` (the display seam) instead of hand-rolling delivery/GST — the
  hand-rolled copy had diverged on the `net===0` delivery edge; the exact-money
  e2e journey ($679.15 / $2,338.20) pins the consolidation behaviour-preserving.
- `[CA]` **JSON-LD availability derives from live per-store inventory** (the
  same rows the BuyBox renders), not the never-decremented `stockTotal` seed;
  e2e-pinned by a spec that zeroes a quiet product's inventory rows in the
  pinned DB and restores them.
- `[CA]` **Checkout stock honesty**: per-product qty is validated against the
  live inventory aggregate → 422 `LOW_STOCK` (was: silent `greatest(0,·)` floor);
  the API response is minimized to `{ orderNumber }` (matching the track route).
- `[CA]` **SEO metadata blanket**: route-layout metadata for the five
  sitemap-indexed client pages (/shop, /family, /business, /sustainability,
  /planning-tools), `generateMetadata` on inspiration details, page-level
  metadata on home, `robots: noindex` on `/order/[number]` (belt-and-suspenders
  with the robots.txt disallow), and site-level Organization + WebSite JSON-LD
  in the root layout.
- `[CA]` **Rate-limit seam**: the four per-route in-process Map limiters
  (checkout/reviews/track/promo) consolidated into the shared
  `src/lib/rate-limit.ts` factory (fixed window, Retry-After, opportunistic
  expired-key purge — the Maps previously never evicted); 429s now carry a
  Retry-After header.
- `[CA]` **ARIA honesty**: the five widget-role surfaces that never
  implemented the APG keyboard pattern (shop category tabs, checkout
  delivery/payment, sustainability condition, planning-tools room type,
  review star rating) now use plain toggle buttons (`role="group"` +
  `aria-pressed`) — honest semantics over broken radio/tab announcements.
- `[CA]` **Docs-counts pin** (`tests/unit/docs-counts.test.ts`): every
  live-tense test-count claim in AGENTS/README/CLAUDE/SKILL is fs-computed and
  test-enforced (the neo-crm mechanism) — SKILL.md's Appendix B had drifted to
  50/23 against a 58/27 reality before this cycle.
- `[CA]` Honesty batch: fabricated member-prices/200+-icons/MRT-app/chat-SLA
  copy reworded; the Family join form confirms honestly (business/planning
  pattern); ESG stats carry the concept-demo disclosure; hero price derives
  from the catalogue; campaign end dates are computed; inspiration budget
  shows both figures honestly labelled; `storeName()` replaces raw store
  slugs in order/track copy; BuyBox's confirmation timer is cleared on
  re-set/unmount; dead `getOrCreateCart`/`getCartLines` + unused Rating prop +
  dead track interface fields retired.
- `[SAN]` Gate totals after this cycle: lint 0/0 · typechecks clean ·
  **79 unit / 34 e2e** · cold build green.

#### Revision Block — v1.1.0 (Tracked Changes)

- `[SYN]` First PAD for the NORDHEM codebase (v1.0.0; the repository's earlier PAD
  described the predecessor `ely-beauty` project and was removed at commit `6bca89e`).
- `[CA]` Docs-validation audit of `docs/implementation-plan.md` /
  `docs/reference-investigation.md` performed against the codebase; findings encoded
  in §11 (including the corrected table count: **11** tables, not the plan's 10).
- `[CA]` Clean-build blocker fixed (v1.0.0 cycle): the Tailwind v4 candidate-scan
  guard (`@source not` block) restored to `src/app/globals.css`.
- `[SAN]` `.env.example` rewritten to match the actual codebase (the inherited file
  described Prisma/SQLite/Stripe variables the code never reads).
- `[CA]` **Task 114 remediation cycle (this revision):** rootless PostgreSQL 17
  installed and the full DB path verified live (seed counts, checkout round-trip
  `NH-20261118-2NRWZD` with exact money math, fail-closed tracking); test harness
  re-pinned (vitest 5.1 + @playwright/test 1.65 — 40 unit / 18 e2e, all green;
  the ely-beauty dead tree + config-clobbering `ensure-build-configs.mjs` retired);
  the 7-error `react-hooks/set-state-in-effect` debt fixed via `local-store.ts`
  external stores + `useSyncExternalStore` + adjust-during-render (never
  suppressed); mobile drawer gained Escape-close (agent-browser-verified gap);
  SEO policy made coherent (robots disallows utility/personal routes, sitemap
  lists 12+24+6 indexable URLs only, PDP canonical + OpenGraph + Product
  JSON-LD, `data-scroll-behavior="smooth"`); `/order/[number]` PII masked
  (`maskEmail`, no street address); promo display unified on `findPromo`
  (killing the unknown-code→10% phantom discount); package identity fixed
  (`home-furnishing-store`); dev-server screenshots under `docs/screenshots/` (21 as of Task 119).
  Remediation plan + evidence: `docs/plans/2026-11-18-task114-remediation-plan.md`.
- `[CA]` **Task 118 remediation cycle (this revision):** fresh-clone re-audit
  caught a **dev-mode hydration trap** — Next 16 `allowedDevOrigins` drops the
  `/_next/hmr` websocket for 127.0.0.1 origins, the RSC client discards the
  inline flight payload, and the dev page renders but never hydrates (no
  console errors); invisible to every gate because e2e boots the production
  build. Fixed via `allowedDevOrigins: ["127.0.0.1"]` in `next.config.ts`
  (hydration probe RED → GREEN, full mobile-drawer taxonomy re-verified on
  dev) and unit-pinned. **Lineage drift** in the operator's inter-session
  commits aligned to the codebase: `.env.example` restored to the
  single-variable contract (the pasted sibling-project file listed 8 unread
  variables incl. Stripe/BDT/auth), `docker-compose.yml` reduced to a
  postgres-only service (no Redis/Stripe/Adminer), the "Maison" pgcrypto/
  pg_trgm init script removed (the schema needs no extensions) — all pinned
  by `tests/unit/env-example.test.ts`. Honesty + boundary cycle: PDP badge
  dedupe completed (`visibleBadges` wired into product pages), reviews 422
  for unknown productIds (was FK 500), 20/min/IP limiters on
  `/api/orders/track` + `/api/promotions/validate`, JSON-LD availability
  derived from stock, marketing copy honest (24% not 30%; no "stackable"),
  MAKAN15 label matches whole-basket reality, untitled reviews no longer
  get a "Verified review" headline, cart keeps the applied promo on a failed
  apply (+ explicit Remove button), half-star rating renderer via `stars()`,
  checkout per-line validation via `clampInt`, `/order/[number]` decode
  guarded, `/api/orders/track` response minimized to the fields the page
  renders. Suite grew to **58 unit + 27 e2e** (env/compose/config +
  scan-guard pins; rate-limit, badge-dedupe, unknown-productId and promo-
  persistence specs). Plan:
  `docs/plans/2026-11-18-task118-remediation-plan.md`.
- `[CA]` **Task 117 remediation cycle:** fresh-clone re-audit
  (mobile-nav taxonomy re-verified clean at 390/768/1440 — no Tailwind v4 bug);
  honesty fixes — Family voucher calculator 10× overstatement (now the pure,
  unit-pinned `familyVoucherCents`), BuyBox no longer fabricates stock on the
  degrade path, wishlist/search render explicit error+retry states instead of
  misleading empty states; API boundary hardening — malformed JSON bodies are
  400 envelopes (reviews/promo/track), invalid `productId` is a 422, reviews
  POST gained the checkout-route rate limiter; `placeOrder` now imports the
  pricing constants from `utils.ts` (single source with `priceTotals`);
  badge dedupe (`visibleBadges`), dead-code sweep (`cartToken`, `ilike`/`or`
  re-exports, inert `animationDelay`), dynamic dates (planning-tools min,
  footer year), honest demo framing on lead-capture forms. Suite grew to
  **50 unit + 23 e2e** (fetch-failure resilience specs + API boundary specs).
  Documentation drift swept: route count corrected to **29** everywhere,
  §1.2/§3.2/§3.3 stale rows brought current. Plan:
  `docs/plans/2026-11-18-task117-remediation-plan.md`.

---

## Table of Contents

1. [System Overview & Decisions](#1-system-overview--decisions)
2. [High-Level System Topology](#2-high-level-system-topology)
3. [Application Architecture](#3-application-architecture)
4. [Data Architecture](#4-data-architecture)
5. [Design System Reference](#5-design-system-reference)
6. [Security Architecture](#6-security-architecture)
7. [Testing Strategy](#7-testing-strategy)
8. [Build & Deployment](#8-build--deployment)
9. [Developer Handbook](#9-developer-handbook)
10. [Known Issues & Outstanding Tasks](#10-known-issues--outstanding-tasks)
11. [Key Files Reference](#11-key-files-reference)
12. [Glossary](#12-glossary)

---

## 1. System Overview & Decisions

### 1.1 Document Metadata & Purpose

This PAD is the single source of truth for the NORDHEM codebase: what it is, why
every consequential choice was made, how the pieces fit, and what is currently
broken or deferred. Use it when onboarding, when choosing where a change belongs,
when debugging a gate failure, or when planning the next remediation cycle.

NORDHEM is a Singapore-market furniture & home-furnishing e-commerce storefront —
an original-code, IA-level functional superset of the public IKEA Singapore site
(public-route observation only; no credentials, no writes, no asset copying; all
product names, copy and store data are invented; imagery is Pexels-licensed).
Provenance: scaffolded from the `nordeim/ely-beauty` template lineage (commit
`6379967` "muse 1.3 v1" replaced the predecessor app), which is why several
non-app artifacts remain in the tree (§10).

### 1.2 Technology Stack Summary

| Layer | Technology | Version | Key Rationale |
|-------|-----------|---------|---------------|
| Web framework | Next.js (App Router, Turbopack) | 16.4.2 (lockfile-pinned) | RSC + route handlers in one deployable; the template lineage standard |
| UI runtime | React | 19.2.6 | Required by Next 16; server components by default |
| Language | TypeScript, `strict: true` | 5.9.3 | Type safety across the API seam without a separate codegen step |
| Styling | Tailwind CSS, CSS-first `@theme` | 4.1.17 | Literal-hex tokens, zero config file, `@source` scan control |
| PostCSS runner | `@tailwindcss/postcss` | 4.1.17 (postcss 8.5.23 pipeline) | The Tailwind v4 integration path |
| ORM | Drizzle ORM | 0.45.2 | SQL-first, schema-as-TypeScript, no engine binary (ADR-002) |
| DB driver | `pg` (node-postgres) | 8.20.0 | Pooled connections, `drizzle-orm/node-postgres` adapter |
| Database | PostgreSQL | 15+ recommended | Relational catalogue/orders; `drizzle-kit push` for schema |
| Lint | ESLint flat config + `eslint-config-next/core-web-vitals` | 9.39.4 | One linter, Next-aware rules |
| Unit/E2E | Vitest 5.1 / Playwright 1.65 (chromium) | lockfile-pinned | NORDHEM-native suite (Task 114; extended Tasks 117–143) — 218 unit + 146 e2e, all green (§7) |
| Imagery | Pexels CDN | — | Licensed stock, zero local pipeline (ADR-007) |

### 1.3 Architecture Decision Records (ADRs)

**ADR-001: Next.js 16 App Router as a single deployable**

- **Context:** The storefront needs SSR for SEO (product metadata, sitemap),
  API routes for the checkout seam, and client interactivity for the bag — with
  one operator and no platform team.
- **Decision:** One Next.js 16 App Router application (`src/app`), pages +
  route handlers in the same tree, `force-dynamic` on data-driven pages.
- **Rationale:** No separate API service to deploy or authenticate between;
  RSC gives server-side data fetching with the option to go client where the
  UX demands it; the template lineage already validated the stack.
- **Consequences:** + Simple deploys, shared types across the seam;
  − API and UI scale together; no independent API versioning.
- **Alternatives Rejected:** Separate Express/Hono API (extra deploy, cross-origin
  concerns); Remix/Vite SPA (weaker SEO defaults for a catalogue site).

**ADR-002: Drizzle ORM + PostgreSQL (not Prisma, not SQLite)**

- **Context:** The predecessor template shipped Prisma + SQLite; the clone mission
  required relational order/inventory data and the repo already carried a Drizzle
  `db` client from the "muse 1.3" build.
- **Decision:** Drizzle ORM over `node-postgres` with a pooled client
  (`src/db/index.ts`), schema in TypeScript (`src/db/schema.ts`), applied via
  `npx drizzle-kit push`.
- **Rationale:** The implementation plan's deviations ledger records it plainly:
  migrating the working Drizzle client to Prisma "would add risk with zero
  behavioural gain". Drizzle's SQL-first model keeps money/limit queries legible.
- **Consequences:** + No query engine binary, schema is plain TS, `push` keeps
  dev friction low; − No Prisma Studio/migration history tooling; requires a
  real Postgres for writes (mitigated by ADR-004).
- **Alternatives Rejected:** Prisma (rewrite risk, engine binary); SQLite
  (the template's zero-config story — abandoned for concurrency and
  SG-deployment realities).

**ADR-003: One React-context store (not Zustand/Redux)**

- **Context:** The bag, wishlist, promo code and store picker need client-side
  persistence; the family skill guidance prefers one store, and the mission
  minimized new dependencies.
- **Decision:** A single `CartProvider` React context (`src/lib/cart-store.tsx`)
  holding cart lines + wishlist + promo over `createLocalStore` external
  stores consumed via `useSyncExternalStore` (`src/lib/local-store.ts`),
  hydrated from `localStorage` inside the store factory, persisted on change
  (`nordhem_cart_v1`, `nordhem_wish_v1`, `nordhem_promo`, `nordhem_store`).
- **Rationale:** Same replace-contract semantics as the Zustand guidance without
  the dependency. (Task 114 replaced the original mount-effect hydration —
  which tripped `react-hooks/set-state-in-effect` — with external stores +
  adjust-during-render for params-derived state; see Pattern 5.)
- **Consequences:** + Zero dependencies, one seam to test, no effect-setState;
  − Not middleware-able.
- **Alternatives Rejected:** Zustand (dependency for one consumer);
  Redux Toolkit (order-of-magnitude oversize).

**ADR-004: "Degrade, Never Fail" data strategy**

- **Context:** Demo/evaluation deployments often have no Postgres; a dead DB must
  not blank the storefront.
- **Decision:** Every DB read in `src/lib/server-data.ts` is wrapped in try/catch
  returning the static catalogue from `src/lib/catalog.ts`; `ensureSeed()`
  idempotently seeds empty tables on first read (single-flight promise); only
  write paths (checkout, review POST, tracking lookup) require the live DB.
- **Rationale:** The catalogue is small and duplicated in `catalog.ts` as the
  seed source anyway — the fallback is free; `/api/health` honestly reports DB
  reachability (`select 1`).
- **Consequences:** + Zero-config demo, resilient reads; − Read replicas of
  truth (catalog.ts vs DB) can drift — the seed is the contract; writes fail
  loudly (500 envelope) rather than silently degrading.
- **Alternatives Rejected:** Static-only build (loses orders/reviews/tracking);
  mandatory DB health-gating the app (breaks the demo story).

**ADR-005: Integer-cents money, server-re-derived totals**

- **Context:** Money math in floats invites rounding drift; client-sent totals
  are a tampering vector.
- **Decision:** All money is integer cents end-to-end (`priceCents`,
  `unitPriceCents`, …). `placeOrder()` re-derives subtotal, discount, delivery
  fee and GST from the product table and promo rules — the client's `totals`
  field is deliberately zeroed at the API boundary. Prices are GST-inclusive;
  the 9% component is back-calculated (`/(1+0.09)`) for display only.
- **Rationale:** SG retail convention lists GST-inclusive prices; integer cents
  match the schema and `Intl.NumberFormat("en-SG")` rendering exactly.
- **Consequences:** + Tamper-proof checkout, drift-free totals; − The pure
  pricing rules exist in two places (`priceTotals` for display,
  `placeOrder` for truth) — a future refactor should unify on the helper.
- **Alternatives Rejected:** Decimal.js (dependency for what integers do);
  trust-then-verify totals (unnecessary when re-derivation is cheap).

**ADR-006: No auth, mock payments (documented deferrals)**

- **Context:** Family/Business flows and checkout need to *exist* for IA parity,
  but storing passwords or charging cards is out of scope for a demo clone.
- **Decision:** No auth library at all; Family (points calculator) and Business
  (instant quote) are interactive demo pages. Payment methods (card, PayNow,
  GrabPay, Atome) are UI selectors; orders are created `status: "confirmed"`
  with no charge; the checkout UI flags "Demo — no charge".
- **Rationale:** The implementation plan's deviations ledger: "documented as
  deferred, not silently omitted". Adding Auth.js/Stripe would add secrets,
  webhooks and compliance surface the mission does not need.
- **Consequences:** + Zero secret management, deployable anywhere; − Order
  tracking is email-scoped knowledge, not capability; real payments need a
  full design pass before introduction.
- **Alternatives Rejected:** Auth.js/Better-Auth with demo credentials (secret
  surface for zero product value); Stripe test mode (webhook + key ceremony).

**ADR-007: Pexels CDN imagery with plain `<img>` (not next/image)**

- **Context:** Product/room imagery must be licensed, original and zero-ops.
- **Decision:** Remote Pexels URLs (attribution in code comments) rendered with
  plain `<img>` + per-line `eslint-disable @next/next/no-img-element`; `loading="lazy"`
  and `fetchPriority` set manually where it matters.
- **Rationale:** No image pipeline, no optimizer config, no local asset
  management; the catalogue ships as data.
- **Consequences:** + Zero asset ops; − No automatic format/size negotiation;
  LCP depends on Pexels' CDN.
- **Alternatives Rejected:** `next/image` remote patterns (optimizer config for
  marginal gain at this scale); locally generated imagery (the family used it
  in the predecessor; abandoned for licensing clarity).

---

## 2. High-Level System Topology

```mermaid
flowchart TB
    subgraph Client
        B[Browser · mobile-first, ≥360px]
    end
    subgraph App["Next.js 16 (single deployable)"]
        PAGES[Server Components<br/>20 page routes · force-dynamic]
        API[Route Handlers · 6 endpoints<br/>envelope + validation + rate limit]
        CTX[Client: CartProvider context<br/>localStorage persistence]
        PAGES --> CTX
    end
    subgraph Data
        DB[(PostgreSQL<br/>9 tables · pooled pg)]
        SEED[ensureSeed<br/>idempotent, single-flight]
        FALLBACK[Static catalogue<br/>src/lib/catalog.ts]
    end
    EXT[PEXELS[image/room imagery]]
    B -->|HTML/RSC| PAGES
    B -->|JSON /api/*| API
    B -->|fetch: shop/search/reviews| API
    API --> SD[server-data.ts]
    PAGES --> SD
    SD --> SEED --> DB
    SD -->|read fails → fallback| FALLBACK
    API -->|writes: orders, reviews| DB
    B -.->|img URLs| EXT
```

Runtime characteristics: one Node process (Next server) + one PostgreSQL; no
cache/queue/CDN layer of our own (Pexels serves imagery); every data page is
`force-dynamic`, so requests hit the seed-guarded read path each time. Scaling
constraint is the Postgres pool (`globalThis`-cached Pool singleton in dev).

---

## 3. Application Architecture

### 3.1 The Layer Model

```
Layer 0: src/db        — schema.ts (9 tables, Drizzle pg-core) + index.ts
                          (pooled client, globalThis-singleton in dev).
                          Rule: no business logic here; types flow up via $inferSelect.
Layer 1: src/lib       — server-data.ts (all DB reads/writes + fallbacks + pricing
                          truth), catalog.ts (static seed + fallback catalogue),
                          cart-store.tsx (client context), utils.ts (pure helpers).
                          Rule: pages/components never import src/db directly.
Layer 2: src/components— Header, Footer, ProductCard, BuyBox, ReviewSection.
                          Rule: presentation + local UI state only; data via props
                          or the cart context.
Layer 3: src/app       — 20 page routes + 6 API route handlers.
                          Rule: pages compose Layer 1/2; handlers validate input,
                          delegate to Layer 1, wrap results in the API envelope.
```

**Golden rule:** every DB touch funnels through `src/lib/server-data.ts`, which
owns the degrade-fallback contract and the pricing truth. A page importing
`@/db` directly is an architecture violation. (Task 136 F-2: the single
named exception is `src/app/api/health/route.ts` — the infra probe must
bypass the degrade by design, because it reports DB status itself; the
funnel fs-pin enforces the rule mechanically: only `src/db/**`,
`server-data.ts`, and `api/health` may import `@/db`.)

### 3.2 Annotated Directory Structure

```
home-furnishing-store/
├── src/
│   ├── app/
│   │   ├── layout.tsx            ← root: CartProvider, Header/Footer, skip link, metadataBase nordhem.sg
│   │   ├── page.tsx              ← home: hero, rooms, bestsellers, deals, stores, brand
│   │   ├── globals.css           ← Tailwind v4 @theme tokens + candidate-scan guard + utilities
│   │   ├── not-found.tsx         ← branded 404
│   │   ├── robots.ts · sitemap.ts← SEO: robots disallows utility/personal routes; sitemap = 12 static + 24 product + 6 room (42 indexable URLs)
│   │   ├── shop/ search/         ← shop: server component ships the SSR grid, client ShopInner takes over (Task 121); search: client page (debounced 250ms)
│   │   ├── product/[slug]/       ← RSC: metadata, gallery, stock/aisle, reviews, related
│   │   ├── cart/ checkout/       ← bag UI; 3-step checkout (contact→delivery→payment) with live totals
│   │   ├── order/[number]/ track-order/ ← confirmation + email-scoped tracking timeline
│   │   ├── inspiration/ + [slug]/ ← shoppable rooms linked to live PDPs
│   │   ├── offers/ services/ stores/ family/ business/ food/ sustainability/
│   │   ├── planning-tools/ wishlist/ help/ ← calculators, quote tool, buy-back estimator, room explorer
│   │   └── api/
│   │       ├── products/route.ts          ← GET: q/cat/sort/max filter+sort
│   │       ├── promotions/validate/route.ts ← POST: code + subtotal → promo or error
│   │       ├── checkout/route.ts          ← POST: validation, 20/min/IP fixed-window, placeOrder
│   │       ├── orders/track/route.ts      ← POST: orderNumber + email match
│   │       ├── reviews/route.ts           ← GET/POST by productId, rating 1–5
│   │       └── health/route.ts            ← GET: select 1 → { ok }
│   ├── components/               ← Header, Footer, ProductCard, BuyBox,
│   │                               ReviewSection (line counts deliberately
│   │                               dropped — Task 129 F-5's "line counts rot")
│   ├── lib/
│   │   ├── server-data.ts        ← ensureSeed, reads+fallbacks, validatePromo,
│   │   │                           placeOrder (money truth + fulfilment-scoped
│   │   │                           inventory), trackOrder, cart helpers
│   │   ├── catalog.ts            ← 24 products / 8 categories / 3 stores /
│   │   │                           6 inspirations / 3 promos + findProduct/productImage
│   │   ├── cart-store.tsx        ← CartProvider + useCart (lines/promo/wishlist)
│   │   └── utils.ts              ← formatSGD, priceTotals, clampInt, validators,
│   │                               orderNumber (NH-YYYYMMDD-XXXXXX), stars, MAX_INT4
│   └── db/
│       ├── schema.ts             ← 9 tables + exported row types
│       └── index.ts              ← pooled Drizzle client, DATABASE_URL guard
├── docs/                          ← implementation-plan, reference-investigation, SSH push
│                                   runbook + wrapper, session/prompt archives, build zips
├── skills/                        ← vendored agent-skills library (operator contract: excluded
│                                   from checking/testing/compilation)
├── tests/                         ← NORDHEM-native suite (Tasks 114–138; live counts pinned by the docs-counts unit test)
├── scripts/                       ← generate-imagery.mjs, gen-gallery-variants.mjs (lineage imagery utilities, no broken imports)
├── AGENTS.md · CLAUDE.md · README.md · this PAD
├── drizzle.config.json            ← local dev DB URL for drizzle-kit push
├── eslint.config.mjs · tsconfig.json · tsconfig.tests.json (inherited)
├── vitest.config.mts · playwright.config.ts (live: node-env unit; prod-build e2e on :3100)
└── worklog.md                     ← session-by-session history (Tasks 113+; the operator
                                    trimmed the Tasks 1–112 predecessor lineage at 6ef81d1)
```

### 3.3 Critical Code Patterns

**Pattern 1 — The degrade-fallback read (`src/lib/server-data.ts`)**

```typescript
/**
 * Every catalogue read follows this shape: seed-guard, live query, static
 * fallback. The storefront must render with Postgres down — only writes fail.
 */
export async function getAllProducts(): Promise<ProductRow[]> {
  await ensureSeed();                      // idempotent, single-flight (below)
  try {
    return await db.select().from(products).orderBy(products.id);
  } catch {
    // Static fallback keeps the storefront alive if Postgres is unreachable.
    return PRODUCTS.map((p, i) => ({ ...p, id: i + 1, /* …shape the schema guarantees */ }));
  }
}
```

*Why this pattern:* the fallback duplicates the seed source (`catalog.ts`), so
there is exactly one catalogue definition to maintain; the catch is empty by
design because degradation is normal operation, not an error to log loudly.

**Pattern 2 — Idempotent single-flight seed (`ensureSeed`)**

```typescript
let seedPromise: Promise<void> | null = null;

export function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const existing = await db.select({ id: products.id }).from(products).limit(1);
        if (existing.length > 0) return;               // already seeded
        await db.insert(categories).values(…).onConflictDoNothing();
        // … products, stores, promotions, inspirations, inventory rows, seed reviews
      } catch (err) {
        console.error("[seed] failed", err);
        seedPromise = null;                            // allow retry on next request
      }
    })();
  }
  return seedPromise;
}
```

*Why this pattern:* concurrent first requests (build prefetch, parallel RSC
fetches) must not double-insert; `onConflictDoNothing` plus the module-level
promise makes re-running safe anywhere, and a failed seed resets instead of
poisoning the process.

**Pattern 3 — Server-side money truth (`placeOrder`)**

```typescript
// Re-derive money server-side; never trust client totals.
const lines = input.lines
  .map((l) => ({ product: byId.get(l.productId), qty: Math.min(99, Math.max(1, Math.floor(l.qty))) }))
  .filter(…);                                   // unknown products dropped, qty clamped
const subtotalCents = lines.reduce((a, l) => a + l.product.priceCents * l.qty, 0);
// …promo validation + discount, delivery rules (express $29 / click-collect $0 /
//   free ≥ $200 / else $12), GST back-calc:
const gstCents = Math.round(((net + deliveryFeeCents) * 0.09) / 1.09);
```

*Why this pattern:* the checkout route passes `totals` as all zeros — the field
exists for the client's convenience but the server never reads it; prices come
from the DB row, discounts from `validatePromo`, so a tampered client can only
choose *what* to buy, not *what it costs*. Inventory decrement runs INSIDE the
locked transaction, fail-closed (Task 121 F-8 — no swallowing catch; a failed
UPDATE aborts the checkout honestly), against the CHOSEN store's rows for every
method (Task 130 F-2 — the check and the decrement read the same rows; the
pre-130 delivery shape checked the island-wide aggregate and minted phantom
units through the greatest(0, …) clamp).

**Pattern 4 — The API envelope + write-boundary validation (`api/checkout/route.ts`)**

```typescript
// One shared fixed-window limiter factory (src/lib/rate-limit.ts, Task 119):
// 20 req / 60s / IP, Retry-After on 429, opportunistic expired-key purge.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
if (limiter.throttled(ip)) return NextResponse.json({ ... }, { status: 429, headers: { "Retry-After": ... } });

// Task 120: a malformed body is a client fault (400 fixed copy — never a
// leaked 500); order fields are refused at length caps, never truncated.
let body;
try { body = await req.json(); } catch { return ... 400 BAD_REQUEST ... }
if (address.length < 6 || address.length > 200) return ... 422 VALIDATION ...

// Every failure returns the same shape; no bare throws to the client.
if (!isValidEmail(email))
  return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter a valid email address." } }, { status: 422 });
```

*Why this pattern:* one envelope means one client-side error handler on every
caller (`ShopInner`, `ReviewSection`, checkout, tracking); codes (`VALIDATION`,
`RATE_LIMIT`, `EMPTY_BAG`, `INVALID_PROMO`, `NOT_FOUND`, …) are stable
contract points for the future test suite.

**Pattern 5 — Hydration-safe client persistence (`cart-store.tsx`, Task 114 shape)**

```typescript
// src/lib/local-store.ts — external store factory (SSR-safe, quota-safe)
const linesStore = createLocalStore<CartLine[]>(CART_KEY, []);
// consumer (src/lib/cart-store.tsx)
const lines = useSyncExternalStore(linesStore.subscribe, linesStore.getSnapshot, linesStore.getServerSnapshot);
```

*Why this pattern:* reading `localStorage` during render would break SSR
hydration, and the old mount-effect + `loaded` flag tripped the
React Compiler-era `react-hooks/set-state-in-effect` lint rule (the 7-error
debt fixed in Task 114 by refactor, never by suppression).
`useSyncExternalStore` handles the server/client split natively —
`getServerSnapshot` during SSR/hydration, the persisted client snapshot after
mount — with no effect-body setState. Params-derived state uses the
adjust-during-render pattern (compare a prev-value during render, setState in
the conditional branch — see `shop/`, `search/`, Header route-close).

---

## 4. Data Architecture

### 4.1 Database Schema (9 tables)

```mermaid
erDiagram
    categories ||..|| products : "category_slug (logical)"
    products ||--o{ inventory : "id = product_id (cascade)"
    products ||--o{ reviews : "id = product_id (cascade)"
    products ||--o{ order_items : "id = product_id (denormalized)"
    orders ||--o{ order_items : "id = order_id (cascade)"
    inspirations }o--o{ products : "product_slugs[] (logical)"
```

| Table | Key columns | Notes |
|-------|------------|-------|
| `categories` | slug (unique), name, tagline, imageUrl, sortOrder | 8 room categories |
| `products` | slug, sku (unique), priceCents, compareAtCents?, ratingAvg numeric(3,2), colors[], imageUrls[], badges[], isNew, isBestseller, stockTotal | 24 rows seeded; `uniqueIndex` on slug |
| `stores` | slug (unique), name, address, hours, phone | 3 SG stores |
| `inventory` | product_id → products, store_slug, quantity, aisle_bin (`A12-B04`) | 3 rows/product |
| `orders` | order_number (unique), email, address/postal, delivery_method/slot, store_slug, payment_method, subtotal/discount/delivery/gst/total cents, status | money snapshot |
| `order_items` | order_id, product_id, name, sku, imageUrl, unitPriceCents, qty | **denormalized snapshot** — order survives catalogue edits |
| `reviews` | product_id, author, rating (1–5), title, body, verified | seeded + user-written |
| `inspirations` | slug (unique), room, sqm, budgetCents, productSlugs[] | 6 shoppable rooms |
| `promotions` | code (unique), kind (`percent`/`fixed`), value, minSubtotalCents, active | 3 codes |

**Note:** `docs/implementation-plan.md` says "10 tables" — the count was
corrected forward twice: the Task-114 audit made it 11 (the plan's "10"
likely skipped a table), and Task 120 retired the never-written
`carts`/`cart_items` dead schema (the cart is the documented localStorage
external store) leaving **9** live tables. The plan remains the historical
record.

### 4.2 Data Models

Row types are exported as `typeof table.$inferSelect` (`Product`, `Order`,
`Review`, …). Client-side views narrow these: `CardProduct`
(`components/ProductCard.tsx`) accepts `ratingAvg: string | number` because the
numeric column arrives as a string over JSON; `CartLine` carries only what the
bag needs (productId, slug, name, sku, imageUrl, unitPriceCents, qty).

### 4.3 Persistence Strategy

- **Connection pooling:** one `pg.Pool` per process, cached on `globalThis`
  outside production (survives Next dev hot reloads); `DATABASE_URL` is required
  at module load — the app refuses to boot with an unset variable rather than
  silently running DB-less (the static fallback covers *unreachable*, not
  *unconfigured*).
- **Migrations:** none — `npx drizzle-kit push` applies `schema.ts` directly;
  `drizzle.config.json` pins the local URL
  (`postgresql://postgres:postgres@127.0.0.1:5432/app_db`). Production usage
  should move to generated SQL migrations before the schema starts changing
  under live data (§10).
- **Seeding:** `ensureSeed()` on first read (Pattern 2) — no seed command, no
  CI step; empty tables fill themselves.

---

## 5. Design System Reference

### 5.1 Typographic System

| Role | Stack | Usage |
|------|-------|-------|
| Display | `"Arial Black", "Helvetica Neue", Arial, sans-serif` (`--font-display`) | Logo block, H1/H2 numerals, price, buttons (font-black weight) |
| Body | `"Helvetica Neue", Helvetica, Arial, system-ui` (`--font-sans`) | Everything else |

No web fonts are loaded — system stacks keep LCP fast and honor the zero-ops
imagery/font posture (ADR-007's sibling decision).

### 5.2 Color Tokens (`globals.css` `@theme`, literal hex)

| Token | Hex | WCAG role |
|-------|-----|-----------|
| `--color-brand` | `#0058a3` | Primary actions/links on white (AA for large/bold text + non-text) |
| `--color-brand-dark` / `--color-brand-ink` | `#004382` / `#003a6b` | Hover / deep accents |
| `--color-accent` | `#ffdb00` | CTAs, badges, `::selection`, focus rings (always paired with `#111` text) |
| `--color-accent-dark` | `#e5c400` | Accent hover |
| `--color-paper` / `--color-cream` | `#f7f5f0` / `#faf8f4` | Warm neutral surfaces |
| `--color-ink` / `--color-muted` | `#111111` / `#5b5b5b` | Body / secondary text |
| `--color-line` | `#e5e1d8` | Hairlines |
| `--color-moss` / `--color-clay` | `#2e6b34` / `#b5502a` | In-stock / low-stock semantics |

### 5.3 Component Primitives

No UI library. Five hand-rolled components (Header, Footer, ProductCard, BuyBox,
ReviewSection) + three utility classes in `globals.css`: `focus-ring`
(3px accent outline, `:focus-visible` only), `reveal-up` (entrance animation),
`no-scrollbar` (overflow strips). Arbitrary values (`bg-[#f5f3ee]`,
`text-[15px]`, `tracking-[0.16em]`) are the house style — tokens that repeat
should be promoted into `@theme`.

### 5.4 Motion

One keyframe (`revealUp`, 0.7s `cubic-bezier(0.22, 1, 0.36, 1)`); hover
transitions at 500ms on imagery. `prefers-reduced-motion: reduce` disables both
the animation and `scroll-behavior: smooth`.

---

## 6. Security Architecture

### 6.1 Security Rules

| Rule | Enforcement |
|------|-------------|
| Validate every write boundary | `isValidEmail/Phone/Postal` + length checks in `api/checkout`; rating 1–5 + name ≥ 2 chars in `api/reviews`; qty clamped 1–99 in `placeOrder` and the client steppers |
| Never trust client money | `placeOrder` re-derives all totals (ADR-005); the route zeroes the client's `totals` |
| Rate-limit order placement | In-process fixed window: 20 req/min/IP (Task 125 G-2: `x-forwarded-for` **rightmost** hop, `"direct"` fallback — the leftmost hop was client-forgeable) → 429 envelope |
| Parameterized queries only | Drizzle query builder throughout — no string-built SQL |
| No secrets in repo | `.gitignore` rejects `.env`, `*.key`, `ssh-key.txt`; `.env.example` documents the single non-secret variable; pushes use the out-of-repo key wrapper |
| Fail-closed on order access | Tracking requires order number **and** matching email (case-insensitive) |
| Input bounding | review fields REFUSED at caps (author 60 / title 120 / body 2000 — Task 122 F-11, refuse-never-truncate: a sliced review is the user's words mangled into a "valid" row); checkout order fields REFUSED at length caps (email 254, name 80, phone 20, address 200 — truncation would break delivery); deliverySlot (80) + method-coherent `DELIVERY_SLOTS` whitelist; storeSlug validated against the three-store `STORES` whitelist (no length cap exists — the whitelist IS the bound); productId bounded above by the shared `MAX_INT4` (Task 133 F-1 — an int4-overflow id is a 422 client error, never a driver 22003 → 500); every POST route parse-guards AND shape-guards `req.json()` → 400 |

### 6.2 Security Utilities

`src/lib/utils.ts` (validators, clamp), the shared `createRateLimiter`
factory in `src/lib/rate-limit.ts` (Task 119 — one instance per write
route, fixed window 20/min/IP, Retry-After, expired-key purge), and
`src/db/index.ts`'s fail-fast `DATABASE_URL` guard.

### 6.3 Authentication & Authorization

Deliberately none (ADR-006). Consequences to keep in mind: reviews are
unauthenticated (moderation is a future need), order knowledge is the
order-number+email pair, and the admin surface does not exist. Introducing
auth is a design event, not a patch.

### 6.4 Threat Model (demo-scope)

| Vector | Current posture |
|--------|----------------|
| Client-total tampering | Neutralized (server re-derivation) |
| Checkout spam | Fixed-window limiter (per-process; weak behind multi-instance LB — acceptable at demo scale) |
| XSS via review fields | React escapes by default; no `dangerouslySetInnerHTML` anywhere in `src/` |
| SQL injection | Drizzle parameterization |
| Secret leakage | No secrets exist in the app surface; the push path keeps keys outside the repo (wrapper runbook) |
| Missing-rate-limit on reviews/tracking | Fixed (Tasks 117/118) — all four POST routes run the shared factory (20/min/IP) |

---

## 7. Testing Strategy

### 7.1 Test Distribution — Current State (Tasks 114–138: NORDHEM-native)

| Category | Files | Status | Location |
|----------|-------|--------|----------|
| Unit (Vitest) | 10 files, 218 tests | ✅ Green — pure seams: `utils` money/validators + `familyVoucherCents` + `visibleBadges` + the `SORT_KEYS` whitelist/derivation pins (Task 135 F-2), `catalog` invariants + `findPromoMinimumCents` + `storeName` + the Task-138 store-count/productDiscountPercent/starter-kit derivation fs-pins, `local-store` external-store contract (+ the Task-133 uniqueness layer, + the Task-134/135 three-writer qty-clamp fs-pin), `mask`, robots/sitemap SEO policy, env/compose/config + scan-guard lineage pins, `rate-limit` factory (Task 119), the `orderStepIndex` ladder seam (Task 120), the `server-data` fulfilment-seam fs-pin (Task 131 F-2) + the DB-funnel golden-rule fs-pin + the reviews-degrade fs-pin + the promo in-tx fs-pin (Task 136 F-2/F-3/F-4) + the PDP unified-outage-signal + recovery pins + the outage-branch characterization pins (Task 137 F-1/F-3, mutation-proven), **docs-counts pin** (Task 119; Task 120 extended it to the PAD; Task 131 F-7 added DEPLOYMENT.md — fails the run on any stale live-tense count claim in AGENTS/README/CLAUDE/SKILL/PAD/DEPLOYMENT) | `tests/unit/` |
| E2E (Playwright) | 2 specs, 146 tests | ✅ Green — production build on `:3100`, pinned `DATABASE_URL`: mobile-navigation project (390×844), desktop storefront/commerce journeys (incl. the live-DB checkout round-trip), API boundary validation (422/400 incl. the Task-133 int4-overflow pair + the Task-135 cat/sort 422 pair), wishlist/search fetch-failure resilience + the Task-135 envelope-trust pair + the Task-136 shop-grid envelope probe + the Task-137 cart promo-apply envelope probe + the Task-138 resync-window commit-capture probe + the fee-copy derivation pin, JSON-LD live-inventory + LOW_STOCK 422 (Task 119, via direct pinned-DB manipulation with restore), the SEO metadata blanket (Task 119; Task 120 completed it for the six title-only routes and pinned the /family earn-rate), the checkout boundary set (Task 120: malformed-JSON 400, field-cap 422, concurrent last-unit oversell → exactly one 201/one 422 LOW_STOCK), and the a11y pins (focus indication, stepper floor, alert role) | `tests/e2e/` |
| Type coverage | `tsconfig.tests.json` | ✅ `npm run typecheck:tests` (node + vitest/globals types) | repo root |

The predecessor's 73-unit/15-e2e tree (ely-beauty imports, undeclared
packages) was retired in Task 114 — replaced, not deleted: every spec pins
NORDHEM behaviour. `npm run test` / `npm run test:e2e` are part of the gate.

### 7.2 Test Patterns

Unit tests assert at pure seams with independent expected values (worked money
examples like the verified `NH-20261118-2NRWZD` order); the localStorage-backed
stores are tested against an in-memory storage shim (`tests/unit/setup.ts`).
E2E runs against the **production build** (the dev server lies about
production) with auto-waiting locators, visible-subtree filters for the
responsive double-DOM (two search inputs), and a self-contained checkout
journey that creates and tracks its own order. TDD (`skills/tdd`):
red → green → refactor, one seam at a time; bug fixes ship with a regression
spec that failed before the fix.

### 7.3 Coverage Thresholds

Formal thresholds not enforced yet; the de-facto target is every acceptance
bullet in `docs/implementation-plan.md` plus the seam table in
`docs/plans/2026-11-18-task114-remediation-plan.md` §3. Grow the suite with
the code, never to hit a number.

### 7.4 Pre-Push Checklist

```bash
rm -rf .next && DATABASE_URL=… npm run build   # cold build (cache can mask the scan-guard failure)
npm run typecheck && npm run typecheck:tests  # app scope + test tree
npm run lint                                   # 0 errors / 0 warnings
npm run test                                   # 218/218 unit
npm run test:e2e                               # 146/146 e2e (live Postgres for the journey; the webServer pins TRUST_PROXY=1 and always boots its own server)
# runtime smoke of touched routes against `npm run start`
```

---

## 8. Build & Deployment

### 8.1 Production Build

```bash
DATABASE_URL="postgresql://…" npm run build    # needs the variable present (module-load guard)
npm run start                                  # serves the build
```

Output: `.next/` — 31 visible routes (20 pages, 6 API handlers, robots,
sitemap, not-found, icon, manifest — icon + manifest added Task 125); data pages are dynamic (`ƒ`), static pages (`/cart`, `/checkout`,
`/help`, …) prerender as shells that hydrate client state. Build toolchain:
Turbopack + PostCSS (`@tailwindcss/postcss`). **Always build cold** — the
candidate-scan guard's failure mode is cache-maskable (§10, row 1).

### 8.2 Environment Variables

| Name | Required | Description | Default |
|------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string; the one REQUIRED variable the code reads | — |
| `TRUST_PROXY` | No (optional) | Rate-limit XFF trust — exactly `"1"` enables x-forwarded-for keying; every other value (incl. unset) fails closed to the shared `"direct"` bucket. Set ONLY behind a trusted appending proxy (Task 141 G; documented commented in `.env.example`) | Direct deploys: leave unset |

`drizzle.config.json` independently pins
`postgresql://postgres:postgres@127.0.0.1:5432/app_db` for `drizzle-kit push`.

### 8.3 Docker Configuration

None. The app is a standard Node deployable (`next build && next start`);
containerization is deliberately out of scope.

### 8.4 CI/CD Pipeline

None hosted (no `.github/workflows`). The local gate chain is the only gate
(operator contract, `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` rule 2);
pushes go to `main` only via `docs/ssh_git_wrapper_v3.py` with an
externally-supplied deploy key (the `--remote` override is mandatory here —
the wrapper default still points at the predecessor repo).

---

## 9. Developer Handbook

### 9.1 Local Setup

```bash
git clone https://github.com/nordeim/home-furnishing-store.git && cd home-furnishing-store
npm install
cp .env.example .env              # set DATABASE_URL (any Postgres; unreachable = static fallback)
npx drizzle-kit push              # 9 tables; seeding is automatic on first read
npm run dev                       # http://localhost:3000
```

### 9.2 Common Commands

| Command | Location | Purpose |
|---------|----------|---------|
| `npm run dev` / `build` / `start` | root | Dev / cold production build / serve |
| `npm run lint` | root | ESLint (flat; `skills/` ignored) |
| `npm run typecheck` / `typecheck:tests` | root | App-scope / test-tree `tsc --noEmit` |
| `npm run test` / `test:e2e` | root | Vitest unit (218) / Playwright e2e (146), production build on :3100 with TRUST_PROXY=1 — the suite always boots its own pinned server) — `npm run test:watch` re-runs the unit suite on change |
| `npx drizzle-kit push` | root | Apply `src/db/schema.ts` |
| `python3 docs/ssh_git_wrapper_v3.py --key-file K --remote git@github.com:nordeim/home-furnishing-store.git` | repo | Verified SSH push to main (see the runbook) |

### 9.3 Code Style Rules

- TypeScript strict; no `any`; early returns; pure helpers in `src/lib/utils.ts`.
- Tailwind arbitrary values for one-offs, `@theme` tokens for repeats; slash-form
  aspect ratios only (`aspect-[16/9]`) — colon-form breaks the build via the
  candidate scan (the guard at the top of `globals.css` is load-bearing).
- ESLint flat config enforces Next core-web-vitals; the former 7-error
  `set-state-in-effect` debt was fixed in Task 114 by refactor (external
  stores + adjust-during-render) — never by disabling the rule.

### 9.4 Git Workflow

`main` only, Conventional Commits, atomic units, docs updated in the same
commit as behavior changes (`worklog.md` gains a dated task entry per session).
Clone over HTTPS; push over SSH through the wrapper with the mandatory
`--remote` override; keys never enter the tree.

---

## 10. Known Issues & Outstanding Tasks

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| ~~CRITICAL~~ | Clean production build broken: Tailwind v4 candidate scan read prose files → invalid `aspect-ratio: 3:1` → PostCSS "Missed semicolon". The `@source not` guard was missing from this repo's `globals.css`. | Build gate failed on every clean checkout | **Fixed (v1.0.0)** — guard restored; clean build verified green (29 routes) |
| ~~HIGH~~ | Inherited test suite not runnable (73 unit + 15 e2e ely-beauty files, undeclared packages, ~40 non-existent modules) | No executable regression net | **Fixed (Task 114)** — NORDHEM-native harness: 40 unit + 18 e2e green, typecheck:tests wired; dead tree + config-clobbering scripts retired |
| ~~HIGH~~ | `.env.example` described the predecessor stack | Misleads every setup | **Fixed (v1.0.0)** — real single-variable contract + precedence note |
| ~~MEDIUM~~ | 7 `react-hooks/set-state-in-effect` lint errors | Lint gate not green; cascading-render risk | **Fixed (Task 114)** — `local-store.ts` external stores + `useSyncExternalStore` (cart/wishlist/promo/store-picker) + adjust-during-render (Header route-close, search param-follow, shop URL-derived filters). Lint 0/0 without suppressing the rule; behaviour pinned by the e2e journey |
| ~~MEDIUM~~ | Mobile drawer ignored Escape | a11y gap (overlay baseline) | **Fixed (Task 114)** — keydown handler; pinned by the mobile-navigation e2e spec |
| ~~MEDIUM~~ | `/order/[number]` rendered full email + street address to anyone with the number | PII exposure on a public-by-number page | **Fixed (Task 114)** — `maskEmail` + address/postal removed; full detail stays behind the email match on `/track-order` |
| ~~MEDIUM~~ | SEO: robots allowed everything; no PDP OG/canonical/JSON-LD; `data-scroll-behavior` missing (Next 16 console warning); sitemap listed robots-excluded routes | Indexation noise + missing rich results | **Fixed (Task 114)** — coherent policy (robots disallow × 7; sitemap 12+24+6=42 indexable URLs; PDP canonical+OG+Product JSON-LD; attribute set) — all unit/e2e pinned |
| ~~LOW~~ | Promo display logic duplicated (cart + checkout) with a phantom 10% default for unknown codes | Misleading totals preview | **Fixed (Task 114)** — shared `findPromo()` in `catalog.ts`; server re-derivation unchanged |
| ~~LOW~~ | `package.json` name was `nextjs-postgresql-template` | Identity drift | **Fixed (Task 114)** — `home-furnishing-store` |
| ~~HIGH~~ | Family voucher calculator granted $5 per 100 pts instead of the advertised per-1,000 (×10 overstatement) | Customer-facing monetary claim was wrong | **Fixed (Task 117)** — pure `familyVoucherCents()` in `utils.ts`, unit-pinned against the page's printed rule |
| ~~MEDIUM~~ | BuyBox fabricated a 12-unit Tampines stock row when inventory data was missing (degrade path) | False availability on every PDP with Postgres down | **Fixed (Task 117)** — honest "stock information unavailable" state; agent-browser-verified on the dead-DB path |
| ~~MEDIUM~~ | Wishlist/search pages had no error state: fetch failure → unhandled rejection + the misleading empty state | Error ≡ empty; "Nothing saved yet" beside a non-zero count | **Fixed (Task 117)** — explicit error + retry states (`role="alert"`); pinned by route-interception e2e specs |
| ~~MEDIUM~~ | Reviews POST: no rate limit; negative `productId` → FK-crash 500; malformed body → 500 on reviews/promo/track | Abuse vector + client errors reported as server faults | **Fixed (Task 117)** — 20/min/IP limiter (checkout pattern), positive-integer validation → 422, JSON parse guard → 400; all e2e-pinned |
| ~~LOW~~ | Computed discount/New chips duplicated catalogue badge literals (`-24%` shown twice on NORDLYS) | Visual noise on 10 of 24 cards | **Fixed (Task 117)** — `visibleBadges()` dedupe helper, unit-pinned |
| ~~LOW~~ | Dead code: `cartToken()`, `ilike`/`or` re-exports, inert `animationDelay`/`index` prop; stale hardcoded dates | Surface noise, drift risk | **Fixed (Task 117)** — removed; planning-tools date min and footer year are dynamic |
| ~~LOW~~ | Lead-capture forms (business quote, planning session) confirmed requests that were never sent | UX dishonesty | **Fixed (Task 117)** — demo framing added ("no request is actually sent"), matching the checkout's "Demo — no charge" pattern |
| LOW | `docs/ssh_git_wrapper_v3.py` default remote still `nordeim/ely-beauty` | A wrapper run without `--remote` pushes to the wrong repo | Open (override documented everywhere; changing the default touches a live operator tool) |
| LOW | `drizzle.config.json` hardcodes a local dev URL | Surprises on remote DBs | Open — documented in README/.env.example |
| INFO | Auth + real payments deferred by decision (ADR-006); reviews unauthenticated; per-process rate limiter weak behind multi-instance LB | Demo-scope accepted risks | Documented; revisit before any production use |
| INFO | No Content-Security-Policy (G-8, Task 125): homenest ships a per-request-nonce CSP via `proxy.ts`; adopting one here requires the `await connection()` discipline on every statically prerendered hydrating page (a prerendered page + per-request nonce = silent non-hydration — the homenest trap log) | Hardening headroom, not an open vuln (no inline event handlers, no third-party scripts, Pexels img-src only) | **Deferred (v1.10.0)** — the platform header set (G-1) landed as the 80% win; revisit CSP only with the connection() discipline |
| INFO | No jsdom component-test layer (G-9, Task 125): timer/state seams (e.g. the search debounce cleanup) are e2e-pinned but not unit-pinned | Test-layer depth, not coverage | **Deferred (v1.10.0)** — the settle-discipline specs cover the behavior end-to-end; a jsdom layer is a new test tier to maintain |
| ~~INFO~~ | Display pricing rules duplicated (`priceTotals` helper vs inline magic numbers in `placeOrder`) | Drift risk between display and truth | **Fixed (Task 117)** — `placeOrder` imports `GST_RATE` / `FREE_DELIVERY_THRESHOLD_CENTS` / `STANDARD_` / `EXPRESS_DELIVERY_FEE_CENTS` from `utils.ts`; behaviour pinned by the exact-value e2e journey |
| INFO | `nordhem_promo` persisted format changed raw → JSON in the Task 114 store refactor | One-time cosmetic migration: a returning visitor re-applies their promo once | Documented in `cart-store.tsx` |
| ~~HIGH~~ | Dev server never hydrated when opened via `http://127.0.0.1:3000` (Next 16 `allowedDevOrigins` drops the `/_next/hmr` websocket; the RSC client then discards the inline flight payload — page renders, drawer/cart/search dead, zero console errors) | Every 127.0.0.1 consumer of the dev server (agent-browser, curl probes, Playwright's default baseURL habit) saw a dead-interactive page; invisible to all gates (e2e boots the production build, which has no HMR) | **Fixed (Task 118)** — `allowedDevOrigins: ["127.0.0.1"]` in `next.config.ts`; hydration probe RED → GREEN; full drawer taxonomy re-verified on dev; unit-pinned by `tests/unit/env-example.test.ts` |
| ~~HIGH~~ | `.env.example` replaced inter-session with a sibling-project file listing 8 variables this codebase never reads (Stripe/BDT payments, Cloudflare posture, session auth) — while its own header claimed DATABASE_URL was the only variable read | Misleads every setup; self-contradicting docs; the exact drift class the repo had already fixed once (v1.0.0) | **Fixed (Task 118)** — single-variable contract restored; lineage strings negative-pinned by `tests/unit/env-example.test.ts` |
| ~~MEDIUM~~ | `docker-compose.yml` + `infrastructure/postgres/init/00-create-extensions.sql` from a foreign lineage (Redis, Stripe CLI → non-existent `/api/webhooks/stripe`, Adminer; "Maison" header; pgcrypto/pg_trgm for uuid-PK/fuzzy-search features this schema has neither) | Describes an architecture this codebase does not have | **Fixed (Task 118)** — compose reduced to the postgres service (credentials/port matching `drizzle.config.json`); init script + mount removed (schema needs no extensions); pinned by `tests/unit/env-example.test.ts` |
| ~~MEDIUM~~ | PDP rendered duplicate badge chips — `visibleBadges()` was wired into ProductCard only, not the product page | The Task-117 dedupe was an incomplete rollout: NORDLYS showed `-24%` twice | **Fixed (Task 118)** — PDP consumes `visibleBadges`; e2e-pinned |
| ~~MEDIUM~~ | reviews POST: unknown-but-positive `productId` → Postgres FK violation → 500 (the route's own comment claimed 422) | Client error reported as server fault; 500 noise | **Fixed (Task 118)** — existence check → 422 `VALIDATION`; e2e-pinned |
| ~~MEDIUM~~ | Marketing copy overclaimed: "up to 30% off" (max catalogue discount is 24%), "stackable promo codes" (single-code store), "Bundle & save" (no bundle pricing) | Copy/behaviour mismatch on three surfaces | **Fixed (Task 118)** — honest copy on offers/home/header; MAKAN15 label matches whole-basket reality |
| ~~MEDIUM~~ | JSON-LD hardcoded `availability: InStock` regardless of actual stock | Structured data contradicted the page's own BuyBox (out-of-stock / degrade states) | **Fixed (Task 118)** — derived from `stockTotal`; e2e-pinned |
| ~~MEDIUM~~ | Untitled reviews rendered the headline "Verified review" while `verified: false` | Misleading trust signal on every user-submitted review without a title | **Fixed (Task 118)** — headline renders only when a title exists |
| ~~MEDIUM~~ | `/api/orders/track` and `/api/promotions/validate` had no rate limiter (checkout and reviews did); track is the PII lookup, promo validates hits Postgres per call | Inconsistent abuse-posture on write/lookup boundaries — the Task-117 plan itself owed the track limiter | **Fixed (Task 118)** — 20/min/IP fixed window (checkout pattern) on both routes; e2e-pinned |
| ~~LOW~~ | A failed promo apply wiped a previously applied valid promo (cart catch → `setPromo(null)`) | User's discount silently vanished on a typo or transient failure | **Fixed (Task 118)** — promo preserved on failure; explicit Remove button added; e2e-pinned |
| ~~LOW~~ | Rating renderers rounded 4.5 → 5 full stars while the aria-label said 4.5 (`stars()` seam existed unused); dead `clampInt`/`cn` exports | Visual/aria mismatch; dead code | **Fixed (Task 118)** — `stars()` wired into ProductCard + PDP (faded half-star); `clampInt` now live in checkout line validation; `cn` removed |
| ~~LOW~~ | `/order/[number]` decoded `decodeURIComponent` outside its try/catch; `/api/orders/track` returned the full order row where the page uses a subset | `%ZZ` → error page; needless PII in the envelope (phone/street) | **Fixed (Task 118)** — decode guarded; track response mapped to the rendered fields |
| LOW | Header store picker persists `nordhem_store` but no other module reads it — decorative in this build | The control implies a behaviour that does not exist | Open — documented deferral (wiring it to BuyBox is new feature work) |
| ~~HIGH~~ | Sitemap-indexed client pages (+ inspiration details + home) published zero/generic metadata: 6 of 12 indexable static routes + all 6 room URLs shipped the layout default title; /shop's SSR HTML carries no product content | Crawlers saw identical titles; 12+6 URLs under-claimed | **Fixed (Task 119)** — route-layout metadata for the five client pages, generateMetadata on inspiration details, page metadata on home; e2e-pinned (SEO metadata blanket specs) |
| ~~HIGH~~ | `placeOrder()` re-implemented `priceTotals()` and had already diverged (`net===0` → priceTotals waives standard delivery, placeOrder charged $12) | Latent server-money drift behind a false single-source comment | **Fixed (Task 119)** — placeOrder calls priceTotals(); exact-money e2e journey pins behaviour |
| ~~MEDIUM~~ | JSON-LD availability derived from `stockTotal` (a seed figure no order decrements; NORDLYS 210 vs live inventory 78) while the same page's BuyBox reads live inventory | Structured data claimed InStock after the stores were genuinely empty | **Fixed (Task 119)** — derived from the same live `getInventory()` rows; e2e zeroes rows in the pinned DB and asserts OutOfStock (restored after) |
| ~~MEDIUM~~ | Overselling floored inventory (`greatest(0,·)`) instead of refusing — a 99-qty line for a 51-stock product succeeded while the PDP printed "Only N left" | Commerce honesty gap at the write boundary | **Fixed (Task 119)** — per-product qty validated against the live inventory aggregate → 422 `LOW_STOCK`; e2e-pinned |
| ~~MEDIUM~~ | Fabricated claims: "member prices stack" (help), "Member prices on 200+ icons" (family, 24-product catalogue), "MRT directions in the app" (stores), "~2 min reply" chat SLA; the Family join form was a silent no-op email harvest | Copy contradicted computed behaviour / feature set | **Fixed (Task 119)** — reworded to what the system is; join form uses the business/planning demo-disclosure pattern |
| ~~MEDIUM~~ | Widget ARIA roles (radiogroup/tablist) announced on five surfaces with no APG keyboard implementation | Screen readers announced broken radio/tab patterns | **Fixed (Task 119)** — plain toggle buttons: `role="group"` + `aria-pressed` (docs updated in lockstep) |
| ~~MEDIUM~~ | The four per-route rate-limit Maps never evicted expired entries (unbounded memory on a long-lived single-node process) and duplicated the window logic 4× | Memory leak + drift risk | **Fixed (Task 119)** — shared `src/lib/rate-limit.ts` factory (fixed window, Retry-After header on 429s, opportunistic expired-key purge); unit-pinned |
| ~~MEDIUM~~ | Docs-count rot: SKILL.md Appendix B claimed 50 unit / 23 e2e against the 58/27 reality | The exact drift class web-application §14 prescribes pinning | **Fixed (Task 119)** — `tests/unit/docs-counts.test.ts` fs-computes the counts and fails the run on any disagreeing live-tense claim (AGENTS/README/CLAUDE/SKILL) |
| ~~MEDIUM~~ | `/order/[number]` (PII surface) had no page-level `noindex` — robots.txt disallow alone cannot prevent URL-only indexing of externally-linked pages | PII page indexed by URL | **Fixed (Task 119)** — `robots: { index: false }` page metadata (robots.txt policy unchanged) |
| ~~MEDIUM~~ | Inspiration listing vs detail budget contradiction ("Room budget" label on two different numbers: $9,800 vs $2,047) | Same-term contradiction on one funnel | **Fixed (Task 119)** — both figures shown, honestly labelled |
| ~~LOW~~ | Checkout API echoed the full inserted order row (email/phone/address) where the page needs only the order number; BuyBox's confirmation timer raced and leaked on unmount; cart steppers shared one aria-label; search page had no submit control; checkout slots didn't adapt to the fulfilment method; hardcoded hero price + "ends 28 Dec" dates; raw store slugs in order copy; sustainability ESG stats lacked demo framing; dead `getOrCreateCart`/`getCartLines`, Rating `dark` prop, dead track fields; PDP breadcrumb showed the category slug | Minimization/a11y/quality batch | **Fixed (Task 119)** — see the remediation plan for the per-item file:line evidence |
| ~~HIGH~~ | Checkout POST had no JSON-parse guard (malformed bodies fell to the generic catch → 500 with the raw parse error in the envelope) and the 500 path echoed internal `err.message` (driver connection text) to unauthenticated callers | Envelope-class inconsistency + info disclosure at the most sensitive write boundary | **Fixed (Task 120)** — parse-guard 400 `BAD_REQUEST` fixed copy; 500 path fixed copy (detail stays in the server log); e2e-pinned |
| ~~HIGH~~ | placeOrder check-then-decrement was not atomic (TOCTOU): two concurrent last-unit orders both passed the availability check, both placed, both floored inventory with `greatest(0,·)` | Silent oversell defeating the "refuses what it cannot fulfil" honesty claim | **Fixed (Task 120)** — one `db.transaction()` with `SELECT … FOR UPDATE` row locks (ordered by id); loser re-reads 0 and gets 422 `LOW_STOCK`; function-level RED evidence + e2e pin |
| ~~MEDIUM~~ | Unbounded unauthenticated writes: email/fullName/address had minimum-length checks only (a 300-char address persisted verbatim) | Storage abuse vector; inconsistent with the reviews route's slicing standard | **Fixed (Task 120)** — length caps with 422 (refuse, never truncate — a truncated delivery address is a broken order); e2e-pinned |
| ~~MEDIUM~~ | `/family` metadata earn-rate contradicted the page's own calculator 20× (5 pts/$10 vs 10 pts/$1) and promised "members-only workshops" that do not exist | Crawlers indexed a claim the product's own math disproves | **Fixed (Task 120)** — metadata corrected to the calculator rule; workshops claim dropped; e2e-pinned |
| ~~MEDIUM~~ | Six sitemap-indexed routes (inspiration, offers, services, stores, food, help) shipped title-only metadata — every SERP entry fell back to the layout's generic description | The Task-119 blanket was half-done | **Fixed (Task 120)** — description + canonical + OG on all six; e2e-pinned |
| ~~MEDIUM~~ | Four form inputs stripped focus with no replacement (family/business/planning-tools emails + dates, BuyBox qty) — `outline-none` with no `focus:` substitute | WCAG 2.4.7: keyboard users could not see focus | **Fixed (Task 120)** — visible focus rings; e2e-pinned via computed-style assertion |
| ~~MEDIUM~~ | PAD live-tense count rot (§1.2 50/23, §7.4 58/27, §9.2 50/23, §11 5 files/58) while the docs-counts pin covered only AGENTS/README/CLAUDE/SKILL; PAD Pattern 4 + §6.2 still documented the retired inline `throttled()` limiter and §6.4 a stale "accepted gap" threat row; AGENTS.md gotcha #4 pointed at the retired route-local limiter | The pin's own blind spot — the rot class lived one file over | **Fixed (Task 120)** — pin extended to the PAD (4 live-tense claim sites); stale sections rewritten to the factory seam; counts swept 86/43/9 files |
| ~~MEDIUM~~ | Fabricated "Nearest MRT listed on each store card above" (cards show no MRT); sustainability "audited yearly" stat contradicting its own illustrative disclaimer two lines above; inspiration "live prices and stock" overclaim | Honesty batch | **Fixed (Task 120)** — reworded to what each surface actually shows |
| ~~LOW~~ | Dead `carts`/`cart_items` schema (zero references in `src/`; the localStorage cart is the documented architecture) with a comment claiming a cookie-identified server cart; vestigial client `totals` field on CheckoutInput; partial-seed lockout (a first-seed crash between inserts left inventory empty forever — every checkout refused "Only 0 left"); order page conflated DB outage with not-found; cart minus-at-qty-1 silently deleted the line; status ladder duplicated in two pages; cart promo errors announced as `role="status"`; star displays put `aria-label` on non-semantic containers; `#8a8a8a` small text ≈3.2–3.5:1; header "N items" grammar + Go button focus ring | Dead-code/a11y/quality batch | **Fixed (Task 120)** — schema retired (9 tables, `drizzle-kit push` verified); seed self-heals (inventory rebuild, reviews first-time-only — manually verified against the live DB); outage split from not-found; `orderStepIndex` seam unit-pinned; minus disabled at 1; `role="alert"`; `role="img"`; muted-token contrast sweep (6.1–6.8:1); header polish |

| ~~MEDIUM~~ | Search page announced "0 results for …" during the 250ms debounce window (loading initialized false; verdict blocks passed their guards before the fetch started) | Assertively wrong SR announcement + flash of a false verdict on the primary search entry path | **Fixed (Task 121)** — settled-for-query flag; e2e-pinned via a frozen-debounce probe |
| ~~MEDIUM~~ | placeOrder's availability check summed inventory island-wide while click-&-collect fulfils from ONE store | Pickup accepted at a store the PDP itself showed "Out of stock" | **Fixed (Task 121)** — pickup validates + decrements the chosen store's rows; delivery keeps the aggregate; e2e-pinned |
| ~~MEDIUM~~ | `createLocalStore` accepted valid-JSON of the wrong shape (`JSON.parse` only rejects invalid JSON); no `error.tsx` anywhere | One bad localStorage value crashed CartProvider at render — every route replaced by the generic error page | **Fixed (Task 121)** — validate predicates on all four stores + branded root `error.tsx`; unit-pinned ×4 |
| ~~MEDIUM~~ | Header utility strip `truncate` clipped the focusable "Shop offers" link past the 390px viewport | WCAG 2.4.7: focusable-but-invisible CTA; campaign copy cut mid-sentence | **Fixed (Task 121)** — link is a shrink-0 flex sibling; e2e-pinned at 390px |
| ~~MEDIUM~~ | PDP header/JSON-LD claimed the seed "412 reviews" beside a live section rendering 2 | Same-page contradiction; unauditable structured-data count | **Fixed (Task 121)** — JSON-LD reviewCount derives from live rows (omitted at zero); header link carries no count; e2e-pinned ×2 |
| ~~LOW~~ | Checkout silently sliced `deliverySlot`/`storeSlug`; `storeSlug` never validated against the three real stores | Comment/code drift ("refuse, never truncate"); crafted slugs persisted as customer-facing copy | **Fixed (Task 121)** — storeSlug whitelist 422 + deliverySlot ≤80 refusal; e2e-pinned |
| ~~LOW~~ | Decrement `try/catch { non-blocking }` inside the transaction | A failed UPDATE aborts the tx; the swallow lied until COMMIT failed | **Fixed (Task 121)** — catch removed; fail-closed honestly |
| ~~LOW~~ | Sitemap `lastModified` = `new Date()` on every URL every crawl | Permanent "freshly modified" noise eroding the lastmod signal | **Fixed (Task 121)** — dropped; unit-pinned |
| ~~LOW~~ | planning-tools `MIN_DATE` computed in UTC | Off-by-one "tomorrow" for SGT users 00:00–07:59 | **Fixed (Task 122)** — the Task-121 claim was premature (never implemented); `sgTomorrowISO()` SGT-aware pure seam, unit-pinned |
| ~~LOW~~ | BuyBox minus enabled-but-noop at qty 1 (Task-120 fixed the cart page only) | Dead control at the stepper floor | **Fixed (Task 121)** — disabled at 1, cart parity; e2e-pinned |
| ~~LOW~~ | Checkout rendered every error inside the "3 · Payment" section | Contact-field failures surfaced far from the offending inputs | **Fixed (Task 121)** — shared alert above the form; e2e-pinned |
| ~~LOW~~ | aria-label on role-less containers (shop loading div, PDP rated `<p>`) | Unreliable AT announcement | **Fixed (Task 121)** — role=status / role=img |
| ~~LOW~~ | Layout JSON-LD comment claimed a "catalogue search pointer" the node never carried | Comment/code drift | **Fixed (Task 121)** — SearchAction added (backed by /search); e2e-pinned |
| ~~LOW~~ | "Member prices this week" (family) vs "no separate member prices" (help FAQ) | Copy/behaviour contradiction | **Fixed (Task 121)** — relabelled |
| ~~LOW~~ | "confirmation sent to…" / "from your confirmation email" / "Live SMS tracking" — no email/SMS subsystem exists | UX dishonesty on the confirmation + tracking funnel | **Fixed (Task 121)** — honest copy + demo disclosure |
| ~~LOW~~ | `/shop` sitemap-indexed but SSR HTML carried zero product content | Empty grid for non-JS crawlers/unfurlers | **Fixed (Task 121)** — server-component SSR grid (no useSearchParams/CSR-bailout, no Suspense-hidden streaming); `sortProductList` shared seam; e2e-pinned ×2 (JS disabled) |
| ~~INFO~~ | Home hero price fallback `?? 79900` re-hardcoded the catalogue value; home shipped no og:image | Drift risk if the hero product changes; weak social previews | **Fixed (Task 121)** — price hidden when product missing; og:image added; e2e-pinned |
| ~~HIGH~~ | Task-121 F-10 (`sgTomorrowISO`) claimed fixed but never implemented ("19 fixed" worklog claim) | SGT off-by-one booking floor 00:00–07:59; docs-truth breach in the cycle summary | **Fixed (Task 122)** — pure SGT seam landed + unit-pinned; count corrected forward (18 + 1 disproven + 1 skipped) |
| ~~HIGH~~ | `error.tsx` could not catch root-layout crashes (CartProvider is above the route boundary); `reset()` could not recover module-poisoned state | The F-4 "safety net" shipped Next's unbranded default page for its own crash class; recovery looped | **Fixed (Task 122)** — `global-error.tsx` (own html/body) + reload-based recovery + console.error/digest diagnostics; both classes browser-verified |
| ~~MEDIUM~~ | Persisted-state validation was container-shallow (`Array.isArray` only) | `[null]` still crashed CartProvider; `[42]`/partial lines NaN'd every total | **Fixed (Task 122)** — element-level `isValidCartPayload`/`isValidWishPayload`; unit-pinned ×8 |
| ~~MEDIUM~~ | Order page: items-query outage rendered a confirmed order as "Items (0)" | Just-placed order appearing empty — more alarming than the outage copy | **Fixed (Task 122)** — outage state honoured before the order branch; browser-verified with PG down |
| ~~MEDIUM~~ | Cart/checkout promo preview ignored `minSubtotalCents` (`findPromo` drops it) | Display showed a discount the server refuses (INVALID_PROMO at placeOrder); persisted across sessions | **Fixed (Task 122)** — `effectivePromo` gate on both previews; unit + e2e pinned |
| ~~MEDIUM~~ | `sortProductList` (the Task-121 shared seam) had zero pins; SSR order never asserted | An API-vs-SSR sort divergence would pass all 153 tests | **Fixed (Task 122)** — unit pins (6 keys + unknown + no-mutation) + JS-disabled SSR order e2e |
| ~~LOW~~ | Checkout `promoCode`/`lines` unbounded; `qty: null` coerced to 1 | 101-line inserts per request; crafted null-qty single-line order placed at qty 1 | **Fixed (Task 122)** — caps 422 (≤32/≤100) + null-qty drop; e2e-pinned |
| ~~LOW~~ | Reviews POST silently truncated (slice 60/120/2000) | The refuse-never-truncate rule was inconsistent across write boundaries | **Fixed (Task 122)** — refuse with 422 + field-specific copy; e2e-pinned |
| ~~LOW~~ | `inventory` had no unique (product_id, store_slug) constraint | Seed's onConflictDoNothing was a no-op; duplicate rows would double-hit the decrement | **Fixed (Task 122)** — unique index; RED-then-GREEN e2e (duplicate insert now 23505) |
| ~~LOW~~ | pg Pool had no connection/query timeout | A wedged (not refused) Postgres hung every force-dynamic page indefinitely | **Fixed (Task 122)** — 5s/8s bounds; browser-verified bounded degrade; source-pinned |
| ~~LOW~~ | `campaignEndLabel()` frozen at module load | A process started Dec 20 advertised "ends 28 Dec" on Dec 30 | **Fixed (Task 122)** — per-render in both server components |
| ~~LOW~~ | Search page never wrote `?q=` (form/chips); SearchAction target theoretical | Refresh/share lost the search; URL round-trip half-wired | **Fixed (Task 122)** — replaceState on submit/chip; reload restores; e2e-pinned ×2 |
| ~~LOW~~ | Inspiration index quoted the editorial budget as "Shop this room · $X" | The Task-119 detail-page conflation, missed on the index (budget $800 vs pieces $667) | **Fixed (Task 122)** — pieces total derived like the detail page; e2e-pinned |
| ~~LOW~~ | Business quote minus dead at 0; checkout summary omitted the GST line the cart shows | Stepper-floor parity gap; disclosure inconsistency on the same totals seam | **Fixed (Task 122)** — disabled at 0 + GST line; e2e-pinned ×2 |
| ~~INFO~~ | Hero/offers "Up to 24% off …" loosely attributed | The max (24%, NORDLYS lamp) led with extendable dining tables — the one member with NO deal | **Fixed (Task 122)** — honest attribution (lighting, cookware, essentials); e2e-pinned |
| ~~INFO~~ | Shop layout hardcoded "24 … 8" counts + stale "client component" comment + filter-copy drift | Catalogue-edit drift; architecture comment lied since F-17 | **Fixed (Task 122)** — derived from PRODUCTS/CATEGORIES; comment + copy corrected |
| INFO | Rate-limiter `clientIp` keys on the `x-forwarded-for` RIGHTMOST hop with a `"direct"` fallback (Task 125 G-2 — the leftmost hop was client-forgeable); with no trusted proxy in front, the client's own rotating XFF is still the rightmost hop | Bucket rotation remains possible on a direct (no-proxy) deployment | Accepted — documented deployment caveat (the TRUST_PROXY env-gate sketch is the named un-deferral path); strip/override XFF at the edge when deploying behind a proxy |
| ~~MEDIUM~~ | Flagship e2e journey left an order row + inventory decrement on every run | The pinned DB accumulated 8 stale orders across sessions; makan Tampines drained 24 → 20; ~42 runs would break the journey's own checkout | **Fixed (Task 123 F-1)** — finally-cleanup (order delete + stock restore); every RED-capable probe self-cleans; "Reviews (2)" hard pin regex-accepted |
| ~~MEDIUM~~ | Cart promo message contradicted the effectivePromo gate below the minimum | "WELCOME10 applied" persisted beside a vanished Discount row; the code still submitted to a server INVALID_PROMO (browser-reproduced) | **Fixed (Task 123 F-2)** — `findPromoMinimumCents` + the honest minimum notice; unit + e2e pinned |
| ~~LOW~~ | Checkout `deliverySlot` accepted any ≤80-char string (length-checked only) | Crafted junk persisted into "Arriving {slot}" customer copy | **Fixed (Task 123 F-3)** — shared `DELIVERY_SLOTS` seam + `isValidDeliverySlot` whitelist at the boundary |
| ~~LOW~~ | Search error box survived a changed needle (weaker gate than the verdicts) | Stale "couldn't load results" through the new search's debounce window | **Fixed (Task 123 F-4)** — gates on `settledFor === needle`; frozen-debounce e2e pin |
| ~~LOW~~ | `/api/products` keyword filter omitted `categorySlug` (recall ≠ shop-SSR seam) | q=outdoor returned 0 from the API, 2 from the shop grid | **Fixed (Task 123 F-5)** — filter includes `categorySlug`; e2e-pinned |
| ~~LOW~~ | Promo code survived order placement (`clear()` emptied lines only) | The next bag silently re-applied the previous order's code | **Fixed (Task 123 F-6)** — `clear()` drops the promo; pinned inside the journey |
| ~~LOW~~ | Error-digest "Ref:" line at #9a9a9a on white (≈2.85:1) | WCAG AA fail on both crash boundaries | **Fixed (Task 123 F-7)** — #5b5b5b muted token |
| ~~LOW~~ | CLAUDE/README claimed `radiogroup`/`tablist` roles + a `cn` helper that do not exist | Docs self-contradicted the Task-119 ARIA stance; a future agent would reintroduce unimplemented widget semantics | **Fixed (Task 123 F-8)** — docs now state the group/aria-pressed posture and the real helper list |
| ~~LOW~~ | `/api/health` deviated from the documented every-route envelope | The one route breaking the "envelope everywhere" contract | **Fixed (Task 123 F-9)** — standard envelope; e2e pin updated |
| ~~LOW~~ | PDP reviewCount + "Reviews (N)" heading saturated at the 20-row display cap | Both understated the truth beyond 20 live reviews | **Fixed (Task 123 F-10)** — `getReviewCount()` true count(*); e2e-pinned with 21 probe reviews |
| ~~INFO~~ | `orderNumber()` date segment derived at UTC, not SGT | Order numbers minted 00:00–07:59 SGT carried the prior calendar day | **Fixed (Task 123 F-12)** — UTC+8 derivation, unit-pinned at fixed instants |
| ~~INFO~~ | `nordhem_promo` store predicate accepted unbounded strings | A crafted 10k-char value rode to checkout until the server cap refused it | **Fixed (Task 123 F-13)** — `isValidPromoPayload` (≤32, mirrors the write boundary); unit-pinned |
| INFO | `/search` input uses `autoFocus` | Auto-focus on navigation can disorient screen-reader users | Accepted (Task 123 F-14b) — common search-page pattern; recorded in the a11y ledger |
| ~~INFO~~ | "ends 28 Dec" went stale Dec 29–31 (computed as current-year) | Banner advertised a past end date | **Fixed (Task 121)** — `campaignEnd` rolls to next year; unit-pinned ×3 |
| LOW | Read-only API GETs (`/api/products`, GET `/api/reviews`, `/api/health`) are unthrottled and uncached | Demo-scope accepted risk (a limiter on the catalogue GET would contaminate the e2e suite's shared "local" bucket) | Open — documented (register row; POST surfaces are limited) |
| ~~LOW~~ | `placeOrder` decrements delivery orders from the `storeSlug || "tampines"` store only; the availability check was island-wide while the decrement floored one row — a delivery order for N units against a store holding < N passed the aggregate check and minted phantom units through the `greatest(0,·)` clamp | Inventory accounting drift: the table permanently overstated stock, later LOW_STOCK refusals fired on wrong numbers | **Fixed (Task 130 F-2)** — check and decrement now read the SAME chosen-store rows for every method (fail-closed inside the lock); the register's redistribution alternative was rejected because the e2e RED-run nets restore inventory post-hoc and a multi-store drain is not reconstructible; e2e-pinned (delivery qty > chosen-store stock → 422 LOW_STOCK that agrees with the PDP display) |
| LOW | Wishlist fetches the full catalogue (`/api/products`) then filters client-side | Fine at the 24-product demo scale; a `?slugs=` param would be the fix at real scale | Open — documented |
| INFO | PDP `aggregateRating.ratingValue` (and the card star display) are catalogue fiction while the visible review list is live DB rows; the card `ratingCount` display was RETIRED in Task 124 F-11 (stars only, PDP-parity — the JSON-LD reviewCount is live-derived since Task 123); per-product warranty claims (12/25-yr) vs the generic trio cell | Demo-grade invented-content stance (same class as invented product names) | Documented — the invented-content decision covers ratingValue/star display; the universal trio cell was reworded (Task 118) |

**Verification ledger (2026-11-18, Task 114 remediation cycle):** rootless
PostgreSQL 17.12 installed (scram TCP + trust socket, `app_db` created) —
*Verified*; `drizzle-kit push` → 9 tables — *Verified*; first-read seed
(24/8/72/5/3/6/3 rows) — *Verified*; checkout round-trip in Postgres
(`NH-20261118-2NRWZD`: 259800 − 25980 WELCOME10, free delivery, GST 19306,
total 233820; tracking 200 on match / 404 on mismatch) — *Verified*; mobile
menu at 390×844 + desktop at 1280×800 via agent-browser (open/navigate/
auto-close/toggle; Escape gap found → fixed → re-verified) — *Verified*;
lint 0 errors 0 warnings — *Verified*; typecheck + typecheck:tests clean —
*Verified*; vitest 40/40 — *Verified* (Task 114; 58/58 as of Task 118); Playwright 18/18 against the production
build — *Verified*; cold `next build` green (29 routes) — *Verified*; 16
dev-server screenshots (PNG signature + dimensions validated) — *Verified*;
no Tailwind v4 mobile-nav bug found (the family's v4 trap is the candidate
scan, guarded and cold-build-proven) — *Verified*.

**Verification ledger (2026-11-18, Task 117 remediation cycle):** fresh clone
→ rootless PostgreSQL 17.12 reinstalled (same skill, same pinned URL) → 11
tables + seed re-verified (24/8/72/5/3/6/3) — *Verified*; baseline gates on
the clone (lint 0/0, typechecks clean, 40/40 unit, 18/18 e2e, cold build 29
routes) — *Verified*; mobile drawer taxonomy at 390×844 + 768×900 + 1440×900
(open/toggle/Escape/navigate/auto-close; hamburger hidden ≥1024; no Tailwind v4
display-toggle bug — the drawer conditionally mounts) — *Verified*; every Task
117 fix TDD'd (RED observed first) — *Verified*; final gates lint 0/0 ·
typecheck + typecheck:tests clean · vitest 58/58 · Playwright 27/27 against the
production build (incl. the live-DB checkout journey, money math exact) · cold
build green (29 routes) — *Verified*; BuyBox degrade state + Family calculator
re-verified in-browser on the dead-DB path ($1,200/yr → $60 vouchers) —
*Verified*; 19 dev-server screenshots (16 refreshed + 3 new surfaces) —
*Verified* (PNG/dimension/hash-validated).

---

## 11. Key Files Reference

(Per-file line counts were dropped in v1.15.0 — Task 129 F-5's "line counts
rot" precedent: both this table and the §3.2 tree had rotted in opposite
directions across remediation cycles. The file inventory is the reference;
`wc -l` is the truth.)

| File | Scale | Purpose |
|------|-------|---------|
| `src/lib/server-data.ts` | — | All DB reads/writes, seed, fallbacks, promo validation, `placeOrder` money truth + fulfilment-scoped inventory (Task 130 F-2), `trackOrder` |
| `src/lib/catalog.ts` | — | Static catalogue: 24 products, 8 categories, 3 stores, 6 rooms, 3 promos (seed + fallback); `storeName`, `matchesProductQuery`, `catalogMaxDiscountPercent` |
| `src/lib/utils.ts` | — | Pure helpers: `formatSGD`, `priceTotals` (percent+fixed both subtotal-capped — Task 130 F-7), validators, `orderNumber`, `clampInt`, `stars`, `isUniqueViolationOn` (Task 130 F-4) |
| `src/lib/cart-store.tsx` | — | The one client store: three `local-store` external stores via `useSyncExternalStore` + `useCart` context |
| `src/lib/local-store.ts` | — | localStorage-backed external-store factory (subscribe/getSnapshot/getServerSnapshot/set) — the set-state-in-effect remedy |
| `src/lib/mask.ts` | — | `maskEmail` — PII policy for the public order page |
| `src/db/schema.ts` | — | 9 Drizzle tables + row types |
| `src/db/index.ts` | — | Pooled client, `DATABASE_URL` fail-fast guard, globalThis singleton |
| `src/app/globals.css` | — | Tailwind v4 `@theme` tokens, candidate-scan guard, utility classes |
| `src/app/page.tsx` | — | Home page composition (hero, rooms, bestsellers, deals, stores, brand) |
| `src/app/product/[slug]/page.tsx` | — | PDP: metadata, gallery, stock/aisle, reviews, related |
| `src/app/api/checkout/route.ts` | — | Validation (TYPE-strict incl. the storeSlug guard — Task 130 F-1), rate limit, `placeOrder` delegation, envelope |
| `src/components/Header.tsx` | — | Utility strip, search, store picker (external store), category nav, mobile drawer (Escape-close) |
| `tests/unit/` | 10 files | 218 unit tests at the pure seams (utils incl. familyVoucherCents/visibleBadges/DELIVERY_SLOTS/orderNumber-SGT/isUniqueViolationOn/MAX_INT4 + the SORT_KEYS seam pins, catalog incl. findPromoMinimumCents + the Task-138 store-count/discount-seam/starter-kit fs-pins, utils incl. the Task-138 fee-copy derivation fs-pins, local-store incl. the promo predicate + the Task-133 uniqueness layer + the Task-135 qty-writer clamp fs-pin, mask, robots/sitemap, env/compose/config + scan-guard pins, server-data incl. the fulfilment-seam fs-pin (Task 131 F-2) + the DB-funnel golden-rule fs-pin + the reviews-degrade fs-pin + the promo in-tx fs-pin (Task 136) + the PDP unified-outage-signal + recovery pins + the outage-branch characterization pins (Task 137)) |
| `tests/e2e/` | 2 specs | 146 Playwright tests: mobile-navigation (iPhone-13 emulation, 390×844), storefront/commerce journeys, API boundary validation (incl. the int4-overflow pair — Task 133 F-1 — and the unknown cat/sort 422 pair — Task 135 F-2), fetch-failure resilience + the envelope-trust pair (Task 135 F-5) + the shop-grid envelope probe (Task 136 F-1) + the cart promo-apply envelope probe (Task 137 F-2) + the resync-window commit-capture probe (Task 138 F-1) + the fee-copy derivation pin (Task 138 F-5), slot coherence, review-count truth, fulfilment-store coherence (Task 130 F-2), the wishlist all-ghost honesty pin (Task 132 F-3), the duplicate-payload degraded-honesty pins (wish Task 133 F-3 + cart Task 134 F-1), the /order/ lowercase-lookup + normalized-decode pins (Task 133 F-5 + Task 134 F-2), and the stepper ceiling pins (Task 134 F-3) |
| `src/components/ProductCard.tsx` | — | Card + `Rating`; wishlist/add-to-bag affordances |
| `docs/implementation-plan.md` | — | Stack decision record, deviations ledger, acceptance criteria |
| `docs/reference-investigation.md` | — | Reference-site evidence (Verified/Reasoned/Assumed/Unknown) |
| `docs/ssh_git_wrapper_v3.py` | — | Verified SSH push wrapper (needs `--remote` override here) |
| `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` | — | Push runbook incl. the paramiko ssh shim for ssh-less sandboxes |

---

## 12. Glossary

| Term | Meaning |
|------|---------|
| **BTO** | Build-To-Order — Singapore's HDB flat ballot system; sizes NORDHEM's small-space range |
| **HDB** | Housing & Development Board — Singapore public housing (the majority market) |
| **Makan** | Singaporean slang for "eat" — the dining category's naming motif (MAKAN table) |
| **CNY** | Chinese New Year — the reunion-dinner sizing story on extendable tables |
| **PayNow / GrabPay / Atome** | SG-local payment rails (bank transfer / wallet / BNPL) — mocked here |
| **Click & Collect** | Order online, pick up in store (free, 2-hour promise) |
| **Aisle/bin** | Warehouse location format (`A12-B04`) shown per store on PDPs |
| **Flat-pack** | Self-assembly furniture packaging; every product's `flatPack` flag |
| **GST** | Goods & Services Tax (Singapore, 9% since 2024) — inclusive in listed prices, back-calculated for receipts |
| **Bomb shelter** | HDB household shelter room — the WFH-corner inspiration motif |
| **The envelope** | The repo's universal API response shape `{ ok, data \| error: { code, message } }` |
| **Degrade, Never Fail** | The contract that every read has a static fallback; only writes require the DB |
| **The scan guard** | The `@source not` block in `globals.css` keeping Tailwind's candidate scan out of prose files |
| **S87-2 / S76 / run-76** | Predecessor-repo session identifiers that appear in inherited config comments |

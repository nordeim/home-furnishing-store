# AGENTS.md — NORDHEM (home-furnishing-store)

Working guide for AI coding agents in this repository. Every line answers: "would an
agent likely miss this without help?" Everything else lives in
`Project_Architecture_Document.md` (architecture detail) and `README.md` (product view).

## What this is

NORDHEM Singapore — a furniture & home-furnishing e-commerce storefront built as an
original-code functional superset of the public IKEA Singapore site (IA-level parity,
never pixel-copy; public-route observation only, see `docs/reference-investigation.md`).
Next.js 16 App Router + React 19 + TypeScript strict + Tailwind v4 CSS-first + Drizzle
ORM + PostgreSQL.

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install (Node ≥ 20; lockfile pins next 16.4.2 / react 19.2.6 / tailwind 4.1.17) |
| `DATABASE_URL=… npm run dev` | Dev server (DATABASE_URL is **required at module load** — `src/db/index.ts` throws without it; point it at any Postgres, even an unreachable one, and the storefront falls back to the static catalogue) |
| `npm run build` | Production build (set `DATABASE_URL` in the environment for the same reason) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config; `skills/` is ignored per the operator contract) — **0 errors expected** |
| `npm run typecheck` | `tsc --noEmit` over the **app scope only** (`src/**`, `next.config.ts`) |
| `npm run typecheck:tests` | `tsc --noEmit -p tsconfig.tests.json` — the **test tree** (`tests/**`; both scopes are live gates) |
| `npm run test` | Vitest unit suite (218 tests, pure seams: utils, catalog, local-store, mask, robots/sitemap + the env/compose/config, scan-guard, rate-limit factory, server-data fulfilment-seam fs-pin + the qty-writer clampInt fs-pin + the SORT_KEYS derivation pin + the DB-funnel golden-rule fs-pin + the reviews-degrade fs-pin + the promo in-tx fs-pin + the PDP unified-outage-signal + recovery pins + the outage-branch characterization pins, docs-counts pins incl. the PAD + the TZ-pure-tree fs-pin + the numeric-args-ctor widening + the Task-138 store-count/productDiscountPercent/fee-copy/starter-kit derivation fs-pins + the Task-139 store-count blast-radius fs-pin + the gotoHydrated docs-claims pin + the Task-140 recovery-count/checkout-default-derivation/cache-wrap fs-pins + the Task-141 Header store-default/no-store-refetch/TRUST_PROXY-gate/env-doc pins + the Task-142 XFF-docs-claims pin + the e2e-boot-contract pin + the Task-143 orderSuffix mint-mask pin + the seedInventoryRows coverage/total/pattern pins + the seed-consumption fs-pin) |
| `npm run test:watch` | Vitest in watch mode (the same suite, re-run on change) |
| `npm run test:e2e` | Playwright e2e (146 tests) — builds + boots the production server on `:3100` with a pinned `DATABASE_URL` and `TRUST_PROXY=1` (**the suite always boots its own pinned server** — `reuseExistingServer: false` since Task 142 H-4: a stale `:3100` server would be reused WITHOUT the env pins and 429 mid-suite; kill stale servers first with `pkill -f next-server`, the process is named `next-server`) (Task 140 added the reviews GET count probe, the wishlist removal-window settle pin, the Tailwind-v4 button-cursor pin and the cart promo label-gate probe; Task 141 added the checkout success-envelope + track-order nested-envelope probes and the reduced-CSP header pin; Task 142 added the track-order full-field probe, the reviews POST field-gate probe and the four fetch-failure fixed-copy probes) |
| `npm run test:e2e:install` | One-time: install the pinned Playwright Chromium build (the fresh-clone cache miss) |
| `npx drizzle-kit push` | Apply `src/db/schema.ts` to the DB in `drizzle.config.json` (9 tables) |

The test suite is **NORDHEM-native** (Task 114; extended in Tasks 117–143):
`tests/unit` (10 files) + `tests/e2e` (mobile-navigation + storefront specs
incl. the fetch-failure resilience pair, the API rate-limit pins, PDP badge
dedupe, cart promo persistence, JSON-LD live-inventory + LOW_STOCK commerce
honesty, the SEO metadata blanket, the Task-121 pins: local-store shape
validation, campaign-date roll, sitemap no-lastModified, PDP→PDP navigation
state, per-store click-&-collect stock, JSON-LD reviewCount honesty, the
storeSlug/deliverySlot boundary, the search settle discipline, the shop SSR
content pair (javaScriptEnabled: false), the utility-strip visibility floor,
the PDP stepper floor, the checkout error placement, the SearchAction node,
the checkout method-switch slot re-derivation, and the Task-122 pins:
`sgTomorrowISO` SGT edges, cart-line ELEMENT validation, the
`effectivePromo` min-spend display gate, `sortProductList` (6 keys + SSR
order), the checkout payload caps + qty:null drop, the reviews
refuse-never-truncate rule, the inventory (product_id, store_slug) unique
index, the business-stepper floor, the checkout GST line, the inspiration
index pieces-total, the search URL sync, the hero discount attribution, and
the db-pool degrade time-bound source pin), and the Task-123 pins:
`findPromoMinimumCents` + the cart promo-message honesty (the
below-minimum notice replaces the stale "applied"), the checkout
slot-coherence boundary (`DELIVERY_SLOTS`/`isValidDeliverySlot`), the
journey finally-cleanup + promo-clear (`nordhem_promo` dies with the
order it was used on), the API categorySlug recall parity, the search
stale-error discipline, the PDP review-count saturation (true count(*)
vs the capped 20-row list), `orderNumber`'s SGT date segment, the
promo-store 32-char predicate, and the /api/health envelope alignment —
and the Task-124 pins: the docs-truth health-envelope pins (three operator
sites must carry the shipped body), the search grid + retry settle
discipline (the grid and the Try-again window gate on the settled needle
AND retry), the checkout qty/productId TYPE-strictness (boolean/array/
string drop the line, never coerce), the unknown-promo notice ("isn't a
valid code", never "$0.00 minimum"), `availableDeliverySlots` (the
click-collect "Today 2pm" hides after its own 14:00 SGT cutoff), the
`matchesProductQuery` shared recall seam (whose pins exposed and fixed the
capitalized-needle 0-results bug), the card rating honesty (no invented
"(412)" count), the cc-*/name autocomplete tokens, the star-button
non-color state cue, the utility-route noindex layouts, and the journey's
identity-based finally cleanup (email + spec-start window — a post-201
assertion failure strands the row no longer). One Task-124 finding was
DISPROVEN by browser evidence (the crafted `nordhem_store` blank-select
claim — React renders the first option as the fallback; the spec stayed as
a pin, no code change) — and the Task-125 pins: the F-20 method-switch
spec's clock pin (a temporal seam landed under it in Task 124 and
time-bombed the pin — honest-RED via a temporary 23:00 SGT pin), the
reviews POST TYPE-strictness (rating/author/body crafted TYPES refused —
the Task-124 F-5 posture mirrored at the last coercing boundary), the
track/promo field caps (order number ≤32, email ≤254, code ≤32 — the
checkout cap discipline), the `clientIp` rightmost-XFF derivation (the
leftmost hop was client-forgeable), the security-header set +
`x-powered-by` absence, the header-strip discount attribution, the
tightened /offers metadata attribution pin, the checkout slot
clock-coherence payload pin (display and submitted slot must agree across
the 14:00 SGT cutoff — intercepted-POST capture, no DB write), the drawer
param-navigation close, the derived home/planning-tools/shop metadata
counts, the `jsonLdScript` U+2028/U+2029 escape seam, the SITE_ORIGIN
fs-pin (no raw origin literal in src/app), the web manifest + app icon,
and the hydration sentinel (`html[data-hydrated]` + the gotoHydrated
gate) — and the Task-126 pins: the **idempotent-checkout pair** (a same-key
double-POST replays the first order — 201 then 200 with the SAME number and
one decrement; the checkout page mints + sends one key per mount and reuses
it across error-path retries), the **RED-run safety nets on every refusal
spec** (the shared `deleteProbeOrders` helper — email-keyed order deletion +
inventory restore re-derived from the inserted rows; proven live by
temporarily reverting the lines cap and observing the stranded 101-row order
clean to zero — and the Task-123-era if-block net was found DEAD on its own
RED path, the failed expect threw past it, rewritten to the finally
pattern), the **read-boundary TYPE parity** (track/promo-validate refuse
crafted TYPES with 422 VALIDATION; reviews GET refuses `?productId=1.5`),
the **reviews id tie-break** (same-timestamp rows render newest-insert-first
— the SQL-seeded pathological state), the **derived marketing copy**
(hero/strip/offers + the metadata-blanket pins interpolate
`catalogMaxDiscountPercent()`; the fee copy derives from the utils
constants), the **SEO completion** (twitter:card inherits site-wide,
og:image declares its true 1200×627, the PDP Offer carries priceValidUntil
from the rolling campaignEnd seam), the **PERSISTED_STORAGE_KEYS seam**
(both crash boundaries import the one list — fs-pinned), and the
**docs-truth .env.example pins** (the SITE_ORIGIN note + the Next-loader
attribution) — and the Task-127 pins: the **PDP ampersand copy pin** (the
Task-126 fee-derivation moved the delivery line into a template literal
where `&amp;` stopped decoding — every PDP rendered "Click &amp; Collect";
JSX entities decode only in text children), the **checkout free-text TYPE
parity** (a single-element-array payload String()-coerced past every
validator and placed a 201 order — email/fullName/phone/postal/address/
deliverySlot now refuse present-non-string with 422, the lines/reviews/
read-boundary posture mirrored at the last coercing seam), the
**`?max=` whole-number guard** on /api/products (the reviews-GET
discipline), the **replay-ownership pair** (both idempotency paths bind to
the order's own email — a leaked key gets 422 REPLAY_MISMATCH, never the
victim's order number; and the fast path hoists above validation so an
emptied-bag resubmit replays instead of EMPTY_BAG-refusing), the
**getRandomValues mint fallback** (128-bit crypto hex where the primitive
exists; Math.random only as the both-absent last resort — deterministic-stub
pins), the **SGT campaign calendar** (campaignEnd derives the year and the
Dec-28-00:00-SGT instant on the UTC+8 clock; the label formats with
timeZone Asia/Singapore; priceValidUntil renders the SGT date, not the UTC
ISO slice), and the **derived-copy completion** (GST ×7, the $200 shop pair,
FLAT20 on /offers, the family voucher rule ×3 — all interpolate their
constants; the GST + family e2e pins derive). Task 127 converted the storefront
spec's then-21 interaction-first blocks to `gotoHydrated` (the mobile spec's
Task-125 G-5 discipline) — 59 storefront call sites now (61 across both
files), zero bare interaction-first gotos. One Task-124 finding was DISPROVEN (browser
evidence) and one Task-126 audit finding was DISPROVEN by insert-order
analysis (the ensureSeed "partial-seed blind spot" — categories/stores/
products/promotions/inspirations all insert BEFORE inventory, so the
products+inventory early return can never skip them; see the plan's AUD-3).
The predecessor's 73-unit/15-e2e dead
tree was retired with it — do not resurrect ely-beauty specs; pin new ones to
this `src/`. And the Task-128 pins: the **body-shape guard on every POST
boundary** (a valid-JSON NON-OBJECT body — `null`, and on checkout any
primitive — parsed cleanly but crashed the first `field in body` / property
read to a 500 "failed on our side" for a pure client fault, browser-verified;
the 400 shape guard now sits beside the Task-120 parse guard on all four
routes, arrays included on checkout), the **recall-needle trim** on
/api/products (`?q=%20solbakken%20` used to return 0 where `?q=solbakken`
returned 1 — one recall definition, one normalization, e2e-pinned), the
**derived-pin completion** (the family voucher rule + the shop GST/threshold
strip + the offers FLAT20 banner now carry e2e pins that interpolate the
constants — a rate edit self-corrects copy and pins together, the Task-127
claim made true), the **orderNumber getUTC\* swap** (the one SGT seam still
reading server-LOCAL getters — the campaignEnd F-7 pattern one seam over),
the **IDEMPOTENCY_KEY_RE import + fs-pin** (the route's inlined regex could
drift from the exported seam while the unit pin stayed green), the
**overlong-fields finally net** (the one write-capable refusal spec without
a RED-run cleanup), the **inspiration og:image dimensions** (the Task-126
F-8 rollout's missing piece, og-pin route list extended), the **earn/trade
rate constants** (FAMILY_POINTS_PER_DOLLAR + TRADE_RATE drive calculator
AND copy — the family/business halves of the Task-127 F-4 class), the
**Footer SGT year** (the last bare server-local calendar read in src/), and
the **producer-side store-key fs-pin** (every createLocalStore key — literal
or constant — must be a member of PERSISTED_STORAGE_KEYS). The storefront
spec's interaction-first coverage is now complete: 59 gotoHydrated call
sites in the storefront spec (61 across both files; the Task-129 conversions
took it from 34 and the Task-131..142 probes grew it past the Task-129-era
count), zero interaction-first bare gotos
(mechanically re-verified — the Task-127 conversion had left 13, including
a /cart site both sweeps under-counted). One reference-agent claim was DISPROVEN by direct read
(rate-limit.ts "corruption" — the line is clean) — and the Task-129 pins:
the **residue-net completion** (three write-capable refusal specs — the
nullqty order probe, the overlong-review-body probe, the bad-rating/short-name
probe — plus the positive-control slot-coherence spec now carry their RED-run
`finally` nets; the "every write-capable refusal spec" claim is true for the
whole suite, not just the order-refusal half), the **enum-boundary parity**
(`deliveryMethod`/`paymentMethod` are TYPE-strict + whitelist-strict like
their enum siblings storeSlug/deliverySlot — `paymentMethod: ["card"]` used
to String()-coerce into a real 201; `promoCode` refuses present-non-string-
non-null while `promoCode: null` stays the UI's accepted "no promo" encoding),
the **business TRADE_RATE derived pin** (the Task-128 F-9 business half —
label + saving + estimate rows derive from the constant and the default-
quantity list total), the **gotoHydrated broad-reading completion** (the one
genuinely racy search-freeze bare goto + its two letter-violating freeze-spec
siblings converted — the sleep-then-click race class closed), the **checkout
array-body probe** (the Task-128 `Array.isArray` guard pinned, not just
implemented), the **producer-side fs-pin widening** (every `.ts/.tsx` under
`src/` scanned for `createLocalStore` call sites — a store minted in any new
file can no longer escape `PERSISTED_STORAGE_KEYS`), the **store-list
derivation** (route whitelist + checkout options + Header picker derive from
the `STORES` seed via `storeName()` — the last hand-duplicated store list),
and the **fs-pin path normalization** (the IDEMPOTENCY_KEY_RE + docs-counts
pins resolve from `import.meta.dirname`, not cwd). And the Task-130 pins:
the **fulfilment-store coherence** (delivery availability checked
island-wide stock while the decrement floored one chosen-store row — a
17-unit order against 15+3+0 stock passed the aggregate and minted 2
phantom units through the greatest(0,·) clamp; check and decrement now
read the SAME chosen-store rows for every method, the register's
"delivery decrement accounting drift" row closed — e2e-pinned with the
422 LOW_STOCK probe + the qty-exact-drain positive control, RED observed
live on the dev server), the **storeSlug TYPE-strictness** (the last
String()-coerced seam — `storeSlug: ["tampines"]` coerced through the
whitelist into a real 201, dev-verified; the lesson-43 field-class rule
one field short), the **saturation-spec de-flake** (the 21-review HAVBRIS
insert raced the two "Reviews (0)" assertions under fullyParallel —
probe product moved to pandan-rug-200), the **23505 constraint-name
discrimination** (`isUniqueViolationOn(err, constraint)` unit-pinned in
utils.ts; the replay path narrows to orders_idempotency_key_unique and an
order_number collision re-mints + retries the rolled-back transaction
once — the register's "orderNumber collision retry" row closed), the
**array-body parity** (reviews/track/promo-validate join checkout's
Array.isArray → 400 — the Task-128 register row promoted), the **Footer
store-chips derivation** (the fourth hand-duplicated list — e2e-pinned
against the STORES seed), the **wishlist heading honesty** (the resolved
count once loaded — a departed product's slug no longer renders "(2)"
above one card; the error state keeps the persisted count), and the
**priceTotals percent cap** (both promo branches now cap at the subtotal —
a >100% promo can no longer mint negative cents at the money seam). And the Task-131 pins:
the **orderNumber crypto suffix** (the 6-char mint reads getRandomValues
bytes — uint32 → base36, exactly 6 chars on every path, the ~2^31 entropy
claim now true against state recovery; Math.random survives only as the
both-primitives-absent last resort, padStarted to 6 — the rare 1-char
mantissa mints are gone; deterministic-stub trio: hand-worked byte
expectations, the 0.5-stub exactly-6 fallback, the spy-throw priority),
the **fulfilment-seam structural pin** (the tenth unit file,
`tests/unit/server-data.test.ts`: the store default derives EXACTLY ONCE
and the decrement reads `fulfilStore` — the Task-130 F-2 check/decrement
coherence is pinned by structure, no longer by textual coincidence), the
**wishlist badge-vs-heading parity pin** (the badge is the persisted
SAVED-entry count BY DESIGN — the Header cannot resolve without a catalogue
fetch on every route; the page EXPLAINS the difference with a "N saved
items are no longer available" note once resolved, and the F-8 pin's
ghost-slug assertions now cover both surfaces — plus its broken ghost-card
locator was repaired: the old `main aref=…]` text matched nothing, a
permanent no-op), the **oversell-spec de-flake** (the Task-119 probe moved
katong → wokhey-cookware-5pc — katong was NEVER quiet; the 500-class spec
zeroes its rows in a fullyParallel window that could pollute the probe's
snapshot/restore pair), and the **DEPLOYMENT.md docs-counts extension**
(its gate chain had rotted to a five-cycle-old 79/79 + 34/34 outside the
pin's scope; the sixth-doc scope makes the class unrecurrable).

And the Task-132 pins: the **TZ-pure test tree** (two unit
pins had survived the Task-127/128 getUTC\* swaps as the OLD idiom — the
orderNumber "today" pin derived its expectation with LOCAL getters on the
shifted instant (a false RED 8h/day on Asia/Singapore hosts — the project's
own locale — and 16:00–20:59 UTC on America/New_York) and the campaignEnd
pins built instants from Z-less date-time literals (parsed as LOCAL time; a
deterministic false RED on every host UTC−5 and further west, observed live
on `TZ=America/New_York`); both fixed to the impl's discipline + a NEW
fs-pin holds the whole unit tree to Z-suffixed date-time literals — and the
GREEN verification is the three-TZ run: `TZ=UTC`, `TZ=Asia/Singapore` and
`TZ=America/New_York` must all pass identically; NO `TZ` pin in
`vitest.config.mts` — a pinned TZ would convert any future TZ-coupled test
into a silent always-pass), the **fulfilment-seam pin strengthening** (the
Task-131 pin only asserted the file contained `eq(inventory.storeSlug,
fulfilStore)` SOMEWHERE — the availability lock satisfied it alone; a
decrement rewritten to any other expression passed both pins while check and
decrement drifted apart — demonstrated by temporary mutation; the clause
must now occur EXACTLY TWICE: lock AND decrement), the **wishlist all-ghost
honesty** (the Task-131 note rollout handled singular/plural/loading/error/
partial-ghost but not the all-ghost corner: "2 saved items are no longer
available." rendered directly above "Nothing saved yet" — browser-verified
live; the all-ghost branch now explains the state and "Nothing saved yet" is
reserved for a truly empty wishlist, e2e-pinned), and the **probe-email
uniqueness** (the three checkout-caps specs shared one probe email — two
concurrent RED runs could double-restore inventory through the shared
deleteProbeOrders nets; each spec now mints its own).

And the Task-133 pins: the **reviews int4-overflow bound** (a crafted
`productId: 2147483648` passed every JS gate — number, integer, > 0 — but the
driver rejects the parameter for the int4 products.id column with 22003, and
the POST answered **500 REVIEW_FAILED for a pure client fault** (proven live
on the dev server) while the GET silently degraded to `{ok:true,data:[]}`,
inconsistent with its own `?productId=1.5` → 422 stance; the shared `MAX_INT4`
constant in utils.ts now bounds BOTH verbs → 422, e2e-pinned on the pair),
the **typeqty residue-net completion** (the Task-124-era spec's finally
deleted order rows with two manual queries but never restored the INVENTORY
placeOrder decremented — the uniform-net claim was not true for this one
relic; honest-RED by temporary route mutation demonstrated the stranded
decrement live (product-1 tampines 45→44 with the rows deleted), the
`deleteProbeOrders` swap restores it on the same mutation run), the
**persisted-payload uniqueness layer** (the shape → element → uniqueness
chain's third layer: `["slug","slug"]` passed the Task-122 element predicate
while the catalogue returns unique slugs, so the wishlist page rendered the
FALSE "1 saved item is no longer available." above the available product's
card; both predicates now reject duplicates → the payload degrades to the
fallback like every other wrong shape, unit-pinned + an e2e probe of the
degraded honest state), the **priceTotals net===0 delivery pin** (the
historically load-bearing corner — placeOrder's own comment records the
pre-Task-119 copy "had already drifted on the net===0 delivery edge" — was
pinned by nothing; the sibling cap pins all used click-collect where the fee
is 0 regardless), the **/order/ lookup normalization parity** (the order
page compared the raw URL segment while trackOrder ran `.trim().toUpperCase()`
— a hand-typed lowercase number got "We can't find that order" for an order
the tracking page found with the SAME input; the page now mirrors the track
discipline, e2e-pinned with a probe order + lowercase URL), and the **pin-
hardening batch** (the inspiration-index pieces-total pin derives from
INSPIRATIONS+PRODUCTS like the page instead of the hardcoded "667.00"; the
TZ-pure fs-pin also fails on numeric-args Date constructors — the string-
literal-only scan was blind to `new Date(<year>, …)`, proven by mutation; the
PERSISTED_STORAGE_KEYS producer scan is fail-closed — a computed-key
`createLocalStore` call (template literal/lowercase const) previously escaped
the scan silently, now fails by name, proven by mutation).

And the Task-134 pins: the **cart duplicate-payload e2e parity** (the
Task-133 F-3 rollout pinned the wishlist half at both tiers but the cart
half — the more severe consequence, doubled React keys + doubled subtotal —
carried the unit pin alone; the sibling probe now seeds a duplicated
`nordhem_cart_v1` payload and asserts the degraded honest empty-bag state,
honest-RED by mutation — the Set check disabled, the probe REDs against the
mutant), the **order-URL decode-corner pin** (a malformed-percent order URL
— scoped by live platform evidence: a RAW malformed request is rejected
inside Next 16's routing layer before any app code runs, prod 500/dev 400,
browser parsers normalize a lone `%` first; the browser-reachable
normalized form `/order/%25ZZ` is what the probe pins: not-found, never a
5xx, never the outage copy — and the Task-133 case-sibling's negative
assertion was repaired in passing: it quoted a typographic apostrophe the
rendered `can&apos;t` never matches, a permanent no-op), the **stepper
ceiling completion** (the three `+` controls — cart/BuyBox/business quote —
stayed enabled-but-inert at their 99/99/200 caps while every `−` was
floor-disabled and pinned; all three now carry the mirrored
`disabled={…}` + ceiling pins, TRUE-RED first), the **addLine floor clamp**
(the found-branch clamped only its ceiling — a programmatic negative-qty
add stored a negative line; both branches now clamp 1–99, fs-pinned —
`addLine` is module-internal, the server-data fulfilment-seam precedent),
the **MAX_INT4 comment truth** (the "every id-taking verb refuses above it
with 422" claim overstated by one verb — checkout's lines[] DROP
out-of-range ids via the catalogue `byId.get` before any DB touch; the
comment now names the exception), and the **TZ fs-pin widening** (the
zless scan now covers all three quote forms and fractional-seconds
literals — the first via a quote-class widening, the second via a
dot-and-digit negative-lookahead that closes TWO backtracking splits:
the optional fraction group can match empty and test the lookahead on
`.`, and `\d+` can give back digits and test it on a stray `0` — both
proven by mutation, the second one caught only because the mutation demo
was run).

And the Task-135 pins: the **qty-writer clamp parity** (setLineQty
still read `Math.min(99, Math.floor(qty))` — a programmatic
`setQty(id, 0.5)` stored a qty-0 line and `setQty(id, NaN)` stored NaN,
while the Task-134 literal forms themselves never covered the
non-finite/fractional class (`Math.max(1, NaN)` is NaN); ALL THREE
cart-store qty writers now route through the shared NaN-safe `clampInt`
seam — the placeOrder/checkout-route posture — fs-pinned as the
three-writer form with the pre-135 literal forms retired), the **API
cat/sort boundary stance** (`?cat=zzz` answered `200 {ok:true, data:[]}`
— a typo'd category masquerading as a legitimately empty catalogue —
and `?sort=zzz` fell through the seam as an unsorted 200 while `?max`
was 422-strict; both params now validate against the `CATEGORIES` seed
and the shared `SORT_KEYS` seam (utils.ts, `satisfies ProductSortKey[]`)
→ 422 VALIDATION, e2e-pinned with the full legitimate-key sweep, and the
shop display list is fs-pinned as a subset of the seam — the
storeName-derivation discipline, so the UI can never offer what the
boundary refuses), and the **envelope-trust gate** (the wishlist and
search pages read `json.data ?? []` — a well-formed 200 `{ok:true}` with
NO `data` rendered the FALSE all-ghost note / the false "0 results"
verdict for a resolution that never happened; both pages now require
`Array.isArray(json.data)` before treating the answer as resolved, else
the error state — the Task-128 body-shape discipline mirrored
client-side, e2e-pinned by route-fulfilled body-less envelopes beside
the Task-119 fetch-failure pair).

And the Task-136 pins: the **shop-grid envelope-trust completion** (the
THIRD client consumer of `/api/products` — the primary catalogue funnel —
still read `json.data ?? []` after Task 135 gated the wishlist + search
siblings; a well-formed `200 {ok:true}` with NO data rendered the false
"0 products" + "Nothing matches those filters" verdict; the shop grid now
gates on `Array.isArray(json.data)` — the client-resilience class closed
across all three consumers, e2e-pinned by the route-fulfilled probe driven
by the LOCAL keyword filter, the one path that actually fires the client-side
refetch), the **DB-funnel golden-rule fs-pin** (the order page imported
`@/db` directly — the literal case PAD §3.1 names — and the reviews POST
was the only write path outside `server-data.ts`; both now funnel through
the `getOrderByNumber` + `submitReview` seams, and the pin fails the run if
any file under `src/` other than `src/db/**`, `server-data.ts`, and the
`api/health` infra-probe exception ever imports `@/db` again), the
**reviews-degrade honesty fs-pin** (`getReviews`/`getReviewCount` degrade
to `null` — never a resolved `[]`/`0` — so an outage renders the honest
"Reviews are unavailable right now" note and the `DB_DOWN` envelope
instead of the false "Reviews (0)" + "No reviews yet" invitation), and the
**promo in-tx coherence fs-pin** (placeOrder re-reads the promotions row
`FOR UPDATE` INSIDE the createOrder transaction and derives the totals
after the locked re-read — the Task-130 F-2 check/act coherence applied to
the other money-shaping input; a promo deactivated under the order refuses
with INVALID_PROMO).

And the Task-137 pins: the **PDP unified-outage-signal pair** (the two
review seams degrade INDEPENDENTLY — but the JSON-LD `aggregateRating` gate
used to trust `reviewCount` ALONE and the section's `initial` passed the
live list through, so the partial-outage branches contradicted themselves:
reviews-ok/count-null rendered the "Reviews are unavailable right now" note
ABOVE the live list, and reviews-null/count-ok published an aggregateRating
the visible page disavowed — the Task-121 F-6 rule its own comment quotes;
the signal is now ONE rule: EITHER null suppresses the list, the count claim
AND the structured-data rating together, fs-pinned as the
`!reviewsUnavailable && reviewCount > 0` gate + the
`reviewsUnavailable ? [] :` initial suppression), the **ReviewSection
recovery state** (the SSR unavailable prop is frozen at mount — a successful
POST under it prepended the new review BELOW the stale note with no count
anywhere; the section now owns recoverable client state —
`useState(!!unavailable)` flipped `false` on a successful POST — the note
unmounts and the heading resumes its count claim, fs-pinned), the **cart
promo-apply envelope-trust completion** (the FOURTH consumer and the only
POST one left without a data gate — `json.data?.label ?? "discount"` treated
a well-formed `200 {ok:true}` with NO data as success, persisting the code
into `nordhem_promo` and rendering the false "X applied — discount"
message; the Task-135/136 class closed at its last sibling — e2e-pinned
with the route-fulfilled probe asserting the scoped alert, no applied copy,
and no Remove button), the **outage-branch characterization pins** (the
Task-136 outage branches shipped unpinned — a regression swapping
`getOrderByNumber`'s `"outage"` for `null`, or the order outage copy for the
not-found copy, or the reviews-GET `DB_DOWN` envelope for a false empty
list would all pass every existing gate; the seam's URIError-vs-outage
discrimination + the four rendered surfaces are now fs-pinned,
mutation-proven), and the **shop-strip honesty** (the strip quoted
`items.length` unconditionally — during the error state it rendered the
STALE previous-view count above the error box; the count claim is now
gated on `!(loading || error)` with the static GST/free-delivery tail
staying — e2e-pinned by the Task-136 probe extension).

And the Task-138 pins: the **shop resync-window honesty** (the Task-137
F-5 strip gate closed loading/error but the resync window BETWEEN server
views stayed outside it — a category/sort navigation under an active
keyword/price filter reset `items` only on the server view, and
`setLoading(true)` fired only inside the 250 ms debounce callback, so the
commit rendering the fresh heading still carried the DEPARTED view's rows
with the strip quoting their count; the resync block now flips `loading`
for cat/sort transitions — skeletons + no count claim at the transition
itself — e2e-pinned by a commit-time DOM capture keyed on the heading:
auto-retrying assertions would bridge the 250 ms window, the probe's
first draft false-passed exactly that way), the **store-count derivation**
(the last hand-duplicated store literal — the Task-129 derivation closed
the store LIST but the COUNT stayed hand-copied at four sites: "3" SG
stores, "all 3 stores", the checkout refusal's "three stores" ×2; all
four interpolate `STORES.length` now, fs-pinned), the
**productDiscountPercent seam** (the per-product discount-percent formula
was triplicated — the card chip, the PDP chip, the
catalogMaxDiscountPercent body — the Task-126 F-3 max seam landed without
its per-product sibling; one seam feeds all three now, fs-pinned that the
formula literal lives only in catalog.ts), the **dead-export retirement**
(`findProduct` + `productImage` had zero consumers anywhere, `findPromo`
zero PRODUCTION consumers since Task 122 F-5 moved the display gate to
effectivePromo — retired per the Task-114 lesson-8 discipline, the
findPromo pins' uncovered intent repointed at the live seams), the
**fee-copy derivation completion** (the $25 assembly + $190 design-service
fee copy was a hand-copied literal pair across home/services/PDP — the
pre-Task-126 fee-rot class in miniature; `ASSEMBLY_FEE_CENTS` +
`DESIGN_SERVICE_FEE_CENTS` now drive all seven sites, fs-pinned + the e2e
pin mutation-proven), and the **offers starter-kit departure guard** (the
hand-curated slug trio's copy asserted "Bed + extendable table + kitchen
trolley" unconditionally — a departed slug silently shrank the chips while
the copy kept asserting the set; the set-copy derives from the resolved
rows now, fs-pinned — the HERO_SLUG sibling's discipline). And the
Task-139 pins: the **store-count derivation completion** (the Task-138 F-2
pin scoped its negative checks to the two files it fixed — four sibling
sites kept hand-drawn counts with every gate green: the /stores metadata
description + og description + h1 ("Three NORDHEM stores…"/"Three
stores, one island") and the /sustainability stat card ("All 3 SG
stores"); all four interpolate `STORES.length` now, and the new fs-pin is
CLASS-scoped — the count literals must not exist anywhere under `src/`,
so the next tier-over cannot land silently; the e2e metadata-blanket pin
derives its expectation from the seed too — it used to assert the
hand-copied "Three" it now replaces), the **gotoHydrated docs-claims pin**
(the AGENTS ×2 + CLAUDE + PAD count claims were live-tense but unpinned —
docs-counts fs-computes the per-spec `gotoHydrated(` counts and fails the
run if any of the four claim sites drifts; GREEN-on-arrival, mutation-
honest RED by a temporary AGENTS "45"→"44" edit), and the **starter-kit
guard polarity proof** (the Task-138 F-6 fs-pin was presence-only — an
inverted ternary satisfied every assertion; the strengthened form pins
the trio copy to the guard's TRUE branch, mutation-proven twice: the
`===`→`!==` inversion AND the subtler branch-swap each REDed the pin).
And the Task-140 pins: the **recovery-count honesty set** (the PDP's
`total={liveCount}` unconditional form + ReviewSection's refetch
consumption of the additive GET `count` field, both fs-pinned; the e2e
GET probe asserts `count === data.length` below the 20-row cap — the
Task-139 registered understatement promoted and closed), the **wishlist
removal-window settle pin** (the route-delayed e2e probe — the heading
quotes the PERSISTED count while the refetch is in flight, never the
departed view's resolved count; the Task-130 F-8 class on the axis it
missed), the **checkout default-derivation fs-pins** (the slot and
store literals banned from the three consumer files while the seam
derivations `DELIVERY_SLOTS.delivery[0]`/`STORES[0].slug` are present
at all five sites — the derivation discipline completed; the Task-131
F-2 fulfilStore pin updated in lockstep), the **Tailwind v4 button-cursor
e2e pin** (the computed-style sibling of the Task-120 F-7 focus pin —
the preflight's dropped `cursor: pointer` restored via the base rule),
the **cart promo label-gate probe** (the Task-137 F-2 class completed to
the FIELD the copy interpolates — a labelless `data:{}` envelope joins
the refusal set), and the **cache-wrap fs-pin** (the `getAllProducts`
const form — the Task-139 registered 3-scans-per-PDP-request candidate,
closed with React's request-scope `cache()`).

And the Task-141 pins: the **Header store-default fs-pin** (the persisted
picker's fallback derives through `storeName(STORES[0].slug)` — the
capitalized display-label form was the sixth hand-copied store literal,
invisible to the Task-140 pin's case-sensitive slug ban), the **checkout
success-envelope + track-order nested-envelope e2e probes** (the
Task-140 F-5 class completed at its last two consumers — the gates
reach the fields the success paths interpolate: a non-string
`orderNumber` refuses BEFORE `clear()`/navigation, and a nested-shape
violation takes the scoped-error path instead of a render crash — the
track-order gate widened to the FULL interpolated field set in Task 142
H-1 below), the
**reduced-CSP e2e pin** (the register's CSP split, promoted half — the
four no-hydration-risk directives asserted on every response; the full
nonce CSP stays deferred), the **no-store-refetch fs-pin** (the recovery
refetch's post-write truth fetch is uncachable), and the **TRUST_PROXY
gate pins** (the register promotion — `clientIp` ignores XFF entirely
unless `TRUST_PROXY` is exactly `"1"`; every other value fails closed to
the shared `"direct"` bucket, closing the verified direct-deploy
rate-limit bypass; the e2e webServer opts in with `TRUST_PROXY=1` so
the suite's 39 x-forwarded-for probe sites (36 distinct identities)
keep their buckets; `.env.example` documents
the commented gate, pinned by the env-doc test).

And the Task-142 pins: the **track-order full-field e2e probe** (an
order-present-but-degenerate envelope — `storeSlug` absent — refuses with
the scoped error instead of crashing inside `storeName`'s `.trim()`; the
gate now covers EVERY order scalar and the items element shape the render
interpolates, completing the Task-141 F-3 class one level deeper), the
**reviews POST field-gate e2e probe** (an ok-but-fieldless `{ok:true,
data:{}}` is a FAILURE — no junk card, no count bump, the scoped error;
the Task-140 F-5 class at its last POST consumer), the **XFF-docs-claims
pin** (docs-counts fs-computes the suite's 39 x-forwarded-for probe
sites (36 distinct identities) and holds the AGENTS/PAD claims to it —
the "16" claim was wrong ON ARRIVAL at Task 141 and survived a full
cycle because nothing computed the number), the **e2e-boot-contract
fs-pin** (playwright.config.ts must carry `TRUST_PROXY: "1"` AND
`reuseExistingServer: false` — a reused stale :3100 server silently
voids the env pins; also closes the previously-unpinned Task-141 webServer
env declaration), and the **fetch-failure fixed-copy e2e probes ×4**
(checkout, track-order, reviews, cart-promo render FIXED copy on a
transport failure — never the browser's "Failed to fetch" TypeError
text; the envelope refusals keep the server's honest copy; the Task-119
resilience class completed to the POST seams).

And the Task-143 pins: the **orderSuffix mint-mask pin** (a deterministic
truncation-region fill — bytes `[0,0,0,0x90]`, uint32 2,415,919,104 > 36^6 —
must mint its MASKED value `4FTI4G`, never the folded `13YDJ4`; the unmasked
uint32 exceeded 36^6 half the time and `slice(0,6)` folded the top half of
the mint space onto the bottom — 37 preimages for the heaviest suffix,
~10× the uniform collision rate, the "~2^31 entropy" claim was false; the
`& 0x7fffffff` mask keeps every value under 36^6, making the claim true),
the **seedInventoryRows behavioral pins** (the inventory seed seam covers
EVERY seed store exactly once — a 4-store catalogue cannot strand a store
with zero rows, the pre-143 positional STORES[0..2] class; the documented
72-rows@1379 seeded-DB contract pinned so the derivation can never drift
the seed quantities; the aisle-bin letter pairs well-formed), and the
**seed-consumption fs-pin** (ensureSeed consumes the seam —
`seedInventoryRows(p.id)` present, ZERO positional `STORES[1-9…]` indices
in server-data.ts; `STORES[0]` stays sanctioned for the placeOrder default
the Task-140 F-3 pin requires). Plus the vitest config rename
(`vitest.config.ts` → `vitest.config.mts` — the ESM-in-CJS
`configLoader: 'native'` warning is gone; Vite's future default is
pre-empted).

**Test counts are documentation claims, pinned by test** (Task 119):
`tests/unit/docs-counts.test.ts` fs-computes the real counts and fails the run
if any live-tense claim in AGENTS/README/CLAUDE/SKILL/PAD/DEPLOYMENT disagrees
(six docs since Task 131) — change the docs in the same commit as any test
change (count-lockstep, no exceptions).

## Pin map (the claims tests enforce — the Task-130 adopted candidate)

| Claim | Enforcing pin |
|---|---|
| Test counts + the `/api/health` body (AGENTS/README/CLAUDE/SKILL/PAD/DEPLOYMENT — six docs since Task 131 F-7) | `tests/unit/docs-counts.test.ts` |
| `.env.example` single-variable contract, postgres-only compose, `allowedDevOrigins` | `tests/unit/env-example.test.ts` |
| The Tailwind candidate-scan guard present in `globals.css` | `tests/unit/tailwind-scan-guard.test.ts` |
| SEO policy coherence (robots vs sitemap, `SITE_ORIGIN`, no raw origin literal in `src/app`) | `tests/unit/robots-sitemap.test.ts` |
| `PERSISTED_STORAGE_KEYS` covers every `createLocalStore` producer under `src/`; persisted payloads are shape-, element- AND uniqueness-valid (duplicates degrade to the fallback); EVERY cart-store qty writer (addLine both branches + setLineQty) routes through the NaN-safe `clampInt` seam (Task 134 F-4 + Task 135 F-1) | `tests/unit/local-store.test.ts` (producer-side fs-scan, fail-closed since Task 133; predicate pins; the three-writer clamp fs-pin) |
| placeOrder fulfilment seam (one store-default derivation; `fulfilStore` read at BOTH the availability lock and the decrement — exactly two occurrences); the DB funnel (only `src/db/**`, `server-data.ts`, and the `api/health` infra-probe exception import `@/db`); the reviews degrade contracts (`getReviews`/`getReviewCount` → `null`, never a resolved `[]`/`0`); the promo re-read INSIDE the createOrder transaction (`FOR UPDATE`, totals derived after it) | `tests/unit/server-data.test.ts` (Task 136 F-2/F-3/F-4 pins) |
| The checkout route consumes the exported `IDEMPOTENCY_KEY_RE` shape; the unit tree stays TZ-pure (no Z-less date-time literals in ANY quote form, no fractional-seconds false-positives, no numeric-args Date constructors); `priceTotals`' net===0 delivery corner (Task 133 F-4); `SORT_KEYS` covers the ProductSortKey union and the shop display list is a subset — the UI cannot offer what the boundary refuses (Task 135 F-2) | `tests/unit/utils.test.ts` (fs-pins + the corner pin + the SORT_KEYS derivation pin; quote-class + backtrack-closed lookahead since Task 134) |
| The reviews boundary bounds `productId` above by `MAX_INT4` (both verbs 422, never a 22003 → 500/degrade) | `tests/e2e/storefront.spec.ts` (Task 133 F-1 probe pair) |
| A duplicated persisted CART payload degrades to the honest empty bag (never doubled lines/subtotal); a normalized malformed-percent order URL lands in not-found (never a 5xx, never the outage copy); the cart/BuyBox/business `+` steppers disable at their 99/99/200 ceilings | `tests/e2e/storefront.spec.ts` (Task 134 F-1/F-2/F-3 probes) |
| `/api/products` refuses an unknown `cat`/`sort` with 422 VALIDATION (never a fake empty catalogue / silent unsorted 200 — the `?max` stance); the wishlist and search pages treat an ok-but-dataless envelope as the ERROR state (never the false all-ghost note / false 0-results verdict) | `tests/e2e/storefront.spec.ts` (Task 135 F-2/F-5 probe quartet) |
| The shop grid treats an ok-but-dataless envelope as the ERROR state (never the false "0 products"/"Nothing matches those filters" verdict) — the third `/api/products` client consumer, completing the Task-135 class | `tests/e2e/storefront.spec.ts` (Task 136 F-1 probe) |
| The PDP reviews-outage signal is UNIFIED (the JSON-LD `aggregateRating` gate + the section's initial list + the heading count claim all key on the COMBINED `reviewsUnavailable` signal); ReviewSection's unavailable state is RECOVERABLE (a successful POST flips the note away) | `tests/unit/server-data.test.ts` (Task 137 F-1 pins) |
| A promo apply on an ok-but-dataless envelope is a FAILURE (scoped alert, no applied copy, no persisted code — the fourth envelope-trust consumer, the only POST one); the shop strip makes no stale count claim under loading/error | `tests/e2e/storefront.spec.ts` (Task 137 F-2 probe + the Task 136 F-1 probe extension) |
| `getOrderByNumber` discriminates URIError (not-found) from everything-else (outage); the outage surfaces (order-page copy, PDP unavailable note, reviews-GET DB_DOWN, submitReview delegation) are pinned | `tests/unit/server-data.test.ts` (Task 137 F-3 characterization pins, mutation-proven) |
| A fresh server view under an active keyword/price filter settles through the loading state — the commit rendering the new heading never carries the departed view's rows or count claim | `tests/e2e/storefront.spec.ts` (Task 138 F-1 probe — the commit-time DOM capture; mutation-honest RED by temporary revert) |
| The store COUNT derives from the STORES seed (the hero stat, the Click-&-Collect strip, both checkout refusal messages — the Task-129 list-derivation class completed) | `tests/unit/catalog.test.ts` (Task 138 F-2 fs-pins) |
| The per-product discount-percent formula lives ONLY in `productDiscountPercent` — the card chip, the PDP chip and `catalogMaxDiscountPercent` consume the seam | `tests/unit/catalog.test.ts` (Task 138 F-3 unit pins + the derivation fs-pin) |
| The $25 assembly + $190 design-service fee copy interpolates `ASSEMBLY_FEE_CENTS`/`DESIGN_SERVICE_FEE_CENTS` at every site (home strip + design card, services metadata + both card prices, the PDP chip + details copy) | `tests/unit/utils.test.ts` (Task 138 F-5 fs-pins) + `tests/e2e/storefront.spec.ts` (the value-level sibling, mutation-proven) |
| The offers starter-kit set-copy is guarded on the resolved rows (a departed slug degrades to the neutral picks copy, never an assertion the chips contradict) | `tests/unit/catalog.test.ts` (Task 138 F-6 fs-pin, polarity-proofed Task 139 F-3) |
| The store-count literals ("Three NORDHEM stores", "Three stores, one island", "All 3 SG stores") exist NOWHERE under `src/` — every count site (home hero stat + strip, checkout refusal ×2, /stores metadata ×2 + h1, /sustainability stat) interpolates `STORES.length`, and the e2e metadata expectation derives from the seed | `tests/unit/catalog.test.ts` (Task 139 F-1 blast-radius fs-pin) + `tests/e2e/storefront.spec.ts` (the derived metadata pin) |
| The gotoHydrated count claims (AGENTS ×2, CLAUDE, PAD) equal the fs-computed per-spec call-site counts | `tests/unit/docs-counts.test.ts` (Task 139 F-2 pin, mutation-proven) |
| The PDP passes the SSR-known review count through UNCONDITIONALLY (no `reviewsUnavailable` ternary on the total) and ReviewSection's recovery path refetches the GET envelope and adopts the server `count` field | `tests/unit/server-data.test.ts` (Task 140 F-1 fs-pins) |
| The reviews GET exposes the TRUE row count (additive `count` beside the capped `data` array; `count === data.length` below the 20-row cap) | `tests/e2e/storefront.spec.ts` (Task 140 F-1 GET probe) |
| The wishlist heading quotes the PERSISTED count during a removal's refetch window (never the departed view's resolved count) | `tests/e2e/storefront.spec.ts` (Task 140 F-2 route-delayed settle probe) |
| The checkout default slot/store literals exist NOWHERE in the page/route/seam files — every default derives from `DELIVERY_SLOTS.delivery[0]`/`STORES[0].slug` (page, API route, placeOrder default + the ensureSeed inventory rows), and the stale-slot adjust guard covers every method | `tests/unit/catalog.test.ts` (Task 140 F-3 fs-pins; the Task-131 F-2 fulfilStore pin follows the derived form) |
| Buttons compute `cursor: pointer` when enabled (the Tailwind v4 preflight default restored via the `button:not(:disabled)` base rule; disabled keeps default semantics) | `tests/e2e/storefront.spec.ts` (Task 140 F-4 computed-style pin) |
| A promo apply on an ok-but-LABELLESS data envelope (`200 {ok:true, data:{}}`) is a FAILURE — no "applied — undefined" copy, no persisted code | `tests/e2e/storefront.spec.ts` (Task 140 F-5 probe) |
| `getAllProducts` is React `cache()`-wrapped (the PDP's three scans per request dedupe into one) | `tests/unit/server-data.test.ts` (Task 140 F-6 fs-pin) |
| The Header store-picker default derives through `storeName(STORES[0].slug)` — no hand-copied display label anywhere in Header.tsx | `tests/unit/catalog.test.ts` (Task 141 F-1 fs-pin, the 4th consumer) |
| An ok-but-orderless checkout envelope is a FAILURE — no `/order/undefined` navigation, the bag is NOT cleared (the gate reaches `orderNumber` before `clear()`) | `tests/e2e/storefront.spec.ts` (Task 141 F-2 probe) |
| An ok-but-orderless track envelope is a FAILURE — the scoped error renders, no render crash (the gate reaches the nested `order.orderNumber`/`items` shape) | `tests/e2e/storefront.spec.ts` (Task 141 F-3 probe) |
| Every response carries the reduced CSP — `object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` (the register's promoted half; the full nonce CSP stays deferred) | `tests/e2e/storefront.spec.ts` (Task 141 F-4 header pin) |
| The recovery refetch passes `{ cache: "no-store" }` — the post-write truth fetch bypasses every HTTP-cache heuristic | `tests/unit/server-data.test.ts` (Task 141 F-5 fs-pin) |
| `clientIp` ignores x-forwarded-for unless `TRUST_PROXY` is exactly `"1"`; every other value fails closed to the shared `"direct"` bucket (the direct-deploy bypass closed; the e2e webServer pins `TRUST_PROXY=1` for the suite's 39 XFF probe sites) | `tests/unit/rate-limit.test.ts` (Task 141 G gate matrix) + `playwright.config.ts` |
| `.env.example` documents the optional TRUST_PROXY gate — commented (never an active assignment), exactly-"1" contract, fail-closed rationale | `tests/unit/env-example.test.ts` (Task 141 G env-doc pin) |
| An order-present-but-degenerate track envelope (`order:{orderNumber}` with a sibling scalar absent) is a FAILURE — the scoped error renders, no render crash (the gate covers every interpolated field: order scalars + items element shape) | `tests/e2e/storefront.spec.ts` (Task 142 H-1 probe) |
| An ok-but-fieldless reviews POST envelope is a FAILURE — no junk card (blank author/body, `key={undefined}`), no count bump, the scoped error renders | `tests/e2e/storefront.spec.ts` (Task 142 H-2 probe) |
| The XFF-probe docs claims equal the fs-computed counts (39 sites / 36 distinct identities) in AGENTS ×2 + PAD | `tests/unit/docs-counts.test.ts` (Task 142 H-3 pin) |
| The e2e boot contract: `playwright.config.ts` webServer pins `TRUST_PROXY: "1"` AND `reuseExistingServer: false` (the suite always boots its own pinned server — a stale :3100 fails fast with EADDRINUSE instead of voiding the env pins mid-suite) | `tests/unit/rate-limit.test.ts` (Task 142 H-4 fs-pin) |
| A transport failure (route abort) at any of the four POST consumers (checkout, track-order, reviews, cart promo) renders the FIXED service copy in the scoped alert — never the browser's TypeError text; envelope refusals keep the server copy | `tests/e2e/storefront.spec.ts` (Task 142 H-6 probes ×4) |
| The orderSuffix mint masks to 31 bits before base36 — a truncation-region fill mints its masked value, never the fold; the "~2^31 entropy" seam comment is true | `tests/unit/utils.test.ts` (Task 143 J-1 deterministic-fill pin) |
| The inventory seed derives from the STORES catalogue via `seedInventoryRows` (src/lib/catalog.ts) — every seed store covered exactly once, the documented 72-rows@1379 contract pinned, aisle-bin pairs well-formed; ensureSeed consumes the seam with ZERO positional store indices ≥ 1 in server-data.ts | `tests/unit/catalog.test.ts` (Task 143 J-2 behavioral pins) + `tests/unit/server-data.test.ts` (the seed-consumption fs-pin) |

## Hard-won gotchas (read before changing anything)

1. **Tailwind v4 candidate-scan guard.** Tailwind v4 scans *every non-gitignored text
   file* for class candidates — `.md` prose included. Doc files quoting the colon-form
   `md:aspect-[3:1]` once compiled to invalid `aspect-ratio: 3:1` CSS and broke the
   clean production build with a PostCSS "Missed semicolon" error. The guard lives at
   the top of `src/app/globals.css` (`@source not` for `**/*.md`, `**/*.mdx`, `docs/`,
   `skills/`, `tests/`, `scripts/`). Never remove it; never write a colon-form
   `aspect-[…]` class anywhere in the repo (use the slash form `aspect-[16/9]`). A
   stale `.next` cache can mask the failure — always test builds cold (`rm -rf .next`).
2. **Degrade, Never Fail.** Every DB read in `src/lib/server-data.ts` is wrapped in
   try/catch with a static-catalogue fallback (`src/lib/catalog.ts`), and
   `ensureSeed()` is an idempotent, single-flight seed on first read. Preserve this
   contract: a page must render even when Postgres is unreachable. Only
   write-paths (checkout, reviews POST, tracking) genuinely require the DB.
3. **Money is integer cents, always.** Client totals are never trusted:
   `placeOrder()` re-derives subtotal/discount/delivery/GST server-side. Prices are
   GST-inclusive; the 9% GST line is back-calculated for display
   (`priceTotals()` in `src/lib/utils.ts`). Keep new pricing logic in `src/lib/utils.ts`.
4. **API envelope everywhere.** Every route returns
   `{ ok: true, data } | { ok: false, error: { code, message } }`. Match it in any new
   route. Validate at every write boundary (email/phone/postal regex, rating 1–5,
   qty clamped 1–99, field-length caps, JSON parse-guards) and rate-limit
   via the shared fixed-window factory (`createRateLimiter` in
   `src/lib/rate-limit.ts` — Task 119; one instance per route, 20/min/IP).
5. **Tailwind v4 is CSS-first.** There is no `tailwind.config.js`. Design tokens are
   literal hex in the `@theme` block of `src/app/globals.css`
   (`--color-brand: #0058a3`, `--color-accent: #ffdb00`, …). Arbitrary values in
   JSX use bracket syntax (`bg-[#f5f3ee]`, `text-[15px]`) by convention.
6. **One store, no state library — via external stores.** Cart + wishlist + promo live
   in `src/lib/local-store.ts` external stores consumed with `useSyncExternalStore`
   (`src/lib/cart-store.tsx`); persisted to `localStorage` (`nordhem_cart_v1`,
   `nordhem_wish_v1`, `nordhem_promo`, `nordhem_store`). Do NOT reintroduce the old
   mount-effect hydration (it trips `react-hooks/set-state-in-effect` — the reason
   the lint gate once sat at 7 errors). Adjust-during-render is the sanctioned
   pattern for params-derived state (see `shop/` + `search/`).
7. **`<img>` not `next/image`.** The codebase deliberately uses plain `<img>` with
   Pexels CDN URLs and per-line `eslint-disable-next-line @next/next/no-img-element`.
   Keep the pattern (no local image pipeline exists).
8. **No auth, mock payments — by design.** Family/Business flows are demo-grade (no
   passwords); payment methods (card/PayNow/GrabPay/Atome) are selectors only,
   flagged "Demo — no charge". This deferral is documented in
   `docs/implementation-plan.md`; don't "fix" it silently.
9. **PII on public order pages.** `/order/[number]` is reachable by number alone —
   mask the email (`maskEmail` in `src/lib/mask.ts`) and never render the street
   address there; full detail stays behind the email match on `/track-order`.
10. **Shell env beats `.env`.** An exported `DATABASE_URL` silently overrides the
   `.env` file (Next's own env loader never overrides an existing env; the
   dotenv package was removed in Task 126). If the app connects to the wrong
   DB, pin the value per command: `DATABASE_URL="postgresql://…" npm run dev`.
11. **Dev hydration needs `allowedDevOrigins`.** Next 16 blocks cross-origin
   dev-resource requests: open the dev server via `http://127.0.0.1:3000`
   while the banner host is `localhost` and the `/_next/hmr` websocket is
   dropped — the page renders but **never hydrates** (drawer/cart/search
   dead; zero console errors). `next.config.ts` pins
   `allowedDevOrigins: ["127.0.0.1"]` (Task 118); the e2e suite boots the
   production build (no HMR) but is no longer blind to hydration itself —
   CartProvider stamps `html[data-hydrated]` on mount and the
   interaction-first specs navigate through `gotoHydrated` (Task 125 G-5),
   with the sentinel pinned. The `tests/unit/env-example.test.ts` pin still
   fails if the entry is removed.
12. **Error boundaries are placement-sensitive.** `src/app/error.tsx` catches
   PAGE-subtree crashes only — anything rendered inside the ROOT LAYOUT
   itself (`CartProvider` and the persisted-state stores) crashes THROUGH it
   and needs `src/app/global-error.tsx` (Task 122 F-2), which owns its own
   `<html>/<body>`. Recovery for module-poisoned state must `window.location
   .reload()` — `reset()` re-renders against the same module snapshot and
   loops. Both boundary classes browser-verified (temporary-throw probes).
13. **RED e2e runs leave DB residue.** A spec whose RED path places an order
   or inserts a row leaves that row behind (the GREEN path refuses it). The
   Task-122 cycle saw a RED-run probe review break the un-suspecting
   Task-121 "Reviews (2)" pin (regex-accepted since Task 123). Clean between
   runs (the F-12 spec pattern: track the inserted id, delete in `finally`;
   since Task 123 the flagship journey spec cleans up too — order row +
   inventory restore — and every RED-capable probe carries its own
   safety-net cleanup) and check for residue when a previously-green
   hard-count pin fails.

## Inherited ely-beauty artifacts (historical, mostly retired in Task 114)

This repo was scaffolded from the `nordeim/ely-beauty` codebase. The Task 114
remediation retired the dead trees that could not compile against this `src/`:
the 73-file `tests/unit` + 15-spec `tests/e2e` (imported ~40 non-existent
modules), `scripts/capture-screenshots.ts`, `scripts/restore-demo-stock.ts`,
`scripts/measure-parity.mjs` and `scripts/ensure-build-configs.mjs` (its
CONFIG_FALLBACKS registry would have clobbered the NORDHEM test configs).

Still present, kept for provenance (do not treat as live):

- `ely-beauty_SKILL.md` (the predecessor skill), `docs/*session*`/
  `docs/prompt-to-review-*`, the `docs/nordherm-*.zip` build archives — historical
  narrative of the predecessor project(s). (`worklog.md`'s Tasks 1–112 lineage
  was trimmed by the operator at `6ef81d1`; Tasks 113+ are this repo's history.)
- `tsconfig.tests.json` — now points at the NORDHEM test tree (extend the app
  tsconfig + node/vitest types); not part of `npm run typecheck` (app scope).
- `scripts/generate-imagery.mjs`, `scripts/gen-gallery-variants.mjs` — lineage
  imagery utilities, no broken imports.
- `docs/ssh_git_wrapper_v3.py` and `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`
  are **live tooling** (below).

When adding tests, pin them to this `src/` — never resurrect ely-beauty specs.

## Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck          # app scope (src/**, next.config.ts)
npm run typecheck:tests    # the test tree (tsconfig.tests.json) — both scopes are live gates
npm run lint               # 0 errors expected
npm run test               # 218/218 unit
npm run test:e2e           # 146/146 e2e (needs a live Postgres for the checkout journey)
```

There is no hosted CI; the local gate is the only gate.

## Git contract

- **main only** — never create branches; Conventional Commit messages; atomic commits.
- Clone remote is `https://github.com/nordeim/home-furnishing-store.git`; push target
  is the SSH URL `git@github.com:nordeim/home-furnishing-store.git`.
- Push with the wrapper: `python3 docs/ssh_git_wrapper_v3.py --key-file <0600 key
  outside the repo> --remote git@github.com:nordeim/home-furnishing-store.git`
  (the wrapper's built-in default remote still points at the old `ely-beauty` repo —
  the `--remote` override is **mandatory** here). Full runbook:
  `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`. Sandboxes without an `ssh`
  binary use the paramiko shim from that runbook's Appendix A.
- Never commit secrets or keys (`.gitignore` rejects `*.key`, `ssh-key.txt`, `.env`).
- `skills/` is vendored reference material — excluded from checking, testing and
  compilation by operator contract.

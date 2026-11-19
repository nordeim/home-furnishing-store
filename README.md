# NORDHEM Singapore — Furniture & Home Furnishing Store

![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black)
![React](https://img.shields.io/badge/React-19.2.6-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.17-38bdf8)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45.2-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-required-336791)
![GST](https://img.shields.io/badge/GST-9%25_inclusive-ffdb00)

A Singapore-market furniture & home-furnishing e-commerce storefront — an
original-code **functional superset of the public IKEA Singapore site's
information architecture** (public-route observation only: no credentials, no
asset copying, invented product names, Pexels-licensed imagery). Built as a
single Next.js 16 app that **degrades, never fails**: the storefront renders from
a static catalogue even when PostgreSQL is unreachable.

## Overview

The problem: a demo-grade but production-shaped storefront that exercises the
full e-commerce loop — browse → filter/search → product detail with store stock
→ bag → promo → checkout → order number → tracking — plus the surrounding
surfaces a furniture retailer needs (inspiration rooms, offers, services,
stores, Family/Business programmes, food, sustainability, planning tools).

The approach: Next.js 16 App Router with React 19 and TypeScript strict on the
front; Drizzle ORM over PostgreSQL on the back with an idempotent first-read
seed and static fallbacks; one React-context client store (cart/wishlist/promo)
persisted to localStorage; integer-cents money with server-side re-derivation
at checkout; mock payment methods (card/PayNow/GrabPay/Atome — "Demo, no
charge") with real authentication explicitly deferred.

## Key Features

| Feature | What it does |
|---|---|
| 🛋️ **Catalogue** | 24 original products (SOLBAKKEN, MAKAN, HAVBRIS…) across 8 room categories with badges, ratings, compare-at pricing |
| 🔍 **Shop** | Category tabs, keyword filter, max-price slider, 6 sort orders via `/api/products` |
| 📦 **Product pages** | Gallery, materials/dimensions, per-store stock with aisle/bin locations, reviews (read + write), related items |
| 🛒 **Bag & wishlist** | One React-context store, localStorage-persisted, quantity steppers (1–99) |
| 🎟️ **Promo codes** | `WELCOME10` / `MAKAN15` / `FLAT20` with minimum-spend rules, validated server-side |
| 💳 **3-step checkout** | Contact → delivery (standard/express/click-&-collect) → payment; 9% GST-inclusive pricing with back-calculated display; order numbers `NH-YYYYMMDD-XXXXXX` |
| 🚚 **Order tracking** | Order number + email lookup with timeline |
| 🏠 **Inspiration rooms** | 6 shoppable room stories (BTO, makan nights, WFH corner…) linking to live PDPs |
| 🧮 **Interactive tools** | Family points calculator, Business instant quote, buy-back estimator, room explorer + booking |
| 🌱 **Full retail surface** | Offers, services, 3 stores, food, sustainability, help, search, wishlist |
| ♿ **Accessibility** | Skip link, labels, focus rings, toggle-button groups (`role="group"` + `aria-pressed`), live regions, autocomplete purpose tokens (incl. cc-*), non-color state cues, responsive to 360px |
| 🛡️ **Degrade, never fail** | Static-catalogue fallback on every DB read; `/api/health` reports DB status |

## Architecture

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Web framework | Next.js (App Router) | 16.4.2 | Pages, route handlers, SSR/metadata |
| UI runtime | React | 19.2.6 | Server + client components |
| Language | TypeScript (strict) | 5.9.3 | Type safety, `@/*` path alias |
| Styling | Tailwind CSS (CSS-first `@theme`) | 4.1.17 | Literal-hex tokens, no config file |
| ORM | Drizzle ORM | 0.45.2 | Schema in `src/db/schema.ts` |
| Database | PostgreSQL (node-postgres) | pg 8.20.0 | 9 tables, pooled client |
| Lint | ESLint (flat config) | 9.39.4 | `eslint-config-next/core-web-vitals` |
| Imagery | Pexels CDN | — | Licensed, attributed in code comments |

```mermaid
flowchart TB
    B[Browser] -->|pages| NEXT[Next.js 16 App Router]
    B -->|/api/*| NEXT
    NEXT --> SD[server-data.ts<br/>ensureSeed + fallbacks]
    SD -->|Drizzle ORM| PG[(PostgreSQL)]
    SD -->|catch → static fallback| CAT[catalog.ts<br/>24 products / 8 categories]
    NEXT --> CS[cart-store.tsx<br/>React Context + localStorage]
    B -.->|img| PEX[Pexels CDN]
```

**Governing decisions** (full record in `docs/implementation-plan.md` and the
PAD): Drizzle over Prisma (the template already shipped it), one context store
over Zustand (no new dependency), no auth / mock payments (demo-grade,
documented deferrals), integer-cents money with server re-derivation, the
`{ ok, data | error }` API envelope on every route, and a Tailwind v4
candidate-scan guard in `globals.css` (prose files quote class names — see
Troubleshooting).

## File Hierarchy

```
📂 home-furnishing-store/
├── 📂 src/app/               # 20 page routes + 6 API route handlers
│   ├── 📄 page.tsx           # Home: hero, rooms, bestsellers, deals, brand
│   ├── 📂 shop/ product/[slug]/ cart/ checkout/ track-order/ order/[number]/
│   ├── 📂 inspiration/[slug]/ offers/ services/ stores/ family/
│   ├── 📂 business/ food/ sustainability/ planning-tools/ search/ wishlist/ help/
│   ├── 📂 api/               # products, promotions/validate, checkout, orders/track, reviews, health
│   ├── 📄 globals.css        # Tailwind v4 @theme tokens + scan guard + utilities
│   └── 📄 layout.tsx · robots.ts · sitemap.ts
├── 📂 src/components/        # Header, Footer, ProductCard, BuyBox, ReviewSection
├── 📂 src/lib/               # server-data (DB+fallbacks), catalog (static seed), cart-store, utils
├── 📂 src/db/                # schema.ts (9 tables) + index.ts (pooled Drizzle client)
├── 📂 docs/                  # implementation-plan, reference-investigation, plans, screenshots, SSH push runbook
├── 📂 skills/                # vendored agent skills (excluded from gates)
├── 📂 tests/                 # NORDHEM-native suite: unit (Vitest) + e2e (Playwright)
├── 📄 AGENTS.md · CLAUDE.md · Project_Architecture_Document.md · home-furnishing-store_SKILL.md
├── 📄 drizzle.config.json · playwright.config.ts · vitest.config.ts
└── 📄 worklog.md             # session-by-session working history
```

## Quick Start

Requires **Node.js ≥ 20** and a PostgreSQL database (or skip the DB — the
storefront runs on the static fallback).

1. **Clone & install**

   ```bash
   git clone https://github.com/nordeim/home-furnishing-store.git
   cd home-furnishing-store
   npm install
   ```

2. **Configure the database** (the only variable the app reads)

   ```bash
   cp .env.example .env
   # edit .env → DATABASE_URL="postgresql://user:pass@host:5432/db"
   ```

   Prefer Docker for the database? `docker compose up -d` runs ONLY PostgreSQL
   17 with the same credentials/port (`postgres`/`postgres`/`app_db` on :5432
   — see `docker-compose.yml`); there is deliberately no Redis/Stripe/Adminer
   service because this architecture uses none of them.

3. **Create the tables** (schema push; seeding happens automatically on first read)

   ```bash
   npx drizzle-kit push
   ```

4. **Run**

   ```bash
   npm run dev        # development → http://localhost:3000
   # or production:
   npm run build && npm run start
   ```

**Verify setup**

- `curl http://localhost:3000/api/products` → `{"ok":true,"data":[…24 products…]}`
- `curl http://localhost:3000/api/health` → `{"ok":true,"data":{"db":"up"}}` with a live DB (500 without — expected on the static fallback)
- Browse `/shop`, add to bag from a product page, apply `WELCOME10` at `/checkout`
  with a $150+ subtotal, place the demo order, then track it at `/track-order`
  with the order number + the email you entered (full persistence requires the DB).

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. `src/db/index.ts` throws at module load without it. `drizzle.config.json` separately pins `postgresql://postgres:postgres@127.0.0.1:5432/app_db` for `drizzle-kit push` — update both when your DB moves. |

That is the complete list. There is no `AUTH_SECRET` (auth deferred), no payment
keys (mock methods only), and `NEXT_PUBLIC_SITE_URL` is not read by this
codebase (canonical origin `https://nordhem.sg` is set in `layout.tsx`).

## Testing

A NORDHEM-native suite is wired into the gates (Tasks 114 + 117):

```bash
npm run test             # Vitest unit — 163 tests at the pure seams
                         # (money math, validators, Family voucher rule,
                         #  badge dedupe, catalogue invariants, findPromo,
                         #  local-store contract, maskEmail, robots/sitemap
                         #  SEO policy)
npm run test:e2e         # Playwright e2e — 113 tests against the PRODUCTION build
                         # (boots :3100 with a pinned DATABASE_URL): mobile
                         # navigation @390×844 incl. Escape-close, PDP SEO +
                         # JSON-LD, robots/sitemap, API envelope + boundary
                         #  validation, wishlist/search fetch-failure states,
                         #  the full bag → promo → checkout → masked
                         #  confirmation → tracking journey (live Postgres),
                         #  plus the Task-121 pins (per-store click-&-collect
                         #  stock, JSON-LD reviewCount honesty, the shop SSR
                         #  content pair, the search settle discipline,
                         #  checkout error placement + method-switch slots,
                         #  stepper floors, SearchAction) and the Task-122
                         #  pins: the promo min-spend display gate, checkout
                         #  payload caps + qty:null drop, reviews
                         #  refuse-never-truncate, the inventory unique index,
                         #  the search URL sync, the inspiration pieces-total,
                         #  the business-stepper floor, the checkout GST line,
                         #  hero discount attribution, and the SSR sort order
npm run test:e2e:install # one-time: install the Playwright Chromium build
```

The predecessor repo's 73-unit/15-e2e dead tree (importing modules that do not
exist in this `src/`) was retired in the same pass — every test here pins
NORDHEM behaviour. TDD is the default for logic changes.

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/products` | GET | public | Filter (`q`, `cat`, `max`) and sort (`featured`, `popular`, `price-asc/desc`, `rating`, `new`) the catalogue |
| `/api/promotions/validate` | POST | public | `{ code, subtotalCents }` → promo or `INVALID_PROMO` with min-spend message |
| `/api/checkout` | POST | public | ⚠️ Places an order (demo, no charge). Validates email/phone/postal/address with length caps, `storeSlug` against the three real stores, and `deliverySlot` against the shared `DELIVERY_SLOTS` map (method-coherent whitelist, refuse-never-truncate — Task 123 F-3); parse-guards malformed JSON (400); rate-limits 20/min/IP (Retry-After); **re-derives all money server-side via `priceTotals()`**; validates qty against live inventory **atomically** (one transaction with row locks — a concurrent last-unit pair gets exactly one 201 + one 422 `LOW_STOCK`); click-&-collect checks the chosen store's rows only; returns `{ orderNumber }` only |
| `/api/orders/track` | POST | public | `{ orderNumber, email }` → order + items (email must match) |
| `/api/reviews` | GET/POST | public | List by `productId` / publish a review (rating 1–5, name ≥ 2 chars) |
| `/api/health` | GET | public | `{ ok: true, data: { db: "up" } }` iff the database answers `select 1` (500 + `DB_DOWN` error envelope without — Task 123 F-9 aligned it to the every-route envelope) |

All responses use the envelope `{ ok: true, data } | { ok: false, error: { code, message } }`.

## Design System

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-brand` | `#0058a3` | Primary blue — buttons, links, logo block |
| `--color-brand-dark` | `#004382` | Hover state |
| `--color-accent` | `#ffdb00` | Yellow — CTAs, badges, selection, focus rings |
| `--color-paper` / `--color-cream` | `#f7f5f0` / `#faf8f4` | Warm neutrals — section backgrounds |
| `--color-ink` / `--color-muted` | `#111111` / `#5b5b5b` | Text primary / secondary |
| `--color-line` | `#e5e1d8` | Hairline borders |
| `--color-moss` / `--color-clay` | `#2e6b34` / `#b5502a` | In-stock green / low-stock amber |

**Typography**: `"Arial Black"` stack for display weights (the IKEA-style bold
look), `"Helvetica Neue"`/system for body. **Motion**: one `reveal-up` entrance
animation (0.7s cubic-bezier), `prefers-reduced-motion` respected.

## Local Context (Singapore)

- **Currency**: SGD via `Intl.NumberFormat("en-SG")`; all money stored as integer cents.
- **GST**: 9%, included in listed prices; the checkout back-calculates the GST
  component for the receipt line.
- **Addresses**: 6-digit postal codes; phone `+65` formats; delivery pricing in
  SGD ($12 standard, free ≥ $200, $29 express, free Click & Collect).
- **Payments**: card / PayNow / GrabPay / Atome selectors — all demo (no charge,
  no SDKs). Real payments are a documented deferral.
- **Stores**: Tampines, Jurong, Alexandra (fictional addresses/phones under the
  NORDHEM brand).

## Project Status

| Phase | Status | Notes |
|-------|--------|-------|
| Reference investigation (IKEA SG, public routes) | ✅ Done | `docs/reference-investigation.md` |
| Implementation plan + decision record | ✅ Done | `docs/implementation-plan.md` |
| Storefront build (20 routes, 6 APIs, 9 tables) | ✅ Done | built from the `ely-beauty` template lineage |
| Build/typecheck gate | ✅ Green | scan guard in `globals.css`; cold build re-verified with live Postgres |
| Lint gate | ✅ 0 errors / 0 warnings | the 7-error `set-state-in-effect` debt was fixed (external stores + render-derivation), not suppressed |
| Test suite | ✅ 163 unit + 113 e2e, all green | NORDHEM-native harness (Tasks 114/117/118/119/120/121/122/123/124/125/126/127/128/129); counts pinned by tests/unit/docs-counts.test.ts |
| Mobile navigation | ✅ Verified (agent-browser + e2e, dev AND production) | open/navigate/auto-close/toggle/Escape; no Tailwind v4 bug; the 127.0.0.1 dev-hydration trap fixed via `allowedDevOrigins` (Task 118) |
| SEO | ✅ robots policy + sitemap + PDP OG/JSON-LD + metadata blanket | coherent policy: sitemap = indexable only, robots excludes utility/personal; every sitemap-indexed route ships its own title/description/canonical (client pages via route layouts); order pages carry noindex; Organization/WebSite JSON-LD in the root layout |
| PII on order pages | ✅ Masked | email masked, no street address on `/order/[number]`; full detail behind email match on `/track-order` |
| Auth + real payments | ⏸️ Deferred by decision | documented in the plan's deviations ledger |

Current cycle (2026-11-20, Task 129): workspace-refresh re-audit (fresh-clone
baseline all green at 163/111 with zero DB residue; **a FRESH rootless
PostgreSQL 17 install via `docs/setup_pg_z.sh`** — no snapshot restore this
cycle, the first fully-fresh initdb since the lesson-31 class appeared; mobile
drawer taxonomy 8/8 at 390/1440 incl. the F-7 param-close regression check —
no Tailwind v4 bug; hydration live-verified; sitemap 42 URLs, robots coherent,
og dimensions live-verified on home + PDP + inspiration) that caught **the
residue-net claim being half false** (three write-capable refusal specs — the
nullqty order probe, the overlong-review-body probe, the
bad-rating/short-name probe — plus the positive-control slot-coherence spec
carried no RED-run `finally` net while the docs said every one did; all
netted), **the enum-boundary field-class gap** (`deliveryMethod`/
`paymentMethod` still String()-coerced — `paymentMethod: ["card"]` placed a
real 201 on a crafted type — and `promoCode` silently null-dropped crafted
types; the trio is now TYPE-strict + whitelist-strict like storeSlug/
deliverySlot, with `promoCode: null` kept as the UI's accepted "no promo"
encoding), **the unpinned business half of Task-128 F-9** (the TRADE_RATE
label/saving/estimate rows now carry a derived e2e pin), **the last racy
interaction-first bare goto** (the search-freeze spec's sleep-then-click,
plus two letter-violating freeze-spec siblings — converted to `gotoHydrated`),
the **unpinned checkout array-body guard** (the Task-128 `Array.isArray`
branch, now probed), the **enumeration-scoped producer fs-pin** (now scans
every `.ts/.tsx` under `src/`), the **last hand-duplicated store list** (the
route whitelist, checkout options and Header picker derive from `STORES` via
`storeName()`), and the **cwd-relative fs-pin paths** (IDEMPOTENCY_KEY_RE +
docs-counts pins resolve from `import.meta.dirname`). Two audit claims
verified TRUE (all ten Task-128 seams held; the reference repo stayed
quiescent with md5-identical catalogs — nothing to port, fifth cycle).
Suite grew to 163 unit + 113 e2e. Details in `worklog.md` and
`docs/plans/2026-11-20-task129-remediation-plan.md`.

Current cycle (2026-11-19, Task 128): workspace-refresh re-audit (mobile-nav
taxonomy re-verified clean at 390/1440 incl. the F-7 param-close regression
check — no Tailwind v4 bug; hydration live-verified; baseline gates green at
161/108 with zero DB residue — the PG snapshot needed its initdb runtime
subdirectories restored AGAIN, the SKILL lesson-31 class, fourth cycle
running) that caught **the valid-JSON non-object body crash** (`null` —
and on checkout any primitive — parsed cleanly but TypeError'd the first
property read into a 500 "failed on our side" for a pure client fault;
browser-verified on all four POST routes; the 400 shape guard now sits
beside the parse guard), **the incomplete gotoHydrated conversion** (13
interaction-first bare gotos remained in the storefront spec — including a
/cart site both sweeps missed — while three docs claimed the discipline was
complete; all converted, zero remain), **the recall-needle trim gap**
(`?q=%20solbakken%20` returned 0 where `?q=solbakken` returned 1 — the API
needle wasn't trimmed like the search seam), **the missing derived pins**
(the Task-127 "GST + family pins derive" claim was half false — the family
voucher, shop strip and offers FLAT20 pins now exist and derive), plus
**orderNumber's server-local calendar** (getUTC* swap — the campaignEnd
pattern one seam over), **the unimported IDEMPOTENCY_KEY_RE seam**
(inlined regex in the route + fs-pin), **the un-netted overlong-fields
spec** (finally + deleteProbeOrders), **the inspiration og:image
dimensions** (the Task-126 F-8 rollout's missing piece), **the earn/trade
rate constants** (FAMILY_POINTS_PER_DOLLAR + TRADE_RATE drive calculator
and copy together), and the **producer-side store-key fs-pin**
(createLocalStore keys ⊆ PERSISTED_STORAGE_KEYS). One reference-agent
claim DISPROVEN by direct read (rate-limit.ts "corruption" — the line is
clean). Suite grew to 163 unit + 111 e2e. Details in `worklog.md` and
`docs/plans/2026-11-19-task128-remediation-plan.md`.

Current cycle (2026-11-19, Task 127): workspace-refresh re-audit (mobile-nav
taxonomy re-verified clean at 390/1440 incl. the F-7 param-close regression
check — no Tailwind v4 bug; hydration live-verified; baseline gates green at
156/104 with zero DB residue — the PG snapshot needed its initdb runtime
subdirectories restored, the SKILL lesson-31 class) that caught **the
Task-126 entity regression** (the fee-derivation moved the PDP delivery line
into a template literal where `&amp;` stopped decoding — every PDP rendered
"Click &amp; Collect"; browser-confirmed), **the checkout free-text TYPE
gap** (a single-element-array payload String()-coerced past every validator
and placed a real order — executed proof; email/fullName/phone/postal/
address/deliverySlot now refuse present-non-string with 422, mirroring the
lines/reviews/read-boundary posture at the last coercing seam), **the
`?max=` read-boundary residue** (abc/1.5 silently Number()-coerced on
/api/products), **replay ownership** (both idempotency paths bind to the
bound order's own email — a key leaked via logs/XSS gets 422
REPLAY_MISMATCH, never the victim's order number; and the fast path hoists
above validation so an emptied-bag resubmit replays — the Stripe-canonical
posture), **the predictable mint fallback** (Math.random →
crypto.getRandomValues 128-bit hex), **campaignEnd on the Singapore
calendar** (a UTC server rolled priceValidUntil 16 hours early; the label
now formats with timeZone Asia/Singapore and the PDP renders the SGT
calendar date), **derived-copy completion** (GST ×7, the $200 shop pair
incl. SERP metadata, FLAT20 on /offers, the family voucher rule ×3 — all
interpolate their constants), and the **docs-truth dotenv sweep** (5
operator-doc sites still named the removed package). The storefront spec's
21 interaction-first blocks now navigate through gotoHydrated (the claim
was true for the mobile spec only). Two audit findings rejected with
evidence (the qty clamp IS the documented contract; DEPLOYMENT.md already
sequences the schema push). Suite grew to 163 unit + 111 e2e. Details in
`worklog.md` and `docs/plans/2026-11-19-task127-remediation-plan.md`.

Current cycle (2026-11-19, Task 126): workspace-refresh re-audit (mobile-nav
taxonomy re-verified clean at 390/1440 incl. the F-7 param-close regression
check — no Tailwind v4 bug; baseline gates green at 145/97 with zero DB
residue; one audit finding DISPROVEN by insert-order analysis — the
ensureSeed "partial-seed blind spot") that delivered **idempotent checkout**
(a double-click or network retry re-POSTs the same client-minted key and the
boundary replays the first order instead of placing a second — nullable
unique column, pre-transaction fast-path + pg-23505 race catch, replay
answers 200 with the same order number, stock decrements exactly once),
**RED-run safety nets on every refusal spec** (five e2e specs that place a
real order when their boundary regresses had no cleanup — the shared
deleteProbeOrders helper deletes by email and restores the inventory
re-derived from the inserted rows; proven live by temporarily reverting the
lines cap and watching the stranded 101-row order clean to zero; the
Task-123-era if-block net was found dead on its own RED path and rewritten
to finally), **read-boundary TYPE parity** (track/promo-validate/reviews GET
refuse crafted types with 422, mirroring the write boundaries), the
**derived marketing copy** pass (catalogMaxDiscountPercent() feeds the
hero/strip/offers claims + pins; the delivery-fee copy derives from the
utils constants), **SEO completion** (twitter:card site-wide, true OG image
dimensions, priceValidUntil from the rolling campaign seam), the
**PERSISTED_STORAGE_KEYS seam** across both crash boundaries, schema hygiene
(redundant products_slug_idx dropped, reviews_product_idx added, the
orderItems default(0) footgun removed, reviews order tie-broken on id), the
dotenv dependency removed, and the HTML playwright reporter. Suite grew to
156 unit + 104 e2e. Details in `worklog.md` and
`docs/plans/2026-11-19-task126-remediation-plan.md`.

Current cycle (2026-11-19, Task 125): workspace-refresh re-audit (mobile-nav
taxonomy re-verified clean at 390/1440 — no Tailwind v4 bug — with one NEW
drawer gap browser-reproduced and fixed: a category tap while already on
/shop kept the drawer open because the close guard compares pathname only;
the drawer links close on click now) that caught **the Task-121 method-switch
e2e pin time-bombed by the Task-124 slot seam** (it asserted "Today 2pm"
with the real clock — any post-14:00-SGT run went red; honest-RED via a
temporary 23:00 SGT pin, now pinned at 10:00 SGT), **the reviews POST
boundary still type-coercing** (`rating: true`/numeric authors persisted
junk — the checkout TYPE-strictness posture mirrored at the last coercing
boundary), **unbounded strings at the track/promo-lookup boundaries** (caps
mirrored from checkout), **the rate-limit identity taking the
client-forgeable leftmost XFF hop at four duplicated sites** (one
`clientIp()` seam, rightmost hop), **no security headers and an advertised
`x-powered-by`** (the platform header set + fingerprint suppression, e2e
pinned), the header strip and /offers metadata misattributing the max
discount to dining (max −17%; the honest lighting/cookware/decor set), the
checkout select displaying "Tomorrow 10am" while POSTing an already-past
"Today 2pm" across the 14:00 SGT cutoff (adjust-during-render reset; the
payload pin captures the intercepted POST), hardcoded metadata counts
(home/planning-tools/shop now derive), a JSON-LD seam missing the
U+2028/U+2029 escapes, the site origin hardcoded in 17 files (one
`SITE_ORIGIN` constant, fs-pinned), a 404-ing favicon (app icon + web
manifest added), and the e2e suite's admitted hydration blindness (the
`html[data-hydrated]` sentinel + `gotoHydrated` gate). The mobile project
now runs on `devices["iPhone 13"]` (touch + DPR 3 + real UA — hover-gated
Tailwind v4 variants render the way phones hit them). Suite grew to 145
unit + 97 e2e. Details in `worklog.md` and
`docs/plans/2026-11-19-task125-remediation-plan.md`.

Current cycle (2026-11-19, Task 124): workspace-refresh re-audit (mobile-nav
taxonomy re-verified clean at 390/1440 — no Tailwind v4 bug; baseline gates
green at 128/78 with a fully clean restored DB — zero residue, both indexes
intact this cycle) that caught **three operator-doc sites still documenting
the pre-Task-123 `/api/health` body** (CLAUDE's API table + README's curl
line and API table — now pinned by unit tests so envelope claims can't rot
again), **the search results grid surviving a failed re-search** (the
previous query's cards rendered beneath the new query's error box — the
mirrored half of the Task-123 F-4 fix; the grid and the Try-again window
now gate on the full settle discipline), **the journey e2e cleanup
stranding its order on any post-201 assertion failure** (the finally now
deletes by email + spec-start window — browser-reproduced with an injected
failure), **a real capitalized-search recall bug** (`q=Outdoor` returned 0
— only the haystack was lowercased; found by the new `matchesProductQuery`
seam pins, fixed in the one shared recall definition), the checkout qty
boundary still coercing `true`/`[5]`/`"3"` into real orders (type-strict
now), the unknown-promo notice quoting a "$0.00 minimum"
(`findPromoMinimumCents` null branch), the click-collect "Today 2pm" slot
sold at 23:00 (`availableDeliverySlots` hides it after its own 14:00 SGT
cutoff), the invented "(412)" seed review count on product cards (stars
only, like the PDP), missing cc-*/name autocomplete tokens, the star-rating
buttons' color-only state (ring added), utility routes relying on
robots.txt alone (five noindex layouts), and the e2e sitemap pin's
hardcoded 42 (derived from the catalogue now). One audit finding was
**disproven by browser evidence** (the crafted `nordhem_store` blank-select
claim — React renders the first option as the fallback; the spec stayed as
a pin). Suite grew to 138 unit + 89 e2e. Details in `worklog.md` and
`docs/plans/2026-11-19-task124-remediation-plan.md`.

Previous cycle (Task 123): workspace-refresh re-audit (mobile-nav
taxonomy re-verified clean at 390/1440 — no Tailwind v4 bug; baseline gates
green after re-pushing the Task-122 inventory unique index the restored
sandbox snapshot had lost, and cleaning the journey-residue the pinned DB
had accumulated) that caught **the flagship e2e journey leaving an order row
plus its inventory decrement behind on every run** (a finally-cleanup now
restores the DB; the suite runs residue-free), **the cart's promo message
contradicting its own discount gate** ("WELCOME10 applied" persisted beside
a vanished Discount row below the minimum — browser-reproduced; the notice
now quotes the code's own minimum via `findPromoMinimumCents`), **the
checkout `deliverySlot` boundary accepting any ≤80-char junk** (it now
enforces the shared `DELIVERY_SLOTS` map the UI offers — the storeSlug
whitelist pattern), **the search error box surviving a changed needle**
(gated on the settled needle like the verdicts), **`/api/products` keyword
recall diverging from the shop-SSR seam** (q=outdoor found nothing; the
filter now matches categorySlug too), the promo code surviving order
placement into the next bag (`clear()` drops it), the PDP review count
saturating at the 20-row display cap (a true `count(*)` feeds the JSON-LD
and heading), `/api/health` deviating from the every-route envelope
contract, `orderNumber`'s date segment following UTC instead of SGT, the
error-digest text failing WCAG AA contrast, the promo store accepting
unbounded persisted strings (32-char predicate now mirrors the write
boundary), and the docs claiming ARIA widget roles the code deliberately
removed (the `role="group"` + `aria-pressed` stance is now what the docs
say). Suite grew to 128 unit + 78 e2e. Details in `worklog.md` and
`docs/plans/2026-11-19-task123-remediation-plan.md`.

Previous cycle (Task 121): client-state robustness (localStorage shape
validation + branded `error.tsx`), click-&-collect per-store stock honesty,
`/shop` SSR content (server component + shared `sortProductList` seam),
search settle discipline (no "0 results" flash), JSON-LD reviewCount
honesty, utility-strip CTA clipping, PDP stepper floor, checkout error
placement, sitemap `lastModified`, SearchAction, og:image, SGT date fix
(planned as F-10 but actually landed in Task 122 — see above), and the
honesty copy batch. One audit finding (PDP→PDP stale review state) was
**disproven by RED-first execution** — the App Router remounts page
subtrees on param navigation; the spec stayed as a pin.

Previous cycle (Task 120): workspace-refresh re-audit that caught
**the checkout boundary as the leakiest route** (no JSON-parse guard —
malformed bodies 500'd with the raw parse error in the envelope; the 500 path
echoed internal driver errors to unauthenticated callers; email/name/address
carried minimum-length checks only, so a 300-char address persisted verbatim —
all fixed with a parse-guard 400, refuse-at-cap 422s and fixed-copy 500s),
**a real TOCTOU oversell** (the Task-119 availability check, order insert and
decrement were three separate statements — two concurrent last-unit orders
both placed and both floored inventory; demonstrated RED at the function
level, now one `db.transaction()` with `SELECT … FOR UPDATE` row locks and an
e2e pin: exactly one 201 + one 422 `LOW_STOCK`), **the half-finished SEO
blanket** (six sitemap-indexed routes still shipped title-only metadata; the
`/family` description claimed a 20×-lower earn rate than the page's own
calculator plus nonexistent workshops), **the docs-counts pin's PAD blind
spot** (the PAD's own live-tense sites had rotted to 50/23, 58/27 and
5-files/58 — the pin now covers all five operator docs), an **a11y floor**
(focus rings on the four outline-stripped inputs, alert-role promo errors,
qty-1 minus guard, `role="img"` stars), the **dead `carts`/`cart_items`
schema retirement** (9 live tables — the localStorage cart is the documented
architecture), the **self-healing seed** (a partial first seed previously
left inventory empty forever), and the honesty batch (fabricated MRT
pointer, "audited yearly" self-contradiction, inspiration stock overclaim).
Details in `worklog.md` and
`docs/plans/2026-11-18-task120-remediation-plan.md`. The previous cycle was
Task 119 (SEO metadata blanket, server-truth consolidation via `priceTotals()`,
ARIA honesty, the rate-limit factory, the docs-counts pin itself).
Prior cycles: Task 114
(remediation: test harness, lint debt, a11y, SEO, PII, rootless PostgreSQL 17
+ live-DB verification), Task 115 (DEPLOYMENT.md rewrite), Task 117 (honesty
+ API-boundary cycle), Task 118 (dev-hydration `allowedDevOrigins` fix,
lineage-drift pins) — same plan directory.

## Troubleshooting

| Symptom | Cause → Fix |
|---------|-------------|
| Dev page renders but nothing is interactive (drawer/cart/search dead, no console errors) — only when opened via `http://127.0.0.1:3000` | Next 16 `allowedDevOrigins` drops the `/_next/hmr` websocket for cross-origin hosts, and the RSC client then discards the inline payload without hydrating. `next.config.ts` already pins `allowedDevOrigins: ["127.0.0.1"]` (Task 118) — if you removed it, restore it and restart `npm run dev`, or open `http://localhost:3000` instead. |
| Build fails: `Missed semicolon` in `globals.css` | Tailwind v4's candidate scan read a class-like string from a **prose file** (the classic colon-form `md:aspect-[3:1]`). The `@source not` guard at the top of `globals.css` prevents it — don't remove it, and never write colon-form aspect values. Always test builds cold (`rm -rf .next`): a warm cache can mask it. |
| `Error: DATABASE_URL is required` at startup | `src/db/index.ts` throws without it. Set any Postgres URL in `.env` (even unreachable — the storefront falls back to the static catalogue; writes need a live DB). |
| `/api/health` returns 500 | The database is unreachable — expected on the static fallback; bring Postgres up and re-check. |
| Checkout returns 500 `CHECKOUT_FAILED` | Almost certainly the DB (write path has no fallback). Verify `DATABASE_URL`, `drizzle-kit push`, and that first-read seeding has run. |
| `DATABASE_URL` returns the wrong DB / health 500 with the DB up | An exported shell `DATABASE_URL` overrides `.env` (Next's own env loader never overrides an existing env). Check `env \| grep DATABASE` and pin the value per command. |
| `npx playwright test` can't find a browser | Run `npm run test:e2e:install` once (installs the pinned Chromium build). |
| e2e checkout journey fails with `CHECKOUT_FAILED` | The journey needs a live Postgres (writes have no fallback). Start the DB, `drizzle-kit push`, and re-run. |
| Push rejected by wrapper: default remote wrong | The wrapper's built-in default still points at `nordeim/ely-beauty`. Always pass `--remote git@github.com:nordeim/home-furnishing-store.git` (runbook: `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`). |

## Contributing

Working conventions for agents and humans (full detail in `AGENTS.md` /
`CLAUDE.md`):

- **main only**, Conventional Commits, atomic changes; push through the SSH
  wrapper with an operator-supplied key that never enters the repo.
- Gate before every push: cold build + typecheck + lint; never weaken a rule to
  pass one.
- React 19 / Tailwind v4 specifics: no `forwardRef` needed; CSS-first tokens in
  `@theme` (no `tailwind.config.js`); slash-form arbitrary values only.
- `skills/` is vendored reference material — excluded from checking, testing,
  and compilation.
- Update `worklog.md` and the live docs in the same commit as behavior changes.

## License

No license file is present in this repository; the code is unpublished
proprietary work of the repo owner. Do not add a license without the owner's
decision.

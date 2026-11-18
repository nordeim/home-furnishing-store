# NORDHEM Singapore — Master Project Architecture Document (PAD) v1.1.0

**Classification:** Internal Engineering Reference
**Status:** DEFINITIVE, PRODUCTION-LOCKED BLUEPRINT
**Companion Documents:** `docs/implementation-plan.md` (build decision record) · `docs/reference-investigation.md` (reference-site evidence dossier) · `AGENTS.md` / `CLAUDE.md` (agent instructions) · `README.md` (product view) · `home-furnishing-store_SKILL.md` (distilled engineering memory)
**Last Updated:** 2026-11-18
**Audience:** Senior Engineers, Tech Leads, DevOps, and Onboarding Engineers (human and AI)
**Rule:** Every architectural decision in this document traces to a specific rationale.
Nothing is here "because it's popular."

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
  (`home-furnishing-store`); 16 dev-server screenshots under `docs/screenshots/`.
  Remediation plan + evidence: `docs/plans/2026-11-18-task114-remediation-plan.md`.

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
| PostCSS runner | `@tailwindcss/postcss` | 8.5.23 pipeline | The Tailwind v4 integration path |
| ORM | Drizzle ORM | 0.45.2 | SQL-first, schema-as-TypeScript, no engine binary (ADR-002) |
| DB driver | `pg` (node-postgres) | 8.20.0 | Pooled connections, `drizzle-orm/node-postgres` adapter |
| Database | PostgreSQL | 15+ recommended | Relational catalogue/orders; `drizzle-kit push` for schema |
| Lint | ESLint flat config + `eslint-config-next/core-web-vitals` | 9.39.4 | One linter, Next-aware rules |
| Unit/E2E (future) | Vitest / Playwright | **not installed** | The inherited suites are not runnable here (§7, §10) |
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
  holding cart lines + wishlist + promo, hydrated from `localStorage` in a
  mount effect, persisted on change (`nordhem_cart_v1`, `nordhem_wish_v1`,
  `nordhem_promo`, `nordhem_store`).
- **Rationale:** Same replace-contract semantics as the Zustand guidance without
  the dependency; the `loaded` flag keeps SSR/first paint hydration-safe.
- **Consequences:** + Zero dependencies, one seam to test; − Not
  middleware-able; the effect-based hydration trips the new
  `react-hooks/set-state-in-effect` lint rule (known debt, §10).
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
        DB[(PostgreSQL<br/>11 tables · pooled pg)]
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
Layer 0: src/db        — schema.ts (11 tables, Drizzle pg-core) + index.ts
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
`@/db` directly is an architecture violation.

### 3.2 Annotated Directory Structure

```
home-furnishing-store/
├── src/
│   ├── app/
│   │   ├── layout.tsx            ← root: CartProvider, Header/Footer, skip link, metadataBase nordhem.sg
│   │   ├── page.tsx              ← home: hero, rooms, bestsellers, deals, stores, brand (237 lines)
│   │   ├── globals.css           ← Tailwind v4 @theme tokens + candidate-scan guard + utilities
│   │   ├── not-found.tsx         ← branded 404
│   │   ├── robots.ts · sitemap.ts← SEO: allow-all + sitemap pointer; 18 static + 24 product + 6 room URLs
│   │   ├── shop/ search/         ← client pages filtering via /api/products (debounced 250ms)
│   │   ├── product/[slug]/       ← RSC: metadata, gallery, stock/aisle, reviews, related (122 lines)
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
│   ├── components/               ← Header (174), Footer (76), ProductCard (92),
│   │                               BuyBox (57), ReviewSection (73)
│   ├── lib/
│   │   ├── server-data.ts        ← 244 lines: ensureSeed, reads+fallbacks, validatePromo,
│   │   │                           placeOrder (money truth), trackOrder, cart helpers
│   │   ├── catalog.ts            ← 142 lines: 24 products / 8 categories / 3 stores /
│   │   │                           6 inspirations / 3 promos + findProduct/productImage
│   │   ├── cart-store.tsx        ← 127 lines: CartProvider + useCart (lines/promo/wishlist)
│   │   └── utils.ts              ← 98 lines: formatSGD, priceTotals, clampInt, validators,
│   │                               orderNumber (NH-YYYYMMDD-XXXXXX), stars, cn
│   └── db/
│       ├── schema.ts             ← 178 lines: 11 tables + exported row types
│       └── index.ts              ← 25 lines: pooled Drizzle client, DATABASE_URL guard
├── docs/                          ← implementation-plan, reference-investigation, SSH push
│                                   runbook + wrapper, session/prompt archives, build zips
├── skills/                        ← vendored agent-skills library (operator contract: excluded
│                                   from checking/testing/compilation)
├── tests/                         ← INHERITED from ely-beauty — NOT runnable here (§7, §10)
├── scripts/                       ← generate-imagery.mjs (lineage), 2 broken inherited scripts
├── AGENTS.md · CLAUDE.md · README.md · this PAD
├── drizzle.config.json            ← local dev DB URL for drizzle-kit push
├── eslint.config.mjs · tsconfig.json · tsconfig.tests.json (inherited)
├── vitest.config.ts · playwright.config.ts (inherited, inactive)
└── worklog.md                     ← session-by-session history (Tasks 1–112 are the
                                    predecessor lineage; 113+ are this repo)
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
choose *what* to buy, not *what it costs*. Inventory decrement is best-effort
(wrapped, non-blocking) by the same never-fail-checkout principle.

**Pattern 4 — The API envelope + write-boundary validation (`api/checkout/route.ts`)**

```typescript
// Fixed-window rate limiter, in-process (single deployable, no store needed).
const rate = new Map<string, { n: number; reset: number }>();
function throttled(ip: string): boolean { /* 20 req / 60s / ip, sliding window reset */ }

// Every failure returns the same shape; no bare throws to the client.
if (!isValidEmail(email))
  return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter a valid email address." } }, { status: 422 });
```

*Why this pattern:* one envelope means one client-side error handler on every
caller (`ShopInner`, `ReviewSection`, checkout, tracking); codes (`VALIDATION`,
`RATE_LIMIT`, `EMPTY_BAG`, `INVALID_PROMO`, `NOT_FOUND`, …) are stable
contract points for the future test suite.

**Pattern 5 — Hydration-safe client persistence (`cart-store.tsx`)**

```typescript
useEffect(() => {
  setLines(read<CartLine[]>(CART_KEY, []));   // localStorage only exists client-side
  setWishlist(read<string[]>(WISH_KEY, []));
  setPromoCode(localStorage.getItem("nordhem_promo") || null);
  setLoaded(true);                            // gates persistence writes until hydrated
}, []);
```

*Why this pattern:* reading `localStorage` during render would break SSR
hydration (server HTML ≠ first client render); the mount-effect + `loaded` flag
is the standard pattern — and the reason the new
`react-hooks/set-state-in-effect` lint rule flags it (known debt, §10;
remediation is `useSyncExternalStore`, not suppression).

---

## 4. Data Architecture

### 4.1 Database Schema (11 tables)

```mermaid
erDiagram
    categories ||..|| products : "category_slug (logical)"
    products ||--o{ inventory : "id = product_id (cascade)"
    products ||--o{ reviews : "id = product_id (cascade)"
    products ||--o{ cart_items : "id = product_id (cascade)"
    products ||--o{ order_items : "id = product_id (denormalized)"
    carts ||--o{ cart_items : "id = cart_id (cascade)"
    orders ||--o{ order_items : "id = order_id (cascade)"
    inspirations }o--o{ products : "product_slugs[] (logical)"
```

| Table | Key columns | Notes |
|-------|------------|-------|
| `categories` | slug (unique), name, tagline, imageUrl, sortOrder | 8 room categories |
| `products` | slug, sku (unique), priceCents, compareAtCents?, ratingAvg numeric(3,2), colors[], imageUrls[], badges[], isNew, isBestseller, stockTotal | 24 rows seeded; `uniqueIndex` on slug |
| `stores` | slug (unique), name, address, hours, phone | 3 SG stores |
| `inventory` | product_id → products, store_slug, quantity, aisle_bin (`A12-B04`) | 3 rows/product |
| `carts` | token (unique), promo_code? | cookie-token server cart (API parity) |
| `cart_items` | cart_id, product_id, qty, addedAt | cascade on both parents |
| `orders` | order_number (unique), email, address/postal, delivery_method/slot, store_slug, payment_method, subtotal/discount/delivery/gst/total cents, status | money snapshot |
| `order_items` | order_id, product_id, name, sku, imageUrl, unitPriceCents, qty | **denormalized snapshot** — order survives catalogue edits |
| `reviews` | product_id, author, rating (1–5), title, body, verified | seeded + user-written |
| `inspirations` | slug (unique), room, sqm, budgetCents, productSlugs[] | 6 shoppable rooms |
| `promotions` | code (unique), kind (`percent`/`fixed`), value, minSubtotalCents, active | 3 codes |

**Note:** `docs/implementation-plan.md` says "10 tables" — the actual count is
**11** (`carts`/`cart_items` were likely counted as one). Corrected forward
here; the plan remains the historical record.

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
| Rate-limit order placement | In-process fixed window: 20 req/min/IP (`x-forwarded-for` first hop, "local" fallback) → 429 envelope |
| Parameterized queries only | Drizzle query builder throughout — no string-built SQL |
| No secrets in repo | `.gitignore` rejects `.env`, `*.key`, `ssh-key.txt`; `.env.example` documents the single non-secret variable; pushes use the out-of-repo key wrapper |
| Fail-closed on order access | Tracking requires order number **and** matching email (case-insensitive) |
| Input bounding | `slice()` caps on review fields (60/120/2000), delivery slot (80), store slug (40) |

### 6.2 Security Utilities

`src/lib/utils.ts` (validators, clamp), the `throttled()` limiter in the
checkout route, and `src/db/index.ts`'s fail-fast `DATABASE_URL` guard.

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
| Missing-rate-limit on reviews/tracking | Accepted demo gap; add limiters when the test suite lands |

---

## 7. Testing Strategy

### 7.1 Test Distribution — Current State (Task 114: NORDHEM-native)

| Category | Files | Status | Location |
|----------|-------|--------|----------|
| Unit (Vitest) | 5 files, 40 tests | ✅ Green — pure seams: `utils` money/validators, `catalog` invariants + `findPromo`, `local-store` external-store contract, `mask`, robots/sitemap SEO policy | `tests/unit/` |
| E2E (Playwright) | 2 specs, 18 tests | ✅ Green — production build on `:3100`, pinned `DATABASE_URL`: mobile-navigation project (390×844) + desktop storefront/commerce journeys (incl. the live-DB checkout round-trip) | `tests/e2e/` |
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
npm run test                                   # 40/40 unit
npm run test:e2e                               # 18/18 e2e (live Postgres for the journey)
# runtime smoke of touched routes against `npm run start`
```

---

## 8. Build & Deployment

### 8.1 Production Build

```bash
DATABASE_URL="postgresql://…" npm run build    # needs the variable present (module-load guard)
npm run start                                  # serves the build
```

Output: `.next/` — 30 routes (20 pages, 6 API handlers, robots, sitemap,
not-found); data pages are dynamic (`ƒ`), static pages (`/cart`, `/checkout`,
`/help`, …) prerender as shells that hydrate client state. Build toolchain:
Turbopack + PostCSS (`@tailwindcss/postcss`). **Always build cold** — the
candidate-scan guard's failure mode is cache-maskable (§10, row 1).

### 8.2 Environment Variables

| Name | Required | Description | Default |
|------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string; the only variable the code reads | — |

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
npx drizzle-kit push              # 11 tables; seeding is automatic on first read
npm run dev                       # http://localhost:3000
```

### 9.2 Common Commands

| Command | Location | Purpose |
|---------|----------|---------|
| `npm run dev` / `build` / `start` | root | Dev / cold production build / serve |
| `npm run lint` | root | ESLint (flat; `skills/` ignored) |
| `npm run typecheck` | root | App-scope `tsc --noEmit` |
| `npx drizzle-kit push` | root | Apply `src/db/schema.ts` |
| `python3 docs/ssh_git_wrapper_v3.py --key-file K --remote git@github.com:nordeim/home-furnishing-store.git` | repo | Verified SSH push to main (see the runbook) |

### 9.3 Code Style Rules

- TypeScript strict; no `any`; early returns; pure helpers in `src/lib/utils.ts`.
- Tailwind arbitrary values for one-offs, `@theme` tokens for repeats; slash-form
  aspect ratios only (`aspect-[16/9]`) — colon-form breaks the build via the
  candidate scan (the guard at the top of `globals.css` is load-bearing).
- ESLint flat config enforces Next core-web-vitals; the 7 known
  `set-state-in-effect` errors are documented debt — fix by refactoring with
  test coverage, never by disabling the rule.

### 9.4 Git Workflow

`main` only, Conventional Commits, atomic units, docs updated in the same
commit as behavior changes (`worklog.md` gains a dated task entry per session).
Clone over HTTPS; push over SSH through the wrapper with the mandatory
`--remote` override; keys never enter the tree.

---

## 10. Known Issues & Outstanding Tasks

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| ~~CRITICAL~~ | Clean production build broken: Tailwind v4 candidate scan read prose files → invalid `aspect-ratio: 3:1` → PostCSS "Missed semicolon". The `@source not` guard was missing from this repo's `globals.css`. | Build gate failed on every clean checkout | **Fixed (v1.0.0)** — guard restored; clean build verified green (30 routes) |
| ~~HIGH~~ | Inherited test suite not runnable (73 unit + 15 e2e ely-beauty files, undeclared packages, ~40 non-existent modules) | No executable regression net | **Fixed (Task 114)** — NORDHEM-native harness: 40 unit + 18 e2e green, typecheck:tests wired; dead tree + config-clobbering scripts retired |
| ~~HIGH~~ | `.env.example` described the predecessor stack | Misleads every setup | **Fixed (v1.0.0)** — real single-variable contract + precedence note |
| ~~MEDIUM~~ | 7 `react-hooks/set-state-in-effect` lint errors | Lint gate not green; cascading-render risk | **Fixed (Task 114)** — `local-store.ts` external stores + `useSyncExternalStore` (cart/wishlist/promo/store-picker) + adjust-during-render (Header route-close, search param-follow, shop URL-derived filters). Lint 0/0 without suppressing the rule; behaviour pinned by the e2e journey |
| ~~MEDIUM~~ | Mobile drawer ignored Escape | a11y gap (overlay baseline) | **Fixed (Task 114)** — keydown handler; pinned by the mobile-navigation e2e spec |
| ~~MEDIUM~~ | `/order/[number]` rendered full email + street address to anyone with the number | PII exposure on a public-by-number page | **Fixed (Task 114)** — `maskEmail` + address/postal removed; full detail stays behind the email match on `/track-order` |
| ~~MEDIUM~~ | SEO: robots allowed everything; no PDP OG/canonical/JSON-LD; `data-scroll-behavior` missing (Next 16 console warning); sitemap listed robots-excluded routes | Indexation noise + missing rich results | **Fixed (Task 114)** — coherent policy (robots disallow × 7; sitemap 12+24+6=42 indexable URLs; PDP canonical+OG+Product JSON-LD; attribute set) — all unit/e2e pinned |
| ~~LOW~~ | Promo display logic duplicated (cart + checkout) with a phantom 10% default for unknown codes | Misleading totals preview | **Fixed (Task 114)** — shared `findPromo()` in `catalog.ts`; server re-derivation unchanged |
| ~~LOW~~ | `package.json` name was `nextjs-postgresql-template` | Identity drift | **Fixed (Task 114)** — `home-furnishing-store` |
| LOW | `docs/ssh_git_wrapper_v3.py` default remote still `nordeim/ely-beauty` | A wrapper run without `--remote` pushes to the wrong repo | Open (override documented everywhere; changing the default touches a live operator tool) |
| LOW | `drizzle.config.json` hardcodes a local dev URL | Surprises on remote DBs | Open — documented in README/.env.example |
| INFO | Auth + real payments deferred by decision (ADR-006); reviews unauthenticated; per-process rate limiter weak behind multi-instance LB | Demo-scope accepted risks | Documented; revisit before any production use |
| INFO | Display pricing rules duplicated (`priceTotals` helper vs inline logic in `placeOrder`) | Future drift risk | Reduced in Task 114 (promo lookup unified); full unification still open |
| INFO | `nordhem_promo` persisted format changed raw → JSON in the Task 114 store refactor | One-time cosmetic migration: a returning visitor re-applies their promo once | Documented in `cart-store.tsx` |

**Verification ledger (2026-11-18, Task 114 remediation cycle):** rootless
PostgreSQL 17.12 installed (scram TCP + trust socket, `app_db` created) —
*Verified*; `drizzle-kit push` → 11 tables — *Verified*; first-read seed
(24/8/72/5/3/6/3 rows) — *Verified*; checkout round-trip in Postgres
(`NH-20261118-2NRWZD`: 259800 − 25980 WELCOME10, free delivery, GST 19306,
total 233820; tracking 200 on match / 404 on mismatch) — *Verified*; mobile
menu at 390×844 + desktop at 1280×800 via agent-browser (open/navigate/
auto-close/toggle; Escape gap found → fixed → re-verified) — *Verified*;
lint 0 errors 0 warnings — *Verified*; typecheck + typecheck:tests clean —
*Verified*; vitest 40/40 — *Verified*; Playwright 18/18 against the production
build — *Verified*; cold `next build` green (30 routes) — *Verified*; 16
dev-server screenshots (PNG signature + dimensions validated) — *Verified*;
no Tailwind v4 mobile-nav bug found (the family's v4 trap is the candidate
scan, guarded and cold-build-proven) — *Verified*.

---

## 11. Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/server-data.ts` | ~244 | All DB reads/writes, seed, fallbacks, promo validation, `placeOrder` money truth, tracking |
| `src/lib/catalog.ts` | ~142 | Static catalogue: 24 products, 8 categories, 3 stores, 6 rooms, 3 promos (seed + fallback) |
| `src/lib/utils.ts` | ~98 | Pure helpers: `formatSGD`, `priceTotals`, validators, `orderNumber`, `clampInt`, `stars` |
| `src/lib/cart-store.tsx` | ~110 | The one client store: three `local-store` external stores via `useSyncExternalStore` + `useCart` context |
| `src/lib/local-store.ts` | ~75 | localStorage-backed external-store factory (subscribe/getSnapshot/getServerSnapshot/set) — the set-state-in-effect remedy |
| `src/lib/mask.ts` | ~14 | `maskEmail` — PII policy for the public order page |
| `src/db/schema.ts` | ~178 | 11 Drizzle tables + row types |
| `src/db/index.ts` | ~25 | Pooled client, `DATABASE_URL` fail-fast guard, globalThis singleton |
| `src/app/globals.css` | ~85 | Tailwind v4 `@theme` tokens, candidate-scan guard, utility classes |
| `src/app/page.tsx` | ~237 | Home page composition (hero, rooms, bestsellers, deals, stores, brand) |
| `src/app/product/[slug]/page.tsx` | ~122 | PDP: metadata, gallery, stock/aisle, reviews, related |
| `src/app/api/checkout/route.ts` | ~62 | Validation, rate limit, `placeOrder` delegation, envelope |
| `src/components/Header.tsx` | ~180 | Utility strip, search, store picker (external store), category nav, mobile drawer (Escape-close) |
| `tests/unit/` | 5 files | 40 unit tests at the pure seams (utils, catalog, local-store, mask, robots/sitemap) |
| `tests/e2e/` | 2 specs | 18 Playwright tests: mobile-navigation (390×844) + storefront/commerce journeys |
| `src/components/ProductCard.tsx` | ~92 | Card + `Rating`; wishlist/add-to-bag affordances |
| `docs/implementation-plan.md` | 42 | Stack decision record, deviations ledger, acceptance criteria |
| `docs/reference-investigation.md` | 45 | Reference-site evidence (Verified/Reasoned/Assumed/Unknown) |
| `docs/ssh_git_wrapper_v3.py` | ~339 | Verified SSH push wrapper (needs `--remote` override here) |
| `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` | ~378 | Push runbook incl. the paramiko ssh shim for ssh-less sandboxes |

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

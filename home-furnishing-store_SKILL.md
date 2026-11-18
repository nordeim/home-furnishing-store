---
name: home-furnishing-store
description: "NORDHEM Singapore — furniture & home-furnishing e-commerce storefront on Next.js 16 App Router + React 19 + TypeScript strict + Tailwind CSS v4 (CSS-first @theme) + Drizzle ORM + PostgreSQL. Distilled engineering memory: architecture contracts (Degrade-Never-Fail, integer-cents money, API envelope), the Tailwind v4 candidate-scan guard, external-store client state, SEO policy, the NORDHEM-native test harness, and the hard-won lessons of the build/remediation lineage."
version: 1.0.0
last_updated: "2026-11-18"
project_state: "gates: lint 0/0 · typecheck + typecheck:tests clean · 40/40 unit · 18/18 e2e · cold build green (30 routes) · PostgreSQL 17.12 live-verified"
---

# NORDHEM (home-furnishing-store) — Engineering Skill

> How to use: this is the distilled engineering memory of the NORDHEM codebase
> after the Task 114 remediation cycle. `AGENTS.md` is the quick operator
> reference, the PAD is the full blueprint, and this skill is the
> pattern/lesson layer an agent needs before touching the code. When code and
> this document disagree, **the code wins** — then fix this document in the
> same commit.

## 1. Project Identity & Design Philosophy

NORDHEM is a Singapore-market furniture & home-furnishing e-commerce
storefront: 24 original products across 8 room categories, 3 stores, 6
shoppable inspiration rooms, promo codes, a 3-step checkout with order
tracking, and Family/Business/Food/Sustainability/Planning-tools surfaces. It
is an original-code, IA-level functional superset of the public IKEA Singapore
site (public-route observation only — invented product names, Pexels imagery,
no reference assets; evidence dossier in `docs/reference-investigation.md`).

Philosophy, in priority order:

1. **Degrade, Never Fail** — every DB read has a static-catalogue fallback
   (`src/lib/catalog.ts`); the storefront renders with Postgres down; only
   writes (checkout, review POST, tracking) require the DB.
2. **Server-truth money** — integer cents everywhere; totals re-derived in
   `placeOrder()`, never trusted from the client; GST-inclusive pricing with
   the 9% component back-calculated for display.
3. **No premature dependencies** — one external-store pattern instead of
   Zustand; plain `<img>` + Pexels CDN instead of an image pipeline; mock
   payments instead of Stripe. Every deferral is documented, not silent.
4. **Original content only** — invented names/copy; no reference trademarks.

## 2. Tech Stack & Environment

| Layer | Technology | Version (lockfile-pinned) |
|-------|-----------|---------------------------|
| Framework | Next.js (App Router, Turbopack) | 16.4.2 |
| UI runtime | React | 19.2.6 |
| Language | TypeScript, `strict: true` | 5.9.3 |
| Styling | Tailwind CSS, CSS-first `@theme` | 4.1.17 (postcss 8.5.23) |
| ORM | Drizzle ORM (`drizzle-orm/node-postgres`) | 0.45.2 |
| DB driver | `pg` | 8.20.0 |
| Unit tests | Vitest + @vitejs/plugin-react | 5.1.0 / 6.3.0 |
| E2E | @playwright/test (chromium) | 1.65.1 |
| Lint | ESLint flat + eslint-config-next/core-web-vitals | 9.39.4 |

Environment contract: **`DATABASE_URL` is the only variable the code reads**
(`src/db/index.ts` throws at module load without it). `drizzle.config.json`
pins `postgresql://postgres:postgres@127.0.0.1:5432/app_db`. Precedence trap:
an exported shell `DATABASE_URL` beats `.env` (dotenv never overrides) — pin
per command when in doubt.

## 3. Bootstrapping & Configuration

```bash
git clone https://github.com/nordeim/home-furnishing-store.git && cd home-furnishing-store
npm install
cp .env.example .env            # set DATABASE_URL (any Postgres; unreachable = static fallback)
npx drizzle-kit push            # 11 tables; seeding happens automatically on first read
npm run dev                     # http://localhost:3000
```

Gate chain (there is no hosted CI; the local gate is the only gate):

```bash
rm -rf .next && DATABASE_URL="postgresql://…" npm run build   # COLD (cache masks the scan-guard failure)
npm run typecheck && npm run typecheck:tests
npm run lint                                                   # 0 errors / 0 warnings
npm run test                                                   # 40/40
npm run test:e2e                                               # 18/18 (live Postgres for the journey)
```

Rootless PostgreSQL (no sudo): the `skills/rootless-postgresql` procedure —
`apt-get download` + `dpkg-deb -x` into a user prefix, `initdb` with the socket
inside the data dir, scram on TCP / trust on socket, lifecycle scripts. Adapt
prefix/port/role/db to the target sandbox (this cycle:
`/home/z/my-project/pg`, port 5432, `postgres`/`app_db` to match the pinned
URLs).

## 4. The Design System (CSS-First)

No `tailwind.config.js`. Tokens are literal hex in the `@theme` block of
`src/app/globals.css`:

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-brand` / `--color-brand-dark` / `--color-brand-ink` | `#0058a3` / `#004382` / `#003a6b` | Primary blue, hover, deep |
| `--color-accent` / `--color-accent-dark` | `#ffdb00` / `#e5c400` | CTAs, badges, selection, focus rings (always `#111` text) |
| `--color-paper` / `--color-cream` | `#f7f5f0` / `#faf8f4` | Warm neutrals |
| `--color-ink` / `--color-muted` | `#111111` / `#5b5b5b` | Text |
| `--color-line` | `#e5e1d8` | Hairlines |
| `--color-moss` / `--color-clay` | `#2e6b34` / `#b5502a` | In-stock / low-stock |

Typography: `"Arial Black"` display stack + `"Helvetica Neue"` body (no web
fonts — LCP posture). Arbitrary values in JSX are the house style
(`bg-[#f5f3ee]`, `text-[15px]`, `tracking-[0.16em]`); **slash-form aspect
values only** (`aspect-[16/9]`, never `aspect-[3:1]` — see §9). Hand-rolled
utilities: `focus-ring`, `reveal-up` (respects `prefers-reduced-motion`),
`no-scrollbar`.

## 5. Component Architecture & Patterns

Three layers, one golden rule — **every DB touch funnels through
`src/lib/server-data.ts`** (it owns the fallback contract and pricing truth; a
page importing `@/db` directly is an architecture violation):

```
Layer 0  src/db        schema.ts (11 tables) + index.ts (pooled client, globalThis singleton)
Layer 1  src/lib       server-data.ts · catalog.ts · cart-store.tsx · local-store.ts · utils.ts · mask.ts
Layer 2  src/components Header · Footer · ProductCard · BuyBox · ReviewSection (all "use client" except Footer)
Layer 3  src/app       20 page routes + 6 API handlers (all force-dynamic where data-driven)
```

Canonical patterns (full code in the PAD §3.3):

- **Degrade-fallback read** — `await ensureSeed(); try { db… } catch { return PRODUCTS… }`;
  the catch is empty by design (degradation is normal operation).
- **Idempotent single-flight seed** — module-level promise; `onConflictDoNothing`
  throughout; a failed seed resets the promise (retry next request).
- **Server-side money truth** — `placeOrder()` clamps qty 1–99, drops unknown
  products, re-derives subtotal/discount/delivery/GST; the route zeroes the
  client's `totals` field at the boundary.
- **API envelope** — `{ ok: true, data } | { ok: false, error: { code, message } }`
  on every route; codes (`VALIDATION`, `RATE_LIMIT`, `EMPTY_BAG`,
  `INVALID_PROMO`, `NOT_FOUND`, …) are stable contract points.
- **External-store client state** — see §6.

## 6. Client State — the External-Store Pattern (Task 114)

The React Compiler-era `react-hooks/set-state-in-effect` lint rule flags the
old "hydrate from localStorage inside an effect" pattern. The compliant
replacement, used for ALL persisted client state:

```ts
// src/lib/local-store.ts — factory (SSR-safe, quota-safe, corrupt-JSON-safe)
const store = createLocalStore<T>(key, fallback);   // subscribe / getSnapshot /
                                                    // getServerSnapshot / set
// consumer (src/lib/cart-store.tsx)
const lines = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
```

`useSyncExternalStore` handles the server/client hydration split natively
(server snapshot during SSR/hydration, client snapshot after mount — no
effect-setState, no hydration mismatch). Persistence keys: `nordhem_cart_v1`,
`nordhem_wish_v1`, `nordhem_promo` (JSON-encoded since the refactor),
`nordhem_store`. For params-derived page state use **adjust-during-render**
(`shop/`, `search/`, Header route-close): compare a prev-value state during
render and call setState in the conditional branch — the React-docs pattern.
Shop filters are URL-derived (`?cat=` + `?sort=` via `router.replace`) — the
same contract the header links already use.

## 7. Catalogue & Data Management

The static catalogue (`src/lib/catalog.ts`, ~160 lines) is **the seed AND the
fallback**: 24 products / 8 categories / 3 stores / 6 inspirations / 3 promos,
plus `findProduct` and `findPromo`. `findPromo(code)` is the single
client-side promo lookup for DISPLAY (cart + checkout previews); the server
re-validates every code against the `promotions` table (ADR-005 stands).
Schema highlights (`src/db/schema.ts`): money is `integer` cents;
`rating_avg` is `numeric(3,2)` (arrives as string over JSON — cards accept
`string | number`); `order_items` is a denormalized snapshot (orders survive
catalogue edits); 11 tables total. Inventory is seeded 3 rows/product
(tampines/jurong/alexandra) with `A12-B04`-style aisle bins; decrement on
checkout is best-effort, non-blocking.

## 8. Accessibility (WCAG 2.2 AA baseline)

Skip link; `aria-label`s on icon buttons; `role="tablist"` (shop category
chips), `role="radiogroup"` (delivery/payment/star rating);
`aria-live` on status regions; visible `focus-ring` (3px accent,
`:focus-visible` only); responsive to 360px; `prefers-reduced-motion`
disables the entrance animation and smooth scroll. The mobile drawer is a
non-modal inline panel that MUST close on Escape (keydown handler — pinned by
`tests/e2e/mobile-navigation.spec.ts`), on route change, and on toggle;
`aria-expanded` swaps the button's accessible name Open/Close menu (test with
a stable locator, not the name). Responsive double-DOM (two search inputs):
query with `.filter({ visible: true })` and beware substring role-name
matches ("Go" ⊂ "ERGONOMI").

## 9. Anti-Patterns & Common Bugs

1. **Colon-form arbitrary aspect values** (`aspect-[3:1]`) anywhere in the
   repo — Tailwind v4's candidate scan reads prose too; it once compiled to
   invalid `aspect-ratio: 3:1` and broke the clean build with PostCSS
   "Missed semicolon". The `@source not` guard at the top of `globals.css` is
   load-bearing; never remove it. A warm `.next` cache masks the failure —
   always build cold.
2. **Effect-body setState** (localStorage hydration, URL-param sync) — cascading
   renders + lint errors. Use the external store / adjust-during-render
   patterns (§6). Never suppress the rule.
3. **Trusting client totals** or floating-point money — `placeOrder()`
   re-derives; keep pricing logic in `src/lib/utils.ts`.
4. **Bare throws / silent catches at API boundaries** — always the envelope;
   read-fallbacks may catch silently (degrade), writes may not.
5. **Rendering PII on `/order/[number]`** — reachable by number alone;
   `maskEmail()` + no street address; full detail only behind the email match
   on `/track-order`.
6. **Listing robots-disallowed URLs in the sitemap** (or vice versa) — the
   policy is coherent by construction: sitemap = 12 indexable static + 24
   product + 6 room URLs; robots disallows `/cart`, `/checkout`,
   `/track-order`, `/order/`, `/wishlist`, `/search`, `/api/`. Both are
   unit-pinned (`tests/unit/robots-sitemap.test.ts`).
7. **Hardcoding promo display values in pages** — the old inline switch gave
   unknown codes a phantom 10% off. Use `findPromo()` (null for unknown).
8. **Forgetting `data-scroll-behavior="smooth"`** on `<html>` when CSS sets
   `scroll-behavior: smooth` — Next 16 warns in dev console.
9. **Unescaped JSON-LD** — `JSON.stringify(jsonLd).replace(/</g, "\\u003c")`
   before `dangerouslySetInnerHTML` (server-controlled values only).
10. **Letting the inherited ely-beauty artifacts back in** — the dead test
    tree and config-restorer scripts were retired in Task 114; pin new tests
    to THIS `src/`.

## 10. Debugging Guide

| Symptom | Root cause | Fix |
|---|---|---|
| Build: "Missed semicolon" in globals.css | Candidate scan read prose (a colon-form class) | Check the `@source not` guard; `rg "aspect-\[" --glob '!src/**'`; rebuild cold |
| Seed logs `SASL: client password must be a string` | Shell-exported `DATABASE_URL` (e.g. a `file:` URL) shadows `.env` | `env \| grep DATABASE`; pin per command |
| `/api/health` 500 with the DB up | Same env shadow, or PG not listening on the pinned port | `status_pg.sh`; verify the URL matches `drizzle.config.json` |
| Checkout 500 `CHECKOUT_FAILED` | Write path has no fallback — DB down/tables missing | Start PG, `drizzle-kit push`, confirm first-read seeding |
| e2e "strict mode violation" on nav links | Same accessible name in drawer + page + footer | Scope to `getByRole("banner")` / drawer locator |
| e2e locator vanishes after click | The accessible name swapped (Open/Close menu) | Anchor on a stable attribute (`header button[aria-expanded]`) |
| e2e count() returns 0 with content present | `count()` does not auto-wait | `await expect(locator.first()).toBeVisible()` first |
| Hydration mismatch warnings about `data-gr-ext-installed` | Browser extension injected attributes (Grammarly et al.) | Not a code bug — test headless |
| `tsc` clean but runtime import error under tests | Test tree not in the app tsconfig scope | `npm run typecheck:tests` (tsconfig.tests.json) |

## 11. Pre-Ship Checklist

```bash
rm -rf .next && DATABASE_URL=… npm run build
npm run typecheck && npm run typecheck:tests && npm run lint
npm run test && npm run test:e2e
git status   # no .env, *.key, db/*.db, test-results/, playwright-report/
```

Plus: changed surfaces verified at 390 and 1440; SEO surfaces re-pinned if
routes changed; screenshots refreshed for docs surfaces that changed;
README/AGENTS/CLAUDE/PAD/this SKILL + `worklog.md` updated in the same commit
(count lockstep: route/test/table counts are documentation claims).

## 12. Lessons Learnt (this lineage)

1. **The display-redaction layer lies.** A tool-output redactor once mangled
   `[msg` into `sg`, making a valid file look like a syntax error that
   contradicted a green gate. Verify exact bytes (hexdump/base64) before
   diagnosing "impossible" states.
2. **Shell env beats dotenv, always.** The ely-beauty lineage hit it
   (`DATABASE_URL=file:…` shadow); NORDHEM hit it again in the sandbox. Pin
   env per command in every server/e2e invocation and document the trap.
3. **A green gate can be stale.** `tsbuildinfo` and a warm `.next` cache can
   mask real failures — cold builds are the only truth (the scan-guard
   failure mode is cache-maskable by design).
4. **Fix lint debt by refactor, never suppression** — the 7
   `set-state-in-effect` errors took an afternoon to fix properly with a
   characterization e2e holding the behavior; the external-store pattern is
   now simpler than the old effect code.
5. **Write the spec's assumptions down in the spec.** The substring traps
   ("Go" ⊂ "ERGONOMI"), the accessible-name swap, and the non-waiting count()
   each cost a test run — the comments in the specs now teach the next agent.
6. **SEO policy must be single-sourced.** robots and sitemap drift
   independently unless a test pins their coherence (a URL in both is a bug).
7. **Order numbers are capability-ish.** `NH-YYYYMMDD-XXXXXX` is unguessable
   enough for a demo, but the public confirmation page still masks PII —
   defense in depth for a page reachable by URL knowledge alone.
8. **Retire dead code when the replacement lands.** The 88-file ely-beauty
   test tree and the config-restorer script were hazards
   (`ensure-build-configs.mjs` would have clobbered the new configs);
   "re-pinning" means writing NORDHEM-native specs, not keeping broken ones.

## 13. Pitfalls to Avoid

- Adding state/auth/payment SDKs without a decision record (ADR-006 deferrals
  are contracts).
- `next/image` conversions (no local pipeline; `<img>` + eslint-disable is
  the pattern).
- Editing `skills/` (vendored reference; excluded from checking/testing/compilation).
- Pushing without the cold-build gate, or with a key inside the repo (wrapper
  runbook: `docs/ssh_git_wrapper_v3.py` with the **mandatory** `--remote`
  override — its default still targets the predecessor repo).
- New branches (main only, Conventional Commits, atomic units).

## 14. Best Practices

- Route handlers: validate at the boundary, delegate to `server-data.ts`,
  wrap in the envelope, log with a route-prefixed `console.error`.
- Money/logic changes: TDD at the pure seam first (`priceTotals` etc. with
  WORKED examples from verified orders, not recomputed expectations).
- E2E against the production build; the webServer pins its own env.
- Keep helper modules small and pure (`utils.ts`, `mask.ts`, `local-store.ts`)
  — they are the unit-test surface.
- Screenshots for docs from the dev server, gate evidence from the build.

## 15. Coding Patterns (representative)

```ts
// Degrade-fallback read (server-data.ts)
export async function getAllProducts() {
  await ensureSeed();
  try { return await db.select().from(products).orderBy(products.id); }
  catch { return PRODUCTS.map((p, i) => ({ ...p, id: i + 1 })); }
}

// External store consumption (cart-store.tsx)
const lines = useSyncExternalStore(linesStore.subscribe, linesStore.getSnapshot, linesStore.getServerSnapshot);

// Adjust-during-render (search/page.tsx)
const [prevParamQ, setPrevParamQ] = useState(paramQ);
if (paramQ !== prevParamQ) { setPrevParamQ(paramQ); setQ(paramQ); }

// Money truth (placeOrder — the verified example)
// 259800 − 10% (25980) = 233820 ≥ 20000 → delivery 0; GST = round(233820×0.09/1.09) = 19306

// JSON-LD with escape (product/[slug]/page.tsx)
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
```

## 16. Coding Anti-Patterns (inverse of §15)

- `useEffect(() => setState(readLocalStorage()))` — the exact pattern §6 replaced.
- Inline promo-value switches in pages (use `findPromo`).
- Raw `JSON.parse` of client input without narrowing (`unknown` + checks).
- `any` (strict repo; use `unknown` + narrowing).
- Importing `@/db` from pages/components (Layer rule).

## 17. Responsive Breakpoint Reference

| Breakpoint | Surface |
|---|---|
| `< 768px` (md) | Mobile: hamburger + drawer (`lg:hidden`), inline mobile search (last in DOM), 2-col grids |
| `768–1023px` | Tablet: utility links + desktop search appear; hamburger + drawer still present (no category nav) |
| `≥ 1024px` (lg) | Desktop: category nav (`hidden lg:block`), store picker; hamburger/drawer unmount from the a11y tree |

Breakpoints in play: `sm` (640) spacing, `md` (768) search/utility, `lg`
(1024) nav/drawer switch. The drawer is conditionally MOUNTED (`{open && …}`)
— no classList toggling, so no Tailwind v4 dynamic-class purge risk.

## 18. Z-Index Layer Map

| Value | Element |
|---|---|
| `z-50` | Sticky `<header>` |
| `focus:z-[100]` | Skip-to-content link |

That is the entire map — no modals, no portals. Keep new overlays above 50
and below 100.

## 19. Color Reference (complete)

See §4 — plus one-off literals worth knowing: `#cc0008` (discount badges),
`#e5a000` (star ratings), `#e8f3e9`/`#2e6b34` (success tint/text),
`#fff4f4`/`#a00008` (error tint/text), `#f0f6fc` (selected radio card tint),
`#8fe388` (discount text on dark aside).

## 20. TypeScript Interface Reference (key shapes)

```ts
// src/lib/cart-store.tsx
interface CartLine { productId: number; slug: string; name: string; sku: string;
  imageUrl: string; unitPriceCents: number; qty: number }
// src/lib/utils.ts
interface TotalsInput { subtotalCents: number;
  promo?: { kind: string; value: number } | null;
  deliveryMethod: "delivery" | "click-collect" | "express" }
interface Totals { subtotalCents: number; discountCents: number;
  deliveryFeeCents: number; gstCents: number; totalCents: number }
// src/components/ProductCard.tsx — numeric(3,2) arrives as string over JSON
interface CardProduct { …; ratingAvg: string | number; … }
// API envelope (every route)
type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
```

## Appendix A — The Meticulous Approach (six-phase workflow)

ANALYZE (read everything, reproduce failures) → PLAN (smallest correct
verifiable plan) → VALIDATE (plan vs codebase/lockfile/schema) → IMPLEMENT
(small typed test-backed increments) → VERIFY (full gate chain + runtime
smoke + browser evidence) → DELIVER (atomic Conventional Commit to main,
docs lockstep, Verified/Reasoned/Assumed handoff). Full text in `CLAUDE.md`.

## Appendix B — Quick Reference Card

| Need | Path |
|---|---|
| Commands & gotchas | `AGENTS.md` |
| Architecture detail | `Project_Architecture_Document.md` |
| Decision record | `docs/implementation-plan.md` |
| Remediation plan + evidence | `docs/plans/2026-11-18-task114-remediation-plan.md` |
| Screenshots | `docs/screenshots/01…16-*.png` |
| SSH push runbook | `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` |
| Working history | `worklog.md` (Tasks 113–114 NORDHEM; 1–112 predecessor lineage) |
| Money/validators | `src/lib/utils.ts` |
| Catalogue + findPromo | `src/lib/catalog.ts` |
| DB seam + pricing truth | `src/lib/server-data.ts` |
| External store factory | `src/lib/local-store.ts` |
| PII masking | `src/lib/mask.ts` |
| SEO surfaces | `src/app/robots.ts` · `src/app/sitemap.ts` · PDP `generateMetadata` |
| Unit suite | `tests/unit/*.test.ts` (40) |
| E2E suite | `tests/e2e/mobile-navigation.spec.ts` · `tests/e2e/storefront.spec.ts` (18) |

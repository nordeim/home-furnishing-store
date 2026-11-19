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
| `npm run test` | Vitest unit suite (145 tests, pure seams: utils, catalog, local-store, mask, robots/sitemap + the env/compose/config, scan-guard, rate-limit factory, docs-counts pins incl. the PAD) |
| `npm run test:e2e` | Playwright e2e (97 tests) — builds + boots the production server on `:3100` with a pinned `DATABASE_URL` |
| `npx drizzle-kit push` | Apply `src/db/schema.ts` to the DB in `drizzle.config.json` (9 tables) |

The test suite is **NORDHEM-native** (Task 114; extended in Tasks 117–124):
`tests/unit` (9 files) + `tests/e2e` (mobile-navigation + storefront specs
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
gate).
The predecessor's 73-unit/15-e2e dead
tree was retired with it — do not resurrect ely-beauty specs; pin new ones to
this `src/`.

**Test counts are documentation claims, pinned by test** (Task 119):
`tests/unit/docs-counts.test.ts` fs-computes the real counts and fails the run
if any live-tense claim in AGENTS/README/CLAUDE/SKILL disagrees — change the
docs in the same commit as any test change (count-lockstep, no exceptions).

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
   `.env` file (dotenv never overrides). If the app connects to the wrong DB,
   pin the value per command: `DATABASE_URL="postgresql://…" npm run dev`.
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
npm run typecheck
npm run lint          # 0 errors expected (the 7-error lint debt was fixed in Task 114)
npm run test          # 145/145 unit
npm run test:e2e      # 97/97 e2e (needs a live Postgres for the checkout journey)
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

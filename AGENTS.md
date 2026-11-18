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
| `npm run test` | Vitest unit suite (40 tests, pure seams: utils, catalog, local-store, mask, robots/sitemap) |
| `npm run test:e2e` | Playwright e2e (18 tests) — builds + boots the production server on `:3100` with a pinned `DATABASE_URL` |
| `npx drizzle-kit push` | Apply `src/db/schema.ts` to the DB in `drizzle.config.json` (11 tables) |

The test suite is **NORDHEM-native** (Task 114): `tests/unit` (5 files) + `tests/e2e`
(mobile-navigation + storefront specs). The predecessor's 73-unit/15-e2e dead tree
was retired with it — do not resurrect ely-beauty specs; pin new ones to this `src/`.

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
   qty clamped 1–99); checkout has an in-process fixed-window rate limit
   (`throttled()` in `src/app/api/checkout/route.ts`).
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

## Inherited ely-beauty artifacts (historical, mostly retired in Task 114)

This repo was scaffolded from the `nordeim/ely-beauty` codebase. The Task 114
remediation retired the dead trees that could not compile against this `src/`:
the 73-file `tests/unit` + 15-spec `tests/e2e` (imported ~40 non-existent
modules), `scripts/capture-screenshots.ts`, `scripts/restore-demo-stock.ts`,
`scripts/measure-parity.mjs` and `scripts/ensure-build-configs.mjs` (its
CONFIG_FALLBACKS registry would have clobbered the NORDHEM test configs).

Still present, kept for provenance (do not treat as live):

- `ely-beauty_SKILL.md`, `worklog.md` (Tasks 1–112 predecessor lineage),
  `docs/*session*`/`docs/prompt-to-review-*`, the `docs/nordherm-*.zip` build
  archives — historical narrative of the predecessor project(s).
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
npm run test          # 40/40 unit
npm run test:e2e      # 18/18 e2e (needs a live Postgres for the checkout journey)
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

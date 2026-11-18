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
| `npm run lint` | ESLint (flat config; `skills/` is ignored per the operator contract) |
| `npm run typecheck` | `tsc --noEmit` over the **app scope only** (`src/**`, `next.config.ts`) |
| `npx drizzle-kit push` | Apply `src/db/schema.ts` to the DB in `drizzle.config.json` (11 tables) |

There is **no runnable test suite in this repo yet** — see "Inherited ely-beauty
artifacts" below before touching `tests/`.

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
6. **One store, no state library.** Cart + wishlist + promo live in a single
   React-context provider (`src/lib/cart-store.tsx`), persisted to `localStorage`
   (`nordhem_cart_v1`, `nordhem_wish_v1`, `nordhem_promo`, `nordhem_store`). Do not
   add Zustand/Redux for new client state; extend the context or use local state.
7. **`<img>` not `next/image`.** The codebase deliberately uses plain `<img>` with
   Pexels CDN URLs and per-line `eslint-disable-next-line @next/next/no-img-element`.
   Keep the pattern (no local image pipeline exists).
8. **No auth, mock payments — by design.** Family/Business flows are demo-grade (no
   passwords); payment methods (card/PayNow/GrabPay/Atome) are selectors only,
   flagged "Demo — no charge". This deferral is documented in
   `docs/implementation-plan.md`; don't "fix" it silently.

## Inherited ely-beauty artifacts (do not trust, do not run)

This repo was scaffolded from the `nordeim/ely-beauty` codebase. These files are
**leftovers from that project and do not compile against this `src/`**:

- `tests/unit/**` (73 files) and `tests/e2e/**` (15 specs) — import `vitest`,
  `@playwright/test` and ~40 modules (`@/lib/stripe-payment`, `@/components/store/*`,
  `@/lib/auth`, …) that do not exist here; `vitest`, `@vitejs/plugin-react` and
  `@playwright/test` are **not** in `package.json`/`package-lock.json`.
- `playwright.config.ts`, `vitest.config.ts`, `tsconfig.tests.json` — same origin;
  `tsconfig.json`'s include is scoped to the app precisely so these don't break
  typecheck/build.
- `scripts/capture-screenshots.ts`, `scripts/restore-demo-stock.ts` — import
  `@playwright/test` / `@prisma/client` / deleted paths. `scripts/generate-imagery.mjs`,
  `gen-gallery-variants.mjs`, `ensure-build-configs.mjs` are from the same lineage
  (ensure-build-configs still works as a config-restorer).
- `ely-beauty_SKILL.md`, `worklog.md` (Tasks 1–112), `docs/*session*`, the
  `docs/nordherm-*.zip` build archives — historical narrative of the predecessor
  project(s), kept for provenance. `docs/ssh_git_wrapper_v3.py` and
  `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` are live tooling (below).

If a future run re-establishes the test harness, re-pin these suites to the NORDHEM
codebase (the family precedent is re-pinning, not deleting). Until then, do not wire
them into gates.

## Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck
npm run lint
```

There is no hosted CI; the local gate is the only gate. Current known lint debt: 7
`react-hooks/set-state-in-effect` errors in `src/` (the intentional localStorage
hydration + URL-param sync patterns) — documented in the PAD's Known Issues; fix via
`useSyncExternalStore`/render-derivation together with a test re-pin, not by
suppressing the rule.

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

# Task 118 Remediation Plan — Lineage-Drift Guard, Dev-Hydration Trap, Honesty & API-Boundary Cycle

Date: 2026-11-18 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: fresh-clone re-audit per `skills/web-application/SKILL.md` (§14–§16, §18–§20)
with the mobile-navigation + Tailwind v4 taxonomies from the family skill line
(agent-browser + Playwright probes at 390×844 / 768×900 / 1440×900), reference
patterns from `nordeim/homenest-store-s` (same stack family; its v4 trap log and
pinned-env e2e posture), execution per `skills/tdd` (red → green, one seam at a
time). `skills/` excluded from checking/testing/compilation (operator contract).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 on 127.0.0.1:5432, postgres/app_db)

| Gate | Result |
|---|---|
| Cold `npm run build` | GREEN — **29 routes**; the operator's new root-level files (docker-compose.yml, infrastructure/) do NOT break the Tailwind v4 candidate scan (verified cold, no colon-form class-like strings in them) |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run test` (Vitest) | 50/50 |
| `npm run test:e2e` (Playwright, production build :3100, live DB) | 23/23 |
| Seed after first read | 24/8/72/5/3/6/3 rows — matches the documented contract |
| Mobile drawer taxonomy (agent-browser AND Playwright, dev :3000 @390×844) | open / navigate+auto-close / Escape / toggle-close / hamburger-hidden-≥1024 ALL pass — **no Tailwind v4 bug** (conditional mount, zero colon-form values, scan guard intact) |
| SEO surfaces | robots 7 disallows + sitemap pointer; sitemap 42 indexable URLs; PDP canonical/OG/JSON-LD verified in raw HTML |
| **NEW dev-mode finding** | `next dev` on :3000 opened via **127.0.0.1** rendered but **never hydrated** (no `__react*` fibers on body; drawer/cart/search dead; `self.__next_f` reset to an empty array by the RSC client after the HMR handshake is dropped). Server log: `⚠ Blocked cross-origin request to Next.js dev resource /_next/hmr from "127.0.0.1"` → Next 16 `allowedDevOrigins`. Invisible to every existing gate because the e2e suite boots the production build (no HMR). Fix applied: `allowedDevOrigins: ["127.0.0.1"]` in next.config.ts; hydration probe GREEN after restart; full drawer taxonomy re-verified on dev |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence)

### F-1 HIGH — Dev server never hydrates when opened via 127.0.0.1 (allowedDevOrigins)
Evidence: `/tmp/dev-server.log` cross-origin block notice; Playwright probe
`HYDRATED: false` at t+2/5/10/20s on `http://127.0.0.1:3000/`; agent-browser
clicks on the hamburger had zero effect; `self.__next_f` array(0) after load.
Root cause: Next 16 blocks the `/_next/hmr` websocket when the browser origin
host (127.0.0.1) differs from the dev-server banner host (localhost); the RSC
client then discards the inline flight payload and waits forever.
Fix (ToDo-1): `allowedDevOrigins: ["127.0.0.1"]` in `next.config.ts` (**applied
and verified this run** — probe GREEN, taxonomy re-verified). Pin it with a
unit test so a future cleanup cannot silently delete the entry; document as
AGENTS.md gotcha + README troubleshooting row.

### F-2 HIGH — Operator's .env.example replacement does not match this codebase
Evidence: commit 457324b replaced the Task-117-verified single-variable
`.env.example` with a 52-line homenest-store-s/"Maison"-lineage file: active
`NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET=""` (`homenest_session` cookie — no auth
here), `STRIPE_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`/
`STRIPE_WEBHOOK_SECRET` (mock payments only), `TRUST_CF_CONNECTING_IP`
(Cloudflare posture — the real limiter keys on `x-forwarded-for`), `STRIPE_BDT_PER_USD`
("taka"/"poisha" — Bangladesh market). Its own header still says "the only
variable the codebase reads" is DATABASE_URL (README: "There is no AUTH_SECRET
… NEXT_PUBLIC_SITE_URL is not read by this codebase"). None of the 8 extra
variables is read by `src/`.
Fix (ToDo-2): restore the codebase-accurate single-variable contract (the
e32fb62 content, re-verified against `src/db/index.ts` this run). Pin with
`tests/unit/env-example.test.ts` (asserts exactly one active variable; asserts
the lineage strings are absent) so the class of drift cannot silently recur.
The operator instruction this cycle explicitly requires ".env.example that
matches the codebase".

### F-3 MEDIUM — docker-compose.yml describes a different architecture (Redis, Stripe, Adminer)
Evidence: services `redis` ("rate limiting, idempotency keys" — no Redis
anywhere in `src/`), `stripe` (forwards to `/api/webhooks/stripe` — route does
not exist; payments are mock selectors), `adminer`. Only the postgres service
matches this codebase (postgres:17, app_db/postgres/postgres, :5432 — aligned
with drizzle.config.json).
Fix (ToDo-3): align to the codebase — postgres-only compose (same credentials/
port/healthcheck), honest header comments, no init-script mount. Keep it as
the documented docker path for the database (DEPLOYMENT.md gains the option).

### F-4 MEDIUM — infrastructure/postgres/init/00-create-extensions.sql is foreign-lineage
Evidence: header says "Maison"; creates `pgcrypto` ("gen_random_uuid() used in
all uuid primary keys" — schema.ts uses `serial` integer PKs, zero uuid) and
`pg_trgm` ("fuzzy text search, Phase 1" — search is ilike substring matching).
No extension is required by `src/db/schema.ts` (verified full read).
Fix (ToDo-4): delete `infrastructure/` and the compose init mount. Pin absence
in the new env/infra contract test (lineage-drift guard).

### F-5 MEDIUM — PDP renders duplicate badge chips (Task-117 fix incomplete rollout)
Evidence: `src/app/product/[slug]/page.tsx:104-108` — computed `NEW` + `-{discount}% NOW`
chips plus raw `p.badges.map(...)`; `nordlys` carries `["-24%"]` (computed 24) →
renders the discount twice; `daun`/`hygge` carry `["New"]` with `isNew` → NEW twice.
`visibleBadges()` exists (utils.ts) but was wired only into ProductCard.
Fix (ToDo-5): consume `visibleBadges` on the PDP. RED e2e: nordlys PDP shows
the literal `-24%` chip 0 times (computed chip covers it); solbakken keeps
"Bestseller" while dropping its `-19%` literal.

### F-6 MEDIUM — reviews POST: valid-but-unknown productId is an FK-crash 500, contradicting the route's own comment
Evidence: `src/app/api/reviews/route.ts:49-51` comment claims non-existent ids
are a 422 client error, but only `productId <= 0`/non-integers are rejected;
`productId: 999` reaches `db.insert` → FK violation → 500 REVIEW_FAILED.
Fix (ToDo-6): existence check against the products table before insert → 422.
RED e2e: POST productId 999 → 422 (currently 500).

### F-7 MEDIUM — False marketing claims: "up to 30% off" and "stackable promo codes"
Evidence (3 sites): `src/app/offers/page.tsx:19`, `src/app/page.tsx:28`,
`src/components/Header.tsx:67`. Max catalogue discount is **24%** (NORDLYS:
16900→12900 — computed this run). Promo codes are single-code-only
(`cart-store.tsx` `promoCode: string | null`; `placeOrder` validates one code;
no stacking path). "Bundle & save" implies bundle pricing that does not exist
(items listed at full price).
Fix (ToDo-7): honest copy — "Up to 24% off", drop "stackable", reword the
bundle section as starter picks + FLAT20's true rule ($20 off ≥$250).

### F-8 MEDIUM — Untitled reviews get the headline "Verified review" while verified=false
Evidence: `src/components/ReviewSection.tsx:49` — `r.title || "Verified review"`;
all user-submitted reviews are inserted with `verified: false`
(`api/reviews/route.ts:56`), so a fresh untitled visitor review shows a
"Verified review" headline it does not earn.
Fix (ToDo-8): render the headline only when a title exists.

### F-9 MEDIUM — MAKAN15 label says "dining collections" but applies to the whole basket
Evidence: `src/lib/catalog.ts:140` label "15% off dining collections over $400";
`validatePromo` checks only `minSubtotalCents` — no category restriction
anywhere. A $400 bedroom order gets 15% off everything.
Fix (ToDo-9): honest label "15% off orders over $400" (single source: catalog.ts;
update the seeded row in the live DB to match; fresh seeds get it automatically).

### F-10 MEDIUM — JSON-LD hardcodes availability InStock regardless of actual stock
Evidence: `src/app/product/[slug]/page.tsx:63`. The same page's BuyBox can show
all stores out of stock (inventory decrements per order) or the honest
"stock information unavailable" degrade state, yet structured data asserts
InStock to crawlers.
Fix (ToDo-10): derive from `p.stockTotal > 0` (the catalogue/DB aggregate).
Pin in the existing PDP e2e spec (availability URL present for a stocked PDP).

### F-11 MEDIUM (docs) — DEPLOYMENT.md gate counts stale: "40/40 unit · 18/18 e2e" (actual 50/23, changing this cycle)
Evidence: `docs/DEPLOYMENT.md:320-321` (Task 115 revision never swept after
Task 117's test additions). Also §1 "nothing else… no Redis" now drifts against
the operator's (mis)aligned docker-compose before ToDo-3 fixes it, and §3's
`cp .env.example .env` copies a file that lists unread variables (before
ToDo-2 restores it).
Fix (ToDo-11): sweep counts to the new totals, document the docker-compose
option (postgres-only), re-verify the env-contract wording.

### F-12 LOW — globals.css cites a scan-guard test that does not exist
Evidence: `src/app/globals.css:3` — "pinned by tests/unit/tailwind-scan-guard.test.ts";
the tests tree has no such file (Task 114 retired the predecessor tree with it).
Fix (ToDo-12): create the pin (unit test asserting the `@source not` guard
lines exist in globals.css — the AGENTS gotcha #1 guard becomes regression-
pinned) rather than editing the comment out.

### F-13 LOW — Failed promo apply wipes a previously applied valid promo
Evidence: `src/app/cart/page.tsx:43` — `catch (e) { setPromo(null); … }`. A user
with WELCOME10 applied who typos a code (or hits a transient fetch failure)
silently loses the discount; the error copy says nothing about the removal.
Fix (ToDo-13): keep the applied promo on failure; add a small "Remove" button
beside the applied code (preserves the remove path). RED e2e: apply WELCOME10 →
type an invalid code → error shows AND the Discount row survives; Remove clears it.

### F-14 LOW — Dead exports in utils.ts; the correct star renderer is the dead one
Evidence: `stars()` (utils.ts:85) zero call sites — `ProductCard.tsx:24` and
`product/[slug]/page.tsx:112` inline `Math.round`, so a 4.5 avg renders 5 full
stars while the aria-label truthfully says 4.5. `clampInt()` (utils.ts:17) zero
call sites (unit-tested dead); `cn()` (utils.ts:125) zero call sites anywhere.
Fix (ToDo-14): wire `stars()` into both render sites (half-star display —
fixes the rounding inaccuracy); use `clampInt` for the checkout route's line
validation (see F-17); remove `cn` (unreferenced, untested).

### F-15 LOW — /order/[number] decodes outside its try/catch
Evidence: `src/app/order/[number]/page.tsx:14` — `decodeURIComponent(number)`
before the try; `/order/%ZZ` throws URIError → error page (500-class), not the
friendly not-found state.
Fix (ToDo-15): decode inside the try (malformed → the existing not-found UI).

### F-16 LOW — /api/orders/track returns the full order row (phone, street address) where the page uses 5 fields
Evidence: `server-data.ts:229-233` returns the whole row; the track-order page
renders orderNumber/fullName/status/deliveryMethod/deliverySlot/storeSlug/
totalCents + items only. The requester already matched the email (fail-closed),
so this is data-minimization, not a third-party leak — but the envelope ships
`address`/`postal`/`phone` needlessly.
Fix (ToDo-16): map the route response to the fields the page consumes
(e2e journey pins page-rendered text only — verified this run).

### F-17 LOW — checkout route does not validate per-line productId/qty shape
Evidence: `api/checkout/route.ts:32` casts lines without per-line validation; a
crafted `qty: NaN` bypasses placeOrder's `Math.min/max` (NaN propagates) →
PG error → 500. Client always sends clamped ints (BuyBox input clamps 1–99).
Fix (ToDo-17): per-line validation using the existing `clampInt` seam —
non-finite/absent qty or productId → 422 VALIDATION. (Also turns F-14's dead
`clampInt` into live, already-tested code.)

### F-18 LOW — Rate-limit coverage inconsistent on write/lookup boundaries
Evidence: checkout + reviews enforce 20/min/IP; `/api/orders/track` (the PII
lookup) and `/api/promotions/validate` (a Postgres read per call) have no
limiter. The Task-117 plan itself noted the track limiter was owed.
Fix (ToDo-18): same fixed-window limiter on both routes. RED e2e: 21 rapid
requests → 429.

### F-19 INFO — BuyBox aria-live sits on the static stock list, not the add-to-bag confirmation
Evidence: `BuyBox.tsx:41` — the stock list never changes client-side; the
"✓ Added to bag" state change (line 37) is silent to screen readers.
Fix (ToDo-19): drop the inert aria-live from the stock list; sr-only live
region announcing the added state.

### F-20 INFO — Universal "10-yr warranty" chip contradicts per-product warranty claims
Evidence: `product/[slug]/page.tsx:95` — the trio cell says 10-yr for every
product while ERGONOMI claims 12-yr and MODUL 25-yr in catalogue copy.
Fix (ToDo-20): replace the middle cell with universally-true content
("Assembly from $25" — already documented on the same page's delivery section).

Deferred (ledger, no code change): Header store picker is decorative (L5 —
nothing reads `nordhem_store` outside Header; wiring it to BuyBox would be
new feature work); aggregateRating/ratingCount JSON-LD + visible counts are
documented demo fiction (I3 — invented-content stance); localStorage payload
shape validation (I5); per-product warranty field (I2 remainder).

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| `tests/unit/env-example.test.ts` (new) | unit | .env.example lineage drift (unread variables), compose architecture drift, infrastructure/ resurrection, allowedDevOrigins removal |
| `tests/unit/tailwind-scan-guard.test.ts` (new) | unit | silent removal of the `@source not` candidate-scan guard |
| PDP badge dedupe (nordlys/solbakken) | e2e | the literal duplicate chip ever returning |
| reviews unknown productId → 422 | e2e | the FK-crash 500 class |
| track + promo rate limit → 429 | e2e | unthrottled PII lookup / DB-bound validation |
| cart promo persistence + Remove | e2e | the silent discount wipe on failed apply |
| JSON-LD availability (existing PDP spec, added assertion) | e2e | hardcoded InStock regressing |
| stars()/clampInt() wiring | existing 50 unit | behavior-preserving (stars/clampInt already unit-pinned) |

## 4. Execution order (vertical slices, red → green each)

1. Unit RED: env/infra contract test + scan-guard test → apply ToDo-2/3/4
   (env.example restore, compose alignment, infrastructure removal) → GREEN.
2. E2E RED: PDP badge dedupe + reviews 422 + track/promo 429 + cart promo
   persistence specs → implement ToDo-5/6/18/13 → GREEN.
3. Honesty slice (ToDo-7/8/9/10/20): copy + JSON-LD + label; PDP e2e assertion
   for availability added; existing journey stays exact (money untouched).
4. Code-quality slice (ToDo-14/15/16/17/19): stars/clampInt wiring, cn removal,
   decode guard, track response mapping, line validation, BuyBox aria-live.
5. Docs lockstep (ToDo-11 + count-lockstep): AGENTS (gotcha #11 + counts),
   CLAUDE (testing + env notes), README (troubleshooting row, env table,
   status table, current-cycle paragraph, compose mention), DEPLOYMENT (counts,
   compose section), PAD revision block + known-issues register, worklog Task
   118, SKILL.md refresh (distill skills), this plan archived.
6. Full gate: lint → typecheck → typecheck:tests → unit (56 expected) →
   cold build (29 routes) → e2e (27 expected) → dev-server screenshots for
   changed surfaces into docs/screenshots/.
7. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py`
   with the mandatory `--remote` override.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and was read in full this run (directly or via
  the Explore-agent audit with line-level evidence re-verified by me).
- Max catalogue discount computed from `catalog.ts` = 24% (NORDLYS) — the
  honest copy number.
- The e2e journey pins page-rendered text only (read in full); F-16's response
  mapping and F-5's PDP changes cannot break it (money untouched; Promo label
  asserted by code, not label text).
- The new unit tests read files at repo root (fs) — no app imports needed;
  the scan-guard test reads globals.css the same way robots/sitemap tests
  import route modules.
- `allowedDevOrigins` is a documented Next 16 config key (Next ≥15.3); the dev
  server log itself prescribed the exact fix this run.
- docker-compose postgres service keeps the operator's credentials/port —
  zero drift with drizzle.config.json; removal of redis/stripe/adminer matches
  the "no Redis, no Stripe, mock payments" documented architecture.
- No new runtime dependencies; no schema changes; no new env variables the
  code reads; `.env.example` restored to the verified single-variable contract.
- Count-lockstep sites for the new totals (56 unit / 27 e2e): AGENTS.md,
  CLAUDE.md, README.md, DEPLOYMENT.md, SKILL.md, PAD — all in the same commit
  as the test change.

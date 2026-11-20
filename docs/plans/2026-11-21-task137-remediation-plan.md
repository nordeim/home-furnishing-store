# Task 137 Remediation Plan — PDP Reviews-Outage Signal Unification, Cart-Promo Envelope-Trust Completion, Outage-Branch Pin Coverage, Shop-Strip Honesty, Docs Truth

Date: 2026-11-21 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` (git pull → `1e5e244` = Task-136 `c0b100b` + the session_38 narrative; node_modules + .env + the pinned Playwright Chromium 1255 all survived the recycle — no reinstall needed). Rootless PostgreSQL 17.12: the data dir SURVIVED the recycle WITH the postmaster process still alive (PID 1535 serving, but its postmaster.pid had been my removal target); handled by a clean SIGTERM smart-shutdown + fresh `pg_ctl start` so the pid file and the process agree — then the 9-table DDL contract + seed quantities verified by direct SQL before any gate: 4 named indexes (`orders_idempotency_key_unique`, `orders_order_number_unique`, `inventory_product_store_uq`, `reviews_product_idx`), seed 24/8/3/72/5/0/0/6/3, inventory 1379 = the formula, zero residue. One environment trap handled pre-gate: an exported shell `DATABASE_URL` (a previous session's SQLite leftover) silently overrode `.env` — gotcha #10, unset + pinned per command. Mobile-navigation + Tailwind v4 taxonomies re-run on the dev server via 127.0.0.1 (agent-browser drawer taxonomy at 390×844 + 1440×900 — 8/8 PASS: open (aria-expanded=true, label toggles) / navigate+auto-close / the F-7 param-close regression / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) / hydration (`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item") / no horizontal overflow at 390px — **no Tailwind v4 bug**; the CSS-first `@theme` posture + the candidate-scan guard re-verified in `globals.css`; all `aspect-[…]` usages slash-form). Sitemap/SEO re-verified live: 42 indexable URLs no lastmod; robots 7 disallows coherent; og:image 1200×627 on home; noindex on the order page + all five utility routes; the 404 surface branded ("This page went flat-pack") + 404 status; the security-header set present (nosniff, DENY, strict-origin-when-cross-origin, HSTS) with no `x-powered-by`. Reference repo `homenest-store-s` cross-checked: **quiescent — HEAD still `4771c3d`, zero src/tests changes after `ff65bd2`** — the thirteenth cycle of "nothing to port". The vitest/playwright suites exist and are wired (`vitest.config.ts` + `tsconfig.tests.json` + `playwright.config.ts` :3100 production webServer; 186/130 baseline green); this cycle EXTENDS them with the new pins below (the config files need no modification — the suites are the repo's own). Execution per `skills/tdd` (red → green, one seam at a time; honest-RED by temporary mutation for every GREEN-on-arrival pin). `skills/clone-app-pat-pro` was considered and set aside — it is a pixel-clone Chrome-extension workflow, not applicable to a remediation cycle (the mobile-nav taxonomy ran via agent-browser instead). `skills/` excluded from checking/testing/compilation (operator contract).

## 1. Audit baseline (all Verified this run)

| Gate | Result |
|---|---|
| git pull → `1e5e244` (Task-136 `c0b100b` + session_38) | clean tree |
| Rootless PostgreSQL 17.12 (clean restart discipline — see Method) | up; DDL contract + seed verified (24/8/3/72/5/0/0/6/3, inventory 1379, zero residue) |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 186/186 |
| `npm run test:e2e` (Playwright, cold production build :3100) | 130/130 |
| DB residue after the full e2e run | ZERO (orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) |
| Mobile drawer taxonomy (agent-browser @390×844 + 1440×900) | 8/8 PASS — no Tailwind v4 bug |
| Full-tree audit | two audit agents (deep code + docs-truth); every actionable finding re-verified at line level by me (the lesson-46 discipline) |

## 2. Findings → ToDo (ordered by severity; every code finding carries file:line evidence re-verified this run)

### F-1 MEDIUM — the PDP reviews-outage signal is SPLIT, not unified: the partial-outage branches render contradictory content and a JSON-LD the page cannot back
Evidence (line-verified): `src/app/product/[slug]/page.tsx:43` — `getReviews` and `getReviewCount` degrade INDEPENDENTLY (separate try/catch in `server-data.ts:112-144`; a transient per-query failure — pool exhaustion, `query_timeout` — can hit one and not the other). The page ORs the two nulls into `reviewsUnavailable` (`:49`) but then each consumer trusts only its own signal:
- **reviews ok, count null** → `reviewList` (`:50`, `reviews ?? []`) is the LIVE list; the page passes it as `initial` (`:208`) so `ReviewSection.tsx:62` renders "Reviews are unavailable right now — please try again in a moment" DIRECTLY ABOVE the live reviews (`:64` renders the list unconditionally) — contradictory content.
- **reviews null, count ok** → empty list + unavailable note, but the JSON-LD gate at `page.tsx:85` (`reviewCount !== null && reviewCount > 0`) publishes `aggregateRating` WITH the count while the visible page says reviews are unavailable — violating the repo's own Task-121 F-6 rule quoted verbatim in the comment at `:81-84` ("never publish an aggregateRating the page cannot back").
- **recovery corner** → under `unavailable`, a successful POST (`ReviewSection.tsx:41-42`) prepends the new review BELOW the stale unavailable note and the heading never shows any count (the note is frozen at SSR).
Fix (ToDo-1): unify the signal — one rule, both consumers key on the COMBINED signal: (a) JSON-LD `aggregateRating` gates on `!reviewsUnavailable && reviewCount > 0`; (b) the section's `initial` passes `reviewsUnavailable ? [] : reviewList` (the note never renders above a live list); (c) `ReviewSection` tracks the unavailable state as recoverable client state (`useState(!!unavailable)`, flipped `false` on a successful POST — the heading resumes its count claim and the note unmounts when the DB has provably recovered). Pin: two fs-pins (the established vehicle for DB-touching branches that cannot be driven by a dead-DB e2e — the Task-131 F-2 precedent). TRUE RED today (the tree has the split-signal forms).

### F-2 MEDIUM — the cart's promo-apply consumer is the FOURTH envelope-trust laggard (the Task-135/136 class, one POST sibling short)
Evidence (line-verified): `src/app/cart/page.tsx:59-62` — `if (!json.ok) throw` then `setPromo(c)` + `setApplyMsg({ ok: true, text: \`${c} applied — ${json.data?.label ?? "discount"}\` })`. A well-formed `200 {ok:true}` body WITHOUT `data` (the exact class Task 135 F-5 closed on wishlist/search and Task 136 F-1 on the shop grid) is treated as SUCCESS: the code is persisted into `nordhem_promo` and the false "X applied — discount" message renders with `role="status"`. Every other POST consumer gates on data presence (`checkout/page.tsx:69`, `track-order/page.tsx:31`, `ReviewSection.tsx:37` — the audit's cross-check). The discount preview itself stays gate-correct (locally derived), so impact is bounded — but the false-applied claim + persisted code is the same dishonesty class the last two cycles closed.
Fix (ToDo-2): mirror the one-line gate — `if (!json.ok || !json.data) throw new Error(json.error?.message ?? "Could not verify code")`. Pin: one NEW e2e probe (route.fulfill `200 {ok:true}` no `data` on `**/api/promotions/validate*`, bag loaded, apply → assert the alert-role failure message + NO "Remove code" button + no applied copy). TRUE RED today.

### F-3 LOW — the Task-136 outage branches carry NO pins: a regression that swaps outage for not-found (or vice versa) ships through every gate green
Evidence (line-verified): `tests/unit/server-data.test.ts` pins the funnel importers, the reviews null-degrades and the in-tx promo re-read — but NOT `getOrderByNumber`'s outage-vs-not-found discrimination (`server-data.ts:480-485`: `err instanceof URIError → null; else → "outage"`), NOT `submitReview`'s delegation from the route, and no pin anywhere on the render branches the seams own: the order page's outage copy ("We can't check orders right now", `order/[number]/page.tsx:36`), the PDP's unavailable note ("Reviews are unavailable right now", `ReviewSection.tsx:62`), the reviews-GET `DB_DOWN` envelope (`api/reviews/route.ts:34-35`). A regression returning `null` instead of `"outage"` on DB failure would render the FALSE "We can't find that order" verdict (the Task-122 F-4 class) with every gate green.
Fix (ToDo-3): characterization fs-pins (GREEN-on-arrival — honest-RED by temporary mutation for each, the Task-131 F-2 discipline): (a) the seam's catch discriminates `URIError` → `null` from everything-else → `"outage"`; (b) the four outage surfaces carry their shipped copy/envelope (order outage copy, PDP unavailable note, reviews-GET DB_DOWN, submitReview delegation).

### F-5 LOW — the shop strip quotes a stale product count above the error state (the wishlist-heading honesty sibling)
Evidence (line-verified): `src/app/shop/shop-inner.tsx:123` — `{items.length} products · prices include …` renders unconditionally; during the error state (incl. the Task-136 envelope-error path) `items` still holds the PREVIOUS view's rows, so the strip quotes a count the error box below disavows. The wishlist heading received exactly this honesty treatment (Task-130 F-8); the shop strip did not.
Fix (ToDo-4): suppress the count claim under `loading || error` (the GST/free-delivery copy is static truth and stays): the strip renders `\`${items.length} products · …\`` only when the view is settled, else the static tail without the count. Pin: extend the existing Task-136 shop-grid envelope probe with the strip assertion (no `\d+ products` text under the error state). TRUE RED today.

### F-4 / F-6 INFO — evaluated and kept (registered, no action)
- **F-4** — `src/components/BuyBox.tsx:39-41` component-local qty clamps still use the inline `Math.max(1, ·)`/`Math.min(99, ·)` literals. Verified unreachable as a bug: the setters are NaN-safe (`Number(x) || 1`) and every cart write re-clamps through `clampInt` in `addLine`. Register for awareness; the display-stepper tier is outside the store-writer fs-pin's class by design.
- **F-6** — `src/lib/server-data.ts:443-445` the order-number-collision retry's own idempotency-violation sub-path propagates raw (astronomically narrow concurrent-same-key-winner-inside-retry window). The comment documents the one-retry-may-500 posture. Awareness only.

### Docs findings — ZERO
The docs-truth audit re-verified all live-tense claims across the six operator docs (AGENTS/README/CLAUDE/PAD v1.21.0/SKILL v2.10.0/DEPLOYMENT) against fs-computed reality: test counts 186/130/10/2, gotoHydrated 43+2, health body, pin-map rows, behavioral spot-checks, the standing deferral register, the session narratives — **all consistent; no corrections required this cycle beyond the count-lockstep sweep that accompanies the new tests below.**

### Evaluated and kept (deferrals — documented, unchanged)
The standing register (ssh-wrapper default remote, drizzle.config.json local URL, auth/payments deferral, per-process rate limiter, CSP, jsdom layer, store-picker wiring, unthrottled GETs, wishlist full-catalogue fetch, ratingValue catalogue fiction, orderNumber retry-wiring, wishlist refetch window + shop-strip sibling, the raw malformed-percent platform-500 class, ensureSeed reviews-only partial-seed window, the checkout slot-options render-time clock read) — verified present in the docs, unchanged.

## 3. Test seams + execution order (TDD — RED observed before every behavior change; mutation-honest RED for every GREEN-on-arrival pin)

| Slice | Finding | Seam | RED vehicle | GREEN change |
|---|---|---|---|---|
| A | F-1 | PDP unified reviews-outage signal | fs-pin #1: the JSON-LD `aggregateRating` gate + the `initial` suppression key on the combined signal — TRUE RED (the tree has the split forms) | `!reviewsUnavailable && reviewCount > 0` gate; `initial={reviewsUnavailable ? [] : reviewList.map(…)}` |
| A' | F-1 | ReviewSection recovery state | fs-pin #2: the section's unavailable prop becomes recoverable client state flipped on a successful POST — TRUE RED | `useState(!!unavailable)` + flip `false` in the submit success path; render gates read the state |
| B | F-2 | cart promo-apply envelope trust | NEW e2e probe (route.fulfill `200 {ok:true}` no data; assert alert + no Remove button + no applied copy) — TRUE RED | `if (!json.ok || !json.data) throw … "Could not verify code"` |
| C | F-3 | outage-branch characterization | fs-pin #3: `getOrderByNumber`'s catch discriminates URIError→null vs else→"outage" — GREEN-on-arrival → honest-RED by temporary mutation | none (pinning shipped behavior) |
| C' | F-3 | outage surfaces | fs-pin #4: the four surfaces carry their shipped copy/envelope (order outage copy, PDP unavailable note, reviews-GET DB_DOWN, submitReview delegation) — GREEN-on-arrival → honest-RED by temporary mutation | none (pinning shipped behavior) |
| D | F-5 | shop strip honesty | extend the Task-136 shop-grid envelope probe: assert no `\d+ products` strip under the error state — TRUE RED | suppress the count claim under `loading \|\| error` |

Order: A → A' → B → D (code + pins), then C/C' (characterization pins + mutation demos), then the full gate (cold build, lint, typechecks, unit ×3 TZ, e2e, residue), then the docs lockstep sweep, then screenshots (100–104), `.env.example` re-verification, session_39 log, worklog entry, commit + push.

Expected count deltas (fs-verified after the code slices, before the docs sweep): unit 186 → **190** (+4 fs-pins, all landing in `tests/unit/server-data.test.ts`); e2e 130 → **131** (+1 the cart promo-apply envelope probe). One new `gotoHydrated` call site in storefront.spec.ts (the promo probe navigates through it) → **44 storefront (46 across both files)** — the AGENTS/CLAUDE counts sweep with it. Unit files stay 10; e2e specs stay 2.

## 4. Verification gate (before every commit/push)

```bash
rm -rf .next && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run build
npm run typecheck && npm run typecheck:tests
npm run lint                # 0 errors expected
npm run test                # 190/190 unit (TZ=UTC host)
TZ=Asia/Singapore npm run test       # 190/190 — the three-TZ discipline
TZ=America/New_York npm run test     # 190/190
npm run test:e2e            # 131/131 (cold; live Postgres)
# + direct SQL residue check: 0 orders, 0 order_items, 5 reviews, 72 inventory rows at seed quantities (1379)
```

## 5. Post-execution addendum (what the execution itself discovered — recorded for the audit trail)

- **The F-2 probe's first alert assertion was WRONG and the RED re-observed
  honestly.** `page.getByRole("alert").first()` matched Next.js's own route
  announcer (the a11y element that always carries `role="alert"` — the Task-120
  spec's documented NB: "Next's own route announcer also carries role=alert"),
  so the first assertion PASSED on the pre-fix tree (a false green on the wrong
  element) while the failure surfaced at the second assertion instead. The
  corrected probe scopes to `aside p[role=alert]` (the promo message element,
  the Task-120 spec's own locator pattern); the TRUE RED was then re-observed
  at the right assertion with the exact false state in the snapshot
  ("WELCOME10 applied — discount" + the Remove code button — the code was
  persisted). The plan's probe design was amended in place before commit.
- **One mutation-restore mishap during the F-3 demos, corrected with
  exact-context restore.** The third demo (DB_DOWN→VALIDATION) was restored
  with a first-match replace — but the reviews route carries OTHER legit
  `"VALIDATION"` occurrences (the POST boundary's error codes), so the restore
  flipped the wrong pair, leaving the GET's 422 refusal stamped DB_DOWN and
  the outage envelope stamped VALIDATION. Caught immediately by `git diff`
  review, corrected with exact-context (message-string-scoped) replaces, and
  the file verified **byte-identical to HEAD** (empty diff) with the full pin
  set re-run green afterwards.
- **Count deltas landed exactly as planned**: unit 186 → **190** (+4 fs-pins
  in server-data.test.ts), e2e 130 → **131** (+1 the cart promo-apply
  envelope probe), unit files stay 10, e2e specs stay 2; the new probe adds
  one gotoHydrated call site → **44 storefront (46 across both files)**,
  swept through AGENTS/CLAUDE.
- **The PG state this cycle was NOT the lesson-31 restore**: the data dir
  survived the recycle WITH the postmaster process still alive (the
  postmaster.pid I removed as "stale" was in fact ACCURATE — the first
  `pg_ctl start` failed on the pre-existing shared-memory block, revealing
  the live server). Handled by a clean SIGTERM smart-shutdown + fresh
  `pg_ctl start` so the pid file and the process agree — recorded here so
  the next cycle checks process liveness (ps) BEFORE removing the pid file.
- **Gate outcome (the exact tree to be committed)**: cold build green ·
  typechecks + lint clean · unit **190/190** (the 17 mid-sweep docs-counts
  reds resolved by the six-doc sweep; identical under UTC /
  Asia/Singapore / America/New_York — the three-TZ discipline) · e2e
  **131/131** against the cold production build · zero DB residue (direct
  SQL: orders 0, order_items 0, reviews 5, inventory 72 rows at 1379) ·
  screenshots 100–104 verified non-blank (PNG signatures, dimensions,
  byte-density 0.115–0.322 B/px) with live DOM verification of every
  captured state.

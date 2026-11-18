# Task 117 Remediation Plan — Calculator Honesty, Fetch-Resilience, API Guards & Docs Alignment

Date: 2026-11-18 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: fresh-clone re-audit per `skills/web-application/SKILL.md` (§14–§16, §18–§20)
with the mobile-navigation + Tailwind v4 taxonomies from `skills/nextjs16-tailwind4`
§9/§10 (agent-browser at 390×844 / 768×900 / 1440×900), reference patterns from
`nordeim/homenest-store-s` (the family's v4 trap log), execution per `skills/tdd`
(red → green, one seam at a time). `skills/` excluded from checking/testing/
compilation (operator contract).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 on 127.0.0.1:5432)

| Gate | Result |
|---|---|
| Cold `npm run build` | GREEN — **29 routes** (the "30" in older docs is Task-114-era drift; Task 115 corrected DEPLOYMENT.md only) |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run test` (Vitest) | 40/40 |
| `npm run test:e2e` (Playwright, production build :3100, live DB) | 18/18 |
| Seed after first read | 24/8/72/5/3/6/3 rows — matches the documented contract |
| Mobile drawer (agent-browser 390×844) | open/toggle/Escape/navigate/auto-close ALL pass; aria state swaps correctly |
| Desktop ≥1024 (1440×900) | hamburger absent, category nav + store picker present; tablet 768 keeps both |
| Tailwind v4 traps | NONE in `src/` — drawer is conditionally mounted (no display-utility toggle, the homenest #15884 trap); zero colon-form arbitrary values; scan guard intact; all template-literal classNames branch on complete static literals |
| Route smoke (17 pages + 404 + 6 APIs) | all 200 / 404 as expected; robots + sitemap (42 URLs) coherent |
| PDP SEO (raw HTML) | product title + canonical + og:title + Product JSON-LD present; `data-scroll-behavior="smooth"` set |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence)

### F-1 HIGH — Family voucher calculator overstates rewards 10×
Evidence: `src/app/family/page.tsx:10` —
`Math.floor(points / 100) * 5 * 100` grants $5 per **100** points while the page's
own bullet (`family/page.tsx:21`) promises "$5 voucher every **1,000** pts".
At the default $1,200/yr spend: 12,000 pts → shows **$600** instead of $60.
Fix (ToDo-1): pure helper `familyVoucherCents(points)` in `src/lib/utils.ts`
(`Math.floor(points / 1000) * 500`), unit test RED first, page consumes it.

### F-2 MEDIUM — BuyBox fabricates stock data on the degrade path
Evidence: `src/components/BuyBox.tsx:44` — empty `stock` falls back to a
hardcoded `{ tampines, quantity: 12, aisleBin: "A04-B02" }` row. With Postgres
down (`getInventory` → `[]`) every PDP claims a fake 12-unit Tampines stock.
Fix (ToDo-2): render an honest "stock information unavailable" state instead.
Verify on the degrade path via agent-browser (dev server + dead DB URL).

### F-3 MEDIUM — Wishlist: unhandled rejection + error masquerading as "Nothing saved yet"
Evidence: `src/app/wishlist/page.tsx:15-25` — try/finally with no catch (network
failure → unhandled promise rejection), and `json.ok === false` leaves `items=[]`
so the page renders "Nothing saved yet" beside a non-zero wishlist count.
Fix (ToDo-3): explicit error + retry state (the `shop/page.tsx` skeleton/error/
empty trio is the house pattern).

### F-4 MEDIUM — Search: fetch failure indistinguishable from "No products found"
Evidence: `src/app/search/page.tsx:31-45` — same catch-less pattern; an aborted
API renders the empty-state copy for a genuine query.
Fix (ToDo-4): same error + retry treatment; keep the empty state for true zeros.

### F-5 MEDIUM — `placeOrder` money magic numbers duplicate the exported constants
Evidence: `src/lib/server-data.ts:160-162` — `2900`/`20000`/`1200`/`0.09` inline
while `src/lib/utils.ts:3-6` exports `EXPRESS_DELIVERY_FEE_CENTS`,
`FREE_DELIVERY_THRESHOLD_CENTS`, `STANDARD_DELIVERY_FEE_CENTS`, `GST_RATE`.
The PAD §10 INFO row ("full unification still open") is this exact debt.
Fix (ToDo-5): import the constants into `placeOrder` (behavior-preserving —
pinned by the 40 unit tests and the 18 e2e including the $679.15 MAKAN15 journey).

### F-6 MEDIUM — Reviews POST: no rate limit; invalid productId → 500; garbage body → 500
Evidence: `src/app/api/reviews/route.ts:16-33` — no limiter (PAD §6.4 said "add
limiters when the test suite lands" — it landed in Task 114);
`productId: -1` passes the truthiness check → FK violation → 500;
`await req.json()` on a non-JSON body throws → 500 REVIEW_FAILED.
Fix (ToDo-6): 20/min/IP fixed-window limiter (the checkout route's pattern),
positive-integer productId validation → 422, JSON parse guard → 400.
Note: the same PAD row names `/api/orders/track` — add the limiter there too.

### F-7 MEDIUM — Malformed JSON body → 500 (not 400) on promo + track routes
Evidence: `src/app/api/promotions/validate/route.ts:8` and
`src/app/api/orders/track/route.ts:8` — unguarded `req.json()`.
Fix (ToDo-7): parse guard → 400 envelope (client error, not server error).

### F-8 LOW — Duplicate badges on product cards
Evidence: `src/components/ProductCard.tsx:49-53` renders a computed `-{discount}%`
red chip + `isNew` blue chip, while 8 of 9 discounted products also carry a
literal percent badge (`catalog.ts` — `nordlys ["-24%"]`, `jurong ["-17%"]`,
`kopi ["-17%"]`, `wokhey ["-23%"]`, `ergonomi ["-23%"]`, `veranda ["-18%"]`,
`pandan ["-21%"]`, `bukit ["-20%"]`) and `daun`/`hygge` carry `["New"]` with
`isNew: true` — the chip renders twice.
Fix (ToDo-8): pure helper `visibleBadges(badges, { isNew, discountPercent })` in
`utils.ts` (unit RED first); ProductCard consumes it.

### F-9 LOW — ReviewSection stamps new reviews with the client clock
Evidence: `src/components/ReviewSection.tsx:28` —
`{ ...json.data!, createdAt: new Date().toISOString() }` overrides the
server-returned `createdAt`.
Fix (ToDo-9): trust the API value; client clock only as a missing-field fallback.

### F-10 LOW — A11y: qty input announces every keystroke; review stars double-announce
Evidence: `src/components/BuyBox.tsx:30` — `aria-live="polite"` on the qty
`<input>` (a live region that narrates each keystroke); the `aria-live` region
on the stock list and the added-to-bag button state are the correct ones.
`src/components/ReviewSection.tsx:46` — `aria-label` on a generic `<p>` whose
text content is the star glyphs (ignored-by-some-AT label + double announce).
Fix (ToDo-10): drop `aria-live` from the input; wrap star glyphs in
`aria-hidden` + `sr-only` text.

### F-11 LOW — Dead code
Evidence: `src/lib/utils.ts:72-74` `cartToken()` (zero call sites incl. tests);
`src/lib/server-data.ts:5,244` — `ilike`/`or` imported only to be re-exported
(zero consumers), plus the `export { db }`/drizzle re-export line (nobody
imports them from this module; the re-export invites a layer-rule violation);
`src/components/ProductCard.tsx:44` — `animationDelay` style computed from an
`index` prop that no card uses (no animation class exists on the article) —
inert plumbing through 6 call sites.
Fix (ToDo-11): remove all four; ProductCard drops the `index` prop.

### F-12 LOW — Stale/hardcoded dates
Evidence: `src/app/planning-tools/page.tsx:60` — `min="2026-11-19"` (a
yesterday-relative hardcode that goes stale immediately);
`src/components/Footer.tsx:70` — `© 2026` static.
Fix (ToDo-12): dynamic tomorrow-min and current year. The offers "Ends 28 Dec"
badge stays (seasonal marketing copy, a documented demo stance).

### F-13 LOW — Lead-capture forms confirm requests that were never sent
Evidence: `src/app/business/page.tsx:58-61` — "Request received — our trade
desk replies within one business day." after a no-op submit;
`src/app/planning-tools/page.tsx:56-60` — "we'll confirm by SMS" likewise.
No API call exists. Fix (ToDo-13): honest demo framing (the checkout's
"Demo — no charge" pattern), NOT a fake backend.

### F-14 LOW — Copy nits
Evidence: `src/app/food/page.tsx:10` — `" fries, mixed salad"` (missing "with");
`src/app/planning-tools/page.tsx:57` — dead `|| "your chosen slot"` fallback
(`booked` requires a truthy `date`).
Fix (ToDo-14): fix the typo; drop the dead branch.

### F-15 MEDIUM (docs) — Stale claims across the living documents
Evidence (sweep): `Project_Architecture_Document.md` §1.2:87 "Vitest /
Playwright **not installed**", §3.2:280 "SEO: allow-all … 18 static",
§3.2:312 "tests/ ← INHERITED from ely-beauty — NOT runnable",
§3.2:317 "(inherited, inactive)", §3.2:318 "Tasks 1–112" lineage note (the
operator deleted that lineage in `6ef81d1`), §3.3:410-425 Pattern 5 still
teaching the retired `useEffect` hydration shape as current, §8.1:624 +
§10:699,724 "30 routes" (actual 29), §9.3:682-683 "the 7 known
set-state-in-effect errors are documented debt" (fixed in Task 114);
`home-furnishing-store_SKILL.md:6` "30 routes"; `AGENTS.md:93` "Tasks 1–112
predecessor lineage".
Fix (ToDo-15): sweep all of them; PAD gains a v1.2.0 revision block + this
cycle's known-issues rows; SKILL.md counts + lessons refreshed; worklog gains
the Task 117 entry. Count-lockstep: unit/e2e totals change this cycle — every
doc that says "40"/"18" gets the new numbers in the same commit.

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| `familyVoucherCents(points)` in `utils.ts` (new) | unit | the 10× reward bug ever coming back |
| `visibleBadges(badges, { isNew, discountPercent })` in `utils.ts` (new) | unit | duplicate chips for badge-literal catalogue rows |
| `/api/reviews` POST boundary | e2e | invalid productId → 422 (was 500); garbage body → 400 (was 500); rating/name validation pinned |
| `/api/promotions/validate` + `/api/orders/track` parse guard | e2e | garbage body → 400 (was 500) |
| Wishlist page resilience | e2e (route interception: abort `/api/products`) | error + retry state (was: unhandled rejection + misleading empty state) |
| Search page resilience | e2e (route interception) | error + retry state (was: error ≡ empty) |
| Money constants unification | existing 40 unit + 18 e2e | behavior-preserving refactor pinned by the exact-value journey ($679.15 MAKAN15) |
| BuyBox degrade state | agent-browser (dev server, dead DB URL) | honest "stock unavailable" instead of fabricated rows |

## 4. Execution order (vertical slices, red → green each)

1. Unit RED: `familyVoucherCents` + `visibleBadges` → implement in `utils.ts` →
   wire into `family/page.tsx` + `ProductCard.tsx` ( ToDo-1, ToDo-8) → GREEN.
2. E2E RED: reviews 422/400 + promo/track 400 specs → implement route guards +
   limiters (ToDo-6, ToDo-7) → GREEN.
3. E2E RED: wishlist + search error-state specs (interception) → implement the
   error/retry UI (ToDo-3, ToDo-4) → GREEN.
4. BuyBox honest degrade + a11y fixes + ReviewSection timestamp
   (ToDo-2, ToDo-9, ToDo-10) → agent-browser degrade-path verification +
   full suite green.
5. `placeOrder` constants import (ToDo-5) — behavior-preserving, pinned by the
   existing suite.
6. Dead-code sweep (ToDo-11) + dates (ToDo-12) + demo-copy honesty (ToDo-13) +
   copy nits (ToDo-14).
7. Docs lockstep (ToDo-15): PAD v1.2.0 (stale sweep + revision block +
   known-issues rows), SKILL.md refresh, AGENTS.md lineage note, README counts,
   worklog Task 117, this plan archived.
8. Full gate: lint → typecheck → typecheck:tests → unit (exact new count) →
   cold build (29 routes) → e2e (exact new count).
9. Dev-server screenshots for changed surfaces into `docs/screenshots/`.
10. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py`
    with the mandatory `--remote` override.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and was read in full this run (this session or
  the Explore-agent audit with line-level evidence).
- `familyVoucherCents` math checked against the page's own printed rule:
  10 pts/$1, $5 per 1,000 pts → $1,200 spend = 12,000 pts = 12 × $5 = $60
  (6,000 cents). The current code yields $600 — the RED test asserts 6,000.
- The badge filter must NOT drop legitimate badges (`solbakken` shows
  "Bestseller" while the computed chip shows "-19%" — both must render); it
  drops only a percent literal equal to the computed discount and a literal
  "New" when the `isNew` chip already renders.
- The reviews limiter copies the checkout route's fixed-window shape (same
  20/min/IP, same "local" fallback) — no new dependency, per-process posture
  documented in the PAD threat model.
- E2E route interception (`page.route(...).abort()`) works against the
  production build (Playwright network interception is browser-side).
- The wishlist e2e journey in the existing suite does not conflict: the new
  specs run in isolated contexts with their own interception.
- No new runtime dependencies; no schema changes; no new env variables;
  `.env.example` verified current (single-variable contract — unchanged).
- Count-lockstep sites for test totals: AGENTS.md (commands table), CLAUDE.md
  (testing strategy), README.md (Testing section), SKILL.md (frontmatter +
  Appendix B), PAD §7 — all updated in the same commit as the test change.

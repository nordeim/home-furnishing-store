# Task 127 Remediation Plan — Boundary-Type Parity, Replay Ownership, Derived-Copy Completion

Date: 2026-11-19 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
+ hydration probe on the dev server — 8/8 PASS incl. the F-7 param-navigation regression
check; **no Tailwind v4 bug**), execution per `skills/tdd` (red → green, one seam at a time).
`skills/` excluded from checking/testing/compilation (operator contract). Reference patterns
cross-checked against `homenest-store-s` (its ownership-bound replay discipline became F-5;
its `getRandomValues` secure-context fallback became F-6; its 23505 constraint-name
discipline became a register annotation; **zero new src/tests material since 2026-10-23** —
all 7 post-snapshot commits touch `skills/` only, commit-stat verified).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 on
127.0.0.1:5432, postgres/app_db — the sandbox snapshot had lost the initdb runtime
subdirectories `pg_notify`/`pg_stat*`/`pg_tblspc`/…; they were restored from a fresh
`initdb` template via a recursive no-clobber merge, preserving `base/`/`pg_wal` — the
SKILL lesson-31 class; schema/DDL intact incl. `orders_idempotency_key_unique`,
`reviews_product_idx`, `inventory_product_store_uq`, no redundant `products_slug_idx`)

| Gate | Result |
|---|---|
| fresh clone → `33dea5e` (docs-only delta since pushed Task-126 `fbd7ac8`: session_18 + session_19 logs) | clean tree |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 156/156 |
| `npm run test:e2e` (Playwright, production build :3100, chromium-1255 installed — the documented trap, third cycle running) | 104/104 |
| DB contract | 9 tables; **zero residue at baseline** (0 orders, 5 seed reviews, 24 products, 72 inventory rows) AND **zero residue after the full 104-test e2e run** — the Task-126 discipline holds |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | open / navigate+auto-close (`/shop?cat=dining`) / Escape / toggle / hamburger hidden-≥1024 (`display:none`, 0×0 rect) / **F-7 param-close regression check** (`/shop?cat=dining` → drawer Bedroom → `/shop?cat=bedroom` + `aria-expanded=false`) / hydration (`data-hydrated=true` + add-to-bag → "Shopping bag, 1 item") / utility strip (right edge 374 < 390) ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact, `lg:` breakpoint renders) |
| Sitemap/SEO | sitemap 42 URLs (12 static + 24 product + 6 inspiration), indexable-only, NO lastModified; robots coherent (disallows cart/checkout/track-order/order/wishlist/search/api) |
| Full-file audit | all `src/` + test files read by an audit agent; every headline finding re-verified by me at line level (M-1 re-verified in the live browser; M-2 re-proven by executed coercion proof) |
| Reference repo | `homenest-store-s` reviewed: no src/tests changes since 2026-10-23 (7/7 commits skills-only); ported: ownership-bound replay (F-5), getRandomValues mint fallback (F-6); annotated: the 23505 constraint-name discrimination for the orderNumber-collision register row |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — Task-126 regression: every PDP renders the literal text `&amp;` in the delivery details
Evidence: `src/app/product/[slug]/page.tsx:188` — Task 126's F-3 fee-derivation moved this
line from JSX text children (where the compiler decodes `&amp;` → `&`) into a JS template
literal `{`…`}` (where no entity decoding occurs); React renders string-expression children
verbatim. **Browser-confirmed live this run** (agent-browser on the dev server: the
"Delivery, assembly" details block "renders &amp; literally" on /product/solbakken-3-seat-sofa).
Every other `&amp;` in `src/` sits in JSX text (decodes fine); every other template-literal
copy site uses a plain `&`.
Fix (ToDo-1): plain `&` inside the template literal. e2e RED first: assert the PDP delivery
details contain "Click & Collect free in 2 hours" and do NOT contain "&amp;" (today the
assertion fails — the RED is the regression itself).

### F-2 MEDIUM — The checkout write boundary still String()-coerces crafted TYPES on its five free-text fields (+ deliverySlot)
Evidence: `src/app/api/checkout/route.ts:32-36` (`String(body.email ?? "")` × email/
fullName/phone/postal/address) and `:84` (`String(body.deliverySlot ?? "…")`). Tasks
124/125/126 hardened `lines` (productId/qty), reviews POST, and the three read boundaries —
but a single-element ARRAY payload `String()`-coerces to its element and passes every
downstream check (executed proof this run: `["journey@nordhem.sg"]` → valid email → a 201
order places with array-typed input). The docs claim write boundaries are TYPE-strict
("like every write boundary", CLAUDE.md:296) — the claim overstates (L-5, fixed by this).
Fix (ToDo-2): mirror the track-route typeof guards — non-string email/fullName/phone/
postal/address/deliverySlot → 422 `VALIDATION` before the `.trim()` (storeSlug/
deliveryMethod/paymentMethod are whitelist-safe; promoCode/idempotencyKey already guarded).
e2e RED first: a fully array-typed payload places a 201 today (with a `finally` safety net
via the shared `deleteProbeOrders` — the net's RED-path discipline from Task 126 F-2).

### F-3 LOW — Read-boundary TYPE-strictness rollout missed `?max=` on /api/products (the Task-126 F-5 residue)
Evidence: `src/app/api/products/route.ts:14` — `Number(url.searchParams.get("max") ?? "0")`:
`?max=abc` → NaN → silently no filter (200); `?max=1.5` → fractional dollars filter. The
sibling GET boundary (reviews `?productId`) went whole-number-strict in Task 126.
Fix (ToDo-3): `/^\d+$/` guard on the raw param → 422 `VALIDATION` (the reviews-GET pattern);
e2e RED first (`?max=abc` → 200 today; `?max=250` stays 200 + filters).

### F-4 LOW — Derived-copy completion: the Task-126 F-3 rollout missed 13 sites in 4 clusters
Evidence (all verified this run):
(a) `$200` threshold literal ×2: `src/app/shop/layout.tsx:19` (metadata — SERP-facing) +
`src/app/shop/shop-inner.tsx:115` (visible) — while six sibling sites derive
`FREE_DELIVERY_THRESHOLD_CENTS`;
(b) `9% GST` literal ×7: cart/page.tsx:139, checkout/page.tsx:175, shop/layout.tsx:19,
shop/shop-inner.tsx:115, product/[slug]/page.tsx:166, page.tsx:26 (metadata),
components/Footer.tsx:71 — while `GST_RATE = 0.09` (utils.ts:27) drives every money figure
(the e2e pin at storefront.spec.ts:2009 also hardcodes the literal);
(c) FLAT20's `$20 off orders over $250` hand-copied at offers/page.tsx:58 beside cards that
derive the same promo's label from `PROMOS` (catalog.ts:141);
(d) the family voucher rule `$5 voucher every 1,000 pts` hand-copied ×3 (family/page.tsx:22,
family/layout.tsx:15, :20) while `FAMILY_VOUCHER_CENTS`/`FAMILY_POINTS_PER_VOUCHER`
(utils.ts:193-194) drive the calculator.
Fix (ToDo-4): interpolate the constants at all 13 sites (`${GST_RATE * 100}%` renders 9 —
use `Math.round(GST_RATE * 100)`; `${FREE_DELIVERY_THRESHOLD_CENTS / 100}` preserves the
"$200" marketing style; the family copy composes the two constants with
`toLocaleString("en-SG")` for "1,000"); derive the GST e2e pin expectation from the imported
constant (the Task-124 F-14 pattern).

### F-5 LOW — Idempotent-replay ownership: possession-only replay + validation-before-replay (homenest S6-8/S7-2 discipline)
Evidence: `src/lib/server-data.ts:257-266` (fast path) + `:341-353` (23505 race path) —
the comment states the stance ("possession IS the authority (no email gate)"), but the
checkout POST carries `email` and the order row stores it: a key leaked via logs/XSS
replays the VICTIM's order number to anyone holding it (the homenest threat model — the
last un-ported piece of the Task-126 F-1 triad). Second nuance (audit I-1): the fast path
runs AFTER bag/promo validation (`:215-221` precede `:259`) — a true replay whose promo was
deactivated between attempts, or whose bag emptied after the success-redirect race, throws
EMPTY_BAG/INVALID_PROMO instead of replaying (validation-first is non-canonical; Stripe-style
replay answers regardless of the re-sent payload's validity).
Fix (ToDo-5): (a) hoist the fast-path above the bag/promo validation (canonical replay);
(b) bind BOTH replay paths to `existing.email.toLowerCase() === input.email.toLowerCase()`
— match → replay; mismatch → `OrderRefusalError("REPLAY_MISMATCH")` (the route's existing
OrderRefusalError → 422 mapping; no disclosure of the bound order, no fall-through insert
that would 23505 anyway). e2e RED first: same key + different email → today 200 + the
victim's order number (with `deleteProbeOrders` safety net).

### F-6 LOW — `mintIdempotencyKey`'s fallback uses Math.random (predictable) where getRandomValues is available (homenest session-7 S7-10)
Evidence: `src/lib/utils.ts:44-50` — the catch-body `k${Date.now()}…${Math.random()…}`.
`crypto.getRandomValues` is NOT secure-context-gated (only `randomUUID` is), so the
non-secure-context fallback (plain-HTTP LAN) can mint a real 128-bit random hex instead.
Fix (ToDo-6): the homenest `random-id.ts:15-22` discipline — `getRandomValues(16 bytes)` →
hex; keep a last-resort Math.random branch only if even getRandomValues is absent (ancient
runtimes). Unit RED first: the fallback shape/distinctness pins against the new path
(crypto redefined via `Object.defineProperty` — the existing mint pins' pattern).

### F-7 LOW — `campaignEnd()` reads the server-LOCAL calendar (the SGT seam discipline's one violator)
Evidence: `src/lib/utils.ts:228-231` — `new Date(now.getFullYear(), 11, 28)`; orderNumber/
sgTomorrowISO/availableDeliverySlots all do pure UTC+8 math. On a UTC server the PDP Offer's
`priceValidUntil` rolls to next year from Dec 28 00:00 UTC = Dec 28 08:00 SGT — the
campaign's final 16 hours advertise next year's date (cosmetic; the visible label is
unaffected).
Fix (ToDo-7): the SGT discipline — compute the campaign year on the UTC+8 clock
(`now.getTime() + SGT_OFFSET_MS`, read `getUTC*` fields), construct Dec 28 00:00 SGT, roll
if past. Unit pins at the SGT edges (Dec 27 15:59:59 UTC = Dec 27 23:59:59 SGT → this year;
Dec 27 16:00:00 UTC = Dec 28 00:00:00 SGT → this year, not past; one ms after the end →
next year) + the existing Dec-29/31 roll pins stay green.

### F-8 LOW — Docs-truth: 5 operator-doc sites still name the removed `dotenv` package; 3 sites over-claim the gotoHydrated + TYPE-strict coverage
Evidence: AGENTS.md:167, CLAUDE.md:335, README.md:419, SKILL.md:66 + :399 say "dotenv never
overrides" while `package.json` carries no dotenv (removed Task 126) and `.env.example`
already says "Next's env loader never overrides existing env" (the Task-126 F-4 fix covered
the example file only). CLAUDE.md:296-297 + README.md:269 claim read boundaries are strict
"like every write boundary" (true AFTER F-2); AGENTS.md:177 + CLAUDE.md:263 + PAD:176 claim
"the interaction-first specs navigate through gotoHydrated" (true AFTER F-9 — 0 call sites
in storefront.spec.ts today, 3 in mobile-navigation.spec.ts only).
Fix (ToDo-8): sweep the 5 dotenv sites to the Next-loader truth; F-2 and F-9 make the
other two claims true (no wording change needed — verify each site reads correctly after).

### F-9 LOW — The storefront e2e suite's 20 interaction-first specs race hydration bare (`page.goto` + immediate click)
Evidence: 20 test blocks identified mechanically this run (goto followed by click/fill/
select within the block): storefront.spec.ts :490, :506, :542, :561, :590, :1018, :1397,
:1460, :1470, :1502, :1524, :1538, :1641, :1670, :1998, :2010, :2040, :2046, :2138, :2255.
A pre-hydration click silently no-ops (the SSR'd button is in the DOM before React wires
onClick) — the exact flake class gotoHydrated exists for (Task 125 G-5), which the mobile
spec uses but the desktop project does not. The DOM-assertion-only specs (JSON-LD,
metadata, SEO blanket, javaScriptEnabled:false pair) MUST stay bare goto — they must not
depend on hydration.
Fix (ToDo-9): route exactly the 20 interaction-first gotos through `gotoHydrated` (import
from ./helpers); GREEN-on-arrival (the sentinel stamps on every route via CartProvider in
the root layout — the conversion is the pin's deliverable, the SITE_ORIGIN precedent).

### F-10 INFO — 23505 constraint-name discrimination (register annotation, homenest S8-3)
Evidence: `server-data.ts:346-353` catches ANY unique violation when a key is present — an
`orderNumber` collision (random 6-char suffix) runs the futile replay re-select and
rethrows (500) rather than retrying allocation. The orderNumber-collision retry is a
documented deferral; this annotates its register row: the residual is slightly wider than
"no retry" (the handler also shadows it), and the un-deferral path is `err.constraint`
name discrimination (pg exposes the constraint name; drizzle wraps it in `.cause`).
Fix (ToDo-10): PAD register annotation only — no code change (the deferral stands).

### Evaluated and kept deferred / rejected (do NOT "fix" without an operator decision)
- **qty clamp vs refuse (audit L-8)**: REJECTED — the clamp is the DOCUMENTED contract
  (AGENTS.md: "qty clamped 1–99"; the route comment cites Task 118 F-17's deliberate
  stance). In-range-value coercion of a correctly-typed field is a different class from
  crafted-TYPE coercion (F-2); the docs and code agree today.
- **DEPLOYMENT order (audit I-4)**: REJECTED — DEPLOYMENT.md §4→§5→§6 already sequences
  docker/drizzle-push before first run, and the §9 troubleshooting row names "schema not
  pushed" as a CHECKOUT_FAILED cause. Covered.
- **TRUST_PROXY, CSP, jsdom layer, delivery-decrement redistribution, store-picker wiring,
  React cache(), health-503, Tailwind token codemod, offers bundle curation, unthrottled
  GETs, orderNumber collision retry**: unchanged in the register (homenest adds no new
  evidence — the reference review confirmed each deferral stands).

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| PDP delivery details contain "Click & Collect free in 2 hours" and NOT "&amp;" | e2e (RED) | F-1 the entity regression |
| array-typed email/fullName/phone/postal/address/deliverySlot payload → 422 (today 201) + finally safety net | e2e (RED) | F-2 crafted-TYPE orders |
| `?max=abc` → 422 VALIDATION (today 200); `?max=250` → 200 + filtered | e2e (RED) | F-3 read-boundary coercion |
| GST pin derives `Math.round(GST_RATE*100)`; shop $200 sites render the constant's value; offers FLAT20 copy composes PROMOS; family copy composes the constants | e2e (derived) + existing pins | F-4 copy drift |
| same key + different email → 422 REPLAY_MISMATCH (today 200 + the first order's number); same key + same email → 200 replay (unchanged); empty-bag same-key resubmit → 200 replay (today EMPTY_BAG 422) | e2e (RED) ×2 | F-5 replay ownership + canonical order |
| mint fallback: shape/distinctness with randomUUID absent AND getRandomValues present; Math.random only when both absent | unit (RED) | F-6 predictable keys |
| campaignEnd SGT edges: Dec 27 15:59:59 UTC → this year; Dec 27 16:00:00 UTC (= Dec 28 00:00 SGT) → this year; end+1ms → next year; existing roll pins stay green | unit (RED) | F-7 server-local calendar |
| 20 interaction-first storefront gotos route through gotoHydrated | e2e (invariant) | F-9 pre-hydration clicks |
| existing pins re-run (unit + e2e) | both | money journeys, idempotent replay, LOW_STOCK/TOCTOU, settle discipline, metadata blanket, docs-counts |

## 4. Execution order (vertical slices, red → green each)

1. **Boundary-type slice**: ToDo-1 (F-1 e2e RED → literal fix → GREEN), ToDo-2 (F-2 e2e RED
   with safety net → typeof guards → GREEN), ToDo-3 (F-3 e2e RED → max guard → GREEN).
2. **Derived-copy slice**: ToDo-4 (GST pin derives → 13 sites interpolated → e2e pins
   derive → GREEN; docs-counts working-red expected if any count claims shift — lockstep
   comes last).
3. **Replay-ownership slice**: ToDo-5 (e2e RED ×2 → fast-path hoist + email gate on both
   paths → GREEN with the idempotency sibling pins: same-key replay, client wiring,
   UI-retry, 23505 race).
4. **Mint + calendar slice**: ToDo-6 (unit RED → getRandomValues fallback → GREEN),
   ToDo-7 (unit RED → SGT campaignEnd → GREEN).
5. **Hydration-gating slice**: ToDo-9 (20 conversions, GREEN-on-arrival).
6. **Docs-truth slice**: ToDo-8 (dotenv ×5 + claim verification) + ToDo-10 (PAD register
   annotation).
7. **Docs lockstep**: counts sweep (AGENTS/CLAUDE/README/PAD/SKILL to the new totals — the
   docs-counts pin enforces all five), PAD v1.12.0 (revision block + register), SKILL
   v2.1.0 (new lessons), worklog Task 127, this plan archived, `.env.example` re-verified
   (contract unchanged — no new env variables).
8. **Full gate**: lint → typecheck → typecheck:tests → unit (new total) → cold build
   (`rm -rf .next`) → e2e (new total, zero residue verified by direct SQL) →
   dev-server screenshots of the changed surfaces into `docs/screenshots/`.
9. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py` with the
   mandatory `--remote` override; session log as the follow-up commit.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this run by direct
  read (M-1 additionally browser-confirmed; M-2 re-proven with an executed coercion proof).
- F-2's guards mirror the track route's existing typeof pattern (no new idiom); the
  deliverySlot guard sits BEFORE the default-coercion `String(body.deliverySlot ?? …)` so
  `undefined` (absent field) still falls to the default — only PRESENT non-strings refuse.
- F-5's hoist is safe: the fast-path only reads `orders` by key; EMPTY_BAG/INVALID_PROMO
  checks move below it; a key with no order falls through to validation exactly as today.
  The email gate compares the route-trimmed `input.email` against the stored trimmed email
  (both lowercased); the 23505 race path re-selects and applies the same gate. The route's
  OrderRefusalError catch maps the new REPLAY_MISMATCH code to 422 with fixed copy.
- F-6's `getRandomValues` exists on all secure AND insecure contexts (only `randomUUID` is
  gated) — homenest's S7-10 evidence; the Math.random branch survives as the
  both-absent last resort for ancient runtimes (node < 19 browsers without WebCrypto).
- F-7's SGT math follows the `sgTomorrowISO`/`orderNumber` discipline (SGT_OFFSET_MS +
  getUTC* reads); the existing Dec-29/31 roll pins pass a LOCAL-time Date on this UTC-TZ
  sandbox — verified the semantics hold under the new internals.
- F-9's 20 sites were identified mechanically (goto followed by an interaction within the
  block); the javaScriptEnabled:false specs and DOM-only specs are NOT in the list and
  stay bare.
- No new runtime dependencies; no new env variables; the docs-counts pin sweeps all five
  operator docs at the final counts. Expected new totals: unit 156 + ~5 ≈ 161;
  e2e 104 + ~6 ≈ 110 — exact counts locked by the docs-counts pin at gate time.

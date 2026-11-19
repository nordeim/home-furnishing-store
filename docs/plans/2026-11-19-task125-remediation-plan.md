# Task 125 Remediation Plan — Test-Integrity, Boundary Parity, Identity/Origin Seams

Date: 2026-11-19 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
+ hydration probe on the dev server — 5/5 PASS, no Tailwind v4 bug; one NEW drawer gap
browser-reproduced: F-7), execution per `skills/tdd` (red → green, one seam at a time).
`skills/` excluded from checking/testing/compilation (operator contract). Reference patterns
cross-checked against `homenest-store-s` (its security-headers posture, rightmost-XFF client-IP
derivation, escaped JSON-LD seam, single-sourced site origin, hydration sentinel and manifest
became G1/G2/G3/G4/G5/G6; its Prisma/SQLite spine is not applicable here — the disciplines
are ORM-agnostic).

## 1. Audit baseline (all Verified this run; rootless PostgreSQL 17.12 on 127.0.0.1:5432, postgres/app_db — restored snapshot needed only the initdb empty-subdirectory recreation of SKILL lesson 31; schema/DDL intact incl. inventory_product_store_uq)

| Gate | Result |
|---|---|
| fresh clone → `451bf40` (delta since pushed Task-124 `dbf3686`: docs-only — session_13 + session_14 logs) | clean tree |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 138/138 |
| `npm run test:e2e` (Playwright, production build :3100, chromium-1255 installed) | 89/89 |
| DB contract | 9 tables; seed 24/8/72/3/6/3/5; **zero residue at baseline** (0 orders, 5 seed reviews, inventory at the seed formula — 0 mismatches vs `(id*37)%40` +8/−4/−10) AND **zero residue after the full 89-test e2e run** (orders 0, reviews 5, 0 mismatches) — the Task-124 discipline holds |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | open / navigate+auto-close (`/shop?cat=bedroom`) / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) ALL pass — **no Tailwind v4 bug** (conditional mount, scan guard intact); hydration verified live (add-to-bag → header badge "Shopping bag, 1 item"); **F-7 browser-reproduced**: `/shop?cat=bedroom` → drawer Dining click → `/shop?cat=dining` with the drawer STILL OPEN (aria-expanded=true) |
| Utility strip @390 | "Shop offers" link right edge 374 < 390 — Task-121 F-5 fix holds |
| Sitemap/SEO | sitemap 42 URLs (12 static + 24 product + 6 inspiration), indexable-only, NO lastModified; robots coherent (disallows cart/checkout/track-order/order/wishlist/search/api); utility noindex layouts + order-page noindex green in the e2e baseline |
| Full-file audit | all 51 `src/` files + 11 test files read by an audit agent; every headline finding re-verified by me at line/byte level (incl. the catalogue discount math: dining max −17%, decor −24% NORDLYS, kitchen −23% WOKHEY, workspace −23%) |
| Reference repo | `homenest-store-s` reviewed: Next 16/React 19/TS-strict/Tailwind v4 CSS-first spine matches; its Prisma 6 + SQLite data layer is NOT applicable (the disciplines translate, the idioms do not). Ported as findings: security headers (G1), rightmost-XFF clientIp (G2), escaped JSON-LD seam (G3), SITE_ORIGIN constant (G4), hydration sentinel (G5), manifest+icon (G6), iPhone-13 mobile emulation (G7) |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — The Task-121 F-20 method-switch e2e pin is time-bombed: no clock pin, fails on any run after 14:00 SGT
Evidence: `tests/e2e/storefront.spec.ts:1442–1457` — asserts `toHaveValue("Today 2pm")` and
`options = ["Today 2pm", "Tomorrow 10am"]` with the REAL clock, while Task-124 F-8 made those
exact options clock-sensitive (`src/lib/utils.ts:117–126` filters "Today 2pm" once
`sgt.getUTCHours() >= 14`); only the two F-8 specs pin the clock (`:1392`, `:1402`). The
baseline green run simply happened at 10:53 SGT — before the cutoff.
Fix (ToDo-1): pin the clock in the F-20 spec (`page.clock.setFixedTime` at 10:00 SGT, the
F-8 sibling's pre-cutoff instant) so the method-switch re-derivation assertion is
deterministic. Honest-RED: temporarily pin 23:00 SGT in the CURRENT spec → observe both
assertions fail (the time bomb proven live) → fix with the pre-cutoff pin.

### F-2 LOW — Reviews POST still type-coerces crafted payloads (Number/String), the exact class Task-124 F-5 closed at checkout
Evidence: `src/app/api/reviews/route.ts:37–38,43,48,55` — `Math.floor(Number(body.productId))`
(`Number(true)===1`, `Number([3])===3`, `Number("5")===5`) and `String(body.author ?? "")`
(`String(12345678901234567890)` → 20-char numeric string passes the ≤60 cap). A crafted
`{ productId: 1, rating: true, author: 1e19 }` persists junk (rating 1, author "10000000000000000000").
Fix (ToDo-2): require `typeof body.productId === "number" && Number.isInteger(...)` and
`typeof body.rating === "number"`, and `typeof author/title/body === "string"` before trim →
422 VALIDATION otherwise (the Task-124 F-5 posture, mirrored). e2e RED: two crafted probes
(`rating: true` and `author: <number>`) → today 201; each probe carries its own safety-net
cleanup (delete the probe review rows by title in `finally` — the gotcha #13 discipline).

### F-3 LOW — `/api/orders/track` and `/api/promotions/validate` accept unbounded strings — the checkout cap discipline isn't mirrored
Evidence: `src/app/api/orders/track/route.ts:25` (`String(body.orderNumber ?? "")`,
`String(body.email ?? "")` — both go into the parameterized Postgres lookup with no length
bound) and `src/app/api/promotions/validate/route.ts:25` (`String(body.code ?? "")` → the
promotions-table lookup). Compare checkout: email ≤254, promoCode ≤32 → 422.
Fix (ToDo-3): mirror the known shapes — order number ≤ 32 (`NH-YYYYMMDD-XXXXXX` is 17),
email ≤ 254, promo code ≤ 32 (mirrors `isValidPromoPayload` and the checkout cap) → 422
VALIDATION with fixed copy. e2e RED: 10k-char email on track (today 404, not 422) and a
100-char code on promo-validate (today 422 INVALID_PROMO, not the boundary VALIDATION copy).

### F-4 LOW — Header utility strip misattributes the max discount: "up to 24% off dining & decor" (dining's max is −17%)
Evidence: `src/components/Header.tsx:73` vs the catalogue math (dining max −17%; the −24% is
NORDLYS, decor/lighting). Task-122 F-19 fixed the hero's attribution but the strip kept the
loose set. The hero e2e scopes to `section.first()` — the strip is unpinned.
Fix (ToDo-4): align the strip to an honest set ("up to 24% off lighting, cookware & decor" —
all three carry ≥20%: NORDLYS −24%, WOKHEY −23%, PANDAN −21%); extend the hero-attribution
e2e to the strip (e2e RED first: the strip fails the tightened attribution assertion today).

### F-5 LOW — Offers metadata still carries the pre-F-19 attribution ("dining, decor and sleep") — the Task-122 fix landed on the visible copy only
Evidence: `src/app/offers/page.tsx:12–13` (metadata.description) and `:16` (og.description)
vs the corrected visible copy at `:35` ("lighting, decor and everyday essentials"). The
metadata-blanket pin (`storefront.spec.ts:683` — regex `/Up to 24% off/`) is too loose to
hold the attribution.
Fix (ToDo-5): copy the corrected attribution into both metadata fields; tighten the blanket
regex for /offers to `/Up to 24% off lighting/` (e2e RED first: today's metadata fails it).

### F-6 LOW — Checkout Time-slot select can display "Tomorrow 10am" while the submitted payload carries "Today 2pm" across the 14:00 SGT cutoff
Evidence: `src/app/checkout/page.tsx:112–119` — options re-derive every render
(`availableDeliverySlots(method)`); a click-collect page opened before 14:00 SGT with
"Today 2pm" in `form.slot` keeps it in state after the cutoff; any re-render drops it from
the options and the controlled select then DISPLAYS the first remaining option while the
state (and the POSTed `deliverySlot`) still holds the already-past slot (the API accepts it
by design: stale-tab grace).
Fix (ToDo-6): adjust-during-render guard (the sanctioned pattern): when `form.slot` is not
in `availableDeliverySlots(method)`, reset it to the first available — the method-switch
reset (`:104`) now also covers the clock crossing. e2e RED via clock + payload capture:
pin 13:59 SGT → select "Today 2pm" → fastForward past 14:00 → re-render (fill a field) →
submit with `/api/checkout` intercepted (fulfilled with a fixed 422 envelope — no DB write)
→ the captured payload's `deliverySlot` is "Today 2pm" while the select displays
"Tomorrow 10am" (the divergence, today) → GREEN: payload "Tomorrow 10am", display agrees.

### F-7 LOW — Mobile drawer stays open on search-param-only navigation (category tap while already on /shop) — browser-reproduced this run
Evidence: `src/components/Header.tsx:35–39` — the close-on-navigation guard compares
`usePathname()` only; drawer category links are `/shop?cat=${slug}`, so `/shop?cat=bedroom`
→ `/shop?cat=dining` keeps the pathname at `/shop` and the drawer stays open over the
re-filtered grid (live: aria-expanded=true after the navigation). The e2e auto-close pin
navigates from `/` (pathname changes) — the gap is unpinned.
Fix (ToDo-7): close the drawer in the link click itself (`onClick={() => setOpen(false)}`
on the drawer's Shop/category/TOP links — the surgical fix that also covers param-only
navigations); the pathname-change guard stays for browser-nav cases. e2e RED: open the
drawer on `/shop?cat=bedroom`, click Dining → expect `aria-expanded=false` (today: true).

### F-8 LOW — Home metadata hardcodes "24 products across 8 room categories" instead of deriving (the Task-122 F-13 class)
Evidence: `src/app/page.tsx:26` (literal counts) + the pin at `storefront.spec.ts:735–737`
hardcodes the same literals — a catalogue edit turns the gate red instead of self-correcting.
Fix (ToDo-8): template the description from `PRODUCTS.length`/`CATEGORIES.length` (the
shop-layout pattern); derive the e2e expectation from the catalogue import (the Task-124
F-14 sitemap-derivation pattern).

### F-9 LOW — PAD §11 key-files table has rotted: "11 Drizzle tables" (actual: 9) plus stale line counts
Evidence: `Project_Architecture_Document.md:1274` (`src/db/schema.ts | ~178 | 11 Drizzle
tables`) vs the schema's 9 `pgTable`s (grep-verified) and every other PAD site (9 tables);
line counts in the same table rotted (`utils.ts ~98` vs actual 226, `server-data.ts ~244`
vs 312, PDP `~122` vs 204, checkout route `~62` vs 130).
Fix (ToDo-9): correct the row to 9 tables and refresh the line counts; fold into the docs
lockstep slice.

### F-10 INFO — Planning-tools layout hardcodes "explore 6 shoppable room stories" (INSPIRATIONS.length is 6)
Evidence: `src/app/planning-tools/layout.tsx:8–11`. Fix (ToDo-10): template from
`INSPIRATIONS.length` (server module — the import is free).

### F-11 INFO — CLAUDE.md Testing-Strategy header says "Tasks 114–123" while listing Task-124 seams
Evidence: `CLAUDE.md:138`. Fix (ToDo-11): the Task-125 lockstep rewrite carries
"Tasks 114–125".

### F-12 INFO — Shop layout hardcodes the category-name enumeration after the derived counts
Evidence: `src/app/shop/layout.tsx:16,21` — counts derive (Task-122 F-13) but the trailing
name list is literal; a rename or ninth category drifts the prose.
Fix (ToDo-12): derive the tail from `CATEGORIES` (or join the names) so the sentence stays
internally consistent.

### G1 (reference posture) — No security headers, no fingerprint suppression: `x-powered-by` advertised, no HSTS/nosniff/frame/referrer/permissions policy
Evidence: `next.config.ts` (only `allowedDevOrigins`) vs homenest's `headers()` block + 
`poweredByHeader: false` + its e2e pin. Fix (ToDo-13): add the platform-level header set
(X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy
strict-origin-when-cross-origin, Permissions-Policy camera=(), microphone=(),
geolocation=(), payment=(), Strict-Transport-Security with includeSubDomains) +
`poweredByHeader: false`; e2e RED (headers absent today, `x-powered-by` present) → GREEN
(pin asserts the header set on `/` and the `x-powered-by` absence).

### G2 (reference posture) — Rate-limit identity uses the LEFTMOST x-forwarded-for hop — the client-forgeable form — at four duplicated sites
Evidence: `src/app/api/{checkout,reviews,orders/track,promotions/validate}/route.ts` all
carry `req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"` (the leftmost
hop is exactly what a direct-deploy client controls — a curl loop with rotating fake XFF
values defeats the 20/min windows); homenest's session-6 fix derives the rightmost hop.
Fix (ToDo-14): extract `clientIp(headers: Headers): string` into `src/lib/rate-limit.ts`
(rightmost XFF hop → `"direct"` fallback — no trusted proxy is documented, so rightmost is
the honest default); rewire the four routes; unit RED ×3 (multi-hop rightmost, single-value
passthrough, absent → "direct"). The Task-124 XFF-identity e2e probes keep working
(single-value XFF: rightmost === the value).

### G3 (reference posture) — JSON-LD serialization escapes only `<` at two inline sites (no U+2028/U+2029, no shared seam, no pin)
Evidence: `src/app/layout.tsx:50` and `src/app/product/[slug]/page.tsx:100` both do
`JSON.stringify(x).replace(/</g, "\\u003c")`. U+2028/U+2029 are legal inside JSON strings
but terminate JS string semantics in some embedding contexts; both payloads are
catalog-authored today (latent), and review text is one product away.
Fix (ToDo-15): `jsonLdScript(data: unknown): string` in `src/lib/utils.ts` with the full
three-escape set (`<`, U+2028, U+2029); wire both sites; unit RED ×3 (hostile payload with
`</script>`, U+2028, U+2029 → escaped output). Existing JSON-LD e2e pins parse the script
text — unchanged for benign payloads.

### G4 (reference posture) — The site origin literal is hardcoded in 17 files (drift-class: a domain move is a 17-file sweep no test can catch)
Evidence: `rg -l "https://nordhem.sg" src/` → 17 files (sitemap, robots, layout, PDP, shop,
offers, food, help, stores, services, inspiration ×2, family, business, sustainability,
planning-tools). Fix (ToDo-16): export `SITE_ORIGIN` from `src/lib/utils.ts`, compose every
site from it; unit pin (fs-scan): no raw literal in `src/app/**` outside the constant's
home. `tests/unit/robots-sitemap.test.ts`'s own `SITE` const is the test's EXPECTATION —
it stays.

### G5 (reference posture) — The e2e suite is blind to hydration (AGENTS gotcha #11 admits it): interaction-first specs race the client bundle
Evidence: `mobile-navigation.spec.ts:19–21` clicks the burger right after `page.goto`;
homenest's `gotoHydrated` + `html[data-hydrated]` sentinel guards exactly this class
(Playwright actionability does not cover React hydration — a pre-hydration click silently
no-ops or falls back to native submit).
Fix (ToDo-17): stamp `document.documentElement.dataset.hydrated = "true"` in CartProvider's
mount effect (the root client boundary); add `tests/e2e/helpers.ts` with
`gotoHydrated(page, url)`; route the mobile-navigation spec through it; one pin spec
asserting the sentinel appears on `/`, `/shop` and a PDP. Update the gotcha #11 claim
("the suite is no longer blind — the sentinel pins it").

### G6 (reference posture) — No web manifest and no app icon: every browser's /favicon.ico request 404s, no installable-PWA metadata
Evidence: no `src/app/manifest.ts`, no `src/app/icon.*`, no `public/` (ls-verified).
Fix (ToDo-18): add `src/app/icon.svg` (a NORDHEM wordmark chip in the brand colors) and
`src/app/manifest.ts` (name/short_name/theme colors `#0058a3`/`#ffdb00`, icon → the icon
route); e2e RED (GET /icon.svg 404 today; no link[rel=icon] / link[rel=manifest]) → GREEN
(both resolve 200 + the link tags present).

### G7 (reference posture) — The mobile e2e project is a bare viewport: no touch, no DPR, no UA — hover-gated Tailwind v4 variants never render the way real phones hit them
Evidence: `playwright.config.ts:28–33` vs homenest's `devices["iPhone 13"]` (same 390×844
viewport + `hasTouch: true` + DPR 3 + real UA). Fix (ToDo-19): switch the mobile project to
`devices["iPhone 13"]`; the three mobile specs must stay green (touch-emulated clicks are
Playwright-native); no new tests — the emulation upgrade IS the change.

Deferred (documented in the PAD register — do NOT "fix"): CSP via proxy.ts (G8 — needs the
per-request-nonce + `await connection()` discipline on every prerendered hydrating page;
deferred with the trap recorded), jsdom component-test layer (G9 — the e2e coverage is
strong; the one candidate pin, search-debounce cleanup, is covered by the settle specs),
plus all prior deferrals (header store-picker wiring into checkout, delivery decrement
redistribution, unthrottled GETs, xff trusted-proxy posture beyond rightmost-hop,
orderNumber collision retry, PDP repeated catalogue reads, cross-tab storage sync,
aggregateRating ratingValue fiction, hover:font-bold glyph jitter, `[m` display-layer trap,
SearchAction decorative posture, offers bundle slug curation, /search autoFocus).

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| F-20 method-switch spec pins the clock (honest-RED: 23:00 SGT pin fails today's spec) | e2e (modified) | F-1 time bomb |
| reviews POST refuses non-number TYPES (rating:true / author:number probes + safety-net cleanup) | e2e (RED) | F-2 coercion |
| track: 10k email → 422 VALIDATION (today 404); promo-validate: 100-char code → 422 VALIDATION (today INVALID_PROMO) | e2e (RED) | F-3 unbounded fields |
| header strip carries the honest attribution (lighting/cookware/decor) | e2e (RED) | F-4 misattribution |
| /offers metadata regex tightened to hold the attribution | e2e (RED) | F-5 metadata rot |
| checkout slot payload === displayed option across the 14:00 SGT crossing (clock + fastForward + intercepted POST fulfilled 422 — no DB write) | e2e (RED) | F-6 display/state divergence |
| drawer closes on param-only navigation (`/shop?cat=bedroom` → Dining → aria-expanded=false) | e2e (RED) | F-7 drawer gap |
| home description derived (PRODUCTS.length/CATEGORIES.length) + pin derives | e2e (modified) | F-8 count drift |
| `clientIp`: multi-hop rightmost / single passthrough / absent → "direct" | unit (RED) | G2 forgeable identity |
| security-header set present + x-powered-by absent | e2e (RED) | G1 fingerprint/policy |
| `jsonLdScript`: `</script>`, U+2028, U+2029 escaped | unit (RED) | G3 serialization |
| SITE_ORIGIN: no raw `https://nordhem.sg` literal in src/app outside utils.ts | unit (fs-pin) | G4 origin drift |
| `html[data-hydrated="true"]` appears on /, /shop, a PDP; mobile spec routes through gotoHydrated | e2e (pin) | G5 hydration blindness |
| /icon.svg + /manifest.webmanifest resolve 200; link[rel=icon]/[rel=manifest] present | e2e (RED) | G6 missing assets |
| mobile project on devices["iPhone 13"]; existing 3 mobile specs stay green | config | G7 emulation |
| existing pins re-run (unit+e2e) | both | money journeys, LOW_STOCK, TOCTOU, settle discipline, metadata blanket, docs-counts |

## 4. Execution order (vertical slices, red → green each)

1. **Test-integrity slice**: ToDo-1 (F-20 clock pin; honest-RED via a temporary 23:00 SGT
   pin proving the bomb live, then the 10:00 SGT deterministic pin).
2. **Boundary-strictness slice**: ToDo-2 (reviews TYPE-strict e2e RED ×2 with cleanup) +
   ToDo-3 (track/promo caps e2e RED ×2).
3. **Rate-limit identity slice**: ToDo-14 (clientIp unit RED ×3 → seam → rewire 4 routes;
   the four "local" fallbacks become "direct").
4. **Security-headers slice**: ToDo-13 (e2e RED → headers() + poweredByHeader → GREEN).
5. **Display-truth slice**: ToDo-4 (strip copy + attribution e2e RED) + ToDo-5 (offers
   metadata + tightened blanket RED).
6. **Temporal-coherence slice**: ToDo-6 (adjust-during-render slot guard; clock+payload
   e2e RED).
7. **Drawer-navigation slice**: ToDo-7 (onClick close + e2e RED — the browser-reproduced
   fix).
8. **Derivation + origin slice**: ToDo-16 (SITE_ORIGIN + fs-pin) + ToDo-8 (home derivation)
   + ToDo-10 (planning-tools derivation) + ToDo-12 (shop layout enumeration).
9. **JSON-LD seam slice**: ToDo-15 (jsonLdScript unit RED ×3 → wire both sites).
10. **Manifest + icon slice**: ToDo-18 (e2e RED → icon.svg + manifest.ts → GREEN).
11. **Mobile-emulation slice**: ToDo-19 (devices["iPhone 13"]; mobile specs re-run green).
12. **Hydration-sentinel slice**: ToDo-17 (stamp + helpers.ts + pin + mobile-spec
    conversion).
13. **Docs lockstep**: ToDo-9/11 + counts sweep (AGENTS/CLAUDE/README/PAD/SKILL to the new
    totals), PAD v1.10.0 (revision block + §11 fix + G8/G9 register rows), SKILL v1.9.0
    (new lessons), worklog Task 125, this plan archived, `.env.example` re-verified
    (contract unchanged), AGENTS gotcha #11 updated.
14. **Full gate**: lint → typecheck → typecheck:tests → unit (new total) → cold build
    (`rm -rf .next`) → e2e (new total, zero residue verified by direct SQL) → dev-server
    screenshots for changed surfaces into `docs/screenshots/`.
15. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py` with the
    mandatory `--remote` override; session log as the follow-up commit.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this run (audit agent
  + my line-level re-reads of the F-20 spec block, the reviews/track/promo routes, the
  header strip + offers metadata vs the catalogue discount math, the checkout options
  derivation + state seam (`set()` at checkout/page.tsx:33), the Header close guard + drawer
  link structure, the home/planning-tools/shop metadata literals, PAD §11, next.config.ts,
  the four XFF sites + rate-limit.ts, both JSON-LD sites, the 17 origin files, the missing
  manifest/icon, playwright.config.ts).
- F-1's fix is test-only; the honest-RED follows the injected-probe precedent (Task-124
  F-2) — temporarily pin the post-cutoff instant, observe the failure, then land the
  pre-cutoff pin.
- F-2's probes write junk reviews on the RED path — each carries a `finally` cleanup keyed
  on the probe's own title (the gotcha #13 + lesson-33 identity discipline); the GREEN path
  refuses (422) so nothing persists.
- F-3's caps mirror the checkout boundary shapes (email ≤254, code ≤32; order number ≤32 —
  `NH-YYYYMMDD-XXXXXX` is 17 chars); the track e2e pattern (request-context POST with XFF
  identity) exists in the storefront spec's boundary block.
- F-6's payload capture uses `page.route` fulfilment (no DB write, no navigation — the
  intercepted POST answers a fixed 422 envelope before `placeOrder` is ever reached);
  `page.clock.setFixedTime` + `fastForward` fake only Date (hydration unaffected — the
  Task-124 F-8 spec comment records this); the adjust-during-render guard follows the
  Header `prevPathname` precedent (no effect-body setState).
- F-7's onClick close is additive to the pathname guard (browser-nav cases keep the old
  path); the e2e RED was browser-reproduced this run (aria-expanded stays true today).
- G2's rightmost-hop derivation keeps every existing single-value XFF identity working
  (rightmost of one hop is the hop); the four routes' shared `"local"` bucket becomes the
  shared `"direct"` bucket (the Task-124 F-14 XFF-identity specs already isolate their
  probes).
- G3's escape set is additive (`<` already escaped at both sites; U+2028/2029 are new);
  the JSON-LD e2e pins `JSON.parse` the script text — benign payloads serialize identically.
- G4's fs-pin follows the docs-counts pattern (read the tree, assert the invariant); the
  robots-sitemap test's own SITE const is the expectation, not a usage site.
- G5's stamp lives in CartProvider's mount effect (the root client boundary — the module
  whose crash class global-error.tsx owns); direct DOM mutation, not setState (the lint
  rule is not engaged); helpers.ts is not collected as a spec (neither project's
  testMatch/testIgnore matches it).
- G6's routes follow the Next conventions (app/icon.svg → /icon.svg with auto link tags;
  app/manifest.ts → /manifest.webmanifest).
- G7 keeps the 390×844 viewport (iPhone 13 is exactly 390×844) — the existing mobile
  assertions are viewport-anchored, not DPR/UA-anchored.
- No new runtime dependencies; no new env variables; `.env.example` contract unchanged;
  the docs-counts pin sweeps all five operator docs at the final counts (count-lockstep,
  no exceptions). Expected new totals: unit 138 + ~7 ≈ 145; e2e 89 + ~9 ≈ 98 — exact
  counts locked by the docs-counts pin at gate time.

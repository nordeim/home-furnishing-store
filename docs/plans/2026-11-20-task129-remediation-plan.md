# Task 129 Remediation Plan — Residue-Net Completion, Enum-Boundary Parity, Business Derived Pin

Date: 2026-11-20 · Scope: NORDHEM (home-furnishing-store) codebase · Branch: `main` only
Method: workspace-refresh re-audit per `skills/web-application/SKILL.md` with the
mobile-navigation + Tailwind v4 taxonomies (agent-browser drawer taxonomy at 390×844/1440×900
on the dev server via 127.0.0.1 — 8/8 PASS: open (aria-expanded=true, label toggles) /
navigate+auto-close / Escape / toggle / hamburger hidden-≥1024 (display:none, 0×0 rect) /
**F-7 param-close regression check** / hydration (`data-hydrated=true` + add-to-bag → badge
"Shopping bag, 1 item") / no horizontal overflow at 390px — **no Tailwind v4 bug**;
sitemap 42 indexable URLs, no lastmod; robots coherent; home + PDP + inspiration og:image
all declare 1200×627 live-verified), execution per `skills/tdd` (red → green, one seam at a
time). `skills/` excluded from checking/testing/compilation (operator contract). Reference
patterns cross-checked against `homenest-store-s`: **still quiescent — zero src/tests
changes since 2026-10-23** (verified: `git log --since=2026-10-23" -- src/ tests/ prisma/`
is empty; HEAD `4771c3d` 2026-11-01 is skills-only; the two skills-catalog md5s MATCH) —
nothing new to port (fifth consecutive cycle).

## 1. Audit baseline (all Verified this run; FRESH rootless PostgreSQL 17 installed by
`docs/setup_pg_z.sh` — no snapshot restore this cycle, the first fully-fresh initdb since
the lesson-31 class appeared; 9 tables + the full DDL contract verified by direct SQL:
`orders_idempotency_key_unique`, `reviews_product_idx`, `inventory_product_store_uq`, no
redundant `products_slug_idx`)

| Gate | Result |
|---|---|
| fresh clone → `5339ed1` (docs-only delta since pushed Task-128 `206ab46`: session_22 log) | clean tree |
| `npm install` | green |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run typecheck` + `typecheck:tests` | GREEN |
| `npm run test` (Vitest) | 163/163 |
| `npm run test:e2e` (Playwright, cold production build :3100; chromium-1255 installed — the cache held 1200, the documented trap, fifth cycle running) | 111/111 |
| DB contract | 9 tables; **zero residue at baseline AND after the full 111-test e2e run** (direct SQL: 0 orders, 0 order_items, 5 seed reviews, 24 products, 72 inventory) |
| Mobile drawer taxonomy (agent-browser @390×844 + desktop @1440×900, dev server via 127.0.0.1) | 8/8 PASS — **no Tailwind v4 bug** (conditional mount, scan guard intact, `lg:` breakpoint renders) |
| Sitemap/SEO | sitemap 42 URLs (12 static + 24 product + 6 inspiration), indexable-only, NO lastModified; robots coherent; og:image dimensions declared on home + PDP + inspiration (Task-128 F-8 live-verified) |
| Full-file audit | two audit agents (deep code audit + docs-truth/reference); every headline finding re-verified by me at line level (the Task-128 lesson-46 discipline) |
| Reference repo | `homenest-store-s`: quiescent, catalogs md5-identical, nothing to port |

## 2. Findings → ToDo (ordered by severity; every item carries file:line evidence verified this run)

### F-1 MEDIUM — "every write-capable refusal spec carries its RED-run finally net" is FALSE: three write-capable refusal specs have no net
Evidence: `tests/e2e/storefront.spec.ts:1902-1923` (the null-qty drop spec — payload
`nullqty-probe@nordhem.sg`; a qty-boundary regression reverts to `Number(null)===0` →
clamp-1 → a REAL order for product 1, exactly the bug the spec pins; no try/finally, no
`deleteProbeOrders`), `:2101-2118` (the overlong-review-body refusal — a cap regression
INSERTS the 3000-char "Truncation Probe" review; no net, unlike its netted Task-125
sibling), `:293-301` (the bad-rating/short-name refusal — a compound-validation regression
INSERTS `{author:"X", rating:9}`; no net). The claim sites: `AGENTS.md:151-152`,
`CLAUDE.md:351-352`, `README.md:272-273`, PAD L52-55. The Task-126 F-2 / Task-128 F-7
program (a net after a failing expect is dead code — cleanup lives in `finally`) stopped
one spec-class short: the REVIEW write-capable specs and the nullqty order spec.
Fix (ToDo-1): wrap each in `try { … } finally { … }` — the nullqty spec gets
`finally { await deleteProbeOrders("nullqty-probe@nordhem.sg"); }`; the two review specs
get author/title-scoped `delete from reviews …` nets in their finally (the Task-125 F-2
sibling pattern), keyed on the probe's own identity (the lesson-33 rule).

### F-2 LOW — One genuinely racy interaction-first bare `page.goto` remains (:1423) plus two letter-violating sites (:1463, :1534); the "zero remain" claim is definition-dependent
Evidence: `:1423` (`await page.goto("/search?q=sofa")` → `waitForTimeout(900)` → two
NEGATIVE assertions → a React-dependent form-submit `.click()` at `:1434`) — the 900ms
sleep is the only hydration guard, precisely the race `gotoHydrated` exists to close; on
a slow machine the click no-ops and the final assert fails (loud flake, never a silent
pass). `:1463` and `:1534` (the stale-error and retry-settle freeze specs) bare-goto then
`fill`/`click`, but their first post-goto assertion is a POSITIVE visibility check on the
client-rendered error box — hydration is proven by construction, so they are
letter-violating under the broad "any interaction later" reading, not racy.
Fix (ToDo-2): convert all three to `gotoHydrated` (GREEN-on-arrival — the sentinel stamps
in a mount effect; the debounce-freeze init scripts only swallow 200–300ms `setTimeout`
calls and are unaffected). The `:593` /family focus probe stays bare (native focus +
computed-CSS read — not an interaction in the click/fill/keyboard sense; verified
hydration-independent).

### F-3 LOW — The checkout enum trio (`deliveryMethod`, `paymentMethod`) still String()-coerces and `promoCode` silently null-drops crafted TYPES — the Task-127 F-2 field-class audit one class over
Evidence: `src/app/api/checkout/route.ts:135` (`["delivery", …].includes(String(body.
deliveryMethod))` — `deliveryMethod: 5` silently rides to the "delivery" default),
`:154` (`paymentMethod: ["card"]` → `String(["card"]) === "card"` → a REAL 201 order on
a crafted TYPE — the exact Task-127 F-2 executed-proof class), `:141` (`promoCode: 42`
→ silent null-drop). The enum SIBLINGS already refuse: `storeSlug` (Task 121 F-7 —
unknown slug → 422) and `deliverySlot` (Task 123 F-3 coherence + Task 127 F-2
TYPE-strictness). The lesson-43 rule: audit boundary strictness by FIELD CLASS — the
enum class was closed on two fields and left open on three.
Fix (ToDo-3): TYPE-strict + whitelist-strict guards on `deliveryMethod` and
`paymentMethod` (present-non-string → 422; present-unknown-string → 422; ABSENT fields
keep the documented "delivery"/"card" defaults — no behavior change for well-formed
clients, all existing specs send valid values, grep-verified) and TYPE-strictness on
`promoCode` (present-non-string-non-null → 422; `promoCode: null` STAYS accepted — it is
the checkout UI's own "no promo" encoding, `checkout/page.tsx:64` always sends the key,
`cart-store.tsx:19` types it `string | null`). e2e RED first: three crafted payloads
(each a 201 writer today → the probe carries its own finally net from ToDo-1's
discipline).

### F-4 LOW — `TRADE_RATE` derivation is unpinned: the business half of Task-128 F-9 got the constant, not the pin
Evidence: `src/app/business/page.tsx:22,55` derive (verified), but `rg TRADE_RATE
tests/` returns nothing — a future revert of the business page to a hand-copied
`0.12`/`"12%"` pair passes every gate (exactly the copy↔math drift class). The family
sibling is fully pinned (`storefront.spec.ts:835-856`); the Task-128 plan deliberately
scoped its pin to the family half.
Fix (ToDo-4): one e2e pin in the family-derived pattern — `gotoHydrated("/business")`,
assert the panel label interpolates `Trade saving (${Math.round(TRADE_RATE * 100)}%)`,
the saving row equals `−{formatSGD(Math.round(LIST_CENTS * TRADE_RATE))}` and the
Estimate row equals `{formatSGD(LIST_CENTS − Math.round(LIST_CENTS * TRADE_RATE))}`,
where LIST_CENTS is the spec-side recomputation of the page's default-quantity list
total (77800×10 + 129800 + 219800 + 34900×2 = 1,197,400 — the UNITS prices are stable
page constants; a unit-price or default-quantity edit fails the pin loudly, the
self-alerting posture). GREEN-on-arrival (the code already derives).

### F-5 LOW — Stale size claim: SKILL.md §7 says `catalog.ts` is "~160 lines"; it is 244
Evidence: `home-furnishing-store_SKILL.md:190` vs `wc -l src/lib/catalog.ts` = 244 (all
substantive counts in the same sentence — 24/8/3/6 — are correct).
Fix (ToDo-5): drop the line-count mention (line counts rot; the file's real contract is
its exports).

### F-6 INFO (fixing — closes the pin's escape hatch) — The producer-side createLocalStore fs-pin is enumeration-scoped
Evidence: `tests/unit/local-store.test.ts:258` hardcodes
`producers = ["src/lib/cart-store.tsx", "src/components/Header.tsx"]` — a fifth store
created in ANY other file (local-store.ts itself, a new component) escapes the pin with
the test green (the audit enumerated all 4 current call sites — all in the two files;
the claim is true today).
Fix (ToDo-6): widen the scan to every `src/**/*.ts(x)` file (recursive readdir, the
same call-regex), keeping the per-file "mints at least one store" guard only for files
that actually mint (files without call sites simply contribute none).

### F-7 INFO (fixing — one assertion) — The checkout array-body guard (`Array.isArray` → 400) is code-verified but spec-unpinned
Evidence: `route.ts:33-34` refuses arrays; the Task-128 e2e probe (`storefront.spec.ts:
328-361`) covers `null` ×4 routes + primitive `5` on checkout — no array body.
Fix (ToDo-7): extend the Task-128 body-shape spec with a `["a"]` checkout probe →
400 BAD_REQUEST (inside the existing test — no count inflation).

### F-8 INFO (fixing — cheap insurance) — The one positive-control write spec cleans up outside a `finally`
Evidence: `storefront.spec.ts:1366-1398` ("a method-coherent slot still places the
order") — `expect(201)` then the delete/restore runs under `if (orderNo)`; a throw
between the 201 and the cleanup (e.g. `res.json()` parse) strands the order + tampines
decrement. Every REFUSAL spec is netted; this positive spec's window is one parse.
Fix (ToDo-8): convert to `try { … } finally { await deleteProbeOrders(
"slot-ok-probe@nordhem.sg"); }` (the shared helper deletes by email and re-derives the
inventory restore — strictly better than the hand-rolled order-number-keyed cleanup).

### F-9 INFO (fixing — robustness) — Two unit fs-pins read cwd-relative paths while siblings use `import.meta.dirname`
Evidence: `tests/unit/utils.test.ts:489` (`readFileSync("src/app/api/checkout/route.ts")`)
and `tests/unit/docs-counts.test.ts:23-24` (`readdirSync("tests/unit")`) — both work
under `npm run test` (cwd = repo root) but break with a confusing ENOENT when vitest
runs from a subdirectory; the `local-store.test.ts:239` precedent resolves via
`path.resolve(import.meta.dirname, "../../", p)`.
Fix (ToDo-9): normalize both to the precedent (repo root =
`path.resolve(import.meta.dirname, "../..")`).

### F-10 INFO (fixing — one word) — An in-file comment says order numbers are "17 chars"; `NH-YYYYMMDD-XXXXXX` is 18
Evidence: `storefront.spec.ts:2040`. Fix (ToDo-10): correct the comment.

### F-11 INFO (fixing — the last store-list literals) — The three-store list is hand-duplicated in three literals instead of deriving from the `STORES` seed
Evidence: `src/app/api/checkout/route.ts:118` (`STORE_SLUGS` array), `src/app/checkout/
page.tsx:127` (three hardcoded `<option>`s), `src/components/Header.tsx:130`
(`["Tampines", "Jurong", "Alexandra"]`). A fourth store in `catalog.ts`'s STORES
requires four coordinated edits; misses fail safely (the boundary 422s unknown slugs)
but the literals are the documented duplication-drift class. `catalog.ts` exports
`STORES` + the `storeName()` display seam (client-safe — BuyBox and track-order already
import from catalog).
Fix (ToDo-11): derive all three sites from `STORES` (route: `STORES.map(s => s.slug)`;
checkout options + Header list: `STORES.map(s => storeName(s.slug))`) —
behavior-preserving (identical values; the storeSlug-refusal and checkout UI specs
already pin the rendered behavior).

### Evaluated and kept deferred / rejected (do NOT "fix" without an operator decision)
- **Array-body asymmetry (checkout 400 vs siblings 422)**: both are 4xx client-fault
  envelopes, never a 500 — the Task-128 plan's documented scope. ToDo-7 pins the
  checkout guard; the siblings' arrays fall to their TYPE-strict field checks.
- **ensureSeed reviews-only partial-seed window** (a crash between the products+
  inventory commit and the review inserts leaves the 5 seed reviews unlanded — the
  early return sees products present): documented tradeoff, honest degrade (Reviews
  (0)), unreachable in practice (single-flight + reset-on-failure retry). The wider
  claim was disproven in Task 126 (AUD-3); this narrower window joins the register note.
- **Home hero Pexels URL literals ×3** (og:image + two `<img>`): editorial page-level
  choice; the og pin asserts dimensions, not provenance. Kept.
- **NODE_ENV pedantry** ("the only variable the code reads"): NODE_ENV is a framework
  runtime flag, not app config. Kept.
- **homenest `clampSearchTerm` (100-char needle cap)**: NORDHEM filters a 24-product
  in-memory catalogue; no value. Noted, not adopted.
- **Standing register rows unchanged**: TRUST_PROXY, CSP, jsdom layer, delivery-decrement
  redistribution, store-picker wiring (ToDo-11 closes the adjacent literal duplication,
  NOT the wiring itself), React cache(), health-503, token codemod, bundle curation,
  unthrottled GETs, orderNumber collision retry, whole-number magnitude bound.

## 3. Test seams (agreed against the codebase contracts — skills/tdd)

| Seam | Tier | Catches |
|---|---|---|
| nullqty spec: `finally { deleteProbeOrders("nullqty-probe@nordhem.sg") }` | e2e (invariant) | F-1a RED-run order residue |
| overlong-review spec: `finally { delete from reviews where author='Truncation Probe' }` | e2e (invariant) | F-1b RED-run review residue |
| bad-rating spec: `finally { delete from reviews where author='X' and body='n/a' }` | e2e (invariant) | F-1c RED-run review residue |
| `:1423`/`:1463`/`:1534` route through `gotoHydrated` | e2e (invariant) | F-2 pre-hydration clicks |
| `paymentMethod:["card"]` / `deliveryMethod:5` / `promoCode:42` → 422 (today 201 ×3, netted) | e2e (RED) | F-3 enum TYPE/whitelist coercion |
| unknown-string enum (`deliveryMethod:"teleport"`) → 422 (today silent default) | e2e (RED) | F-3 whitelist parity with storeSlug/deliverySlot |
| business panel: label + saving + estimate rows derive from `TRADE_RATE` + the default-quantity list total | e2e (derived, GREEN-on-arrival) | F-4 copy↔math drift |
| checkout array body `["a"]` → 400 (extends the Task-128 body-shape spec) | e2e | F-7 the unpinned guard |
| slot-ok spec: `try { … } finally { deleteProbeOrders("slot-ok-probe@nordhem.sg") }` | e2e (invariant) | F-8 stranded-order window |
| producer fs-pin scans all `src/**/*.ts(x)` (every createLocalStore call site ⊆ PERSISTED_STORAGE_KEYS) | unit (widened) | F-6 new-file escape |
| fs-pin paths resolve via `import.meta.dirname` | unit (normalized) | F-9 cwd fragility |
| store-list derivation: `STORE_SLUGS`/options/labels ← `STORES` | behavior-preserving (existing storeSlug + checkout specs pin) | F-11 four-edit drift |
| existing pins re-run (unit + e2e full suites, zero-residue SQL check) | both | money journeys, idempotent replay + ownership, LOW_STOCK/TOCTOU, settle discipline, metadata blanket, docs-counts |

## 4. Execution order (vertical slices, red → green each)

1. **Residue-net slice (F-1 + F-8)**: ToDo-1 (three finally nets) + ToDo-8 (the slot-ok
   try/finally). Invariant changes — GREEN-on-arrival; the nets must be RED-run-proof by
   construction (finally, never after-assert).
2. **Enum-boundary slice (F-3)**: ToDo-3 — e2e RED first (the crafted-trio probe with
   its own finally net; expect 201-today → observe RED) → the route guards
   (deliveryMethod/paymentMethod TYPE+whitelist, promoCode TYPE-strict-null-kept) →
   GREEN + sibling specs re-run (all existing payloads send valid values).
3. **Derived-pin slice (F-4)**: ToDo-4 — the business TRADE_RATE pin,
   GREEN-on-arrival.
4. **Array-probe slice (F-7)**: ToDo-7 — extend the Task-128 body-shape spec.
5. **Hydration-gate slice (F-2)**: ToDo-2 — the three gotoHydrated conversions,
   GREEN-on-arrival.
6. **Seam-tightening slice (F-11 + F-9 + F-10 + F-6 + F-5)**: ToDo-11 (store-list
   derivation ×3 sites), ToDo-9 (fs-pin path normalization), ToDo-10 (comment),
   ToDo-6 (producer-pin widening), ToDo-5 (SKILL §7 line-count fix).
7. **Docs lockstep**: counts sweep (AGENTS/CLAUDE/README/PAD/SKILL to 163 unit / 113
   e2e — the docs-counts pin enforces all five), PAD v1.14.0 (revision block + register
   notes), SKILL v2.3.0 (new lesson: a write-capable spec is a write-capable spec —
   the refusal/positive distinction is not a net boundary), worklog Task 129, this plan
   archived, `.env.example` re-verified (contract unchanged — no new env variables).
8. **Full gate**: lint → typecheck → typecheck:tests → unit (163) → cold build
   (`rm -rf .next`) → e2e (113, zero residue verified by direct SQL) →
   dev-server screenshots of the changed surfaces into `docs/screenshots/`.
9. Single Conventional Commit to `main`, push via `docs/ssh_git_wrapper_v3.py` with the
   mandatory `--remote` override; session log as the follow-up commit.

## 5. Plan validation against the codebase (done before execution)

- Every file named above exists and the cited lines were re-verified this run by direct
  read; F-1's three specs confirmed netless and their RED paths confirmed WRITERS by
  reading the routes' validation order (a regression of each pinned boundary inserts a
  real row — the net is load-bearing, not ceremonial).
- F-2's three sites read in context; `:1423`'s click is React-dependent (form submit),
  `:1463`/`:1534`'s first post-goto assertions are positive visibility checks on the
  client-rendered error box; the `:593` focus probe verified hydration-independent
  (native focus + computed style).
- F-3's guards mirror the storeSlug (Task 121 F-7) and deliverySlot (Task 127 F-2)
  patterns; the UI contract verified — `checkout/page.tsx:60-66` always sends
  `promoCode: string | null` (null MUST stay accepted) and valid method strings; every
  existing spec sends valid enum values (grep-verified, 20 payload sites); absent
  fields keep documented defaults (the Task-127 stance).
- F-4's pin math verified: UNITS defaults {desk:10, meet4:1, pantry:1, locker:2} →
  778000+129800+219800+69800 = 1,197,400 cents; `TRADE_RATE` exported from utils
  (already imported by business/page.tsx); `formatSGD` importable in the spec (the
  family-pin precedent interpolates constants).
- F-6's widened scan: the call-regex `(?:<[^>]*>)?\(\s*("[^"]+"|[A-Z][A-Z0-9_]*)`
  verified against all 4 current call sites; catalog.ts/local-store.ts themselves
  contain no call sites (the factory definition only).
- F-11's derivation verified behavior-preserving: STORES slugs are exactly
  tampines/jurong/alexandra; `storeName()` maps each to the exact labels the three
  sites render today; catalog.ts is client-safe (BuyBox/track-order import precedent).
- No new runtime dependencies; no new env variables; the docs-counts pin sweeps all
  five operator docs at the final counts. Expected new totals: unit 163 (widened/
  normalized tests, no new blocks); e2e 111 + 2 (the enum-trio probe, the business
  derived pin) = 113 — exact counts locked by the docs-counts pin at gate time.

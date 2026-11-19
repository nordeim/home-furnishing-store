# Session 20 — Task 127 (boundary-type parity, replay ownership, derived-copy completion)

Workspace reset again — fresh clone to `33dea5e` (docs-only delta since the pushed Task-126 `fbd7ac8`). Rootless PostgreSQL 17.12: the snapshot had lost the initdb runtime subdirectories (`pg_notify`, `pg_stat*`, `pg_tblspc`, `pg_logical/snapshots`, …) — restored by a recursive no-clobber merge from a fresh `initdb` template (preserving `base/`/`pg_wal`; the SKILL lesson-31 class). 9 tables, DDL intact (`orders_idempotency_key_unique`, `reviews_product_idx`, no redundant `products_slug_idx`). npm install green; chromium-1255 installed (cache held 1200 — the documented trap, third cycle running).

## Baseline (all green, zero residue)

lint 0/0 · typechecks clean · 156/156 unit · 104/104 e2e COLD · orders 0, reviews 5, inventory at seed — and zero residue after the full e2e run. The Task-126 discipline held.

## Live verification (agent-browser, dev server via 127.0.0.1)

Mobile drawer taxonomy 8/8 at 390×844 + 1440×900: open / navigate+auto-close / Escape / toggle / hamburger display:none ≥1024 / F-7 param-close regression check (`/shop?cat=dining` → drawer Bedroom → `/shop?cat=bedroom` + `aria-expanded=false`) / hydration (`data-hydrated=true` + add-to-bag → badge "Shopping bag, 1 item") / utility strip (right edge 374 < 390). Sitemap 42 indexable URLs, no lastmod; robots coherent. **No Tailwind v4 bug.** The M-1 regression was browser-confirmed live here (the PDP "Delivery, assembly" details rendered `&amp;` literally).

## Audit (two agents: deep code audit + homenest-store-s reference; every headline re-verified at line/byte level — M-1 browser-confirmed, M-2 re-proven with an executed array-coercion proof)

10 findings (F-1/F-2 MEDIUM, F-3..F-9 LOW, F-10 INFO), plus:

- homenest reference: **zero new src/tests material since 2026-10-23** (7/7 post-snapshot commits touch skills/ only; skills catalogs md5-identical between repos). Ported: the ownership-bound replay (F-5 — its `order-access.ts` S6-8/S7-2 discipline), the `getRandomValues` secure-context fallback (F-6 — its session-7 S7-10 lesson), the 23505 constraint-name discrimination as a register annotation (F-10).
- Two audit claims **REJECTED with evidence**: qty clamp-vs-refuse (the clamp IS the documented AGENTS contract — a different class from crafted-TYPE coercion) and the deploy-order note (DEPLOYMENT.md §4→§5→§6 already sequences it).

## TDD execution (RED observed before every behavior change)

- **Boundary-type slice (F-1/F-2/F-3)**: PDP ampersand e2e RED (the browser-predicted render) → plain `&` in the template literal → GREEN. Checkout free-text e2e RED (fully array-typed payload → 201; finally-net held) → typeof guards on email/fullName/phone/postal/address/deliverySlot (present-non-string → 422; absent fields fall to documented defaults) → GREEN. `?max=` e2e RED (abc → 200) → `/^\d+$/` whole-number guard (the reviews-GET discipline) → GREEN.
- **Derived-copy slice (F-4)**: GST_RATE ×7 (incl. two metadata sites + the Footer), FREE_DELIVERY_THRESHOLD_CENTS on the shop pair (incl. SERP metadata), the offers FLAT20 copy deriving from the PROMOS row, the family voucher rule ×3 deriving from FAMILY_VOUCHER_CENTS/FAMILY_POINTS_PER_VOUCHER; the GST + family + priceValidUntil e2e pins derive from the imported constants; metadata-blanket + shop-SSR + family specs re-green (12/12).
- **Replay-ownership slice (F-5)**: e2e RED (same key + different email → 200 + the victim's order number) → `resolveReplay()` — the case-insensitive email gate on BOTH paths (mismatch → 422 REPLAY_MISMATCH, never disclosure) + the fast path hoisted above bag/promo validation + the route's empty-bag refusal deferred to placeOrder when a key is present (an emptied-bag post-success resubmit now replays — the spec's empty-bag assertion was RED against the pre-hoist code exactly as designed) → GREEN with all idempotency/journey/concurrent/boundary siblings.
- **Mint + calendar slice (F-6/F-7)**: mint fallback unit RED (deterministic getRandomValues stub exposed the Math.random path) → 128-bit crypto-hex fallback (Math.random only as the both-absent last resort) → GREEN ×2. campaignEnd SGT unit RED ×3 (the UTC-server divergence instant; the strict-< end instant; the true-instant ISO) → the UTC+8 calendar derivation (Dec 28 00:00 SGT = Dec 27 16:00 UTC) + the label formatting with `timeZone: "Asia/Singapore"` + the PDP priceValidUntil rendering the SGT calendar date (en-CA) instead of the UTC ISO slice (a day early on any non-SGT server) → GREEN; the Task-121 roll pins stay green.
- **Hydration-gating slice (F-9)**: the 21 interaction-first storefront blocks (mechanically identified: goto followed by an interaction within the block) converted to `gotoHydrated` — GREEN-on-arrival; DOM-assertion-only specs (JSON-LD, metadata, javaScriptEnabled:false pair) stay bare by design; the docs' "interaction-first specs" claim is now true for both spec files.
- **Docs-truth slice (F-8/F-10)**: dotenv attribution swept ×5 operator-doc sites to the Next-loader truth; the PAD register annotated with the 23505 constraint-name discrimination path.

## Gates after remediation

lint 0/0 · typechecks clean · **161/161 unit** (156 + 5: mint fallback ×2, campaignEnd SGT ×3) · **108/108 e2e COLD** (104 + 4: PDP ampersand, checkout free-text TYPE, ?max= whole-number, replay ownership) · cold build green (rm -rf .next first) · **ZERO DB residue** after the full suite (direct SQL: orders 0, reviews 5, order_items 0, inventory at seed).

## Docs lockstep

AGENTS (161/108, Tasks 117–127, the Task-127 pin list), CLAUDE (Task-127 seams paragraph, last_updated, counts), README (counts, Task-127 current-cycle paragraph), PAD **v1.12.0** (revision block incl. the two evidence-based rejections + the F-10 register annotation), SKILL **v2.1.0** (lesson 41 amended + lessons 42–44: JSX entities vs template literals / boundary strictness audited by field class / the SGT-calendar discipline for every date seam), worklog Task 127, the plan archived in docs/plans/, .env.example re-verified (single-variable contract unchanged — no new env variables).

## Screenshots

6 fresh captures (docs/screenshots/48–53): PDP delivery ampersand fix, shop derived copy, family derived voucher, offers derived FLAT20, cart derived GST, mobile drawer. All verified non-blank (pixel-ratio check).

**Task 127 delivered — gates lint 0/0 · 161/161 unit · 108/108 e2e (cold) · zero DB residue; pushed via the SSH wrapper, remote verified.**

# Session 22 — Task 128 (body-shape guards, recall parity, derived-pin completion)

Workspace reset again — fresh clone to `2a7f68b` (docs-only delta since the pushed Task-127 `ac93496`: session_21). Rootless PostgreSQL 17.12: the snapshot lost the initdb runtime subdirectories AGAIN (the SKILL lesson-31 class, **fourth cycle running**) — restored by the recursive no-clobber merge from a fresh `initdb` template (preserving `base/`/`pg_wal`), then `docs/setup_pg_z.sh` started it clean. 9 tables, DDL intact (`orders_idempotency_key_unique`, `reviews_product_idx`, `inventory_product_store_uq`, no redundant `products_slug_idx`). npm install green (420 packages); chromium-1255 installed (cache held 1200 — the documented trap, fourth cycle running).

## Baseline (all green, zero residue)

lint 0/0 · typechecks clean · 161/161 unit · 108/108 e2e COLD · orders 0, order_items 0, reviews 5, inventory at seed — and zero residue after the full e2e run. The Task-126/127 discipline held.

## Live verification (agent-browser, dev server via 127.0.0.1)

Mobile drawer taxonomy 8/8 at 390×844 + 1440×900: open (aria-expanded=true, label toggles) / navigate+auto-close / Escape / toggle / hamburger display:none ≥1024 / F-7 param-close regression check / hydration (`data-hydrated=true` + add-to-bag → "Shopping bag, 1 item") / no horizontal overflow at 390. Sitemap 42 indexable URLs, no lastmod; robots coherent. **No Tailwind v4 bug.** F-1 browser-confirmed live here (null body → 500 on all four POST routes; `5` → 500 on checkout), F-5 confirmed (`?q=%20solbakken%20` → 0 vs `?q=solbakken` → 1), F-8 confirmed in the rendered heads (inspiration og:image lacks dimensions; home + PDP declare them).

## Audit (two agents: deep code audit + homenest-store-s reference; every headline re-verified at line/byte level)

12 findings (F-1/F-2 MEDIUM, F-3..F-9/F-11/F-12 LOW, F-10/F-13 INFO), plus:

- homenest reference: **quiescent since 2026-11-01 — zero new src/tests material since 2026-10-23** (all 8 post-boundary commits touch skills/ + two session logs; root docs frozen at `ff65bd2`; skills catalogs md5-identical between the repos). Nothing new to port.
- One reference-agent claim **DISPROVEN by direct read**: the "rate-limit.ts:31 corruption" flag — the line is `return hops[hops.length - 1];` (clean; typecheck + the 161-unit baseline corroborated). The task-127 lesson applied: agent output is a hypothesis until verified.
- F-10 (whole-number magnitude bound) and F-13 (journey hardcoded amounts — self-alerting) deferred to the PAD register.

## TDD execution (RED observed before every behavior change)

- **Body-shape slice (F-1)**: e2e RED (null → Expected 400, Received 500, exactly as browser-predicted) → the shape guard beside the parse guard on all four POST routes (checkout refuses arrays too) → GREEN.
- **Recall-trim slice (F-5)**: e2e RED (padded needle → 0 results) → `.trim()` in the products route → GREEN.
- **Derived-pins slice (F-3/F-9)**: `FAMILY_POINTS_PER_DOLLAR` + `TRADE_RATE` constants; family calculator/copy/metadata + business calculator/copy derive; three e2e pins added (family voucher + earn rate, shop GST/threshold strip incl. SERP metadata, offers FLAT20 from the PROMOS row) — GREEN-on-arrival.
- **SEO slice (F-8)**: inspiration og:image declares 1200×627; the og pin's route list extended → GREEN.
- **Seam-tightening slice (F-6/F-4/F-11)**: the route imports `IDEMPOTENCY_KEY_RE` (fs-pinned, no inline literal); `orderNumber` getUTC* swap (TZ-pure); the Footer year on the SGT clock.
- **Test-integrity slice (F-2/F-7/F-12)**: 13 interaction-first gotos converted to `gotoHydrated` (12 audit-found + a /cart site its sweep missed — mechanically re-identified this cycle; the method-switch family's mid-test navigations included) — GREEN-on-arrival, zero remain (34 call sites); the overlong-fields spec wrapped in `finally { deleteProbeOrders }`; the producer-side fs-pin (`createLocalStore` keys — literal AND constant — ⊆ `PERSISTED_STORAGE_KEYS`).

## Gates after remediation

lint 0/0 · typechecks clean · **163/163 unit** (161 + 2 fs-pins) · **111/111 e2e COLD** (108 + 3: non-object body probe, offers FLAT20 pin, shop strip pin) · cold build green (rm -rf .next first) · **ZERO DB residue** after the full suite (direct SQL: orders 0, order_items 0, reviews 5, inventory at seed — 0..46 matching the (id*37)%40 +8/-4/-10 formula).

## Docs lockstep

AGENTS (163/111, Tasks 117–128, the Task-128 pin list + the gotoHydrated-completion note), CLAUDE (Task-128 seams paragraph, last_updated, counts), README (counts, Task-128 current-cycle paragraph), PAD **v1.13.0** (revision block incl. the rate-limit disproof + the F-10/F-13 register deferrals), SKILL **v2.2.0** (lessons 45–46: a parse guard proves the body parses, not that it is a record / a docs claim about pins must be verified against the pins, not the code), worklog Task 128, the plan archived in docs/plans/, .env.example re-verified (single-variable contract unchanged — no new env variables).

## Screenshots

6 fresh captures (docs/screenshots/54–59): family derived earn-rate, business derived trade rate, shop derived strip, offers derived FLAT20, inspiration og-dimensions surface, mobile drawer. All verified non-blank (pixel-ratio check).

**Task 128 delivered — gates lint 0/0 · 163/163 unit · 111/111 e2e (cold) · zero DB residue; pushed via the SSH wrapper, remote verified.**

# Session 18 — Task 126 (idempotent checkout, test-residue parity, derived copy)

Workspace reset again — fresh clone to `cbb6131` (docs-only delta since the pushed Task-125 `6bd5ae9`). Rootless PostgreSQL 17 installed FRESH this time (no snapshot to restore — `docs/setup_pg_z.sh` ran end-to-end: deb download, initdb, scram TCP, the app_db bootstrap; schema pushed; 9 tables verified). npm install + chromium-1255 (the cache held 1200 — the documented trap, second cycle running).

## Baseline (all green, zero residue)

lint 0/0 · typechecks clean · 145/145 unit · 97/97 e2e COLD · orders 0, reviews 5, inventory 0 mismatches vs the seed formula — and zero residue after the full e2e run. The Task-125 discipline held.

## Live verification (agent-browser, dev server via 127.0.0.1)

Mobile drawer taxonomy 6/6 at 390×844 + 1440×900: open / navigate+auto-close / Escape / toggle / hamburger display:none ≥1024 / **F-7 param-close regression check** (`/shop?cat=bedroom` → drawer Dining → `/shop?cat=dining` + aria-expanded=false — last cycle's fix holds). Hydration: `html[data-hydrated]="true"` + add-to-bag → badge "Shopping bag, 1 item" live. Utility strip right edge 374 < 390. Sitemap 42 indexable URLs, robots coherent. **No Tailwind v4 bug.**

One tooling lesson re-learned: an `agent-browser get url` read immediately after a client-side navigation can return the PRE-navigation value — re-read before concluding anything from it.

## Audit (two agents: deep code audit + homenest-store-s reference review; every headline re-verified at line/byte level)

10 findings planned (F-1 MEDIUM idempotency / F-2 MEDIUM test-residue / F-3..F-8 LOW / F-9 INFO), plus:

- **AUD-3 DISPROVEN** (insert-order analysis): the claimed ensureSeed "partial-seed blind spot for promotions/inspirations" is unreachable — categories → stores → products → promotions → inspirations all insert BEFORE inventory, so the products+inventory early return can never skip them. The genuine window (crash between inventory and the seed-reviews loop) strands only the 5 seed reviews — the documented first-time-only design.
- **L-5 REJECTED** after evaluation: "Today 2pm cutoff contradicts the 2-hour ready promise" — the copy reads as a WITHIN-2-hours maximum; an order at 13:59 for 14:00 satisfies it.
- **H-1 (XFF TRUST_PROXY)**: real (rightmost-hop parsing is still client-controlled in a no-proxy deploy) but it IS the documented deferral — the TRUST_PROXY design sketch is now named in the PAD register for the operator (it would change the single-variable env contract pinned across all five docs).
- homenest reference: zero new src/tests material since the Task-125 snapshot (every post-2026-10-23 commit touches skills/ only — commit-stat verified). Ported: idempotent checkout (F-1), twitter-card/priceValidUntil/OG-dimensions (F-8), the S51-1 orderBy trap (F-7's tie-break), the HTML reporter (F-9).

## TDD execution (RED observed before every behavior change)

- **F-2 test-residue**: honest-RED by temporarily reverting the lines cap → the 101-line spec failed with a STRANDED 101-row order (SQL: 1 order + 101 items, products 1–20 tampines decremented). En-route discoveries: (a) the storeSlug-revert probe proved the unknown-slug spec's 201 path requires the availability check broken TOO (click-collect + unknown slug refuses LOW_STOCK naturally — the crafted slug scopes the inventory query to nothing); (b) the Task-123-era `if (res.status() === 201)` net was DEAD CODE on its own RED path (the failed expect THROWS past it). All six nets now live in `finally` blocks via the shared `deleteProbeOrders(email)` helper (deletes by email, restores the inventory re-derived from the inserted order_items — the payload's lines may have been dropped by the boundary, the inserted rows are the only truth). Net proven live: with the cap still reverted, the spec failed BUT cleaned to zero residue.
- **F-1 idempotency**: e2e RED ×2 (replay: two 201s with different numbers; UI: no key in the payload) → `orders.idempotency_key` (nullable unique — push-verified) + `placeOrder → { order, replayed }` with the pre-transaction fast-path + the pg-23505 race catch (`.code` and `.cause` checked) + the route's shape-gated drop-to-null + the client's `useState(() => mintIdempotencyKey())` (one key per mount, KEPT across error-path retries — the UI pin submits twice after a refused first and asserts the same key) → GREEN + intermediate full suite 99/99. Unit: mint shape/distinctness/the randomUUID-throws fallback (crypto redefined via Object.defineProperty)/the boundary regex.
- **F-3 derived copy**: `catalogMaxDiscountPercent()` unit RED → seam in catalog.ts → 5 discount sites interpolated (hero, strip, offers metadata ×2, offers copy — the offers metadata templates at module scope) + 8 fee-copy sites derived from the `*_DELIVERY_*` constants (`$${cents/100}` preserves the marketing style) + the 3 e2e pins derive from the imported seam. My first help-page edit accidentally dropped the metadata export — caught by review, restored.
- **F-5 read-boundary TYPE parity**: e2e RED (track numeric orderNumber → 404; promo numeric code → INVALID_PROMO; subtotal "15000" → 200; reviews GET ?productId=1.5 → 200) → typeof guards + the whole-number-string productId → GREEN with the Task-125 F-3 sibling.
- **F-6/F-7 seams + schema**: `PERSISTED_STORAGE_KEYS` in local-store.ts + both crash boundaries + the fs-pin; schema DDL pushed (redundant `products_slug_idx` dropped, `reviews_product_idx` added, orderItems `default(0)` removed — index states SQL-verified) + the reviews `desc(createdAt), desc(id)` tie-break with a SQL-seeded same-timestamp pin (GREEN-on-arrival invariant, the SITE_ORIGIN precedent).
- **F-8 SEO**: e2e RED ×3 → root-layout `twitter.card` (inherits everywhere) + true OG 1200×627 dimensions (every Pexels URL pins them) + `priceValidUntil` from the rolling `campaignEnd()` seam → GREEN. Live-verified in the DOM: `"2026-12-28"`.
- **F-4/F-9 docs-truth + reporter**: .env.example origin note corrected (SITE_ORIGIN single-sourcing) + Next-loader attribution (pinned by the extended env-example test); the XFF spec comment fixed (rightmost hop); the ilike claims corrected ×2; dotenv REMOVED via npm uninstall (unused since the lineage); playwright HTML reporter (`open: "never"`).

## Gates after remediation

lint 0/0 · typechecks clean · **156/156 unit** (145 + 11) · **104/104 e2e COLD** (97 + 7) · cold build green (rm -rf .next first) · **ZERO DB residue** after the full suite (direct SQL: orders 0, reviews 5, inventory at seed).

## Docs lockstep

AGENTS (156/104, Tasks 117–126, the Task-126 pin list + both disproofs), CLAUDE (Task-126 seams paragraph, counts, last_updated), README (counts, Task-126 current-cycle paragraph), PAD **v1.11.0** (revision block with the AUD-3 disproof + the register updates incl. the TRUST_PROXY sketch, the L-5 rejection, the L-3 token-codemod note, the C-6 health-503 note), SKILL **v2.0.0** (lessons 39–41: dead-code safety nets / insert-order reachability analysis / the three-part idempotency pattern), worklog Task 126, the plan archived, `.env.example` updated + its claims pinned. Docs-counts 20/20.

## Screenshots

6 fresh captures (docs/screenshots/42–47): home hero derived copy, offers derived copy, services derived fees, PDP (priceValidUntil), checkout derived fee sublabels, mobile drawer with the derived strip. All verified non-blank (pixel-ratio check).

**Task 126 delivered — gates lint 0/0 · 156/156 unit · 104/104 e2e (cold) · zero DB residue; pushed via the SSH wrapper, remote verified.**

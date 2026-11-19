# Session 23 — Task 129 (residue-net completion, enum-boundary parity, business derived pin)

Workspace fully reset — fresh clone to `5339ed1` (docs-only delta since pushed Task-128 `206ab46`: session_22). **A FRESH rootless PostgreSQL 17.12 installed by `docs/setup_pg_z.sh`** — the pg snapshot was entirely absent this cycle, so no lesson-31 subdirectory restore was needed for the first time since the class appeared; `drizzle-kit push` created the 9 tables and the full DDL contract was verified by direct SQL (`orders_idempotency_key_unique`, `reviews_product_idx`, `inventory_product_store_uq`, no redundant `products_slug_idx`) before any gate ran. npm install green; chromium-1255 installed (cache held 1200 — the documented trap, fifth cycle running).

## Baseline (all green, zero residue)

lint 0/0 · typechecks clean · 163/163 unit · 111/111 e2e COLD · orders 0, order_items 0, reviews 5, inventory 72 — and zero residue after the full e2e run.

## Live verification (agent-browser, dev server via 127.0.0.1)

Mobile drawer taxonomy 8/8 at 390×844 + 1440×900: open (aria-expanded=true, label toggles) / navigate+auto-close / Escape / toggle / hamburger display:none ≥1024 (0×0 rect) / F-7 param-close regression check / hydration (`data-hydrated=true` + add-to-bag → "Shopping bag, 1 item") / no horizontal overflow at 390. **No Tailwind v4 bug.** Sitemap 42 indexable URLs, no lastmod; robots coherent; og:image 1200×627 live-verified on home + PDP + inspiration.

## Audit (two agents: deep code audit + docs-truth/reference; every headline re-verified at line level)

11 findings (F-1 MEDIUM, F-2..F-5 LOW, F-6..F-11 INFO→fixed). The headline — **the residue-net claim was half false** — was found by the docs-truth agent reading every checkout-POST spec block: the nullqty order probe, the overlong-review-body probe and the bad-rating probe all WRITE on their RED paths with no finally net, while four operator docs claimed the discipline complete. The enum-coercion finding (F-3) was dev-server-verified live pre-fix: `paymentMethod: ["card"]`, `deliveryMethod: 5` and `promoCode: 42` each placed a REAL 201 order (residues cleaned). The docs-truth pass otherwise verified all ten Task-128 seams HELD plus every README/API/design-token/local-context/env/command claim TRUE. Reference repo: still quiescent (zero src/tests changes since 2026-10-23, git-log-verified), skills-catalog md5s MATCH — nothing to port, fifth consecutive cycle.

## TDD execution (RED observed before every behavior change)

- **Residue-net slice (F-1 + F-8)**: three finally nets (nullqty → `deleteProbeOrders`; the two review probes → author/title-scoped deletes) + the slot-ok positive control moved into `try/finally { deleteProbeOrders }` — invariant, GREEN-on-arrival.
- **Enum-boundary slice (F-3)**: e2e RED (5 crafted payloads, all 201 writers today, netted) → deliveryMethod/paymentMethod TYPE-strict + whitelist-strict (present-but-invalid → 422, absent keeps the documented default), promoCode TYPE-strict with `promoCode: null` kept as the checkout UI's own "no promo" encoding (checkout/page.tsx always sends the key) → GREEN (422 ×5 + null-promo 201 preserved, dev-verified).
- **Derived-pin slice (F-4)**: the business TRADE_RATE pin — label + saving + estimate rows derive from the constant + the default-quantity list total (the family-pin pattern) — GREEN-on-arrival.
- **Array-probe slice (F-7)**: the `["a"]` checkout probe inside the Task-128 body-shape spec (400 BAD_REQUEST).
- **Hydration-gate slice (F-2)**: the search-freeze spec's genuinely racy bare goto (sleep-then-click) + its two letter-violating freeze-spec siblings → `gotoHydrated` (38 call sites in the storefront spec now, 40 both files).
- **Seam-tightening slice (F-11/F-9/F-10/F-6/F-5)**: the store list derives from `STORES` via `storeName()` at all three sites (route whitelist, checkout options, Header picker — live-verified identical values); the IDEMPOTENCY_KEY_RE + docs-counts fs-pins resolve from `import.meta.dirname`; the 18-chars comment; the producer fs-pin walks every `src/**/*.ts(x)` with a ≥4 floor; the SKILL's stale "~160 lines" claim dropped.

## Gates after remediation

lint 0/0 · typechecks clean · **163/163 unit** · **113/113 e2e COLD** (111 + 2: the enum-trio probe, the business TRADE_RATE pin) · cold build green (rm -rf .next first) · **ZERO DB residue** after the full suite (direct SQL: orders 0, order_items 0, reviews 5, inventory 72).

## Docs lockstep

AGENTS (113 e2e, Tasks 117–129, the Task-129 pin list), CLAUDE (Task-129 seams paragraph, last_updated, counts, the gotoHydrated live-count correction), README (counts, Task-129 current-cycle paragraph), PAD **v1.14.0** (revision block + register notes incl. the ensureSeed reviews-only window + the fresh-PG environment record), SKILL **v2.3.0** (lessons 47–48: a write-capable spec is a write-capable spec — the refusal/positive distinction is not the net boundary / an enum field's silent default is a coercion hole — and check the UI's own null encoding before refusing nulls), worklog Task 129, the plan archived in docs/plans/, .env.example re-verified (single-variable contract unchanged).

## Screenshots

5 fresh captures (docs/screenshots/60–64): business derived trade rate, checkout derived store options, header derived store picker, search settle surface, mobile drawer. All verified non-blank (pixel-ratio check).

**Task 129 delivered — gates lint 0/0 · 163/163 unit · 113/113 e2e (cold) · zero DB residue; pushed via the SSH wrapper, remote verified.**

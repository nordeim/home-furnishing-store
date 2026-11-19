I'll start by internalizing the operating instructions, then set up a structured plan for this complex remediation task. Let me begin with the workspace setup and TODO list.
Repo cloned. Now let me read the core documentation files to understand the project.
The repo has all the referenced skills. Let me read the key ones plus the worklog tail and setup scripts.
Now let me kick off `npm install` and the PostgreSQL setup in parallel while I read the remaining docs and skills.
Now let me run the PG setup script in the background while I read the remaining audit skills.
PostgreSQL is ready. I now have a deep understanding of the project state: Task 125 is complete (145 unit + 97 e2e, gates green), and this session continues the pattern as **Task 126**. Let me wire up the DB and check install status.
9 tables live. Now let me run the baseline gates and check the Playwright browser situation.
The documented chromium trap: cache has 1200 but pinned Playwright needs 1255. Installing in the background while I review the configs.
Test suites are already wired in from prior cycles — my job is to verify integrity and extend. Let me validate the documented Task-125 seams against the actual codebase.
All Task-125 seams verified in the code — docs and codebase are aligned. Let me check the baseline gates.
Baseline: lint 0/0, typechecks clean, 145/145 unit. Now launching the parallel audit agents (deep code audit + homenest-store-s reference review) per the established cycle pattern.
Both audits returned strong findings. Per the established discipline, I must re-verify every headline finding at line level myself. First, let me kick off the e2e baseline and dev server in the background.
e2e baseline and dev server are starting. M-3 needs careful verification — let me analyze the insert order. I can see from `server-data.ts:31-46`: categories → stores → products → promotions → inspirations → inventory. The early-return at :26-28 requires products AND inventory — since inventory inserts LAST (before reviews), any crash leaving products+inventory present means promotions/inspirations already inserted. The audit's M-3 reachability claim looks wrong. Let me verify the remaining findings at line level.
Now verifying the M-2 spec sections and L-11 routes at line level.
M-2 verified — four specs lack the RED-run safety net that siblings carry. Let me verify the remaining findings (L-1, L-4, L-9, L-10, C-2, C-3).
All findings verified. Now let me read the checkout route and `placeOrder` to design the C-1 idempotency fix, and check the e2e baseline.
The `placeOrder` transaction is clear — I can design the idempotency fix precisely. Let me check the checkout page client code and the e2e baseline progress.
E2E 基准测试：**97/97 通过**。开发服务器已启动。我来验证一下零数据库残留，并加载用于实时移动导航检查的 agent-browser 技能。
Zero DB residue — baseline fully green. Now running the live agent-browser checks on the dev server (mobile nav taxonomy per the frontend-ui-testing-journey reference).
The drawer closed but the URL didn't change — suspicious. Let me investigate.
Test 2 PASS (stale URL read earlier — it did navigate to /shop?cat=bedroom and auto-close). Now the F-7 regression check: param-only navigation must close the drawer.
F-7 fix verified live. Continuing the taxonomy: Escape close, toggle, desktop hamburger, hydration.
Tests 3/4/5 PASS. Now the hydration probe (add-to-bag → live badge update) and utility strip check.
Hydration verified live. Now the utility strip check and sitemap/robots verification.
All live checks PASS — mobile nav fully working, no Tailwind v4 bug, SEO surfaces coherent. Let me close the browser and read the remaining files needed for the plan (layout.tsx, Header, promo-validate route).
All verification complete. Now let me check the session-log commit pattern, then write the remediation plan.
All OG image URLs pin `h=627&w=1200` — dimension declarations will be true. Now writing the remediation plan.
Plan written and validated. Updating the TODO list and starting execution.
**Slice 1 (F-2): e2e safety-net backfill.** First the honest RED — temporarily revert the storeSlug whitelist and observe the stranded row.
Spec failed but no residue — unexpected combination. Let me investigate what actually happened.
The honest RED taught me something the audit missed: the unknown-storeSlug spec's RED path refuses LOW_STOCK downstream (click-collect + unknown slug scopes the inventory query to nothing) — no order places. Let me probe the 101-line spec instead, where a 201 genuinely lands.
**HONEST RED ACHIEVED**: spec failed (Expected 422, Received 201) and the residue is live — 1 order + 101 order_items stranded. Now let me add the safety nets to all five specs.
Now let me view the spec's top section to place the shared helper, and fix my call sites to use the cleaner derive-from-rows approach.
Now the nets for the last two specs (promoCode + 101-line bag).
Critical realization: my nets run AFTER `expect(...).toBe(422)` — on a RED run the assertion throws and the net never executes. The existing Task-123 coherence net has the same dead-code flaw. Let me restructure all of them as try/finally (the typeqty pattern).
Now the coherence spec's dead net (Task-123 era) and the last two caps specs.
All six nets in place. Now the net-proof: re-run the 101-line spec with the boundary still reverted — it must still fail but leave zero residue.
Spec passed with the cap supposedly reverted — contradiction. Let me check the actual route source state.
The cap is still reverted in source yet the spec passed — a stale server must be interfering. Let me debug directly.
Let me stop theorizing and directly observe: build + boot the production server with the current (reverted) source and probe it.
My curl payload had a shell-quoting bug (the `$(...)` inside single quotes was literal). Let me fix the probe.
The direct probe confirms: with the cap reverted, a fresh cold build places the order (201). Now the real net-proof — run the spec against this live reverted-cap server. First clean up my manual probe order.
**NET-PROVEN**: spec fails against the reverted boundary (Expected 422, Received 201) AND the finally-net leaves zero residue (orders:0, items:0, inventory at seed). Now restore the boundary.
The 928ms runtime reveals it: the run reused my manually-booted server which still has the reverted build. Let me kill it and re-run against a fresh build.
Slice 1 complete — 6/6 green, zero residue. Now **Slice 2 (F-1): idempotent checkout**. Let me look at the journey's checkout form-filling pattern to reuse for the client-wiring pin.
Now writing the idempotency e2e specs (RED first).
Now observe the RED for both idempotency specs.
RED observed for both specs, and the net cleaned the RED run (orders:0). Now the GREEN. First the schema + placeOrder input.
Now implementing the GREEN — schema column, placeOrder replay semantics, route validation, client mint.
Schema verified: idempotency unique index added, redundant products_slug_idx dropped, reviews_product_idx added. Now the placeOrder replay semantics.
The try-wrap needs reindentation. Let me fix it with a script, then wire the route and client.
Now the client mint helper in utils.ts and the checkout page wiring.
All pieces wired. Now the unit pins for the mint helper, then the GREEN run.
Unit green (57/57 incl. 4 new). Now the e2e GREEN for idempotency.
Slice 2 GREEN. Let me run the full e2e suite as an intermediate checkpoint (placeOrder return type changed — all dependents must stay green).
99/99 green, zero residue. **Slice 3 (F-3): derived marketing copy.** Unit RED first.
RED observed. Now the GREEN — implement `catalogMaxDiscountPercent` in catalog.ts.
Unit GREEN. Now wiring the five discount sites — first check Header and offers imports.
All sites identified. Wiring the derivations now.
Now the offers page, checkout sublabels, cart, PDP, services, and help sites.
The help edit accidentally dropped the metadata export — restoring it.
Now derive the e2e pin expectations from the catalogue.
E2e specs pass but 15 unit tests failed — let me investigate.
All 15 failures are the docs-counts pin — the expected working-red (docs lockstep comes in Slice 8). Continuing with **Slice 4 (F-5): read-boundary TYPE parity**.
Reviews GET confirmed coercing. Let me find the Task-125 boundary spec blocks to extend.
RED observed. Implementing the typeof guards in all three routes.
Slice 4 GREEN. **Slice 5: PERSISTED_STORAGE_KEYS seam + reviews tie-break.**
F-6 done. Now the reviews orderBy tie-break + same-timestamp pin.
Now the same-timestamp pin (SQL-seeded, GREEN-on-arrival invariant per the SITE_ORIGIN precedent).
Slice 5 complete. **Slice 6 (F-8): SEO completion.** RED spec first, then implementation.
RED observed on all three. Implementing the GREEN.
Slice 6 GREEN. **Slice 7 (F-4 + F-9): docs-truth sweep + dotenv removal + HTML reporter.**
Now F-9: the HTML reporter.
All slices implemented. Running the gate chain (lint, typechecks, unit) before the docs lockstep.
Unit: 156 total (141 pass + 15 docs-counts working-red — exactly the lockstep mechanism). Starting the full cold e2e in the background while I do the docs lockstep sweep.
Now the docs lockstep sweep. Let me update AGENTS.md first.
The big block replacement missed — let me take the surgical approach instead.
The tool applied edits sequentially before failing. Applying the remaining AGENTS.md edits individually.
AGENTS.md done. Now CLAUDE.md.
Now README.md.
Now the PAD — version bump, revision block, counts, register.
**104/104 e2e COLD GREEN.** Now the SKILL.md refresh — let me check its lesson structure.
Docs-counts 20/20 — all five docs locked. Full unit verification + zero-residue check, then screenshots.
All gates green (156/156 unit, 104/104 e2e cold, zero residue). Writing the worklog entry.
Worklog done. Now capturing dev-server screenshots of the changed surfaces (42–47).
priceValidUntil live-verified ("2026-12-28"). Capturing checkout + mobile views.
All 6 screenshots captured. Verifying non-blank + final pre-commit checks.
Everything is in place. Running the final verification gate: cold build (per the AGENTS contract) + lint.
All gates green. Writing the session log and committing.
Committed. Now the push via the SSH wrapper — let me read the runbook first.
Runbook understood — the `--remote` override is mandatory for this repo. Setting up the push.
Dry-run green (fast-forward `cbb6131..fbd7ac8`). Executing the real push.
**Push verified independently** — remote `main` = `fbd7ac8` == local HEAD. Key shredded. Final cleanup and verification.
**Task 126 complete — pushed to `main` at `fbd7ac8`, remote verified independently, key shredded.**

**Setup & validation**: Fresh clone at `cbb6131`; all five operator docs + session_16/17 + the Task-125 plan reviewed and validated against the codebase (all seams verified at line level). Rootless PostgreSQL 17 installed fresh via `docs/setup_pg_z.sh` (9 tables, zero residue at baseline). Baseline gates: lint 0/0, 145/145 unit, 97/97 e2e cold.

**Live browser verification (agent-browser)**: Mobile drawer taxonomy 6/6 at 390×844/1440×900 incl. the F-7 param-close regression check — **no Tailwind v4 bug**; hydration live-verified; utility strip, sitemap (42 URLs), robots all coherent.

**Audit** (deep scan + homenest-store-s reference): 10 findings, every headline re-verified at line level; **one audit claim DISPROVEN by insert-order analysis** (the ensureSeed "partial-seed blind spot"); the XFF TRUST_PROXY design recorded for the operator.

**TDD remediation** (RED observed before every change):
- **F-1 MEDIUM — Idempotent checkout**: double-clicks/retries now replay the first order (nullable-unique key, fast-path + pg-23505 race catch, client mints one key per mount, 200-on-replay)
- **F-2 MEDIUM — Test-residue parity**: 5 e2e refusal specs got RED-run safety nets (proven live by reverting the lines cap — a stranded 101-row order cleaned to zero); the Task-123-era net was dead code, rewritten to `finally`
- **F-3/F-5/F-6/F-7/F-8/F-9**: derived marketing copy (`catalogMaxDiscountPercent()` + fee constants), read-boundary TYPE parity, PERSISTED_STORAGE_KEYS seam, schema hygiene (redundant index dropped, reviews index added, id tie-break), SEO completion (twitter:card, true OG dimensions, priceValidUntil), docs-truth sweep (dotenv removed), HTML reporter

**Delivered**: lint 0/0 · **156/156 unit · 104/104 e2e (cold build)** · zero DB residue · 6 screenshots (`docs/screenshots/42–47`) · `.env.example` corrected + pinned · docs lockstep (PAD v1.11.0, SKILL v2.0.0 lessons 39–41) · plan + worklog + session_18.

The deferred register (TRUST_PROXY, CSP, delivery decrement, store-picker wiring, React `cache()`) remains documented for a future cycle.

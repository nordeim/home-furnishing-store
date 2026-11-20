The workspace is fresh. Let me clone the repository and set up a TODO plan for this comprehensive task.
The repo is cloned with extensive prior sessions (36 sessions, tasks up to 135). Let me review the core documents. Given their large size, I'll delegate deep document review to subagents while I read the most recent status files myself.
Good overview. Now let me read the recent session status files myself.
I now have a clear picture: the repo is at Task-135 delivered state (183/183 unit, 129/129 e2e, zero residue). My cycle will be **Task 136**. Let me mark TODO #1-2 progress and check the environment state.
Two key findings: gotcha #10 confirmed (exported shell `DATABASE_URL` SQLite leftover must be unset) and the rootless PG data dir survived the recycle. Let me read the setup script and skill.
The PG binaries and data dir survived the sandbox recycle. Let me unset the shell env trap (gotcha #10), inspect the data dir state for lesson-31 restore needs, and start the server.
The data dir needs the lesson-31 restore: stale postmaster.pid + the 9 missing empty top-level dirs + nested pg_logical pair. Let me restore and start.
PG 17 is up. Now verify the DDL contract and seed state per the established discipline.
DDL contract intact — seed 24/8/3/72/5/0/0/6/3, inventory 1379, zero residue. This matches the documented Task-135 end state exactly. Now npm install + .env setup.
While npm installs, let me examine the most recent code change (Task 135, b449013) to focus the audit on recent changes.
The Task-135 changes are clean and well-documented. Let me check npm install progress and prepare the .env.
Test structure matches docs. Now running baseline gates (lint, typechecks, unit tests).
Lint 0/0, typechecks clean. The Playwright cache has chromium-1200 but the pinned version needs 1255 (the fresh-cache miss precedent). Let me run unit tests and install pinned chromium.
183/183 unit baseline green. Chromium 1255 installed. Now the e2e baseline against the cold production build (a few minutes).
129/129 e2e baseline green. Verify zero DB residue after the run (standard discipline), then start the dev server for the mobile nav taxonomy.
Zero residue confirmed — baseline fully matches the documented Task-135 end state. Now cross-check the reference repo and start the dev server.
The reference repo directory exists but is not a git repo (sandbox recycle). Let me re-clone it and start the dev server in parallel.
Reference repo at HEAD `4771c3d` — same as the last 11 cycles. Let me verify quiescence (no src/tests changes after `ff65bd2`) and start the dev server.
Reference repo quiescent (12th cycle — zero src/tests changes). Dev server running with HTTP 200. Now let me load the agent-browser skill for the mobile nav taxonomy.
agent-browser healthy. Now running the mobile drawer taxonomy (T1–T8) at 390×844 on the dev server.
The viewport wasn't set correctly (needs space-separated args). Let me fix it.
T1 PASS (aria-expanded=true, label toggles Open→Close). Let me verify the drawer panel visibility and run T2 (navigate + auto-close).
Drawer is open. T2: click the drawer's own "Dining" link and verify navigate + auto-close.
Let me read the Header component source to target the drawer's own link precisely.
Now I understand the drawer structure. T2: click the drawer's own Dining link (`div.grid.gap-1 > a`).
T2 PASS. T3: F-7 param-close regression — re-open drawer on /shop, param-only navigation.
T3 PASS (F-7 fix holds). T4: Escape key closes the drawer.
T4, T5 PASS. T6: hamburger hidden at ≥1024px (desktop viewport check).
T6 PASS. T7: hydration check + add-to-bag badge update at mobile viewport.
T7 PASS (badge "Shopping bag, 1 item"). T8: no horizontal overflow at 390px.
Mobile drawer taxonomy **8/8 PASS — no Tailwind v4 bug**. Let me verify the Tailwind v4 posture in code (CSS-first config, colon-form guard) and then run SEO checks.
Tailwind v4 posture confirmed (CSS-first `@theme`, candidate-scan guard in place). Now the SEO verification pass: sitemap, robots, OG, noindex, 404.
SEO pass fully green. Now the deep audit phase — dispatching two audit agents in parallel (deep code + docs-truth) per the established cycle discipline.
Both audits returned 4 code findings + 4 docs findings. Per the lesson-46 discipline, let me re-verify every finding at line level myself before planning.
F-1 VERIFIED at shop-inner.tsx:81-84. Now F-2: the direct `@/db` imports.
F-2 VERIFIED (order page + reviews route import @/db directly vs the golden rule). Now F-3 and F-4 in server-data.ts.
F-3 VERIFIED (comment false; PDP renders "No reviews yet" under outage). Now F-4: read placeOrder's promo sequence.
F-4 VERIFIED (promo read at :256 outside the transaction at :305). Now D-1: verify the CLAUDE.md gotoHydrated claim and count sites myself.
Raw string counts (45/3) vs docs claims (42+2). Let me count actual call sites precisely.
D-1 VERIFIED (fs: 42 storefront + 2 mobile = 44; CLAUDE's "42 across the two files" + "three conversions" garbled). Let me verify D-2, read the rest of placeOrder, and check the standing register for F-2/F-3 overlap.
D-2 verified (cosmetic — parenthetical only). Now confirm F-2/F-3/F-4 are not already registered deferrals in PAD §10.
Register verified — F-2/F-3/F-4 are genuine unregistered findings. Now let me read the F-2 sites (order page, reviews route, health route) to design the funnel fix.
Now let me check all `@/db/schema` importers and the existing server-data fs-pin test to design the F-2 refactor.
Let me verify those suspicious lines in ReviewSection.tsx with the Read tool directly.
Display artifact only — code is correct. Now let me study the Task-135 envelope-trust probe pattern in the e2e spec to mirror it for the shop-inner probe.
Now let me check shop-inner's error-state UI and how the existing shop fetch-failure spec asserts it.
Let me examine the remaining probe precedents and validatePromo's full body for the F-4 design.
Let me read the remaining server-data fs-pins to ensure my planned changes won't break existing pins.
I have everything needed. Now let me write the Task-136 remediation plan (the user's requested comprehensive plan with detailed ToDo list).
All anchors verified. Writing the Task-136 remediation plan.
Plan written and anchors validated. Let me verify two final details for the plan: the checkout route's OrderRefusalError mapping and ReviewSection's full render + PDP JSON-LD block.
All details confirmed. Plan validated. Now executing TDD — **Slice A (F-1)**: TRUE RED first (the e2e probe against the current shop grid).
Now observe TRUE RED by running just the new probe.
TRUE RED observed (no alert; false verdict renders). Now the GREEN change — the envelope gate in shop-inner.
Still RED — likely a stale build. Let me check the playwright config's webServer reuse behavior.
`reuseExistingServer` is reusing the stale pre-fix build on :3100. Let me kill it so the fix gets built.
Still failing — let me see the actual failure detail now.
The page rendered the real dining products — the chip click is an RSC navigation that re-ships the view server-side, so the effect intentionally skips. The client fetch fires on the LOCAL keyword/max filters. Let me verify shop-inner's state model.
Confirmed — the client fetch fires on local `q`/`max` filters. Let me check the render branches for the empty state to finalize the probe.
The render branches are clear. Let me fix the probe to use the local keyword filter (which is what actually fires the client fetch).
Now to observe the honest TRUE RED for the corrected probe, let me temporarily revert the fix (mutation discipline), run the probe, then re-apply.
**Slice A complete** (TRUE RED → GREEN). Now **Slice B (F-2)**: the funnel fs-pin first (TRUE RED).
TRUE RED confirmed for the funnel pin. Now the GREEN refactor — first check schema type exports.
Now adding the two seams to server-data.ts (GREEN change for F-2).
Now adding `getOrderByNumber` after `trackOrder` (the sibling lookup seam).
Now refactoring the order page to use the seam (drop direct `@/db` imports).
Now I need to destructure `order`/`items` from `found` after the guard branch.
Now refactoring the reviews route POST to use the `submitReview` seam.
Slice B GREEN (pin passes, typecheck clean). Now verify the refactor preserves behavior — run the order-page + reviews e2e specs.
All 28 order/review specs pass — behavior net holds. Now **Slice C (F-3)**: the reviews-degrade fs-pin (TRUE RED first).
TRUE RED observed. Now the GREEN changes for F-3 — server-data.ts null-typed seams + comment fix.
Now the api/reviews GET route: null → DB_DOWN envelope.
Now the PDP changes — handle null reviews/reviewCount with the unavailable note.
Now update the ReviewSection invocation to pass the unavailable state.
Let me check for other references to `reviews`/`reviewCount` in the PDP that need updating.
Now update ReviewSection with the `unavailable` prop and honest note.
F-3 GREEN (typecheck + 4/4 pins). Now **Slice D (F-4)**: the promo in-tx re-read fs-pin (TRUE RED first).
TRUE RED for F-4. Now the GREEN change in placeOrder — check priceTotals' promo param type first.
Now the F-4 GREEN change — move the promo re-read + totals inside the transaction.
F-4 GREEN (5/5 pins, typecheck, lint). Quick mutation demo to prove the pin catches drift.
The git checkout reverted my server-data edits. Let me check and re-apply all changes.
server-data.ts reverted to HEAD; other files intact. Re-applying all server-data edits now.
All edits re-applied. Verify the full state again.
Now the full unit suite for the authoritative count (expecting docs-counts lockstep reds).
186 unit confirmed (17 expected lockstep reds). Verify the e2e count + gotoHydrated counts.
130 e2e / 43+2 gotoHydrated confirmed. Now the full code-phase gate: cold build + full e2e (kill the stale server first for a true cold build).
130/130 e2e green on the cold build. Now the three-TZ discipline + residue check.
Code phase complete (three-TZ identical, zero residue). Now the docs phase — let me read the docs-counts pin to know exactly which claim sites to sweep.
Now the six-doc lockstep sweep. Let me find all live count claim sites first.
Now applying the AGENTS.md sweep.
Now the gotoHydrated counts + Task-136 pins paragraph in AGENTS.md.
Now the Task-136 pins paragraph in AGENTS.md.
Let me check the Pin map table for Task-136 rows.
AGENTS.md done. Now CLAUDE.md — find the claim sites.
Now the Task-136 seams paragraph in CLAUDE.md.
CLAUDE.md done. Now README.md — find claim sites.
README done. Now PAD — find claim sites.
Now the PAD sweep — new revision block v1.21.0 + all live sites.
Two more PAD sites: §7.1's table row (183 tests) and the §3.1 golden-rule exception sentence.
PAD done. Now SKILL.md + DEPLOYMENT.md — find their claim sites.
Updating SKILL.md (v2.10.0 — lessons 61-62, counts, Appendix B).
SKILL.md done. Now DEPLOYMENT.md.
Lockstep restored (186/186). Now capture the screenshots. Restart the dev server fresh and write the capture script.
All 5 captured. Verify non-blank by byte-density (the established discipline).
All verified (density 0.058–0.368 B/px, 100 PNGs total). Now clean the scratch script, write the plan addendum, worklog entry, and session log.
Now the worklog Task 136 entry.
Now the session_37.md cycle summary.
Now the final full gate on the exact tree to be committed.
Final gate fully green (cold build, 186/186, 130/130, zero residue). Now the pre-commit review and SSH push setup.
Hygiene clean (the fingerprint hits are the operator's own committed public-fingerprint narratives). Now commit.
Committed `c0b100b`. Now the SSH push — read the runbook and wrapper.
No ssh binary. Let me check the prior session's shim and paramiko availability.
The shim survived; paramiko needs reinstalling.
Key verified (fingerprint matches the Task-134/135 records). Dry-run with the mandatory `--remote` override.
Dry-run clean (fb64859..c0b100b). Real push now.
The wrapper verified the remote (main @ c0b100b == local HEAD). One more independent verification with the shim, then final status.
The key is shredded so the shim can't re-auth (expected). Let me verify via HTTPS read access (the repo is public-readable).
Remote main @ `c0b100b` verified via HTTPS — the push is confirmed. All tasks complete.
**Task 136 delivered and pushed — remote `main @ c0b100b` verified.**

## Cycle summary (Verified / Reasoned / Assumed)

**Baseline (all Verified):** fresh clone after sandbox reset · rootless PostgreSQL 17.12 restored via the lesson-31 discipline (stale postmaster.pid + 9 missing initdb subdirs + the nested `pg_logical` pair) — 9-table DDL + seed contract verified by direct SQL (inventory 1379, zero residue) · Chromium 1255 re-installed · baseline gates matched the documented Task-135 state exactly (lint 0/0 · 183/183 unit · 129/129 e2e cold) · mobile drawer taxonomy **8/8 PASS — no Tailwind v4 bug** (CSS-first `@theme` + candidate-scan guard re-verified) · SEO fully green (sitemap 42 URLs, robots, og 1200×627, noindex ×6, branded 404, security headers) · reference repo `homenest-store-s` quiescent (12th "nothing to port").

**Audit → 6 findings** (two agents, every finding re-verified line-level), all fixed TDD-first:

- **F-1 MEDIUM** — the shop grid was the *third* `/api/products` client consumer still reading `json.data ?? []` after Task 135 fixed the other two; now gates on `Array.isArray` (TRUE RED observed, probe honestly corrected mid-cycle)
- **F-2 MEDIUM** — the order page + reviews POST imported `@/db` directly, violating PAD §3.1's golden rule for 22 cycles; now funneled through new `getOrderByNumber`/`submitReview` seams + an fs-pin (health documented as the infra-probe exception)
- **F-3 LOW** — reviews degraded to a false "No reviews yet" under outage; now `null`-signaled with the honest unavailable note + `DB_DOWN` envelope
- **F-4 LOW** — promo validated outside the order transaction; now `FOR UPDATE` inside `createOrder` with in-tx totals
- **D-1/D-2 docs** — CLAUDE's gotoHydrated mis-attribution + typecheck:tests rows fixed

**Final gates (Verified):** lint 0/0 · typechecks clean · **186/186 unit × 3 timezones** · **130/130 e2e** (cold) · zero DB residue · screenshots 95–99 · SKILL v2.10.0 (lessons 61–62) · PAD v1.21.0 · six-doc lockstep + session_37 + worklog Task 136.

Key artifacts: [Task-136 plan](/home/z/my-project/home-furnishing-store/docs/plans/2026-11-21-task136-remediation-plan.md) · [session_37 log](/home/z/my-project/home-furnishing-store/docs/session_37.md) · [SKILL.md](/home/z/my-project/home-furnishing-store/home-furnishing-store_SKILL.md)

Next-cycle candidates: the usual deferral backlog (CSP, jsdom layer, store-picker wiring, TRUST_PROXY) plus a potential hardening pass on the remaining `?max` magnitude register row.

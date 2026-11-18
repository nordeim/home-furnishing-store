The workspace has been reset. I'll clone the repository and set up a comprehensive TODO plan.
Repo cloned successfully. Now let me review the key documentation files.
Task 121 was completed and pushed (`77cd1a8` + session log `9042784` = HEAD). This session is the next cycle — Task 122. Let me review the remaining docs and skills.
Now let me review the skills catalog and key skills, plus skim the PAD and SKILL.md structure.
Let me start npm install in the background and read the rootless-postgresql skill.
Now let me check the environment state and start PostgreSQL setup (adapted to the repo contract per prior sessions).
Sandbox is fresh (no PG artifacts). Let me set up rootless PostgreSQL per the skill, adapted to the repo contract (port 5432, postgres/app_db — as in prior cycles).
PostgreSQL 17.12 is live with the repo contract. Let me check npm install and set up the environment.
9 tables as documented. Now running baseline gates and cloning the reference repo in parallel.
94/94 unit tests green. Now let me install Playwright browsers and start the e2e baseline in the background.
Playwright config is well-established. Starting the e2e baseline in the background while I review the source code.
While e2e runs, let me review the source tree and the recent Task-121 changes to focus the audit.
The codebase matches the documented state. Let me check the audit methodology from the web-application skill, then delegate the deep audit.
Now let me check the reference repo clone and delegate the deep codebase audit to an Explore agent while I read key files myself.
The e2e baseline exited 1 — let me examine the failure.
The pinned Playwright needs chromium-1255 (sandbox has an older 1200 from a previous session). Installing the pinned browser build.
While e2e rebuilds, let me delegate the deep code audit and reference repo review in parallel.
Both audits returned strong findings. Let me check the e2e baseline and then verify the headline findings myself at line level.
**E2E baseline: 59/59 GREEN.** All baseline gates pass. Now verifying the audit's headline findings myself at line level.
**H-1 VERIFIED** — planning-tools still uses UTC arithmetic; `sgTomorrowISO` was never implemented despite the "19 fixed" claim. Let me verify H-2 and M-1 (the error boundary + local-store seam).
M-1 and H-2 verified. Let me confirm the remaining findings — order page outage, findPromo, campaign freeze, and layout CartProvider placement.
All key findings verified. Let me check the checkout route and db pool for the remaining findings.
L-4, L-5, L-9 verified. Let me check utils.ts seams and the sitemap to complete verification.
All findings verified at line level. Now let me run the agent-browser visual/functional checks — starting the dev server and checking the mobile nav taxonomy.
Dev server is live. Running the mobile navigation taxonomy at 390×844.
Drawer opens, utility strip link fully inside viewport (312.8+61.2=374 < 390 — F-5 fix holds). Testing navigate+auto-close and Escape.
Navigate+auto-close confirmed. Testing Escape close and toggle.
**Mobile navigation taxonomy: ALL PASS** (open/navigate+auto-close/Escape/toggle/hamburger-hidden≥1024; no Tailwind v4 bug — conditional mount intact; hydration works). Now checking search behavior and shop SSR.
L-3 verified — search form never updates the URL. Let me batch-verify the remaining LOW/INFO findings at line level.
All verified. (Note: the `ax, setMax]` display is the documented `[m` display-layer trap — typecheck/e2e pass, so file bytes are intact.) Let me verify the last few details: findPromo, inventory schema, offers slugs.
All findings verified. Let me complete the SEO/sitemap check (todo 9) before writing the plan.
Sitemap/SEO coherent (Task-121 state holds). Let me verify the last two claims — checkout GST line and inspiration index — then write the plan.
All claims verified. Let me check what the live docs say about Task-121's claims (for the correction), then write the remediation plan.
All verified. Now writing the Task 122 remediation plan.
Plan written. Let me validate the inventory-duplicate precondition and start execution.
**Slice 1 (F-1)**: TDD RED first — the `sgTomorrowISO` unit tests.
Now writing the RED tests for `sgTomorrowISO` (Slice 1).
RED confirmed (4 failing). Implementing `sgTomorrowISO` — GREEN.
Now rewiring the planning-tools page:
**Slice 1 GREEN (35/35).** Now Slice 2 — crash boundary. RED units for the element validators (F-3) first.
Adding RED tests for the element-level validators (F-3) to local-store.test.ts.
RED confirmed (8 failing). Implementing the validators in cart-store.tsx — GREEN.
F-3 GREEN (20/20). Now F-2 — creating `global-error.tsx` and updating `error.tsx`.
F-2 files created. Now manually verifying the boundary classes in the dev browser with a temporary throw (reverted before commit).
The probe needs to be in a client component (server components don't re-execute client-side). Let me move the probe into CartProvider — the actual F-4 crash location.
The boundary rendered — but I need to verify WHICH boundary (body is suspiciously large). Checking distinctive markers.
**global-error VERIFIED** (htmlLang="en" = the boundary's own document; header/footer replaced; branded UI + recovery present). Now verifying the recovery button actually clears storage and reloads.
The marker persisted but the store key wasn't cleared — the removeItem may not have run. Let me investigate precisely.
The dev overlay is intercepting clicks. Let me click via eval directly (bypasses overlay hit-testing).
**Recovery VERIFIED** (store cleared surgically, marker kept, reload fired). Now verifying the route boundary (error.tsx) with a page-level probe.
The shop crash also landed on global-error — suspicious. Let me check whether error.tsx compiled properly.
The shop URL also contains "crashtest" which triggered the CartProvider probe first. Renaming the shop probe param.
**Both boundary classes VERIFIED**: root-layout crash → global-error (own html, full replacement); page-segment crash → error.tsx (branded, layout survives). Reverting the probes.
Slice 2 complete. Now **Slice 3 — money-display**. First the RED unit for `effectivePromo` (F-5).
Now adding the RED tests for `effectivePromo` (F-5):
RED confirmed. Implementing `effectivePromo` and rewiring the preview sites.
Now rewiring the two preview sites (cart + checkout):
F-5 unit GREEN. Now the e2e RED specs for Slice 3. Let me review the existing spec conventions.
Let me check the cheap-product price and inspiration pieces totals for the specs.
Let me check the JS-disabled spec pattern, then write all the new e2e RED specs.
I have all patterns (note: `aref^=` in output is the same display-layer bracket-eating artifact — source is intact). Writing all Task-122 e2e specs now.
Let me verify the selectors against the actual page code before running.
Now observing the e2e REDs. First stopping the dev server (build conflict over .next), then running only the new specs.
11 RED as designed (F-5 e2e passed as expected — its logic was unit-RED-first; F-7a passes via INVALID_PROMO and stays as an outcome pin). Let me check why F-6 (SSR sort) failed — could be a spec bug.
F-6 failure is a spec bug — my regex catches both compare-at and current prices. Let me check ProductCard's price DOM structure.
ProductCard renders the current price in a `p` and compare-at in a `line-through` p. Fixing the spec locator to exclude compare-at prices.
F-6 GREEN — the SSR sort was already correct (spec bug fixed; now a valid pin). 10 genuine REDs remain. Implementing all fixes now.
Now F-11 — the reviews route refuse policy.
Now F-12 — the inventory unique index.
The push errored. Let me see the full error.
The e2e RED probe inserted a duplicate (as designed) and my fragile cleanup SQL missed it. Let me clean up properly and re-push.
Index created. Now hardening the F-12 spec's cleanup to delete the exact probe row.
Now F-15a (business stepper), F-15b (checkout GST line):
Now F-16 (inspiration index pieces total) and F-19 (hero/offers copy):
Now F-17 (search URL sync):
I accidentally dropped the `settledFor` declaration in that edit — restoring it immediately.
Now F-19 — honest hero/offers discount copy:
Now F-4 (order page outage precedence) and F-9 (pool timeouts):
Now the F-9 source-pin unit test. Let me check the existing infrastructure-pin pattern.
Now F-10 (campaignEnd in render), F-13/F-14 (shop layout), F-18 (tautology cleanup):
The home page injection looks misaligned. Let me inspect and fix.
The Python position arithmetic misfired (computed before the removal shifted offsets). Fixing the placement properly.
Now F-13/F-14 (shop layout counts + comment/copy) and F-18 (tautology cleanup):
Now F-18 (ShopInner tautology cleanup):
The `ax, setMax]` is the known display artifact — editing via python to handle brackets safely.
Now the sortProductList unit pins (F-6):
Now appending the sortProductList tests:
All utils tests pass. Running the full unit suite, typechecks, and lint.
All 15 failures are the docs-counts pin (working-red by design — unit is now 117). Running the full e2e suite for GREEN.
While e2e runs, let me prepare the docs lockstep. First, check what the docs-counts pin expects.
PAD line 982 falsely claims the MIN_DATE fix landed in Task 121 — confirming H-1 extends to the PAD. Let me check e2e progress.
Diagnosing the 4 failures:
RED-run residue found (a truncated probe review + 2 probe orders that decremented inventory). Cleaning up and restoring the inventory deltas.
Cleanup done. Now investigating the business stepper failure — checking for other "Fewer" buttons:
The business page initializes with nonzero defaults — the spec must drive a unit to 0 first. Fixing all three specs:
All fixed. Running the complete e2e suite (both projects) for the final count.
**72/72 e2e GREEN.** Now the F-9 manual verification — unroutable DB URL, confirm bounded degrade.
**F-9 VERIFIED** — bounded degrade (10s vs infinite hang before), full static-catalogue content. Now the F-4 manual verification: place an order, stop PG, load the order page.
**F-4 VERIFIED** — PG down renders the honest outage copy (the items-fail sub-case is now structurally the same branch). Restarting PG.
All code verified. Now the docs lockstep sweep (94→117 unit, 59→72 e2e).
Docs-counts pin GREEN. Now the substantive docs updates — starting with AGENTS.md.
Adding gotcha #12 (error boundary placement) to AGENTS.md:
Now README.md — updating the current-cycle paragraph and testing bullets:
Now updating the README testing bullets:
Now CLAUDE.md — frontmatter and the Task-122 seams paragraph:
Now the PAD — revision block and known-issues rows:
Adding the Task-122 known-issues rows to the PAD register:
Now the SKILL.md refresh — checking its structure first.
The lesson-22 `` is the display artifact again — editing via python. Adding new lessons + version bump:
Now the worklog Task 122 entry:
Worklog done. Now verifying .env.example and capturing screenshots of changed surfaces.
.env.example verified (single-variable contract unchanged, matches live PG). Capturing fresh screenshots of the changed surfaces.
The documented relative-path trap — using absolute paths:
The daemon hiccupped. Let me retry with the standard snapshot+ref flow.
Simplest honest path: navigate directly to the synced URL state (`/search?q=oak`) — the e2e already proves the form writes it.
agent-browser's ref churn is fighting the stateful flow. Using a deterministic Playwright script instead (chromium already installed):
The cart page loops navigations when a bag exists. Let me debug what's happening:
Found it — the e2e production build contaminated `.next` while the dev server was live, causing a Fast-Refresh reload storm. Restarting the dev server clean:
All 5 captured. Let me also re-capture the three earlier agent-browser shots (taken during the .next storm) with the clean server, then verify image integrity.
The add-to-bag flow raced hydration. Hardening the script with explicit waits:
All 8 screenshots captured. Verifying image integrity:
All screenshots valid. Cleaning up scratch scripts and running the final gate.
**FULL GATE GREEN: lint 0/0 · typechecks clean · 117/117 unit · cold build 29 routes · 72/72 e2e.** Now the pre-commit check and commit.
Clean — no secrets, 40 files, 1304 insertions. Committing:
Committed `09030d8`. Now the push — reading the SSH wrapper runbook:
Setting up the push per the runbook — checking ssh/paramiko and materializing the key outside the repo:
Key verified. Dry-run with the mandatory `--remote` override:
Dry-run green (fast-forward `9042784..09030d8`). Executing the real push:
The wrapper already verified the push; the ls-remote failed only because its temp key was shredded. Shredding the operator key and doing a final verification pass:
**Push independently verified: remote main == local HEAD (`09030d8`).** Following the repo convention, writing the session log and pushing it as the follow-up commit:
**Task 122 complete — both commits pushed to `main` and remote-verified.**

## Summary

**Setup & validation**: Fresh clone (`9042784`), all five operator docs + Task-121 plan/worklog/session_8 reviewed, rootless PostgreSQL 17.12 installed per `skills/rootless-postgresql` (repo contract: `postgres:postgres@127.0.0.1:5432/app_db`), baseline gates green (lint 0/0, typechecks, 94/94 unit, 59/59 e2e), mobile drawer taxonomy ALL PASS at 390×844/1440×900 — **no Tailwind v4 bug** (conditional mount + scan guard intact).

**Audit** (per `skills/web-application`, homenest-store-s as reference): 21 findings, every headline verified at line level. The two HIGHs:
- **F-1**: Task-121's SGT date fix was claimed ("19 fixed") but *never implemented* — `sgTomorrowISO()` landed now; the false count claim corrected forward (18 fixed + 1 disproven + 1 skipped)
- **F-2**: the Task-121 `error.tsx` "safety net" couldn't catch its own crash class (CartProvider sits in the root layout, above the route boundary) — `global-error.tsx` added with reload-based recovery; both boundary classes browser-verified with temporary-throw probes

**Remediation** (TDD, plan at `docs/plans/2026-11-19-task122-remediation-plan.md`): 19 fixes + 2 GREEN pins — element-level localStorage validation, the `effectivePromo` min-spend display gate, checkout payload caps + `qty:null` drop, reviews refuse-never-truncate, the inventory unique index, pg-pool degrade time bounds (blackhole-verified ~10s vs infinite), order-page outage honesty, search URL sync, inspiration pieces-total, GST/stepper parity, honest discount attribution.

**Delivered**: gates **lint 0/0 · 117/117 unit · 72/72 e2e · cold build 29 routes**; 8 fresh screenshots; `.env.example` verified; docs lockstep across all five docs (PAD v1.7.0, SKILL v1.6.0, worklog, session_9); pushed via the SSH wrapper — `09030d8` (fix) + `2a87873` (session log), remote verified, operator key shredded.

Suggested next steps: the deferred register (header store-picker wiring, delivery decrement source, unthrottled GETs, xff spoofing posture) remains documented in the PAD for a future cycle.

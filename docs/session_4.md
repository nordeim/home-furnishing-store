I'll start by setting up a comprehensive task plan, then work through this systematically.
The workspace has been reset. Let me check the existing git config and clone the repository.
Repo cloned successfully. Now let me review the key documentation files.
Now let me read the session docs and remediation plan.
Now let me check the recent commits and worklog tail, then read the PAD.
I notice the last commit deleted 1063 lines from worklog.md. Let me investigate what happened and check the current state.
The operator's last commit trimmed the ely-beauty lineage from the worklog (Tasks 1-112 removed, 113-116 kept). The tree is clean. Now let me read the PAD and survey the codebase structure.
I have the full picture of the docs. Now let me validate against the actual codebase structure and check the skills catalog.
The codebase structure matches docs. The sandbox was reset (no node_modules, no PostgreSQL). Let me check the environment and start npm install while reviewing the skills catalog.
Sandbox fully reset: PostgreSQL gone, node_modules gone, .env gone, stale DATABASE_URL shell shadow present, no ssh binary, no paramiko. Let me start npm install in the background and review the skills catalog.
Now let me read the key skills. First check sizes, then read the rootless-postgresql skill (needed for DB setup).
I have the PG skill. Per Task 114's sandbox adaptation (documented in the SKILL), I'll use `/home/z/my-project/pg`, port 5432, `postgres`/`app_db` to match the pinned URLs. Let me run the environment probes and write the setup script.
All probes pass (Debian 13, PG 17 available, port 5432 free). Now let me write the adapted rootless PostgreSQL setup script.
PG setup finished surprisingly fast. Let me verify the full log and actual state.
PostgreSQL 17.12 is live on 127.0.0.1:5432 with postgres/app_db — zero drift with the pinned URLs. Let me check npm install and push the schema.
Toolchain verified: next 16.4.2, react 19.2.6, vitest 5.1.0, playwright 1.65.1. Now create .env and push the schema.
psql hung waiting for password over TCP. Let me use the trusted socket instead.
11 tables confirmed. PostgreSQL fully operational. Now let me read the audit methodology skills.
agent-browser 0.43.0 available; the repo's Playwright 1.65.1 needs its matching chromium (cache has v1200 from an older toolchain). Let me run the fast gates and clone the reference repo in parallel.
Fast gates green: lint 0/0, typechecks clean, 40/40 unit. Now let me start the cold build in the background, clone the homenest-store-s reference repo, and install the Playwright browser.
This reference repo documents key Tailwind v4 traps — especially **"Never JS-toggle a display utility"** (v4 issue #15884/#18653). Let me check the NORDHEM codebase against these trap patterns.
Header uses conditional mount (`{open && ...}`) — safe from the v4 display-toggle trap. Let me check globals.css and scan for any dynamic class patterns.
Cold build green — 29 routes. Now let me install the Playwright browser build and start the dev server for browser-based checks.
Dev server live with DB connected (`{"ok":true}`). Let me verify the seed and begin the agent-browser audit.
Seed verified: 24/8/72/5/3/6/3. Now the agent-browser mobile navigation audit at 390×844.
Connection refused — the dev server likely died. Let me check and restart it more robustly.
The dev server was reaped between tool calls. Let me restart it fully detached with setsid so it survives.
The sandbox reaps processes between tool calls (only properly-daemonized processes like the agent-browser daemon survive). I'll batch server + browser checks within single bash invocations. Let me write a helper script.
Mobile home page renders correctly. Now the critical mobile drawer behavior tests: open, links, Escape, toggle, navigate + auto-close.
Drawer opens with correct aria state and Escape closes it. Now toggle, navigate + auto-close, and the desktop breakpoint.
The click sequence had stale-ref issues. Let me retest with fresh snapshots between each action.
The ref extraction was wrong — snapshot shows `[ref=e362]` but clicks need `@e362`. Let me fix the extraction.
Navigation + auto-close verified (URL → `/shop?cat=bedroom`, menu closed). The button ref extraction failed because `[expanded=false, ref=e477]` doesn't match my `[ref=` pattern. Let me redo the toggle test with robust extraction.
Complete mobile drawer taxonomy verified: open/toggle/Escape/navigate/auto-close all work. Now the desktop breakpoint check.
Mobile nav fully verified across breakpoints — no Tailwind v4 bug. Now the full route smoke + console error check.
All routes 200 (my inspiration slug guess was wrong). Let me check real slugs, console errors, and the SEO surfaces.
The PDP shows default title and no JSON-LD in that eval — suspicious. Let me verify against the raw server HTML with curl.
Raw HTML confirms PDP SEO intact (product title, JSON-LD, canonical, og:title all present) — the earlier eval was a timing artifact. Now the full e2e suite against the production build.
All 18 e2e tests pass. The Task 114-116 state fully holds. Now the deeper audit for NEW issues — let me read the core seams in full.
Core seams are clean. Let me check for dead code and read the remaining key files.
Let me delegate a scan of the content pages and components to an Explore agent while I review the commerce-critical pages myself.
Excellent audit — real new findings. Let me verify the headline findings myself before planning.
Both headline findings verified. Let me check the wishlist/search error-state issues and the offers page.
Both error-state issues verified. Now let me sweep the docs for stale claims (the PAD has pre-Task-114 leftovers).
Significant doc drift found in the PAD. Let me count the actual routes from the cold build to pin the correct number.
Now let me examine the remaining fix targets: ProductCard badges, ReviewSection, the reviews route, and the e2e specs' anchors.
I now have the complete audit picture. Let me read the last three fix targets, then write the remediation plan.
I have the complete audit picture. Now let me write the Task 117 remediation plan.
Plan written and validated. Now executing Slice 1: unit RED tests for the two new pure helpers.
RED confirmed (10 new tests failing). Now implement the helpers in utils.ts.
Now wire the helpers into the family page and ProductCard.
ProductCard drops the `index` prop. Now update all 6 call sites.
The seds failed (the `/` in `/>` broke the delimiter) — unit tests are 50/50 GREEN but call sites still pass `index`. Let me fix them with Edit.
Slice 1 GREEN (50/50 unit). Now Slice 2: e2e RED specs for the API guards.
Now confirm the e2e RED state for the new specs.
RED confirmed (4 failed as intended, 1 pin passed). Let me verify the malformed-JSON failure is the expected 500 (not a spec bug).
Unexpected: reviews returned 422 (not 500) for the malformed body — Playwright may be JSON-wrapping the string. Let me verify the raw server behavior with curl.
Playwright wraps string `data` — I need to verify exactly what it sends. Let me probe with a quick script.
Confirmed: Playwright wraps string data in quotes (making it valid JSON). Let me rewrite that spec to use raw browser fetch via page.evaluate.
All 4 RED targets confirmed. Now the GREEN phase — first read the promo/track routes.
Now implement the parse guards and limiters across the three routes.
Now implement the wishlist and search error+retry states.
The search "Try again" needs to actually retrigger the effect — `setQ(needle)` with the same value won't. Let me add a retry counter.
4 of 5 GREEN. Let me diagnose the wishlist spec failure.
The error state works — it's a strict-mode collision with Next's route announcer. Let me scope the locator to `main`.
One more subtlety: the wishlist store reads localStorage at module load, so the spec must seed it via addInitScript (before app boot), not after. Let me fix.
All new specs GREEN. Now Slice 4: BuyBox honest degrade state, a11y fixes, ReviewSection timestamp.
Now the ReviewSection timestamp fix and the star-row a11y fix.
Slice 5: unify `placeOrder` money constants with utils.ts.
Now remove the dead `cartToken()` from utils.ts and apply the remaining copy/date fixes.
All code changes in. Running the full fast gates now.
Cold build green (29 routes). Now the full e2e suite.
All 23 e2e pass — the money math ($679.15 journey) confirms the constants refactor is behavior-preserving. Now verify the BuyBox degrade state via agent-browser with a dead DB.
Both fixes verified live in the browser (honest degrade state, $60 calculator). Now capture the dev-server screenshots for docs/screenshots/.
All 19 PNGs validated. Screenshots 05, 11, 16 need real-state fixes (promo applied, real order confirmation, tracking result). Let me redo them with a live order journey.
Let me visually verify the key screenshots.
No vision in this session — let me verify the screenshots programmatically (non-blank, distinct content).
Two fixes needed: 15/16 are identical (tracking result didn't render), and 02 matches the old byte size suspiciously. Let me check and redo.
02 is legitimately identical (drawer unchanged this cycle, deterministic render). Now redo 16 with careful ref handling.
The result didn't render at click time. Let me read the track-order page to see the exact result markers.
The server likely died mid-call. Let me redo 16 fully self-contained with result verification before the shot.
16 verified with real result (exact $2,338.20 math). Let me also verify 05 (cart with promo) rendered correctly.
The cart shows the item but no promo. Let me check how the cart page renders the persisted promo.
The grep may have cut off the promo lines (head -6). Let me verify the full cart snapshot.
Cart with promo fully verified. All screenshots valid. Now the docs lockstep phase — starting with AGENTS.md counts.
Now CLAUDE.md and README.md count updates.
Let me use sed for the precise count edits instead.
README done. Now the PAD v1.2.0 update — the biggest doc change.
The wrapper row is fine — the failing assert is the ledger tail. Let me check its exact bytes.
The second line has no leading spaces. Let me fix the ledger replacement.
The part-3 script failed before writing, so those changes were lost. Let me re-apply them.
PAD fully updated (v1.2.0, zero "30 routes" left). Now the worklog Task 117 entry.
Now let me read the distillation skills before refreshing SKILL.md.
Now refresh SKILL.md per the distillation methodology (count-lockstep + new lessons).
Indentation mismatch — file uses 3 spaces, I used 4. Fixing.
SKILL.md refreshed. Now the final full gate chain on the complete tree.
One lint error appeared. Let me identify it.
The React Compiler `purity` rule flags `Date.now()` during render. Let me fix with the compliant pattern — module-level constant (evaluated once at load, not during render).
Lint clean. Final full gate: cold build + complete e2e suite.
All gates green. Let me amend the worklog with the purity-rule catch, then check the tree state for commit.
The lockfile fix is legitimate (Task 114 renamed package.json but missed the lockfile name — my npm install synced it). Let me verify ignore rules and commit.
All clean. Now let me commit, then prepare the push. First, the runbook.
I have the full procedure. First, commit the remediation.
Commit `e32fb62` on main. Now prepare the SSH push: install paramiko, deploy the shim, materialize the key.
Now deploy the shim outside the repo and materialize the operator key.
Dry-run green — key authenticates, fast-forward `6ef81d1..e32fb62` confirmed. Executing the real push.
Push verified: `refs/heads/main @ e32fb62 == local HEAD`. Now shred the operator key per the runbook.
**Task 117 complete — commit `e32fb62` pushed to `main` and remote-verified** (`refs/heads/main @ e32fb62 == local HEAD`, fast-forward from `6ef81d1`, key shredded after use, never entered the repo).

## What this cycle did

**Workspace & docs**: fresh clone (sandbox was reset), all five root docs + session docs + Task 114 plan reviewed and validated against the codebase.

**PostgreSQL 17.12**: reinstalled rootless per the skill (port 5432, `postgres`/`app_db` — zero drift with the pinned URLs); 11 tables, seed 24/8/72/5/3/6/3.

**Audit** (web-application methodology + homenest-store-s v4 trap log + agent-browser at 390/768/1440): mobile nav fully verified (open/toggle/Escape/navigate/auto-close; hamburger hidden ≥1024) — **no Tailwind v4 bug** (the drawer conditionally mounts; no display-toggle, no colon-form values, scan guard intact). Sitemap/SEO coherent (robots 7 disallows; sitemap 42 indexable URLs; PDP canonical/OG/JSON-LD).

**15 findings fixed TDD-first** (RED observed before every fix): the Family voucher calculator's **10× overstatement** (now the unit-pinned `familyVoucherCents`), BuyBox's fabricated degrade-path stock, wishlist/search error-vs-empty conflation, API boundary guards (malformed JSON→400, invalid productId→422, reviews rate limiter), `placeOrder` money constants unified with `priceTotals`, badge dedupe, dead code, dynamic dates, honest demo framing.

**Gates all green**: lint 0/0 · typechecks clean · **50/50 unit · 23/23 e2e** (was 40/18) · cold build **29 routes** · live-DB journey money exact ($679.15 / $2,338.20).

**Deliverables**: [remediation plan](/home/z/my-project/home-furnishing-store/docs/plans/2026-11-18-task117-remediation-plan.md) · [SKILL.md v1.1.0](/home/z/my-project/home-furnishing-store/home-furnishing-store_SKILL.md) · [PAD v1.2.0](/home/z/my-project/home-furnishing-store/Project_Architecture_Document.md) · 19 screenshots (11/16 use a real placed order) · `.env.example` re-verified accurate · worklog Task 117.

**Ledger**: all claims above *Verified* (executed this session); one lint catch during execution (`react-hooks/purity` on the dynamic date) fixed by refactor, not suppression. *Deferred*: generated SQL migrations before the next schema change under live data; radiogroup arrow-key roving focus (documented).

Workspace refreshed. Now reading the root documentation set to build understanding.
The PAD is fully absorbed. Now let me look at the skills catalog, recent session docs, and the key skills for this task.
Now let me read the key skills needed. Starting with rootless-postgresql (next concrete task) and checking recent session docs.
`/home/project` is not writable in this sandbox — I'll adapt the skill to `/home/z/my-project/pg/` (same procedure, sandbox-compliant prefix). Port 5432 is free, so I'll use the DB URL the repo already pins (`postgres:postgres@127.0.0.1:5432/app_db`) for zero config drift.

First, let me finish absorbing context — recent docs and the worklog tail.
The worklog confirms my task will be Task 114 in this lineage. Now let me examine the actual codebase — package.json, the Header (mobile nav), globals.css — and then read the audit skills.
Now let me survey the skills I need — checking sizes first, then reading the audit methodology and Tailwind v4 skills.
I spotted what looks like a syntax error in ReviewSection.tsx (`const sg, setMsg]`). Let me verify the actual file bytes.
Line 13 confirmed: `const sg, setMsg]` — a genuine syntax error shipped in the initial commit. This contradicts Task 113's "typecheck clean, build green" claims, so let me reproduce the actual gate state right now.
Typecheck passes despite the syntax error — the stale `tsconfig.tsbuildinfo` is suspect. Let me force a cold typecheck.
The hexdump reveals the truth: actual bytes are `const [msg, setMsg]` — my bash tool output passes through a redaction layer that mangled `[msg` into `sg`. The file is valid (tsc confirms). Important lesson for this session: verify exact bytes via base64/hex when something looks off.

Now let me run the baseline gates — cold build in the background while I install PostgreSQL.
Lint baseline: 7 known `set-state-in-effect` errors confirmed. Now installing rootless PostgreSQL per the skill, adapted to this sandbox (`/home/z/my-project/pg/`, port 5432 to match the repo's pinned `drizzle.config.json` URL).
PostgreSQL 17.12 cluster initialized. Starting the server and verifying.
PG 17.12 running with scram auth on TCP. Now pushing the Drizzle schema (11 tables) and wiring the app `.env`.
11 tables confirmed. The background build didn't survive the earlier shell issue — restarting it now.
While the build runs, let me complete the codebase review — remaining pages, schema, and catalog.
The background build died silently (sandbox process management). Running it in the foreground.
Cold build is green (30 routes). Now let me boot the dev server and verify the DB-backed seed path plus the full data layer against live Postgres.
The DB is up but `/api/health` says `{"ok":false}` and no seeding happened — the app's DB connection is failing. Let me check the dev server log.
Root cause: `SCRAM: client password must be a string` — the app isn't seeing the password. Likely a shadow `DATABASE_URL` in the parent environment overriding `.env` (shell env beats dotenv). Checking.
Confirmed: a leftover parent-shell export `DATABASE_URL=file:.../custom.db` (ely-beauty lineage) shadows the `.env`. Classic dotenv-precedence trap. Restarting dev with the URL pinned explicitly.
DB-backed path fully live: seed verified (24/8/72/5/3/6/3 — all counts match docs). Now the checkout round-trip against live Postgres, which Task 113 could only mark "Reasoned".
Checkout round-trip fully verified: money math exact (259800 − 10% = 233820, free delivery ≥$200, GST back-calc 19306, fail-closed tracking). Now the mobile navigation check — let me load the agent-browser skill.
agent-browser + Playwright chromium are available. Running the mobile navigation test at 390×844.
Drawer opens with all links and correct aria state. Testing navigation from the drawer and the auto-close behavior.
Mobile nav findings: opens/navigates/auto-closes correctly, but **Escape does not close the drawer** — a genuine a11y gap. Let me verify the desktop breakpoint behavior, then run a console-error check.
Desktop header is correct. Found a Next 16 console warning: `scroll-behavior: smooth` without `data-scroll-behavior="smooth"` on `<html>`. Now the full route smoke + SEO endpoints.
My earlier 404 was a wrong slug guess — real inspiration slugs differ; sitemap has the right ones (47 URLs = 17 static + 24 + 6; docs claim "18 static" — doc drift). Let me finish the audit with the remaining pages.
Codebase review complete. Let me check the last audit items — `.env.example`, the ensure-build-configs bootstrap (it could clobber my new test configs), and the exact lint error inventory.
Full audit picture is complete. Let me quickly absorb the remaining guidance skills (tdd, clone-app-pat-pro) before writing the remediation plan.
All guidance absorbed. Now writing the comprehensive remediation plan with the detailed ToDo list.
Plan complete and validated. Executing — Step 1: install the test toolchain.
Playwright 1.65.1 needs chromium v1255 (cache has v1200 from an older toolchain). Installing the matching browser.
Toolchain ready. Writing the NORDHEM test configs, then the RED unit tests.
Now retiring the dead ely-beauty test tree and broken scripts (per plan F-1), then writing the new suite.
Old tree removed. Now writing the fresh NORDHEM suite — setup + RED unit tests.
The robots/sitemap test I wrote has a policy contradiction (disallowed pages listed in the sitemap). Fixing to a coherent policy: sitemap = indexable only (12 static), robots = excludes utility/personal pages.
Now update package.json scripts and name, then run the suite to confirm the RED state.
RED confirmed (8 failures). One test issue on my side: `formatSGD`'s currency symbol is ICU-dependent (`$` vs `S$` in this node build). Making that assertion environment-proof before implementing.
Now implementing the GREEN phase: `local-store.ts`, `mask.ts`, `findPromo`, robots + sitemap policy.
Now robots.ts and sitemap.ts (coherent policy: 12 indexable static routes).
The store's `typeof window` guard misses the test shim (node env has `globalThis.localStorage` only). Fixing `safeStorage` to read `globalThis.localStorage` directly — same server behavior, works in browser and tests.
Unit suite 40/40 GREEN. Now the Playwright config + e2e specs — characterization specs (bag journey) must pass on current code; Escape/PII/metadata specs are the expected REDs.
Before running e2e, let me verify the spec's selectors against the actual cart and track-order pages.
Fixing one spec assertion (track-order page renders name, not email):
Running the e2e suite against the current code to observe the expected REDs (build included — takes a few minutes).
10 passed / 8 failed. Some failures are the wanted REDs (Escape, OG/JSON-LD, data-scroll-behavior); others need diagnosis. Let me inspect each.
Tests 1/2/3 are spec bugs (button name swaps after click → stale locator; strict-mode link ambiguity). Let me see the remaining failure details.
Snapshot shows articles DID render — my `count()` assertion raced the fetch (non-auto-waiting). That's a spec bug. Let me check the journey failure too.
All failures diagnosed: 3 spec bugs (stale locator after name swap, strict-mode ambiguity, non-auto-waiting count) plus the genuine REDs. Fixing the specs.
Re-running the mobile spec to verify the fixes and isolate the genuine Escape RED.
Two more spec bugs ("Go" substring-matches "ERGONOMI"; role queries exclude CSS-hidden elements but raw locators don't) plus the genuine Escape RED. Fixing the specs.
All remaining REDs are the intended TDD targets. Now the implementation pass. First, checking `loaded` usage before the cart-store refactor.
No `loaded` consumers — safe to drop. Writing the refactored cart-store (useSyncExternalStore over three local stores).
Now the Header — store picker via local-store, adjust-during-render route close, Escape handler, dead `searchRef` removed.
Now the shop page — URL-derived cat/sort, async loading state:
Now the search page — adjust-during-render for param sync, render derivation for the empty case:
Now layout.tsx (data-scroll-behavior), PDP metadata + JSON-LD, order page masking, and the cart/checkout findPromo swap.
Now the order page PII masking:
Now the cart and checkout pages — `findPromo` swap plus the cart promo-UI derivation fix:
All code changes in. Running the gates: typecheck + lint first.
0 lint errors (was 7), typecheck clean. Removing the one warning (unused directive in setup.ts).
Lint fully green, units 40/40. Full e2e run — all previously-RED fixes are now implemented.
Regex bug in my spec — I required a leading space before the digit count. Fixing.
**All 18 e2e green** — Escape, SEO, masking, and the full commerce journey all verified against the production build. Now the cold-build gate and then dev-server screenshots.
Cold build green. Now capturing dev-server screenshots. First verify the dev server is alive and hot-reloaded.
The screenshots were saved relative to the agent-browser daemon's CWD, not my shell. Let me locate them.
All 15 PNGs valid with correct viewports. Visual spot-check of the two remediation-critical shots.
All 16 screenshots captured. Now the docs phase — first reading the two distillation skills for the SKILL.md deliverable.
Methodology absorbed. Now updating all docs in lockstep. Starting with `.env.example` (shell-precedence note), then AGENTS.md.
Now AGENTS.md — commands table, testing section, resolved debt:
I claimed `tsconfig.tests.json` is updated in AGENTS.md — let me actually make that true (NORDHEM test tree + a `typecheck:tests` script).
Now CLAUDE.md updates — testing strategy, quality standards, and conventions:
Now README.md — Testing section, status table, and file-tree updates:
Now the PAD — revision block, testing section, and the known-issues register:
Now the PAD §10 known-issues table and verification ledger:
Now the worklog Task 114 entry:
Now the final deliverable — `home-furnishing-store_SKILL.md` per the distillation methodology:
SKILL.md created. Now the final full gate chain, then commit + push. First, reading the SSH push runbook.
The paramiko shim from the prior session is still deployed outside the repo. Running the complete final gate chain now.
**Complete final gate: ALL GREEN** — lint 0/0, typechecks clean, 40/40 unit, cold build green with all new .md files present, 18/18 e2e. Now staging and committing.
All clean — only deliverables are untracked. Committing with a Conventional Commit message.
Commit `7b695bb` on main (143 files, +3992/−17709). Now the push — setting up the key outside the repo and the ssh shim per the runbook.
Dry-run green — authentication verified, fast-forward confirmed. Real push now.
**Task 114 complete — commit `7b695bb` pushed to `main` and remote-verified via the SSH wrapper.**

**What was done:**
- **Workspace refreshed** and root docs validated against the codebase (all Task-113 claims re-verified live).
- **Rootless PostgreSQL 17.12** installed per the skill (scram TCP/trust socket, port 5432, `app_db`) — checkout round-trip, seed counts, and fail-closed tracking now **Verified** against a live DB, with exact money math (WELCOME10: $2,598 → $2,338.20, GST $193.06).
- **Audit** (web-application methodology + mobile-nav taxonomies at 390×844/1280×800): 8 findings — dead test tree, 7 lint errors, SEO gaps, drawer ignoring Escape, PII on `/order/[number]`, promo display duplication. **No Tailwind v4 mobile-nav bug** (the family's v4 trap is the candidate scan — guarded, cold-build-proven).
- **Remediation plan** → validated → executed TDD-first: vitest + Playwright harness re-pinned (**40 unit + 18 e2e, all green**), lint debt fixed by refactor (external stores + `useSyncExternalStore`, 0/0 without suppression), Escape-close, coherent robots/sitemap policy + PDP OG/canonical/JSON-LD, email masking, `findPromo()`.
- **Gates all green**: lint 0/0 · typechecks clean · 40/40 unit · 18/18 e2e · cold build (30 routes). 16 dev-server screenshots captured; docs (README/AGENTS/CLAUDE/PAD v1.1.0/worklog) + [home-furnishing-store_SKILL.md](/home/z/my-project/home-furnishing-store/home-furnishing-store_SKILL.md) updated in lockstep; plan archived in [docs/plans](/home/z/my-project/home-furnishing-store/docs/plans/2026-11-18-task114-remediation-plan.md).

**Suggested next steps:** grow the e2e suite around reviews/planning-tools, unify `priceTotals` with `placeOrder`'s inline pricing, and consider generated SQL migrations before schema changes under live data.

I'll continue by first examining the current state of the workspace, the existing `DEPLOYMENT.md`, and the SSH wrapper instructions.
The repo exists. Let me check its git status, the existing DEPLOYMENT.md, and the wrapper instructions.
The working tree is clean and the last commit was the Task 114 remediation. Now I need to understand what the remediated codebase actually looks like (I notice a `drizzle.config.json` at the root, while DEPLOYMENT.md still describes Prisma), and check the rootless PostgreSQL setup at `/home/z/my-project/pg`. Let me explore.
The codebase has fundamentally changed: it's now **NORDHEM Singapore** — Next.js 16 + React 19 + **Drizzle + PostgreSQL** (no Prisma, no SQLite, no Stripe scripts). The existing DEPLOYMENT.md describes the old ElyBeauty stack entirely, so it needs a full rewrite. Let me examine the remediated codebase, the rootless PostgreSQL setup, and the wrapper script.
The workspace has the rootless PostgreSQL setup (`/home/z/my-project/pg/` + `scripts/pg_setup.sh`) and the paramiko SSH shim in `bin/ssh`. Let me read the key files to understand the current app architecture.
The schema is clear — a Singapore furniture storefront. Now let me look at the DB client, env contract, next.config, worklog, and the wrapper's default remote.
`DATABASE_URL` is the only env var, with a "Degrade, Never Fail" pattern, and `next.config.ts` is minimal (no standalone output). Let me check the health route, worklog, last commit, wrapper script, and how the DB gets seeded.
The wrapper's default remote is stale (`ely-beauty`) — I'll need `--remote git@github.com:nordeim/home-furnishing-store.git`. Now let me find the seed mechanism and check the worklog, health route, and test configs.
The health route returns `{ok: true/false}` — different from the old doc's `{"status":"ok","db":"up"}`. Let me examine the worklog structure, the seed mechanism, and server-data degrade pattern.
The seed mechanism is `ensureSeed()` in `server-data.ts` — self-seeding from the static catalog on first request. Let me read that, the worklog's Task 114 entry, and the test configs.
Now let me read the README and AGENTS.md to keep the new DEPLOYMENT.md consistent with the regenerated root docs, plus check the order-number format and checkout money rules.
README is NORDHEM-native and consistent. Let me read AGENTS.md (gate + git contract) and check `src/lib/utils.ts` for the order-number format, then verify the PostgreSQL cluster state.
PostgreSQL is running and accepting connections. Let me check the order-number generator and the checkout rate limiter, then I'll have all the facts I need.
I now have the full picture. Let me set up the task plan, then verify the remaining details (promo min-spends, worklog tail for the append point, repo skills inventory).
The worklog ends at Task 114 — I'll append Task 115. Let me quickly verify the rootless-postgresql skill reference and the wrapper script's on-disk integrity (per the runbook's display-redaction warning), plus the SSH shim readiness.
All prerequisites verified. Let me check for cross-references to DEPLOYMENT.md in other docs and the shell env shadow trap, then present the plan.
The shell exports the stale `DATABASE_URL=file:...custom.db` shadow (the documented trap) — I'll pin the URL explicitly for every build/test invocation. Let me verify the effective postgresql.conf so the doc's sed patterns are exact.
All patterns verified against the live cluster. Here is the plan, then I'll execute it.

## Plan for the DEPLOYMENT.md alignment

**Why a full rewrite:** the current `docs/DEPLOYMENT.md` is 100% ElyBeauty-era — it documents Prisma + SQLite (`file:` URLs, `db:setup`/`db:push`/`db:seed` scripts), a `standalone` build with `.env` baking, `AUTH_SECRET`/Stripe/`NEXT_PUBLIC_SITE_URL` env vars, Cloudflare limiter topology and the Stripe FX gate. **None of that exists in the remediated NORDHEM tree** (verified: single env read `DATABASE_URL` in `src/db/index.ts`; `drizzle.config.json` pins its own URL; `next.config.ts` sets nothing; npm scripts are `dev/build/start/lint/typecheck*/test*` only).

**New structure (12 sections), every claim code-verified:**
1. Supported shape — one Next.js app + one Postgres, no standalone output, mock payments
2. Prerequisites — Node ≥ 20, PostgreSQL (17.12 rootless = the verified path)
3. Install & configure — the single-variable env contract + the dotenv precedence trap
4. **Database installation — rootless PostgreSQL** (apt-get download → `dpkg-deb -x` into a user prefix → `initdb` trust-socket/scram-TCP → conf → `pg_ctl` lifecycle → role + `app_db` → `pg_isready`), matching the live workspace cluster
5. Schema push — `npx drizzle-kit push`, the dual-config drift warning
6. Seeding — automatic `ensureSeed()` on first read; reseed-is-not-a-refresh semantics
7. Build & run — build-time env requirement, port contract
8. Production notes — Degrade-Never-Fail semantics, server-truth money rules, proxy guidance for the limiter, per-process state
9. Updating — cold-build mandate
10. Verification checklist — the AGENTS.md gate + runtime probes
11. Common issues — 12-row table
12. Push contract — wrapper with mandatory `--remote` override

Then: worklog Task 115 entry → full verification gate against the live rootless PG → commit to main → push via `ssh_git_wrapper_v3.py`.
Now writing the new DEPLOYMENT.md:
Let me verify the track-order 404 behavior and reviews route claims I made in the doc:
Both verified. Now appending the Task 115 worklog entry:
Worklog appended. Now running the full verification gate — cold build first with the pinned DATABASE_URL (the shell shadow trap):
Build completed. Let me confirm the route count and run the typechecks and lint:
Typechecks and lint are clean. Let me count the routes precisely and run the unit + e2e suites:
40/40 unit tests pass, and the build output shows exactly **29 routes** (not 30 as the old worklog claimed) — let me correct that number in the doc for precision, then run the e2e suite:
All 18 e2e tests pass (including the live-DB checkout journey). I noticed an odd artifact in the Edit output — let me verify the file content around that area is intact:
The file is intact (the odd text was a display artifact). Let me review the rest of the document:
The document reads well. Two small refinements: make the reseed recipe explicit about which psql client, and verify the `.gitignore` claim:
`.gitignore` claim verified, and only the two intended files are modified. Let me re-run the fast gates on the exact final tree (the last edits were docs-prose only), then commit:
All gates green. Committing to main:
Committed `6cb2e02` on main. Now preparing the push: materialize the operator key into a 0600 file outside the repo, put the paramiko shim on PATH, and dry-run the wrapper:
Dry-run green — the key authenticates and the remote is at `7b695bb` (fast-forward expected). Executing the real push:
Push verified — remote main is at `6cb2e02`, matching local HEAD. Now shredding the operator key per the runbook and doing a final status check:
Done. Summary of this cycle:

**DEPLOYMENT.md alignment** — the inherited guide was 100% ElyBeauty-era (Prisma/SQLite, standalone build, AUTH_SECRET/Stripe/Cloudflare content — none of which exist in the remediated tree). I rewrote it wholesale as a 12-section guide verified against the code: the single-variable `DATABASE_URL` contract, **rootless PostgreSQL as the documented database installation method** (the exact verified procedure: `apt-get download` → `dpkg-deb -x` into a user prefix → `initdb` trust-socket/scram-TCP → `pg_ctl` lifecycle → `app_db` — PG 17.12, zero drift with `drizzle.config.json`), `drizzle-kit push` + the dual-config drift warning, automatic `ensureSeed` semantics, Degrade-Never-Fail operations, the cold-build mandate, the verification gate, an 11-row issue table, and the push contract.

**Gate on the final tree**: cold build green (29 routes) · typecheck + typecheck:tests clean · lint 0/0 · 40/40 unit · 18/18 e2e against the live rootless PG.

**Push**: commit `6cb2e02` on main (no new branch), pushed via `ssh_git_wrapper_v3.py` with the mandatory `--remote git@github.com:nordeim/home-furnishing-store.git` override — dry-run first, then real push, remote verified `refs/heads/main @ 6cb2e02 == local HEAD`; the operator key was shredded after use and never entered the repo. Worklog Task 115 documents the cycle.

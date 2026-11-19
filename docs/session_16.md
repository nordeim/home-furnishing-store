The workspace had remnants (pg/, bin/ssh, screenshots) but no repo checkout — fresh clone to `451bf40` (Task 124 complete: 138 unit + 89 e2e). This session is Task 125. npm install + PG restore in parallel; chromium-1255 installed (the cache held only 1200 — the documented trap).
Rootless PG 17.12 restored per SKILL lesson 31 (subdirectories only, DDL intact incl. the unique index). DB baseline fully clean — 0 orders, 5 seed reviews, inventory verified against the seed CODE (0 mismatches). Baseline gates green: lint 0/0, typechecks, 138/138 unit, 89/89 e2e cold, zero residue after the suite.
Both audits returned: 19 findings (1 MEDIUM / 11 LOW / 7 reference-posture gaps incl. 2 evaluated-and-deferred), every headline re-verified at line/byte level, the discount math recomputed from the catalogue.
Mobile taxonomy 5/5 PASS + hydration PASS — no Tailwind v4 bug. F-7 browser-reproduced: the drawer stays open on param-only navigation (aria-expanded true after /shop?cat=bedroom → /shop?cat=dining).
Plan written and validated. Executed 12 slices, red → green each:
- F-1: honest-RED via a temporary 23:00 SGT pin (both assertions failed as predicted — the baseline green had simply run before the 14:00 SGT cutoff) → the 10:00 SGT pin → GREEN.
- F-2/F-3: reviews TYPE-strictness (4 probes, 201 → 422, zero residue after the RED run) + track/promo caps (404/INVALID_PROMO → 422 VALIDATION).
- G-2: clientIp unit RED ×3 → rightmost-XFF seam → 4 routes rewired.
- G-1: headers e2e RED → the platform header set + poweredByHeader:false → GREEN.
- F-4/F-5: strip + /offers metadata attribution (dining max −17%; honest set: lighting −24%, cookware −23%, decor).
- F-6: clock+payload e2e RED (intercepted POST carried "Today 2pm" while the select showed "Tomorrow 10am"; first draft hit the route announcer under strict mode — scoped to the text) → the adjust-during-render guard → GREEN with all 3 sibling slot specs.
- F-7: e2e RED → drawer-link onClick close → GREEN (8/8 mobile).
- G-4/F-8/F-10/F-12: SITE_ORIGIN + 17 files + fs-pin; home/planning-tools/shop metadata derive.
- G-3: jsonLdScript RED ×3 (first draft had invisible raw U+2028 literals — rewritten with String.fromCodePoint) → the three-escape seam → both sites wired.
- G-6: e2e RED → icon.svg + manifest.ts → GREEN (a metadataBase key tsc caught in the first draft).
- G-7: devices["iPhone 13"] → 8/8 mobile green.
- G-5: html[data-hydrated] sentinel + gotoHydrated + pin → GREEN (gotcha #11's blindness admission retired).
Full unit 145/145 (docs-counts swept across all five docs). One TS lesson: closure-assigned `let x = null` narrows to `never` — the object-wrapper pattern. Full e2e COLD 97/97 + ZERO DB residue. Cold build 30 routes.
Screenshots 36–41 captured and verified non-blank; strip copy, slot options and icon/manifest links DOM-verified live.
Docs lockstep: AGENTS (145/97, pin list, gotcha #11), CLAUDE (Task-125 seams, 114–125), README (Task-125 paragraph), PAD v1.10.0 (revision block, §11 9-tables fix, G-8/G-9 register deferrals), SKILL v1.9.0 (lessons 36–38), worklog, plan archived. `.env.example` re-verified tracked + unchanged.
Committed `6bd5ae9`. Push via the SSH wrapper: paramiko shim on PATH, key materialized 0600 outside the repo (fingerprint verified), dry-run green (fast-forward `451bf40..6bd5ae9`), real push, wrapper verified remote == HEAD; independent ls-remote re-verified `6bd5ae9`; operator key shredded.
**Task 125 delivered — `6bd5ae9` pushed to `main`, remote verified independently.**

## Summary

**Setup & validation**: fresh clone (`451bf40`), all five operator docs + session_13/session_14/the Task-124 plan/worklog reviewed against the codebase. Rootless PG 17.12 restored (lesson 31); baseline gates green (lint 0/0, typechecks, 138/138 unit, 89/89 e2e cold); mobile drawer taxonomy + hydration + utility strip + sitemap/robots verified live; DB fully clean before and after the baseline suite.

**Audit** (per `skills/web-application`, homenest-store-s as reference): 19 findings, every headline verified at line level. The one MEDIUM:
- **F-1**: the Task-121 method-switch e2e pin was time-bombed by the Task-124 slot seam — any post-14:00-SGT run would go red with zero code change (proven live by a temporary 23:00 SGT pin)

**Remediation** (TDD, plan at `docs/plans/2026-11-19-task125-remediation-plan.md`): 17 fixes + 2 evaluated-and-deferred (CSP with the homenest trap log recorded; the jsdom layer). Highlights: reviews POST TYPE-strictness (the last coercing write boundary), track/promo field caps, the `clientIp()` rightmost-XFF rate-limit identity (the leftmost hop was client-forgeable at four sites), the platform security-header set + fingerprint suppression, the honest discount attribution (strip + offers metadata), the checkout slot clock-coherence guard with a payload-level e2e pin, the drawer param-navigation close (browser-reproduced), `SITE_ORIGIN` single-sourcing (17 files → 1 constant, fs-pinned), the `jsonLdScript` U+2028/U+2029 escape seam, the web manifest + app icon, `devices["iPhone 13"]` mobile emulation, and the `html[data-hydrated]` hydration sentinel + `gotoHydrated` gate.

**Delivered**: gates **lint 0/0 · 145/145 unit · 97/97 e2e (cold build, 30 routes) · zero DB residue**; 6 fresh screenshots (docs/screenshots/36–41); `.env.example` verified tracked + unchanged; docs lockstep across all five operator docs (PAD v1.10.0, SKILL v1.9.0 with lessons 36–38); pushed via the SSH wrapper — `6bd5ae9`, remote verified twice, keys shredded.

Suggested next steps: the deferred register remains documented (CSP via proxy.ts with the connection() discipline, jsdom component layer, header store-picker wiring into checkout, delivery decrement redistribution, orderNumber collision retry) for a future cycle.

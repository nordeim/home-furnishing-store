import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

/**
 * Docs-counts pin (web-application skill §14, the neo-crm mechanism):
 * live-tense test-count claims in the operator docs are DOCUMENTATION CLAIMS —
 * they must equal the fs-computed reality of the test tree. A stale count
 * anywhere below fails `npm run test`, so future test changes force the
 * same-commit docs sweep (count-lockstep) instead of relying on memory.
 *
 * Rules that keep this pin exact:
 * - Every test here is a LITERAL `test(...)` declaration — no loops generating
 *   tests, because this file's own fs-countable surface is part of the truth
 *   it pins (a loop would undercount itself).
 * - Scope: AGENTS/README/CLAUDE/SKILL/PAD (the five live operator docs).
 *   The PAD's historical verification ledgers intentionally keep their
 *   era's counts (history rule); its LIVE-TENSE sites are pinned below —
 *   Task 120 closed the blind spot that let the PAD rot while the other
 *   four docs stayed truthful.
 */

// Task 129 F-9: repo-root anchor — cwd-relative paths break with a confusing
// ENOENT when vitest runs from a subdirectory; resolve from this file's own
// location instead (the local-store fs-pin precedent).
const ROOT = resolve(import.meta.dirname, "../..");

const unitDir = join(ROOT, "tests/unit");
const e2eDir = join(ROOT, "tests/e2e");

const unitFiles = readdirSync(unitDir).filter((f) => /\.test\.tsx?$/.test(f));
const e2eFiles = readdirSync(e2eDir).filter((f) => /\.spec\.ts$/.test(f));

function countMatches(files: string[], dir: string, re: RegExp): number {
  let n = 0;
  for (const f of files) n += (readFileSync(join(dir, f), "utf8").match(re) ?? []).length;
  return n;
}

// Top-level test declarations (the suite uses flat `test(...)` calls; if
// describe-nesting is ever introduced, this regex already counts indented
// tests too because ^\s* tolerates indentation).
const unitCount = countMatches(unitFiles, unitDir, /^\s*(?:test|it)\(/gm);
const e2eCount = countMatches(e2eFiles, e2eDir, /^\s*test\(/gm);

function claimed(doc: string, re: RegExp): number {
  const m = readFileSync(join(ROOT, doc), "utf8").match(re);
  expect(m, `${doc}: claim pattern ${re.source} not found — the claim site moved?`).not.toBeNull();
  return Number(m?.[1] ?? -1);
}

test("fs-computed suite counts are non-zero", () => {
  expect(unitFiles.length).toBeGreaterThan(0);
  expect(e2eFiles.length).toBeGreaterThan(0);
  expect(unitCount).toBeGreaterThan(0);
  expect(e2eCount).toBeGreaterThan(0);
});

test("AGENTS.md unit-suite count === fs reality", () => {
  expect(claimed("AGENTS.md", /Vitest unit suite \((\d+) tests/)).toBe(unitCount);
});
test("AGENTS.md e2e count === fs reality", () => {
  expect(claimed("AGENTS.md", /Playwright e2e \((\d+) tests/)).toBe(e2eCount);
});
test("AGENTS.md unit-file count === fs reality", () => {
  expect(claimed("AGENTS.md", /`tests\/unit` \((\d+) files\)/)).toBe(unitFiles.length);
});
test("README.md unit count === fs reality", () => {
  expect(claimed("README.md", /Vitest unit — (\d+) tests/)).toBe(unitCount);
});
test("README.md e2e count === fs reality", () => {
  expect(claimed("README.md", /Playwright e2e — (\d+) tests against/)).toBe(e2eCount);
});
test("README.md status-table counts === fs reality", () => {
  const doc = readFileSync(join(ROOT, "README.md"), "utf8");
  const m = doc.match(/(\d+) unit \+ (\d+) e2e, all green/);
  expect(m, "README status-table claim not found").not.toBeNull();
  expect(Number(m?.[1])).toBe(unitCount);
  expect(Number(m?.[2])).toBe(e2eCount);
});
test("CLAUDE.md unit count === fs reality", () => {
  expect(claimed("CLAUDE.md", /Unit \(Vitest, (\d+) tests\)/)).toBe(unitCount);
});
test("CLAUDE.md e2e count === fs reality", () => {
  expect(claimed("CLAUDE.md", /E2E \(Playwright, (\d+) tests\)/)).toBe(e2eCount);
});
test("SKILL.md gate-chain unit fraction === fs reality", () => {
  const m = readFileSync(join(ROOT, "home-furnishing-store_SKILL.md"), "utf8").match(/npm run test\s+# (\d+)\/(\d+)/);
  expect(m, "SKILL gate-chain unit claim not found").not.toBeNull();
  expect(Number(m?.[1])).toBe(unitCount);
  expect(Number(m?.[2])).toBe(unitCount);
});
test("SKILL.md gate-chain e2e fraction === fs reality", () => {
  const m = readFileSync(join(ROOT, "home-furnishing-store_SKILL.md"), "utf8").match(/npm run test:e2e\s+# (\d+)\/(\d+)/);
  expect(m, "SKILL gate-chain e2e claim not found").not.toBeNull();
  expect(Number(m?.[1])).toBe(e2eCount);
  expect(Number(m?.[2])).toBe(e2eCount);
});
test("SKILL.md Appendix B unit count === fs reality", () => {
  expect(claimed("home-furnishing-store_SKILL.md", /tests\/unit\/\*\.test\.ts`? \((\d+)\)/)).toBe(unitCount);
});
test("SKILL.md Appendix B e2e count === fs reality", () => {
  expect(claimed("home-furnishing-store_SKILL.md", /storefront\.spec\.ts`? \((\d+)\)/)).toBe(e2eCount);
});

test("PAD §1.2 tech-table counts === fs reality", () => {
  // Live-tense: "… N unit + N e2e, all green (§7)". The historical ledgers
  // ("Suite grew to …", "as of Task 118") keep their era counts — the
  // ", all green" tense marker targets only the live claim.
  const m = readFileSync(join(ROOT, "Project_Architecture_Document.md"), "utf8").match(/ (\d+) unit \+ (\d+) e2e, all green/);
  expect(m, "PAD §1.2 live claim not found").not.toBeNull();
  expect(Number(m?.[1])).toBe(unitCount);
  expect(Number(m?.[2])).toBe(e2eCount);
});

test("PAD §7.4 gate commands === fs reality", () => {
  const doc = readFileSync(join(ROOT, "Project_Architecture_Document.md"), "utf8");
  const unit = doc.match(/npm run test\s+# (\d+)\/(\d+) unit/);
  const e2e = doc.match(/npm run test:e2e\s+# (\d+)\/(\d+) e2e/);
  expect(unit, "PAD §7.4 unit gate claim not found").not.toBeNull();
  expect(e2e, "PAD §7.4 e2e gate claim not found").not.toBeNull();
  expect(Number(unit?.[1])).toBe(unitCount);
  expect(Number(unit?.[2])).toBe(unitCount);
  expect(Number(e2e?.[1])).toBe(e2eCount);
  expect(Number(e2e?.[2])).toBe(e2eCount);
});

test("PAD §9.2 command-table counts === fs reality", () => {
  const m = readFileSync(join(ROOT, "Project_Architecture_Document.md"), "utf8").match(/Vitest unit \((\d+)\) \/ Playwright e2e \((\d+)/);
  expect(m, "PAD §9.2 command-table claim not found").not.toBeNull();
  expect(Number(m?.[1])).toBe(unitCount);
  expect(Number(m?.[2])).toBe(e2eCount);
});

test("PAD §11 key-files test counts === fs reality", () => {
  const doc = readFileSync(join(ROOT, "Project_Architecture_Document.md"), "utf8");
  const unit = doc.match(/\| (\d+) files \| (\d+) unit tests/);
  const e2e = doc.match(/\| (\d+) specs \| (\d+) Playwright tests/);
  expect(unit, "PAD §11 unit row not found").not.toBeNull();
  expect(e2e, "PAD §11 e2e row not found").not.toBeNull();
  expect(Number(unit?.[1])).toBe(unitFiles.length);
  expect(Number(unit?.[2])).toBe(unitCount);
  expect(Number(e2e?.[1])).toBe(e2eFiles.length);
  expect(Number(e2e?.[2])).toBe(e2eCount);
});

// Task 124 F-1: the docs-counts pin guards COUNTS; these pins guard the other
// live-tense claim class — the /api/health BODY. The Task-123 F-9 envelope
// change swept DEPLOYMENT.md but missed three sites in CLAUDE/README (the
// same docs then carried both the old bare `{ ok: true }` and the new
// envelope narrative). Every health claim site must now tell the shipped
// truth (src/app/api/health/route.ts), or the run fails.
test("CLAUDE.md /api/health table row tells the envelope truth (Task 124 F-1)", () => {
  const row = readFileSync(join(ROOT, "CLAUDE.md"), "utf8").match(/\| `\/api\/health`[^\n]*/)?.[0] ?? "";
  expect(row, "CLAUDE.md /api/health table row not found").not.toBe("");
  expect(row).toContain('data: { db: "up" }');
});

test("README /api/health quick-start line tells the envelope truth (Task 124 F-1)", () => {
  const line = readFileSync(join(ROOT, "README.md"), "utf8").match(/- `curl http:\/\/localhost:3000\/api\/health`[^\n]*/)?.[0] ?? "";
  expect(line, "README quick-start health curl line not found").not.toBe("");
  expect(line).toContain('"data":{"db":"up"}');
});

test("README /api/health table row tells the envelope truth (Task 124 F-1)", () => {
  const row = readFileSync(join(ROOT, "README.md"), "utf8").match(/\| `\/api\/health`[^\n]*/)?.[0] ?? "";
  expect(row, "README /api/health table row not found").not.toBe("");
  expect(row).toContain('data: { db: "up" }');
});

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
 * - Scope: AGENTS/README/CLAUDE/SKILL (the four live operator docs). The PAD's
 *   historical verification ledgers intentionally keep their era's counts
 *   (history rule) — only its live §7 claims are swept manually.
 */

const unitDir = "tests/unit";
const e2eDir = "tests/e2e";

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
  const m = readFileSync(doc, "utf8").match(re);
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
  const doc = readFileSync("README.md", "utf8");
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
  const m = readFileSync("home-furnishing-store_SKILL.md", "utf8").match(/npm run test\s+# (\d+)\/(\d+)/);
  expect(m, "SKILL gate-chain unit claim not found").not.toBeNull();
  expect(Number(m?.[1])).toBe(unitCount);
  expect(Number(m?.[2])).toBe(unitCount);
});
test("SKILL.md gate-chain e2e fraction === fs reality", () => {
  const m = readFileSync("home-furnishing-store_SKILL.md", "utf8").match(/npm run test:e2e\s+# (\d+)\/(\d+)/);
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

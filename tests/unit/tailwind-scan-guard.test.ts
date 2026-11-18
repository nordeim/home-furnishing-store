import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Tailwind v4 candidate-scan guard pin (Task 118): globals.css's comment
 * claimed this pin existed since the guard was written — it didn't (the
 * predecessor tree was retired with it). The guard is the reason this repo's
 * clean build survives prose files quoting class names (AGENTS.md gotcha #1);
 * removing any @source not line must fail HERE, not at the next cold build.
 */

const css = readFileSync(
  join(import.meta.dirname, "../../src/app/globals.css"),
  "utf8",
);

describe("globals.css candidate-scan guard", () => {
  it("excludes prose/doc surfaces from the Tailwind v4 candidate scan", () => {
    expect(css).toContain('@source not "../../**/*.md"');
    expect(css).toContain('@source not "../../**/*.mdx"');
    expect(css).toContain('@source not "../../docs"');
    expect(css).toContain("@source not \"../../skills\"");
    expect(css).toContain("@source not \"../../tests\"");
    expect(css).toContain("@source not \"../../scripts\"");
  });

  it("defines the design tokens in the CSS-first @theme block", () => {
    // No tailwind.config.js exists — tokens live here as literal hex.
    expect(css).toMatch(/@theme\s*\{/);
    expect(css).toMatch(/--color-brand:\s*#0058a3/);
    expect(css).toMatch(/--color-accent:\s*#ffdb00/);
  });
});

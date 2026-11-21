import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Repo-infrastructure contract pins (Task 118): this repo twice inherited
 * whole-file lineage drift — the operator pasted a sibling project's
 * .env.example (Stripe/BDT/auth variables this codebase never reads) and a
 * docker-compose describing a different architecture (Redis, Stripe CLI,
 * Adminer). These pins fail BY CONTENT when that class of drift returns.
 */

const ROOT = join(import.meta.dirname, "../..");

function readRoot(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/** Active (uncommented) KEY=VALUE assignments in an env file. */
function activeVars(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => l.split("=")[0]!.trim());
}

describe(".env.example matches the codebase", () => {
  const env = readRoot(".env.example");

  it("defines DATABASE_URL — the one REQUIRED variable (active assignments stay exactly one)", () => {
    const vars = activeVars(env);
    expect(vars).toContain("DATABASE_URL");
    expect(vars).toEqual(["DATABASE_URL"]);
  });

  it("documents the optional TRUST_PROXY gate — commented, fail-closed, exactly-\"1\" (Task 141 G)", () => {
    // The register promotion: src/lib/rate-limit.ts now reads TRUST_PROXY.
    // The honest direct-deploy default is UNSET (fails closed to the shared
    // "direct" bucket), so the example ships it COMMENTED — an active
    // assignment here would silently trust XFF for every copy-paste setup.
    // The block must document the exactly-"1" contract and the spoofed-XFF
    // bypass it closes (the docs-truth stance: the claim stays load-bearing).
    expect(env).toMatch(/#TRUST_PROXY="1"/);
    expect(env).toMatch(/TRUST_PROXY is EXACTLY "1"/);
    expect(env).toMatch(/fails closed/);
    expect(env.toLowerCase()).toContain("spoofer");
    // …and the variable never becomes an active assignment.
    expect(activeVars(env)).not.toContain("TRUST_PROXY");
  });

  it("carries no sibling-lineage variables this codebase never reads", () => {
    // None of these appear in src/; all arrived via the homenest/"Maison"
    // lineage paste (Stripe/BDT payments, Cloudflare posture, session auth).
    const forbidden = [
      "AUTH_SECRET",
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_BDT_PER_USD",
      "NEXT_PUBLIC_SITE_URL",
      "NEXT_PUBLIC_DEMO_MODE",
      "TRUST_CF_CONNECTING_IP",
    ];
    const present = activeVars(env);
    for (const f of forbidden) expect(present).not.toContain(f);
    // Even commented lineage guidance must not survive (it misleads setup).
    expect(env).not.toMatch(/STRIPE_BDT_PER_USD|homenest_session|poisha|taka/i);
  });

  it("documents the dotenv precedence trap (shell env beats .env)", () => {
    expect(env.toLowerCase()).toMatch(/shell|exported/);
    expect(env).toMatch(/never overrides|beats/i);
  });
});

describe("docker-compose describes THIS architecture", () => {
  const compose = readRoot("docker-compose.yml");

  it("runs exactly the postgres service this codebase needs", () => {
    expect(compose).toMatch(/postgres:17/);
    expect(compose).toMatch(/POSTGRES_DB:\s*app_db/);
    expect(compose).toMatch(/5432:5432/);
    // Redis/Stripe/Adminer are not dependencies of this codebase: the only
    // container image the compose file may pull is postgres (comments may
    // honestly say "no Redis" — service definitions may not).
    const images = [...compose.matchAll(/^\s*image:\s*(\S+)/gm)].map((m) => m[1]!);
    expect(images).toEqual(["postgres:17-alpine"]);
    const servicesBlock = compose.split(/^services:\s*$/m)[1]?.split(/^volumes:\s*$/m)[0] ?? "";
    const serviceKeys = [...servicesBlock.matchAll(/^\s{2}([a-zA-Z0-9_-]+):\s*$/gm)].map((m) => m[1]!);
    expect(serviceKeys).toEqual(["postgres"]);
  });

  it("mounts no init-script directory — the schema needs no extensions", () => {
    // serial integer PKs + in-JS catalogue search: pgcrypto/pg_trgm lineage has no place.
    expect(compose).not.toMatch(/docker-entrypoint-initdb\.d/);
    expect(existsSync(join(ROOT, "infrastructure"))).toBe(false);
  });
});

describe("next.config.ts keeps the dev hydration guard", () => {
  it("allows 127.0.0.1 as a dev origin (allowedDevOrigins)", async () => {
    // Next 16 blocks /_next/hmr from 127.0.0.1 while the banner host is
    // localhost: the page renders but never hydrates (drawer/cart dead), and
    // every existing gate is blind to it (e2e boots the production build).
    const mod = await import(join(ROOT, "next.config.ts"));
    expect(mod.default?.allowedDevOrigins).toContain("127.0.0.1");
  });
});

describe("db pool keeps its degrade time bound (Task 122 F-9)", () => {
  it("pins connectionTimeoutMillis + query_timeout in src/db/index.ts", () => {
    // "Degrade, Never Fail" only engages when a failing query actually
    // RETURNS: without these bounds a wedged (not refused) Postgres hangs
    // every force-dynamic page indefinitely. Source-pin per the scan-guard
    // precedent (the Pool config is not observable from a node unit test).
    const src = readRoot(join("src", "db", "index.ts"));
    expect(src).toMatch(/connectionTimeoutMillis:\s*5_000/);
    expect(src).toMatch(/query_timeout:\s*8_000/);
  });
});

describe(".env.example keeps its docs-truth claims current (Task 126 F-4)", () => {
  it("documents the SITE_ORIGIN single-sourcing, not the retired hardcoded-origin note", () => {
    // Task 125 G-4 moved the origin literal into SITE_ORIGIN
    // (src/lib/utils.ts); the .env.example note still told a domain-mover to
    // edit layout.tsx/robots.ts/sitemap.ts. Docs claims rot exactly like
    // counts — pin the corrected claim (the docs-counts stance).
    const example = readRoot(".env.example");
    expect(example).toContain("single-sourced as SITE_ORIGIN in src/lib/utils.ts");
    expect(example).not.toMatch(/hardcoded in src\/app\/layout\.tsx/);
  });

  it("attributes the env precedence to Next's own loader (dotenv the package is gone)", () => {
    // dotenv sat unused in dependencies for the template lineage — Next
    // reads .env natively; the precedence note must name the real actor.
    const example = readRoot(".env.example");
    expect(example).toContain("Next's");
    expect(example).not.toMatch(/^.*dotenv never overrides/m);
  });
});

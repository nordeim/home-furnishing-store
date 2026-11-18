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

  it("defines DATABASE_URL — the only variable src/ reads", () => {
    const vars = activeVars(env);
    expect(vars).toContain("DATABASE_URL");
    expect(vars).toEqual(["DATABASE_URL"]);
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
    // serial integer PKs + ilike search: pgcrypto/pg_trgm lineage has no place.
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

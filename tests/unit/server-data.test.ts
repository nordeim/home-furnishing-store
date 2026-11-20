import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { resolve } from "node:path";

/**
 * Task 131 F-2: a STRUCTURAL pin on the placeOrder fulfilment seam. Task 130
 * F-2 scoped the lock/availability query to the chosen store (`fulfilStore`)
 * for every method — but the decrement re-derived `input.storeSlug ||
 * "tampines"` verbatim instead of reading the seam, so the check/decrement
 * coherence (the fix's whole point — check and decrement must read the SAME
 * rows or the greatest(0,·) clamp mints phantom units) rested on textual
 * duplication. This pin fails the run if the re-derivation ever returns:
 * the default expression must occur EXACTLY ONCE (the `fulfilStore`
 * definition) and the decrement must reference `fulfilStore` itself.
 *
 * fs-based by design (the IDEMPOTENCY_KEY_RE / PERSISTED_STORAGE_KEYS
 * producer-pin precedent): placeOrder touches the live DB, so the unit
 * suite pins its source structure, not its runtime behavior.
 */

const ROOT = resolve(import.meta.dirname, "../..");
const SOURCE = readFileSync(resolve(ROOT, "src/lib/server-data.ts"), "utf8");

it("the fulfilment-store default is derived EXACTLY ONCE (the fulfilStore seam)", () => {
  const occurrences = SOURCE.match(/input\.storeSlug \|\| "tampines"/g) ?? [];
  expect(occurrences.length, "placeOrder must derive the fulfilment store in ONE place — a second re-derivation (e.g. inside the decrement) re-opens the Task-130 F-2 phantom-unit class by letting check and decrement drift apart").toBe(1);
});

it("the decrement reads the fulfilStore seam, not its own store derivation", () => {
  // The decrement's where-clause must bind to `fulfilStore` — the same
  // identifier the lock/availability query reads (check/decrement coherence
  // by construction, not by coincidence of identical expressions).
  expect(SOURCE).toMatch(/eq\(inventory\.storeSlug, fulfilStore\)/);
});

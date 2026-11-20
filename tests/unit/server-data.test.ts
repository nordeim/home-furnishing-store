import { readdirSync, readFileSync } from "node:fs";
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
  // Task 132 F-2: the pre-132 pin only asserted the file CONTAINED
  // `eq(inventory.storeSlug, fulfilStore)` somewhere — the lock/availability
  // query satisfied it alone, so a decrement rewritten to any OTHER
  // expression (e.g. reading input.storeSlug directly, no default
  // re-derivation) passed BOTH pins while check and decrement drifted apart
  // (the Task-130 F-2 phantom-unit class; demonstrated by temporary mutation
  // — the old pin stayed green on the mutated tree). The strengthened pin
  // binds BOTH sites: the clause must occur EXACTLY TWICE — once in the
  // availability lock, once in the decrement.
  const occurrences = SOURCE.match(/eq\(inventory\.storeSlug, fulfilStore\)/g) ?? [];
  expect(occurrences.length, "placeOrder must read the fulfilStore seam at BOTH the availability lock and the decrement — exactly two occurrences (check/decrement coherence by structure)").toBe(2);
});

it("the DB funnel holds: only src/db, server-data, and the health probe import @/db (Task 136 F-2)", () => {
  // PAD §3.1's golden rule: "every DB touch funnels through
  // src/lib/server-data.ts … A page importing @/db directly is an
  // architecture violation." Task 136 found the rule violated by exactly
  // the case it names (the order page imported @/db directly, hand-rolling
  // the outage/not-found semantics) plus the reviews POST (the only write
  // path outside the funnel). The health route is the DOCUMENTED
  // infra-probe exception — it must bypass the degrade by design (it
  // reports DB status itself). This pin fails the run if any other file
  // under src/ ever grows a direct @/db / @/db/schema import again.
  const importers: string[] = [];
  const walk = (dir: string) => {
    for (const ent of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
      const p = `${dir}/${ent.name}`;
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(ent.name) && /from "@\/db(\/schema)?"/.test(readFileSync(resolve(ROOT, p), "utf8")))
        importers.push(p);
    }
  };
  walk("src");
  const violators = importers.filter(
    (p) => p !== "src/lib/server-data.ts" && p !== "src/app/api/health/route.ts" && !p.startsWith("src/db/"),
  );
  expect(
    violators.join("; "),
    "PAD §3.1 golden rule: every DB touch funnels through src/lib/server-data.ts — only src/db/**, server-data.ts, and the api/health infra probe may import @/db",
  ).toBe("");
});

it("the reviews degrade contracts return null (outage), never a false resolved-empty (Task 136 F-3)", () => {
  // getReviews catch → [] and getReviewCount catch → 0 made a DB outage
  // render "Reviews (0)" + the false "No reviews yet — be the first"
  // invitation for a product with LIVE reviews (the server-side twin of the
  // "fetch failure ≠ empty state" class the repo polices client-side since
  // Task 117/119/135). null is the outage signal: [] is reserved for a
  // RESOLVED empty list, 0 for a RESOLVED zero — the PDP turns null into
  // the honest unavailable note and the API GET into the DB_DOWN envelope.
  const reviewsFn = SOURCE.slice(SOURCE.indexOf("export async function getReviews"), SOURCE.indexOf("export async function getReviewCount"));
  expect(reviewsFn.includes("return null"), "getReviews must degrade to null (outage) — a resolved [] under outage renders the false 'No reviews yet' verdict").toBe(true);
  const countFn = SOURCE.slice(SOURCE.indexOf("export async function getReviewCount"), SOURCE.indexOf("export async function getInspirations"));
  expect(countFn.includes("return null"), "getReviewCount must degrade to null (outage) — a resolved 0 under outage renders the false 'Reviews (0)' heading").toBe(true);
});

it("placeOrder re-reads the promo INSIDE the transaction — FOR UPDATE, the authoritative discount (Task 136 F-4)", () => {
  // Task 130 F-2 gave the inventory check+decrement one-transaction
  // coherence (FOR UPDATE row locks); the promo — the OTHER money-shaping
  // input — was validated OUTSIDE the transaction, so the committed order
  // could carry a discount derived from promo state that changed (row
  // deactivated / min raised) between validation and commit. The pin binds
  // the re-read to the createOrder body (the transaction) and requires the
  // totals derivation to live AFTER it, inside the lock — the same
  // check/act coherence the inventory rows got.
  const createOrderIdx = SOURCE.indexOf("const createOrder =");
  const tryIdx = SOURCE.indexOf("try {", createOrderIdx);
  const txBody = SOURCE.slice(createOrderIdx, tryIdx);
  expect(txBody.includes("from(promotions)"), "createOrder must re-read the promotions row inside the transaction").toBe(true);
  expect(txBody.includes('.for("update")'), "the in-transaction promotions re-read must lock the row (FOR UPDATE) — a plain read re-opens the window the lock closes").toBe(true);
  expect(txBody.indexOf("from(promotions)") < txBody.indexOf("priceTotals("), "the totals must derive AFTER the in-transaction promo re-read (the committed discount derives from locked state)").toBe(true);
});

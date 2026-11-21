import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { resolve } from "node:path";

/**
 * Task 131 F-2: a STRUCTURAL pin on the placeOrder fulfilment seam. Task 130
 * F-2 scoped the lock/availability query to the chosen store (`fulfilStore`)
 * for every method — but the decrement re-derived the default expression
 * verbatim instead of reading the seam, so the check/decrement coherence
 * (the fix's whole point — check and decrement must read the SAME rows or
 * the greatest(0,·) clamp mints phantom units) rested on textual
 * duplication. This pin fails the run if the re-derivation ever returns:
 * the default expression must occur EXACTLY ONCE (the `fulfilStore`
 * definition) and the decrement must reference `fulfilStore` itself.
 * Task 140 F-3: the default itself now derives from the seed
 * (`STORES[0].slug`) — the pinned form follows the derivation.
 *
 * fs-based by design (the IDEMPOTENCY_KEY_RE / PERSISTED_STORAGE_KEYS
 * producer-pin precedent): placeOrder touches the live DB, so the unit
 * suite pins its source structure, not its runtime behavior.
 */

const ROOT = resolve(import.meta.dirname, "../..");
const SOURCE = readFileSync(resolve(ROOT, "src/lib/server-data.ts"), "utf8");

it("the fulfilment-store default is derived EXACTLY ONCE (the fulfilStore seam)", () => {
  const occurrences = SOURCE.match(/input\.storeSlug \|\| STORES\[0\]\.slug/g) ?? [];
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

it("the PDP reviews-outage signal is UNIFIED — the JSON-LD gate and the section initial both key on the combined signal (Task 137 F-1)", () => {
  // Task 136 F-3 gave the two review seams independent null degrades; the
  // PDP ORs them into `reviewsUnavailable` — but the JSON-LD
  // aggregateRating gate trusted `reviewCount !== null` ALONE and the
  // section's `initial` passed the live list through, so the partial-outage
  // branches contradicted themselves: reviews-ok/count-null rendered the
  // "Reviews are unavailable right now" note DIRECTLY ABOVE the live list,
  // and reviews-null/count-ok published an aggregateRating the visible page
  // disavowed — the exact Task-121 F-6 rule the code's own comment quotes
  // ("never publish an aggregateRating the page cannot back"). The
  // unified signal is one rule: EITHER null suppresses the list, the count
  // claim AND the structured-data rating together.
  const pdp = readFileSync(resolve(ROOT, "src/app/product/[slug]/page.tsx"), "utf8");
  expect(
    pdp.includes("!reviewsUnavailable && reviewCount > 0"),
    "the JSON-LD aggregateRating must gate on the COMBINED signal (!reviewsUnavailable && reviewCount > 0) — a count-ok/reviews-null outage must not publish a rating the page says it cannot back",
  ).toBe(true);
  expect(
    pdp.includes("reviewsUnavailable ? [] :"),
    "the section's initial list must be suppressed under the combined signal (reviewsUnavailable ? [] : …) — the unavailable note never renders above a live list",
  ).toBe(true);
});

it("ReviewSection's unavailable state is RECOVERABLE — a successful POST flips the note away and the heading resumes its count (Task 137 F-1)", () => {
  // Under the SSR unavailable state a successful POST (the DB provably
  // recovered — the write went through) used to prepend the new review
  // BELOW the stale "unavailable" note while the heading never showed any
  // count: the note was frozen at mount. The section now owns the state as
  // client state — it unmounts the note and resumes the count claim the
  // moment a review provably landed.
  const rs = readFileSync(resolve(ROOT, "src/components/ReviewSection.tsx"), "utf8");
  expect(
    rs.includes("useState(!!unavailable)"),
    "the unavailable prop must seed RECOVERABLE client state (useState(!!unavailable)) — a mount-frozen note survives the recovery that disproves it",
  ).toBe(true);
  expect(
    rs.includes("setSectionUnavailable(false)"),
    "a successful POST must flip the section back to available — the write provably landed",
  ).toBe(true);
  expect(
    rs.includes('sectionUnavailable ? "Reviews"'),
    "the heading count claim must key on the RECOVERABLE state, not the frozen prop",
  ).toBe(true);
});

it("the PDP passes the SSR-known count through UNCONDITIONALLY — a partial outage must not discard the count it knows (Task 140 F-1)", () => {
  // Task 137 F-1's recovery flip resumes the heading's count claim — but the
  // Task-136 seam fed it `total={reviewsUnavailable ? undefined : liveCount}`,
  // so a count-ok/reviews-null PARTIAL outage (the count was KNOWN at SSR
  // time) seeded the section's count at zero, and the first recovered POST
  // rendered "Reviews (1)" for a product with 42 live reviews — a specific
  // false number, the Task-123 F-10 contract the heading exists to enforce.
  // The outage honesty is owned by the sectionUnavailable heading gate (the
  // claim is suppressed while unavailable), so the count must flow through
  // unconditionally: the partial branch resumes at liveCount + 1 (correct),
  // and the full-outage branch is closed by the recovery refetch below.
  const pdp = readFileSync(resolve(ROOT, "src/app/product/[slug]/page.tsx"), "utf8");
  expect(
    pdp.includes("total={liveCount}"),
    "the section's total must be the SSR-known liveCount UNCONDITIONALLY — a reviewsUnavailable ternary discards a count the page provably knows and mints a false one on recovery",
  ).toBe(true);
  expect(
    pdp.includes("reviewsUnavailable ? undefined"),
    "the count-suppression ternary must be gone — the sectionUnavailable heading gate owns the outage honesty, not the total prop",
  ).toBe(false);
});

it("ReviewSection RE-DERIVES the count on recovery — the refetch adopts the server truth instead of minting from zero (Task 140 F-1)", () => {
  // The full-outage branch (both seams null) seeds the count at zero: the
  // page provably could not know it. A successful POST under that state
  // proves the DB recovered — the write landed — so the section refetches
  // the reviews envelope and adopts the server's count (the additive GET
  // `count` field) instead of incrementing a minted-from-zero figure: the
  // heading resumes at the TRUE count, not "the ones I saw plus one".
  const rs = readFileSync(resolve(ROOT, "src/components/ReviewSection.tsx"), "utf8");
  expect(
    rs.includes("wasUnavailable"),
    "the submit path must capture whether this POST is a RECOVERY (the section was unavailable when it landed) — the refetch is the recovery branch's obligation",
  ).toBe(true);
  expect(
    /fetch\(`\/api\/reviews\?productId=\$\{productId\}`/.test(rs),
    "the recovery path must refetch the reviews envelope (fetch(`/api/reviews?productId=${productId}`, …)) — the count claim cannot resume from client-side arithmetic alone",
  ).toBe(true);
  expect(
    rs.includes("json.count"),
    "the refetch must adopt the server's count field (the TRUE row count beside the capped list) — list-length arithmetic saturates at the 20-row cap",
  ).toBe(true);
});

it("the recovery refetch is cache: no-store — the post-write truth fetch must never ride an HTTP-cache heuristic (Task 141 F-5)", () => {
  // The refetch's entire purpose is POST-write truth: it fires once, on
  // the recovery path, immediately after the write landed. The route is
  // force-dynamic and the page made no prior GET on that URL, so a stale
  // answer is only a theoretical browser-heuristic risk — but a truth
  // fetch that can be answered from any cache is one word short of its
  // own contract. The option makes the intent explicit and the heuristic
  // impossible.
  const rs = readFileSync(resolve(ROOT, "src/components/ReviewSection.tsx"), "utf8");
  expect(
    /fetch\(`\/api\/reviews\?productId=\$\{productId\}`, \{ cache: "no-store" \}\)/.test(rs),
    'the recovery refetch must pass { cache: "no-store" } — the post-write truth fetch must bypass every HTTP-cache heuristic',
  ).toBe(true);
});

it("getAllProducts is React cache()-wrapped — the PDP's three scans per request dedupe into one (Task 140 F-6)", () => {
  // The PDP request path scanned the products table THREE times per
  // request: generateMetadata → getProductBySlug → getAllProducts (#1),
  // the page body → getProductBySlug (#2), and the related-products rail
  // → getAllProducts (#3) — three identical table scans for one render.
  // React's cache() (the Next.js-documented RSC request-scope memoization)
  // dedupes them into one: identical results within one request,
  // INCLUDING the degrade fallback (the wrapped function's behavior is
  // unchanged; only the call count collapses). Route handlers share the
  // request scope, so API consumers get the same dedup for free.
  expect(
    /export const getAllProducts = cache\(/.test(SOURCE),
    "getAllProducts must be the cache()-wrapped const form (export const getAllProducts = cache(async …)) — an unwrapped plain function re-scans the products table once per consumer (the PDP alone scans it three times per request)",
  ).toBe(true);
});

it("getOrderByNumber discriminates outage from not-found — URIError is not-found, everything else is outage (Task 137 F-3)", () => {
  // The seam owns the Task-122 F-4 authority: ANY query failure is
  // "outage", never a false "can't be found" (or the half-rendered
  // confirmed order). A regression that returns null instead of "outage" on
  // DB failure — or lets a URIError reach "outage" — would render the FALSE
  // not-found verdict under a dead DB with every gate green (the branch is
  // not e2e-reachable without killing the live server; this pin holds it —
  // the Task-131 F-2 fs-pin precedent for DB-touching code).
  const seam = SOURCE.slice(SOURCE.indexOf("export async function getOrderByNumber"));
  expect(
    seam.includes("if (err instanceof URIError) return null"),
    "a URIError (malformed percent-encoding) must land in not-found — the client-input class, never the DB class",
  ).toBe(true);
  expect(
    seam.includes('return "outage"'),
    "any OTHER query failure must land in outage — a dead DB must never render the false 'We can't find that order' verdict",
  ).toBe(true);
});

it("the outage surfaces the seams own are pinned — order-page copy, PDP note, reviews-GET DB_DOWN, submitReview delegation (Task 137 F-3)", () => {
  // The Task-136 outage branches shipped unpinned: a regression that
  // swapped the order outage copy for the not-found copy, dropped the PDP's
  // honest unavailable note, degraded the reviews GET back to a false
  // empty list, or re-inlined the reviews POST's DB work would all pass
  // every existing gate. These surfaces are the DB-down contract the
  // "Degrade, Never Fail" principle names — hold them in place.
  const orderPage = readFileSync(resolve(ROOT, "src/app/order/[number]/page.tsx"), "utf8");
  expect(
    orderPage.includes("We can&apos;t check orders right now"),
    "the order page must carry the outage copy — the Task-122 F-4 authority rendered, never a false not-found under a dead DB",
  ).toBe(true);
  const rs = readFileSync(resolve(ROOT, "src/components/ReviewSection.tsx"), "utf8");
  expect(
    rs.includes("Reviews are unavailable right now"),
    "ReviewSection must carry the honest unavailable note (the BuyBox degrade sibling, Task 136 F-3)",
  ).toBe(true);
  const reviewsRoute = readFileSync(resolve(ROOT, "src/app/api/reviews/route.ts"), "utf8");
  expect(
    reviewsRoute.includes('"DB_DOWN"'),
    "the reviews GET must answer the DB_DOWN envelope under outage — a false ok-with-empty-data answers a boundary that has NO static fallback",
  ).toBe(true);
  expect(
    reviewsRoute.includes("submitReview("),
    "the reviews POST must delegate its DB work to the submitReview seam (the Task-136 F-2 funnel)",
  ).toBe(true);
});

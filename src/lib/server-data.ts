import { db } from "@/db";
import { categories, inspirations, inventory, orderItems, orders, products, promotions, reviews, stores } from "@/db/schema";
import type { Order, OrderItem, Review } from "@/db/schema";
import { CATEGORIES, INSPIRATIONS, PRODUCTS, PROMOS, STORES, matchesProductQuery } from "@/lib/catalog";
import {
  clampInt,
  isUniqueViolationOn,
  orderNumber,
  priceTotals,
} from "@/lib/utils";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { cache } from "react";

let seedPromise: Promise<void> | null = null;

/** Idempotent seed: fills empty tables from the static catalogue. Safe for
 * concurrent first requests WITHIN the process (the single-flight promise);
 * a multi-process cold start is the documented single-node posture — Task 131
 * F-6 qualified the earlier blanket claim. */
export function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        // Task 120 F-13: "any product row exists" alone treated a PARTIAL
        // first seed (crash between the products insert and the inventory
        // insert) as complete — inventory stayed empty forever and every
        // checkout refused with "Only 0 left". Both signals must be present;
        // a products-only state now rebuilds the inventory rows (idempotent —
        // the tables are empty at that point, so onConflictDoNothing holds).
        // Seed reviews stay first-time-only: the reviews table has no unique
        // constraint, so re-inserting them would duplicate rows.
        const existing = await db.select({ id: products.id }).from(products).limit(1);
        if (existing.length > 0) {
          const invExisting = await db.select({ id: inventory.id }).from(inventory).limit(1);
          if (invExisting.length > 0) return;
        }
        const firstTime = existing.length === 0;
        await db.insert(categories).values(CATEGORIES.map((c) => ({ ...c }))).onConflictDoNothing();
        await db.insert(stores).values(STORES.map((s) => ({ ...s }))).onConflictDoNothing();
        await db.insert(products).values(PRODUCTS.map((p) => ({ ...p }))).onConflictDoNothing();
        await db.insert(promotions).values(PROMOS.map((p) => ({ ...p }))).onConflictDoNothing();
        await db.insert(inspirations).values(INSPIRATIONS.map((i) => ({ ...i }))).onConflictDoNothing();
        const all = await db.select().from(products);
        const invRows: Array<{ productId: number; storeSlug: string; quantity: number; aisleBin: string }> = [];
        for (const p of all) {
          const base = (p.id * 37) % 40;
          invRows.push(
            // Task 140 F-3: the seed's inventory rows follow the STORES catalogue
            // order by index (the first store carries the deepest stock, the
            // later ones thinner) — a store-list edit no longer strands seed
            // rows under a departed slug (the same derivation the defaults use).
            { productId: p.id, storeSlug: STORES[0].slug, quantity: Math.max(0, base + 8), aisleBin: `A${String((p.id % 24) + 1).padStart(2, "0")}-B${String((p.id % 12) + 1).padStart(2, "0")}` },
            { productId: p.id, storeSlug: STORES[1].slug, quantity: Math.max(0, base - 4), aisleBin: `C${String((p.id % 20) + 1).padStart(2, "0")}-D${String((p.id % 10) + 1).padStart(2, "0")}` },
            { productId: p.id, storeSlug: STORES[2].slug, quantity: Math.max(0, base - 10), aisleBin: `E${String((p.id % 16) + 1).padStart(2, "0")}-F${String((p.id % 8) + 1).padStart(2, "0")}` },
          );
        }
        if (invRows.length) await db.insert(inventory).values(invRows).onConflictDoNothing();
        const seedReviews = [
          { slug: "solbakken-3-seat-sofa", author: "Mei L.", rating: 5, title: "Survived two kids and a cat", body: "Covers wash beautifully. Delivery to Sengkang was on time and the crew carried it up.", verified: true },
          { slug: "solbakken-3-seat-sofa", author: "Arjun S.", rating: 4, title: "Great, firm at first", body: "Took two weeks to break in. Now the favourite seat in the house.", verified: true },
          { slug: "makan-extendable-table", author: "Grace T.", rating: 5, title: "CNY hero", body: "Sat 8 comfortably for reunion dinner. The butterfly leaf is genuinely one-person work.", verified: true },
          { slug: "ergonomi-task-chair", author: "Daniel K.", rating: 5, title: "Back pain gone", body: "Upgraded from a dining chair. Lumbar dial + tilt lock are worth every cent.", verified: false },
          { slug: "hdb-kitchen-trolley", author: "Nur A.", rating: 5, title: "Extra counter that moves", body: "Use it as an island daily and roll it aside when cooking big. Very stable.", verified: true },
        ];
        if (firstTime) {
          for (const r of seedReviews) {
            const prod = all.find((p) => p.slug === r.slug);
            if (prod) await db.insert(reviews).values({ productId: prod.id, author: r.author, rating: r.rating, title: r.title, body: r.body, verified: r.verified }).onConflictDoNothing();
          }
        }
      } catch (err) {
        // Seed must never break rendering — catalogue fallback covers reads.
        console.error("[seed] failed", err);
        seedPromise = null;
      }
    })();
  }
  return seedPromise;
}

export type ProductRow = typeof products.$inferSelect;

// Task 140 F-6: request-scope memoized via React's cache() — the PDP
// request path called this seam THREE times per request (generateMetadata's
// getProductBySlug, the page body's getProductBySlug, and the
// related-products rail), three identical products-table scans per render.
// cache() (the Next.js-documented RSC dedup) collapses them into one call
// per request with identical results — including the degrade fallback
// (behavior unchanged; only the call count). Route handlers share the
// request scope, so API consumers dedupe for free.
export const getAllProducts = cache(async (): Promise<ProductRow[]> => {
  await ensureSeed();
  try {
    return await db.select().from(products).orderBy(products.id);
  } catch {
    // Static fallback keeps the storefront alive if Postgres is unreachable.
    return PRODUCTS.map((p, i) => ({ ...p, id: i + 1, compareAtCents: p.compareAtCents ?? null, flatPack: true, createdAt: new Date() }));
  }
});

export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  const all = await getAllProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function searchProducts(q: string, cat?: string): Promise<ProductRow[]> {
  const needle = q.trim().toLowerCase();
  const all = await getAllProducts();
  return all.filter((p) => {
    if (cat && cat !== "all" && p.categorySlug !== cat) return false;
    if (!needle) return true;
    return matchesProductQuery(p, needle);
  });
}

export async function getInventory(productId: number) {
  await ensureSeed();
  try {
    return await db.select().from(inventory).where(eq(inventory.productId, productId));
  } catch {
    return [];
  }
}

export async function getReviews(productId: number): Promise<Review[] | null> {
  await ensureSeed();
  try {
    // Task 126 F-7 (the homenest S51-1 trap): createdAt alone is not a total
    // order — same-timestamp rows (a batch insert shares Postgres's
    // transaction-scoped now(), and the seed loop is one statement away from
    // it) return in arbitrary physical order. id is the deterministic
    // tie-break: newest insert first, stable across runs and plans.
    return await db.select().from(reviews).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt), desc(reviews.id)).limit(20);
  } catch {
    // Task 136 F-3: null is the OUTAGE signal — a resolved [] under outage
    // rendered the false "Reviews (0)" + "No reviews yet — be the first"
    // verdict for a product with live reviews. The PDP turns null into the
    // honest unavailable note; [] is reserved for a genuinely empty list.
    return null;
  }
}

// Task 123 F-10: the rendered list is capped at 20 rows (a display cap), but
// the JSON-LD reviewCount and the "Reviews (N)" heading must quote the TRUE
// count — deriving them from the capped list silently understated every
// product with more than 20 live reviews. Task 136 F-3: like its sibling
// read, the degrade is null (the outage signal the PDP renders as the honest
// unavailable note) — null is never a count claim.
export async function getReviewCount(productId: number): Promise<number | null> {
  await ensureSeed();
  try {
    const rows = await db.select({ n: sql<number>`count(*)::int` }).from(reviews).where(eq(reviews.productId, productId));
    return rows[0]?.n ?? 0;
  } catch {
    return null;
  }
}

export async function getInspirations() {
  await ensureSeed();
  try {
    return await db.select().from(inspirations).orderBy(inspirations.id);
  } catch {
    return INSPIRATIONS.map((i, idx) => ({ ...i, id: idx + 1, createdAt: new Date() }));
  }
}

// Task 136 F-2: the reviews POST was the only write path outside the funnel —
// the product-existence read and the insert lived in the route handler with
// its own @/db import (PAD §3.1: "Route handlers validate input, delegate to
// Layer 1"). The seam owns the DB work; the route keeps its boundary
// validation (parse/shape/type/length stay AT the boundary). An unknown
// product answers the 422 envelope; DB faults propagate as exceptions (the
// route's fixed-copy 500 REVIEW_FAILED posture is unchanged).
export async function submitReview(input: { productId: number; author: string; rating: number; title: string; body: string }): Promise<{ ok: true; data: Review } | { ok: false; error: { code: "VALIDATION"; message: string } }> {
  await ensureSeed();
  const known = await db.select({ id: products.id }).from(products).where(eq(products.id, input.productId)).limit(1);
  if (known.length === 0)
    return { ok: false, error: { code: "VALIDATION", message: "That product does not exist." } };
  const ins = await db.insert(reviews).values({ productId: input.productId, author: input.author, rating: input.rating, title: input.title, body: input.body, verified: false }).returning();
  const row = ins[0];
  if (!row) throw new Error("Could not save your review.");
  return { ok: true, data: row };
}

export async function validatePromo(code: string, subtotalCents: number) {
  await ensureSeed();
  const c = code.trim().toUpperCase();
  if (!c) return { ok: false as const, error: "Enter a promo code." };
  try {
    const rows = await db.select().from(promotions).where(eq(promotions.code, c)).limit(1);
    const promo = rows[0];
    if (!promo || !promo.active) return { ok: false as const, error: "This code is not valid." };
    if (subtotalCents < promo.minSubtotalCents)
      return { ok: false as const, error: `Requires a minimum spend of $${(promo.minSubtotalCents / 100).toFixed(0)}.` };
    return { ok: true as const, promo };
  } catch {
    const local = PROMOS.find((p) => p.code === c);
    if (!local) return { ok: false as const, error: "This code is not valid." };
    if (subtotalCents < local.minSubtotalCents) return { ok: false as const, error: `Requires a minimum spend of $${(local.minSubtotalCents / 100).toFixed(0)}.` };
    return { ok: true as const, promo: local };
  }
}

export interface CheckoutInput {
  email: string;
  fullName: string;
  phone: string;
  address: string;
  postal: string;
  deliveryMethod: string;
  deliverySlot: string;
  storeSlug: string;
  paymentMethod: string;
  promoCode?: string | null;
  lines: Array<{ productId: number; qty: number }>;
  /** Task 126 F-1: optional client-minted double-submit guard — a repeated
   * key replays the first order instead of placing a second. */
  idempotencyKey?: string | null;
}

/** A domain refusal at the checkout write boundary (422-class, carries the
 *  stable envelope code the client can branch on). */
export class OrderRefusalError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "OrderRefusalError";
    this.code = code;
  }
}

/** What placeOrder returns: the order row plus whether this call REPLAYED an
 * existing order (Task 126 F-1) — the route answers 200 on a replay (nothing
 * was created) vs 201 on a fresh insert. */
export interface PlaceOrderResult {
  order: Order;
  replayed: boolean;
}

// pg unique-constraint violation (23505) discrimination — Task 130 F-4
// moved the check to the pure, unit-pinned `isUniqueViolationOn` seam in
// utils.ts (constraint-name aware): placeOrder needs to tell an idempotency
// replay from an order_number collision apart, and the old code-only test
// could not.

// Task 127 F-5: a replay is OWNERSHIP-BOUND — both replay paths require the
// same email as the bound order (case-insensitive; the track-route match
// discipline). Task 126's possession-only replay let a key leaked via logs
// or XSS disclose the victim's order number — the PII lookup key for
// /track-order (the homenest S6-8/S7-2 threat model). Returns the bound
// order on a match, "mismatch" on a different email (refuse, never
// disclose), or null when the key has no order yet (fresh intent).
async function resolveReplay(key: string, email: string): Promise<Order | "mismatch" | null> {
  const existing = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, key))
    .limit(1);
  if (!existing[0]) return null;
  return existing[0].email.toLowerCase() === email.trim().toLowerCase() ? existing[0] : "mismatch";
}

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  await ensureSeed();
  // Task 127 F-5 (canonical order): the replay fast path runs BEFORE bag/promo
  // validation — a true replay (same key, order already placed) must answer
  // with the bound order even if the re-sent payload's bag emptied after the
  // success redirect or its promo was deactivated between attempts. Only a
  // key with NO bound order falls through to validation as a fresh intent.
  if (input.idempotencyKey) {
    const replay = await resolveReplay(input.idempotencyKey, input.email);
    if (replay === "mismatch")
      throw new OrderRefusalError("REPLAY_MISMATCH", "This order was placed with a different email address — check the address and try again.");
    if (replay) return { order: replay, replayed: true };
  }
  const all = await getAllProducts();
  const byId = new Map(all.map((p) => [p.id, p]));
  // Re-derive money server-side; never trust client totals. Task 131 F-5:
  // the qty clamp goes through the shared clampInt seam (the NaN-safe
  // helper this comment always cited) instead of an inline floor+clamp —
  // identical for every finite input (the route guarantees finite),
  // defensive parity for anything else.
  const lines = input.lines
    .map((l) => ({ product: byId.get(l.productId), qty: clampInt(l.qty, 1, 99, 1) }))
    .filter((l): l is { product: ProductRow; qty: number } => !!l.product);
  if (lines.length === 0) throw new OrderRefusalError("EMPTY_BAG", "Your bag is empty.");
  const subtotalCents = lines.reduce((a, l) => a + l.product.priceCents * l.qty, 0);
  let promo: { kind: string; value: number } | null = null;
  const code = (input.promoCode ?? "").trim().toUpperCase();
  if (code) {
    const v = await validatePromo(code, subtotalCents);
    if (!v.ok) throw new OrderRefusalError("INVALID_PROMO", v.error);
    promo = v.promo;
  }
  // Honesty of commerce (Task 119, atomized in Task 120): the write boundary
  // refuses what it cannot fulfil — qty is checked against LIVE inventory
  // (the same per-store rows the PDP BuyBox renders scarcity from),
  // aggregated per product across lines so a crafted duplicate-line payload
  // cannot slip past a per-line cap. The check, the inserts and the decrement
  // run in ONE transaction over SELECT … FOR UPDATE row locks: two concurrent
  // last-unit orders can no longer both pass the check (the loser re-reads 0
  // under the winner's committed decrement and refuses with LOW_STOCK).
  const qtyByProduct = new Map<number, number>();
  for (const l of lines) qtyByProduct.set(l.product.id, (qtyByProduct.get(l.product.id) ?? 0) + l.qty);
  const num = orderNumber();

  // Task 121 F-2: click-&-collect fulfils from ONE store, so its availability
  // check must be scoped to THAT store's rows — the island-wide aggregate let
  // a Jurong pickup pass on Tampines stock while the PDP honestly showed
  // "Jurong: Out of stock".
  // Task 130 F-2: the scoping is now METHOD-INDEPENDENT — every order fulfils
  // from the chosen store. The pre-130 delivery shape checked the island-wide
  // aggregate ("any store can ship") while the decrement hit ONE row with a
  // greatest(0, …) clamp — a delivery order larger than the chosen store's
  // stock PASSED on the aggregate, clamped the row to 0, and the difference
  // materialised as phantom units the table then overstated forever (the
  // register's "delivery decrement accounting drift" row). Scoping check and
  // decrement to the same rows makes them coherent by construction and keeps
  // the LOW_STOCK refusal agreeing with the PDP's per-store display. The
  // register's redistribution alternative (drain across stores in id order)
  // was rejected: the e2e RED-run nets restore inventory post-hoc from the
  // order rows — a multi-store drain is not reconstructible after the fact.
  // Task 140 F-3: the fulfilment default derives from the STORES seed
  // (STORES[0].slug) — the last hand-copied store literal at this seam
  // (the derivation discipline the Task-131 F-2 pin polices for the
  // check/decrement coherence now covers the default itself).
  const fulfilStore = input.storeSlug || STORES[0].slug;

  // Task 130 F-4: the transaction body is a helper so a minted
  // order_number collision can be retried with a fresh mint — the whole
  // first transaction rolls back (locks released, no decrement, no
  // order row), so the retry is a clean re-run, never a partial one.
  const createOrder = (minted: string) =>
    db.transaction(async (tx) => {
      // Lock the touched inventory rows (ordered by id so concurrent carts with
      // overlapping products acquire locks in one deterministic order — no
      // cross-transaction deadlock). Sums are computed in JS: FOR UPDATE cannot
      // ride along with a GROUP BY aggregate in Postgres.
      const lockedRows = await tx
        .select({ productId: inventory.productId, quantity: inventory.quantity })
        .from(inventory)
        .where(and(inArray(inventory.productId, [...qtyByProduct.keys()]), eq(inventory.storeSlug, fulfilStore)))
        .orderBy(inventory.id)
        .for("update");
      const available = new Map<number, number>();
      for (const row of lockedRows) available.set(row.productId, (available.get(row.productId) ?? 0) + row.quantity);
      for (const l of lines) {
        const have = available.get(l.product.id) ?? 0;
        if ((qtyByProduct.get(l.product.id) ?? 0) > have) {
          throw new OrderRefusalError("LOW_STOCK", `Only ${have} left of ${l.product.name} right now — adjust the quantity and try again.`);
        }
      }
      // Task 136 F-4: the promo is the OTHER money-shaping input — re-read it
      // INSIDE the transaction under a FOR UPDATE row lock so the committed
      // order's discount derives from promo state that cannot change under
      // the order (the Task-130 F-2 check/act coherence, applied to the
      // sibling input; the early validatePromo above stays as the fail-fast
      // UX + outage static fallback). A row deactivated or re-min'd between
      // validation and commit refuses with INVALID_PROMO and the whole
      // transaction rolls back.
      let txPromo: { kind: string; value: number } | null = promo;
      if (code) {
        const rows = await tx.select().from(promotions).where(eq(promotions.code, code)).limit(1).for("update");
        const fresh = rows[0];
        if (!fresh || !fresh.active || subtotalCents < fresh.minSubtotalCents)
          throw new OrderRefusalError("INVALID_PROMO", "This code is no longer valid — remove it and try again.");
        txPromo = fresh;
      }
      // Money truth is the priceTotals() seam — the same function the cart and
      // checkout displays use (Task 119: the previous hand-rolled copy had
      // already drifted from it on the net===0 delivery edge; display and server
      // can no longer diverge). Task 136 F-4: derived INSIDE the transaction,
      // AFTER the locked promo re-read — the committed totals derive from
      // locked state, never the pre-transaction snapshot.
      const totals = priceTotals({
        subtotalCents,
        promo: txPromo,
        deliveryMethod:
          input.deliveryMethod === "express" ? "express" : input.deliveryMethod === "click-collect" ? "click-collect" : "delivery",
      });
      const { discountCents, deliveryFeeCents, gstCents, totalCents } = totals;
      const inserted = await tx
        .insert(orders)
        .values({
          orderNumber: minted,
          idempotencyKey: input.idempotencyKey ?? null,
          email: input.email.trim(),
          fullName: input.fullName.trim(),
          phone: input.phone.trim(),
          address: input.address.trim(),
          postal: input.postal.trim(),
          deliveryMethod: input.deliveryMethod,
          deliverySlot: input.deliverySlot,
          storeSlug: input.storeSlug,
          paymentMethod: input.paymentMethod,
          subtotalCents,
          discountCents,
          deliveryFeeCents,
          gstCents,
          totalCents,
          status: "confirmed",
        })
        .returning();
      const order = inserted[0];
      if (!order) throw new Error("Could not create order.");
      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId: order.id,
          productId: l.product.id,
          name: l.product.name,
          sku: l.product.sku,
          imageUrl: l.product.imageUrls[0] ?? "",
          unitPriceCents: l.product.priceCents,
          qty: l.qty,
        })),
      );
      // Decrement store inventory (single-store source — a documented
      // deferral; inside the lock no concurrent writer can interleave between
      // the check above and this commit). Task 121 F-8: no swallowing catch —
      // a failed UPDATE aborts the surrounding transaction anyway, so a silent
      // catch here would only mask the failure until the COMMIT blows up.
      // Fail-closed is the honest semantics for a locked-row arithmetic miss.
      for (const l of lines) {
        // Task 131 F-2: the decrement reads the SAME `fulfilStore` seam as
        // the lock/availability query above — the pre-131 inline
        // re-derivation of the store default kept the Task-130 F-2 coherence
        // guarantee alive only by textual coincidence; structurally pinned
        // by tests/unit/server-data.test.ts.
        await tx
          .update(inventory)
          .set({ quantity: sql`greatest(0, ${inventory.quantity} - ${l.qty})` })
          .where(and(eq(inventory.productId, l.product.id), eq(inventory.storeSlug, fulfilStore)));
      }
      return { order, replayed: false };
    });
  try {
    return await createOrder(num);
  } catch (err) {
    // Task 126 F-1 (race path): two concurrent same-key POSTs both pass the
    // fast-path check; the unique index makes the loser's INSERT fail inside
    // its transaction — which rolls the whole thing back (no decrement) —
    // and the winner's committed order is what this key means now. Task 127
    // F-5: the race path applies the SAME ownership gate — a concurrent
    // same-key different-email POST is refused, never handed the winner's
    // receipt. Task 130 F-4: the replay test now names the constraint — an
    // order_number collision on a keyed order must not be misrouted into
    // replay resolution (which would find nothing and rethrow anyway).
    if (input.idempotencyKey && isUniqueViolationOn(err, "orders_idempotency_key_unique")) {
      const replay = await resolveReplay(input.idempotencyKey, input.email);
      if (replay === "mismatch")
        throw new OrderRefusalError("REPLAY_MISMATCH", "This order was placed with a different email address — check the address and try again.");
      if (replay) return { order: replay, replayed: true };
    }
    // Task 130 F-4 (the register's "orderNumber collision retry" row): a
    // minted NH-YYYYMMDD-XXXXXX collision is a customer-invisible retry,
    // never a 500 CHECKOUT_FAILED — the suffix carries ~2^31 entropy, so
    // the birthday bound bites around 46k orders/day. One retry: a second
    // collision (~2^-62 joint) is genuinely exceptional and may 500.
    if (isUniqueViolationOn(err, "orders_order_number_unique")) {
      return await createOrder(orderNumber());
    }
    throw err;
  }
}

export async function trackOrder(orderNumberInput: string, email: string) {
  await ensureSeed();
  const num = orderNumberInput.trim().toUpperCase();
  const rows = await db.select().from(orders).where(eq(orders.orderNumber, num)).limit(1);
  const order = rows[0];
  if (!order || order.email.toLowerCase() !== email.trim().toLowerCase()) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { order, items };
}

// Task 136 F-2: the public order page read orders/orderItems through its own
// @/db import — the literal case PAD §3.1's golden rule names ("a page
// importing @/db directly is an architecture violation"). The funnel seam now
// carries the semantics the page hand-rolled: the decode guard (Task 118
// F-15's URIError → not-found), the trackOrder-normalization parity (Task 133
// F-5 — trim + uppercase, two surfaces one identifier), and the outage
// authority (Task 122 F-4 — ANY query failure is "outage", never a false
// not-found or a half-rendered confirmed order).
export async function getOrderByNumber(rawNumber: string): Promise<{ order: Order; items: OrderItem[] } | null | "outage"> {
  await ensureSeed();
  try {
    // Malformed percent-encoding (e.g. /order/%ZZ) throws URIError — decode
    // inside the guard so it lands in the friendly not-found state, not the
    // error boundary (Task 118 F-15, moved into the seam).
    const decoded = decodeURIComponent(rawNumber).trim().toUpperCase();
    const rows = await db.select().from(orders).where(eq(orders.orderNumber, decoded)).limit(1);
    const order = rows[0];
    if (!order) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return { order, items };
  } catch (err) {
    // A URIError is a malformed number (not-found); anything else means the
    // DB itself could not answer — outage, never a false "can't be found"
    // (Task 120 F-14 + Task 122 F-4, moved into the seam).
    if (err instanceof URIError) return null;
    return "outage";
  }
}

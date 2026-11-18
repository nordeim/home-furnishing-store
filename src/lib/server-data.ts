import { db } from "@/db";
import { categories, inspirations, inventory, orderItems, orders, products, promotions, reviews, stores } from "@/db/schema";
import { CATEGORIES, INSPIRATIONS, PRODUCTS, PROMOS, STORES } from "@/lib/catalog";
import {
  orderNumber,
  priceTotals,
} from "@/lib/utils";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

let seedPromise: Promise<void> | null = null;

/** Idempotent seed: fills empty tables from the static catalogue. Safe for concurrent first requests. */
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
            { productId: p.id, storeSlug: "tampines", quantity: Math.max(0, base + 8), aisleBin: `A${String((p.id % 24) + 1).padStart(2, "0")}-B${String((p.id % 12) + 1).padStart(2, "0")}` },
            { productId: p.id, storeSlug: "jurong", quantity: Math.max(0, base - 4), aisleBin: `C${String((p.id % 20) + 1).padStart(2, "0")}-D${String((p.id % 10) + 1).padStart(2, "0")}` },
            { productId: p.id, storeSlug: "alexandra", quantity: Math.max(0, base - 10), aisleBin: `E${String((p.id % 16) + 1).padStart(2, "0")}-F${String((p.id % 8) + 1).padStart(2, "0")}` },
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

export async function getAllProducts(): Promise<ProductRow[]> {
  await ensureSeed();
  try {
    return await db.select().from(products).orderBy(products.id);
  } catch {
    // Static fallback keeps the storefront alive if Postgres is unreachable.
    return PRODUCTS.map((p, i) => ({ ...p, id: i + 1, compareAtCents: p.compareAtCents ?? null, flatPack: true, createdAt: new Date() }));
  }
}

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
    return `${p.name} ${p.tagline} ${p.description} ${p.sku} ${p.categorySlug}`.toLowerCase().includes(needle);
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

export async function getReviews(productId: number) {
  await ensureSeed();
  try {
    return await db.select().from(reviews).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt)).limit(20);
  } catch {
    return [];
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

export async function placeOrder(input: CheckoutInput) {
  await ensureSeed();
  const all = await getAllProducts();
  const byId = new Map(all.map((p) => [p.id, p]));
  // Re-derive money server-side; never trust client totals.
  const lines = input.lines
    .map((l) => ({ product: byId.get(l.productId), qty: Math.min(99, Math.max(1, Math.floor(l.qty))) }))
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
  // Money truth is the priceTotals() seam — the same function the cart and
  // checkout displays use (Task 119: the previous hand-rolled copy had
  // already drifted from it on the net===0 delivery edge; display and server
  // can no longer diverge).
  const totals = priceTotals({
    subtotalCents,
    promo,
    deliveryMethod:
      input.deliveryMethod === "express" ? "express" : input.deliveryMethod === "click-collect" ? "click-collect" : "delivery",
  });
  const { discountCents, deliveryFeeCents, gstCents, totalCents } = totals;
  const num = orderNumber();

  return db.transaction(async (tx) => {
    // Lock the touched inventory rows (ordered by id so concurrent carts with
    // overlapping products acquire locks in one deterministic order — no
    // cross-transaction deadlock). Sums are computed in JS: FOR UPDATE cannot
    // ride along with a GROUP BY aggregate in Postgres.
    const lockedRows = await tx
      .select({ productId: inventory.productId, quantity: inventory.quantity })
      .from(inventory)
      .where(inArray(inventory.productId, [...qtyByProduct.keys()]))
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
    const inserted = await tx
      .insert(orders)
      .values({
        orderNumber: num,
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
    // Decrement store inventory (best-effort, single-store source — a
    // documented deferral; inside the lock no concurrent writer can
    // interleave between the check above and this commit).
    try {
      for (const l of lines) {
        await tx
          .update(inventory)
          .set({ quantity: sql`greatest(0, ${inventory.quantity} - ${l.qty})` })
          .where(and(eq(inventory.productId, l.product.id), eq(inventory.storeSlug, input.storeSlug || "tampines")));
      }
    } catch { /* non-blocking */ }
    return order;
  });
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

/** Shared pure helpers: money (integer cents), formatting, pricing rules. */

export const GST_RATE = 0.09;
export const FREE_DELIVERY_THRESHOLD_CENTS = 20000; // $200
export const STANDARD_DELIVERY_FEE_CENTS = 1200; // $12
export const EXPRESS_DELIVERY_FEE_CENTS = 2900; // $29

export function formatSGD(cents: number): string {
  const v = (Number.isFinite(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
  }).format(v);
}

export function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.min(max, Math.max(min, v));
}

export interface TotalsInput {
  subtotalCents: number;
  promo?: { kind: string; value: number } | null;
  deliveryMethod: "delivery" | "click-collect" | "express";
}

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  gstCents: number;
  totalCents: number;
}

/** Server-truth pricing: discounts → delivery → 9% GST-inclusive back-calc. */
export function priceTotals(input: TotalsInput): Totals {
  const subtotalCents = Math.max(0, Math.round(input.subtotalCents));
  let discountCents = 0;
  if (input.promo) {
    if (input.promo.kind === "percent") {
      discountCents = Math.round((subtotalCents * input.promo.value) / 100);
    } else if (input.promo.kind === "fixed") {
      discountCents = Math.min(subtotalCents, input.promo.value);
    }
  }
  const net = subtotalCents - discountCents;
  let deliveryFeeCents = 0;
  if (input.deliveryMethod === "delivery") {
    deliveryFeeCents = net >= FREE_DELIVERY_THRESHOLD_CENTS || net === 0 ? 0 : STANDARD_DELIVERY_FEE_CENTS;
  } else if (input.deliveryMethod === "express") {
    deliveryFeeCents = EXPRESS_DELIVERY_FEE_CENTS;
  }
  // Prices are GST-inclusive in SG retail; show GST component for transparency.
  const gstCents = Math.round(((net + deliveryFeeCents) * GST_RATE) / (1 + GST_RATE));
  return {
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    gstCents,
    totalCents: net + deliveryFeeCents,
  };
}

export const ORDER_STEPS = ["Confirmed", "Picking", "On the way", "Delivered"] as const;

/** Status→step on the ORDER_STEPS ladder; unknown statuses floor at
 * "Confirmed" (the honest default for freshly placed orders). One shared
 * truth for the order page and tracking page (Task 120 F-16 — the two
 * hand-rolled copies had already diverged in formatting). */
export function orderStepIndex(status: string): number {
  if (status === "delivered") return 3;
  if (status === "shipped") return 2;
  if (status === "picking") return 1;
  return 0;
}

// Task 123 F-12: the date segment derives at SGT (UTC+8) — between 00:00 and
// 07:59 SGT the server's UTC date is still "yesterday", so Singapore-morning
// order numbers carried the prior calendar day. Same class as sgTomorrowISO
// (pure UTC+8 arithmetic, unit-pinnable); the format is unchanged.
export function orderNumber(now: Date = new Date()): string {
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const sgt = new Date(now.getTime() + SGT_OFFSET_MS);
  const ymd = `${sgt.getFullYear()}${String(sgt.getMonth() + 1).padStart(2, "0")}${String(sgt.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NH-${ymd}-${rand}`;
}

// Task 123 F-3: the checkout slot contract, shared by the page (the <select>
// options) and the API boundary (the whitelist). A crafted payload could
// persist any ≤80-char string into customer-facing copy ("Arriving
// {slot}"); the boundary now enforces what the UI itself offers — the
// storeSlug whitelist pattern (Task 121 F-7).
export const DELIVERY_SLOTS: Record<string, string[]> = {
  delivery: ["Standard (3–5 days)", "Evening (6–9pm)", "Weekend morning"],
  "click-collect": ["Today 2pm", "Tomorrow 10am"],
  express: ["Next-day by 6pm"],
};

export function isValidDeliverySlot(method: string, slot: string): boolean {
  // Unknown methods coerce to the delivery set upstream (the route's
  // deliveryMethod whitelist) — mirror that here so the two seams agree.
  const allowed = DELIVERY_SLOTS[method] ?? DELIVERY_SLOTS.delivery;
  return allowed.includes(slot);
}

// Task 124 F-8: the click-&-collect labels are TIME-RELATIVE ("Today 2pm")
// but were offered around the clock — an order placed at 23:00 persisted
// "Today 2pm" into confirmation/tracking copy promising a slot 9 hours in
// the past. The UI derives its options from this seam (the SGT discipline
// of sgTomorrowISO/orderNumber); the API boundary keeps validating against
// the full DELIVERY_SLOTS sets — a stale tab submitting a just-expired
// slot is grace, not junk (method coherence remains the boundary contract).
export const CLICK_COLLECT_TODAY_CUTOFF_SGT_HOUR = 14; // the slot's own time

export function availableDeliverySlots(method: string, now: Date = new Date()): string[] {
  const allowed = DELIVERY_SLOTS[method] ?? DELIVERY_SLOTS.delivery;
  if (method !== "click-collect") return allowed;
  // SGT wall clock (UTC+8) — the store's locale, not the server's.
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const sgt = new Date(now.getTime() + SGT_OFFSET_MS);
  return sgt.getUTCHours() >= CLICK_COLLECT_TODAY_CUTOFF_SGT_HOUR
    ? allowed.filter((s) => s !== "Today 2pm")
    : allowed;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

export function isValidPostal(v: string): boolean {
  return /^[0-9]{6}$/.test(v.trim());
}

export function isValidPhone(v: string): boolean {
  return /^[+\d][\d\s-]{6,15}$/.test(v.trim());
}

export function stars(rating: number): { full: number; half: boolean; empty: number } {
  const r = Math.max(0, Math.min(5, rating));
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  return { full, half, empty: 5 - full - (half ? 1 : 0) };
}

/** Family programme rule (as printed on /family): $5 voucher per 1,000 pts. */
export const FAMILY_VOUCHER_CENTS = 500;
export const FAMILY_POINTS_PER_VOUCHER = 1000;

export function familyVoucherCents(points: number): number {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.floor(points / FAMILY_POINTS_PER_VOUCHER) * FAMILY_VOUCHER_CENTS;
}

/**
 * Badges a product card should actually render. ProductCard already draws a
 * computed red "-{discount}%" chip and a blue "New" chip; several catalogue
 * rows carry the same value as a badge literal, which used to render the chip
 * twice. Drop only the duplicates — a percent literal that does not match the
 * computed discount, and every qualitative badge, stays.
 */
export function visibleBadges(
  badges: string[],
  computed: { isNew: boolean; discountPercent: number },
): string[] {
  const percentLiteral = `-${computed.discountPercent}%`;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of badges) {
    if (computed.discountPercent > 0 && b === percentLiteral) continue;
    if (computed.isNew && b.toLowerCase() === "new") continue;
    if (seen.has(b)) continue;
    seen.add(b);
    out.push(b);
  }
  return out;
}

// Task 121 F-19: the campaign banner's end label was computed as "28 Dec of
// the current year" — inside the Dec 29–31 window the banner advertised an
// already-past end date. Pure functions so the roll is unit-pinnable.
export function campaignEnd(now: Date = new Date()): Date {
  const thisYear = new Date(now.getFullYear(), 11, 28);
  return thisYear.getTime() < now.getTime() ? new Date(now.getFullYear() + 1, 11, 28) : thisYear;
}

export function campaignEndLabel(now: Date = new Date()): string {
  return campaignEnd(now).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

// Task 122 F-1 (the skipped Task-121 F-10): Singapore is UTC+8 year-round —
// "tomorrow" for a booking form must be the next SGT calendar day, not the
// next UTC day (the old `Date.now() + 86_400_000` arithmetic shipped
// "today" as the minimum between 00:00–07:59 SGT). Pure UTC+8 math — no Intl
// dependency — so it is unit-pinnable against fixed instants.
export function sgTomorrowISO(now: Date = new Date()): string {
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const sgtNowMs = now.getTime() + SGT_OFFSET_MS;
  const sgtTomorrowMs = sgtNowMs + 86_400_000;
  return new Date(sgtTomorrowMs).toISOString().slice(0, 10);
}

// Task 121 F-17: the shop page now server-renders its initial grid — the
// display sort previously lived ONLY inside the /api/products route, so the
// SSR path would have duplicated it. One seam, two callers.
export type ProductSortKey =
  | "featured"
  | "popular"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "new";

export function sortProductList<
  T extends { priceCents: number; ratingAvg: string | number; ratingCount: number; isNew: boolean },
>(list: T[], sort: string): T[] {
  const sorted = [...list];
  if (sort === "price-asc") sorted.sort((a, b) => a.priceCents - b.priceCents);
  else if (sort === "price-desc") sorted.sort((a, b) => b.priceCents - a.priceCents);
  else if (sort === "rating") sorted.sort((a, b) => parseFloat(String(b.ratingAvg)) - parseFloat(String(a.ratingAvg)));
  else if (sort === "popular") sorted.sort((a, b) => b.ratingCount - a.ratingCount);
  else if (sort === "new") sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew));
  return sorted;
}

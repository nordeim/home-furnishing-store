/** Shared pure helpers: money (integer cents), formatting, pricing rules. */

/**
 * Task 125 G-4: the ONE site origin. It used to be a literal in 17 files
 * (metadataBase, robots, sitemap, canonicals, OG urls, JSON-LD) — a domain
 * move was a 17-file sweep no test could catch. Compose every origin from
 * this constant; tests/unit/robots-sitemap.test.ts pins that no raw literal
 * survives in src/app outside this home.
 */
export const SITE_ORIGIN = "https://nordhem.sg";

/**
 * Task 125 G-3: the ONE ld+json serialization. Both script sites used to
 * inline `JSON.stringify(x).replace(/</g, "\\u003c")` — `<` is escaped but
 * U+2028/U+2029 are not: both are LEGAL inside JSON strings yet terminate JS
 * string semantics in some embedding contexts, breaking the script element.
 * Escape all three; the output still JSON.parses identically (the escapes
 * are valid JSON string escapes).
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export const GST_RATE = 0.09;
export const FREE_DELIVERY_THRESHOLD_CENTS = 20000; // $200
export const STANDARD_DELIVERY_FEE_CENTS = 1200; // $12
export const EXPRESS_DELIVERY_FEE_CENTS = 2900; // $29

// Task 126 F-1: the shape the checkout boundary accepts for an idempotency
// key (client-minted double-submit guard). Malformed keys are dropped by the
// route, never refused — dedupe is an enhancement, not a persisted field.
export const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Task 130 F-4: discriminate WHICH unique constraint fired a pg 23505.
 * placeOrder's catch used to test the error code alone, so an order_number
 * collision (the NH-YYYYMMDD-XXXXXX suffix carries ~2^31 entropy — the
 * birthday bound bites around 46k orders/day) was indistinguishable from an
 * idempotency-key replay and fell through to a customer-facing 500. The
 * discriminator checks the driver's `constraint` name on the error AND on
 * `.cause` (Drizzle surfaces the pg error either way — the existing
 * isUniqueViolation precedent). Pure — unit-pinned.
 */
export function isUniqueViolationOn(err: unknown, constraint: string): boolean {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const code = e?.code === "23505" || e?.cause?.code === "23505";
  const named = e?.constraint === constraint || e?.cause?.constraint === constraint;
  return code && named;
}

/**
 * Mint one idempotency key per checkout-page mount. crypto.randomUUID is the
 * canonical token but is only available on secure contexts (https OR
 * loopback) — plain-HTTP LAN deployments would crash at mount, so fall back
 * to crypto.getRandomValues bytes (Task 127 F-6; the homenest session-7
 * S7-10 discipline — only randomUUID is secure-context-gated). Pure — safe
 * on server and client renders.
 */
export function mintIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Task 127 F-6 (homenest session-7 S7-10): only randomUUID is
    // secure-context-gated — getRandomValues is available on insecure origins
    // too, so the non-secure fallback consumes real crypto bytes (128-bit
    // hex) instead of the predictable Date.now + Math.random pair. The final
    // branch is the both-primitives-absent last resort (ancient runtimes).
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    }
  }
}

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
      // Task 130 F-7: cap at the subtotal like the fixed branch — a >100%
      // percent promo (unreachable today, seed/DB-controlled) must never
      // mint negative net/GST/total cents at the money seam.
      discountCents = Math.min(subtotalCents, Math.round((subtotalCents * input.promo.value) / 100));
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
// Task 128 F-4: the calendar fields read via getUTC* — the LOCAL getters
// re-interpreted the shifted instant in the server's own TZ (a UTC−5 server
// minted "yesterday" for the first 13 SGT hours; the campaignEnd Task-127
// F-7 fix of the identical pattern). Pure arithmetic, no server-TZ reads.
export function orderNumber(now: Date = new Date()): string {
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const sgt = new Date(now.getTime() + SGT_OFFSET_MS);
  const ymd = `${sgt.getUTCFullYear()}${String(sgt.getUTCMonth() + 1).padStart(2, "0")}${String(sgt.getUTCDate()).padStart(2, "0")}`;
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
// Task 128 F-9: the earn-rate half of the rule — the /family calculator
// (Math.floor(spend * 10)) and three copy/metadata sites hand-copied "10
// points per $1" while the voucher half derived. One rate edit must
// self-correct calculator AND copy together (the Task-127 F-4 class).
export const FAMILY_POINTS_PER_DOLLAR = 10;

/** Business programme rule (as printed on /business): 12% trade discount. */
// Task 128 F-9: same derivation class — the calculator (subtotal * 0.12)
// and the "Trade saving (12%)" line were a hand-copied pair.
export const TRADE_RATE = 0.12;

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
// Task 127 F-7: the campaign calendar is SINGAPORE's — the year and the
// end instant are derived on the UTC+8 clock (the orderNumber/sgTomorrowISO
// discipline), not the server-local calendar (a UTC server rolled the date
// 16 hours early, from Dec 28 08:00 SGT — the campaign's final day).
const SGT_CAMPAIGN_OFFSET_MS = 8 * 60 * 60 * 1000;
function campaignEndSGT(year: number): Date {
  // Dec 28 00:00 Singapore time === Dec 27 16:00 UTC.
  return new Date(Date.UTC(year, 11, 28) - SGT_CAMPAIGN_OFFSET_MS);
}
export function campaignEnd(now: Date = new Date()): Date {
  const sgt = new Date(now.getTime() + SGT_CAMPAIGN_OFFSET_MS);
  const end = campaignEndSGT(sgt.getUTCFullYear());
  return end.getTime() < now.getTime() ? campaignEndSGT(sgt.getUTCFullYear() + 1) : end;
}

export function campaignEndLabel(now: Date = new Date()): string {
  // Formatted on the Singapore calendar so the label reads "28 Dec" on any
  // server timezone (the instant itself is Dec 27 16:00 UTC in 2026).
  return campaignEnd(now).toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "Asia/Singapore" });
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

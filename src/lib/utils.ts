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

export function orderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NH-${ymd}-${rand}`;
}

export function cartToken(): string {
  return `ct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
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

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

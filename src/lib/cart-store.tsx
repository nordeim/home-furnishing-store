"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createLocalStore } from "@/lib/local-store";

export interface CartLine {
  productId: number;
  slug: string;
  name: string;
  sku: string;
  imageUrl: string;
  unitPriceCents: number;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  promoCode: string | null;
  count: number;
  subtotalCents: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  setPromo: (code: string | null) => void;
  toggleWish: (slug: string) => void;
  isWished: (slug: string) => boolean;
  wishlist: string[];
}

const CART_KEY = "nordhem_cart_v1";
const WISH_KEY = "nordhem_wish_v1";
const PROMO_KEY = "nordhem_promo";

// Task 122 F-3: the Task-121 validators were container-shallow —
// Array.isArray([null]) is true, so a poisoned cart key of `[null]` still
// crashed CartProvider's lines.reduce and `[42]` NaN'd every total. The
// payload validators check ELEMENTS: every line must be a well-formed
// CartLine (positive integer productId, integer qty 1–99, non-negative
// integer price, string identity fields — the same contract addLine/setQty
// enforce on writes). Exported for the unit pins.
function isValidCartLine(v: unknown): boolean {
  if (typeof v !== "object" || v === null) return false;
  const l = v as Record<string, unknown>;
  return (
    Number.isInteger(l.productId) && (l.productId as number) > 0 &&
    Number.isInteger(l.qty) && (l.qty as number) >= 1 && (l.qty as number) <= 99 &&
    Number.isInteger(l.unitPriceCents) && (l.unitPriceCents as number) >= 0 &&
    typeof l.slug === "string" && typeof l.name === "string" &&
    typeof l.sku === "string" && typeof l.imageUrl === "string"
  );
}

export function isValidCartPayload(v: unknown): v is CartLine[] {
  return Array.isArray(v) && v.every(isValidCartLine);
}

export function isValidWishPayload(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

// One external store per persisted key. useSyncExternalStore handles the
// server/client hydration split natively (getServerSnapshot → fallback during
// SSR/hydration, client snapshot after mount) — the reason this replaced the
// old mount-effect + setState hydration, which the React Compiler-era
// `react-hooks/set-state-in-effect` rule flags.
// Note: `nordhem_promo` was persisted as a raw string before the refactor and
// is JSON-encoded now — a legacy raw-string value fails the JSON.parse guard
// in local-store and degrades to null (no promo), it does not carry over.
// Task 121 F-4: each store validates the SHAPE of what it parses — a
// valid-JSON wrong-shape payload (e.g. an object in the cart key) used to
// reach CartProvider's lines.reduce and crash every route at render.
const linesStore = createLocalStore<CartLine[]>(CART_KEY, [], isValidCartPayload);
const wishStore = createLocalStore<string[]>(WISH_KEY, [], isValidWishPayload);
const promoStore = createLocalStore<string | null>(PROMO_KEY, null, (v) => v === null || typeof v === "string");

function addLine(line: Omit<CartLine, "qty">, qty = 1) {
  linesStore.set((prev) => {
    const found = prev.find((l) => l.productId === line.productId);
    if (found) {
      return prev.map((l) =>
        l.productId === line.productId ? { ...l, qty: Math.min(99, l.qty + qty) } : l,
      );
    }
    return [...prev, { ...line, qty: Math.min(99, Math.max(1, qty)) }];
  });
}

function setLineQty(productId: number, qty: number) {
  linesStore.set((prev) =>
    qty <= 0
      ? prev.filter((l) => l.productId !== productId)
      : prev.map((l) => (l.productId === productId ? { ...l, qty: Math.min(99, Math.floor(qty)) } : l)),
  );
}

const actions = {
  add: addLine,
  setQty: setLineQty,
  remove: (productId: number) => linesStore.set((prev) => prev.filter((l) => l.productId !== productId)),
  clear: () => linesStore.set([]),
  setPromo: (code: string | null) => promoStore.set(code),
  toggleWish: (slug: string) =>
    wishStore.set((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(linesStore.subscribe, linesStore.getSnapshot, linesStore.getServerSnapshot);
  const wishlist = useSyncExternalStore(wishStore.subscribe, wishStore.getSnapshot, wishStore.getServerSnapshot);
  const promoCode = useSyncExternalStore(promoStore.subscribe, promoStore.getSnapshot, promoStore.getServerSnapshot);

  const { count, subtotalCents } = useMemo(
    () => ({
      count: lines.reduce((a, l) => a + l.qty, 0),
      subtotalCents: lines.reduce((a, l) => a + l.qty * l.unitPriceCents, 0),
    }),
    [lines],
  );

  const value = useMemo<CartState>(
    () => ({
      lines,
      promoCode,
      count,
      subtotalCents,
      isWished: (slug: string) => wishlist.includes(slug),
      wishlist,
      ...actions,
    }),
    [lines, promoCode, count, subtotalCents, wishlist],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

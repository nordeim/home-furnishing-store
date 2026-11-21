"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createLocalStore } from "@/lib/local-store";
import { clampInt } from "@/lib/utils";

interface CartLine {
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

// Task 133 F-3: the third validation layer — UNIQUENESS. The shape check
// (Task 121 F-4) and the element checks (Task 122 F-3) still admitted a
// crafted duplicate payload: ["slug","slug"] passed every element gate while
// the catalogue returns unique slugs, so the wishlist page rendered the FALSE
// "1 saved item is no longer available." above the available product's card;
// a duplicated cart line produced duplicate React keys and a doubled
// subtotal. The UI's own writers can never mint duplicates (toggle/add are
// idempotent by key) — a duplicate payload is crafted junk and degrades to
// the fallback like every other wrong shape (the [null] precedent).
export function isValidCartPayload(v: unknown): v is CartLine[] {
  return (
    Array.isArray(v) && v.every(isValidCartLine) &&
    new Set(v.map((l) => l.productId)).size === v.length
  );
}

export function isValidWishPayload(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string") && new Set(v).size === v.length;
}

// Task 123 F-13: the promo store's predicate accepted any string — a crafted
// 10k-char nordhem_promo rode to checkout until the server's 32-char cap
// refused it. The persisted-state contract mirrors the write boundary
// (checkout route: promoCode <= 32) so junk degrades to null at load.
export function isValidPromoPayload(v: unknown): v is string | null {
  return v === null || (typeof v === "string" && v.length <= 32);
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
const promoStore = createLocalStore<string | null>(PROMO_KEY, null, isValidPromoPayload);

function addLine(line: Omit<CartLine, "qty">, qty = 1) {
  linesStore.set((prev) => {
    const found = prev.find((l) => l.productId === line.productId);
    if (found) {
      // Task 134 F-4 clamped the found-branch floor; Task 135 F-1 routed the
      // clamp through the shared NaN-safe clampInt seam (the placeOrder/
      // checkout-route posture) — Math.max(1, NaN) is NaN and Math.max(1, 3.7)
      // is 3.7, so the literal forms never covered the non-finite/fractional
      // class.
      return prev.map((l) =>
        l.productId === line.productId ? { ...l, qty: clampInt(l.qty + qty, 1, 99, 1) } : l,
      );
    }
    return [...prev, { ...line, qty: clampInt(qty, 1, 99, 1) }];
  });
}

function setLineQty(productId: number, qty: number) {
  linesStore.set((prev) =>
    qty <= 0
      ? prev.filter((l) => l.productId !== productId)
      : prev.map((l) => (l.productId === productId ? { ...l, qty: clampInt(qty, 1, 99, 1) } : l)),
  );
}

const actions = {
  add: addLine,
  setQty: setLineQty,
  remove: (productId: number) => linesStore.set((prev) => prev.filter((l) => l.productId !== productId)),
  // Task 123 F-6: clear() empties the WHOLE bag state — a promo code belongs
  // to the order it was used on. Leaving nordhem_promo persisted made the
  // next bag silently re-apply the previous order's code (and its discount
  // row) the moment it crossed the minimum.
  clear: () => {
    linesStore.set([]);
    promoStore.set(null);
  },
  setPromo: (code: string | null) => promoStore.set(code),
  toggleWish: (slug: string) =>
    wishStore.set((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  // Task 125 G-5: the hydration sentinel. Stamped by the root client
  // boundary's mount effect — the e2e suite can wait on it instead of
  // racing the client bundle (Playwright's actionability checks do NOT
  // cover React hydration; a pre-hydration click silently no-ops). Direct
  // DOM mutation, not setState (the set-state-in-effect rule is not
  // engaged); the provider never unmounts, so no cleanup is needed.
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

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

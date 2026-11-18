"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

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
  loaded: boolean;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  setPromo: (code: string | null) => void;
  toggleWish: (slug: string) => void;
  isWished: (slug: string) => boolean;
  wishlist: string[];
}

const CartContext = createContext<CartState | null>(null);
const CART_KEY = "nordhem_cart_v1";
const WISH_KEY = "nordhem_wish_v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLines(read<CartLine[]>(CART_KEY, []));
    setWishlist(read<string[]>(WISH_KEY, []));
    setPromoCode(localStorage.getItem("nordhem_promo") || null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch { /* storage full — degrade silently */ }
  }, [lines, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
      if (promoCode) localStorage.setItem("nordhem_promo", promoCode);
      else localStorage.removeItem("nordhem_promo");
    } catch { /* ignore */ }
  }, [wishlist, promoCode, loaded]);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.productId === line.productId);
      if (found) {
        return prev.map((l) =>
          l.productId === line.productId ? { ...l, qty: Math.min(99, l.qty + qty) } : l,
        );
      }
      return [...prev, { ...line, qty: Math.min(99, Math.max(1, qty)) }];
    });
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, qty: Math.min(99, Math.floor(qty)) } : l)),
    );
  }, []);

  const remove = useCallback((productId: number) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const setPromo = useCallback((code: string | null) => setPromoCode(code), []);

  const toggleWish = useCallback((slug: string) => {
    setWishlist((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }, []);

  const isWished = useCallback((slug: string) => wishlist.includes(slug), [wishlist]);

  const { count, subtotalCents } = useMemo(() => {
    return {
      count: lines.reduce((a, l) => a + l.qty, 0),
      subtotalCents: lines.reduce((a, l) => a + l.qty * l.unitPriceCents, 0),
    };
  }, [lines]);

  const value = useMemo(
    () => ({ lines, promoCode, count, subtotalCents, loaded, add, setQty, remove, clear, setPromo, toggleWish, isWished, wishlist }),
    [lines, promoCode, count, subtotalCents, loaded, add, setQty, remove, clear, setPromo, toggleWish, isWished, wishlist],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

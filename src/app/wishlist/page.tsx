"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { ProductCard, type CardProduct } from "@/components/ProductCard";

export default function WishlistPage() {
  const { wishlist } = useCart();
  const [items, setItems] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/products");
        const json = (await res.json()) as { ok: boolean; data?: CardProduct[] };
        if (!cancelled && json.ok) {
          setItems((json.data ?? []).filter((p) => wishlist.includes(p.slug)).map((p) => ({ ...p, ratingAvg: String(p.ratingAvg) })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [wishlist]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-tight">Your wishlist ({wishlist.length})</h1>
      {loading ? <p className="mt-4 text-[#5b5b5b]">Loading…</p> : items.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-[#f5f3ee] p-10 text-center">
          <p className="text-[20px] font-black">Nothing saved yet</p>
          <p className="mt-1 text-[#5b5b5b]">Tap the heart on any product to keep it here — saved on this device.</p>
          <Link href="/shop" className="mt-4 inline-block rounded-full bg-[#0058a3] px-6 py-3 text-[14px] font-bold text-white">Discover favourites</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { ProductCard, type CardProduct } from "@/components/ProductCard";

export default function WishlistPage() {
  const { wishlist } = useCart();
  const [items, setItems] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  // A failed fetch must be an explicit error — never the "empty" state (the
  // wishlist count in the heading would then contradict the body copy).
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(false);
        const res = await fetch("/api/products");
        const json = (await res.json()) as { ok: boolean; data?: CardProduct[] };
        if (!cancelled && json.ok) {
          setItems((json.data ?? []).filter((p) => wishlist.includes(p.slug)).map((p) => ({ ...p, ratingAvg: String(p.ratingAvg) })));
        } else if (!cancelled) {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [wishlist]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Task 130 F-8: the heading counts what the grid can actually show.
          While loading (or on error) the persisted-slug count is the honest
          number — resolution is unknowable; once resolved, items.length is
          the truth (a persisted slug whose product left the catalogue must
          not render "(2)" above one card — the honesty class the project
          polices everywhere). */}
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-tight">Your wishlist ({loading || error ? wishlist.length : items.length})</h1>
      {/* Task 131 F-1: the header badge counts SAVED entries by design (the
          Header cannot resolve slugs without a catalogue fetch on every
          route — resolution is unknowable there). Once this page HAS
          resolved, a departed slug makes the heading's (resolved) count
          differ from the badge's (saved) count — the page explains the
          difference instead of silently contradicting the badge. */}
      {!loading && !error && items.length < wishlist.length && (
        <p className="mt-2 text-[14px] text-[#5b5b5b]">
          {wishlist.length - items.length === 1
            ? "1 saved item is no longer available."
            : `${wishlist.length - items.length} saved items are no longer available.`}
        </p>
      )}
      {loading ? <p className="mt-4 text-[#5b5b5b]" role="status">Loading…</p> : error ? (
        <div className="mt-6 rounded-2xl bg-[#fff4f4] p-10 text-center" role="alert">
          <p className="text-[18px] font-black text-[#a00008]">We couldn’t load your wishlist</p>
          <p className="mt-1 text-[#5b5b5b]">The catalogue service didn’t answer. Your saved items are safe on this device.</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-full bg-[#0058a3] px-6 py-3 text-[14px] font-bold text-white hover:bg-[#004382] focus-ring">Try again</button>
        </div>
      ) : items.length === 0 && wishlist.length > 0 ? (
        /* Task 132 F-3: the all-ghost state — every persisted slug has left
           the catalogue. The pre-132 page rendered the true ghost note
           directly above the FALSE "Nothing saved yet" (the user HAS saved
           items; they departed) — browser-verified live. This branch explains
           the state honestly instead; "Nothing saved yet" stays reserved for
           a truly empty wishlist. */
        <div className="mt-6 rounded-2xl bg-[#f5f3ee] p-10 text-center">
          <p className="text-[20px] font-black">Your saved items are no longer available</p>
          <p className="mt-1 text-[#5b5b5b]">Everything you saved has moved on from the range — browse the shop to save new favourites.</p>
          <Link href="/shop" className="mt-4 inline-block rounded-full bg-[#0058a3] px-6 py-3 text-[14px] font-bold text-white">Discover favourites</Link>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-[#f5f3ee] p-10 text-center">
          <p className="text-[20px] font-black">Nothing saved yet</p>
          <p className="mt-1 text-[#5b5b5b]">Tap the heart on any product to keep it here — saved on this device.</p>
          <Link href="/shop" className="mt-4 inline-block rounded-full bg-[#0058a3] px-6 py-3 text-[14px] font-bold text-white">Discover favourites</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

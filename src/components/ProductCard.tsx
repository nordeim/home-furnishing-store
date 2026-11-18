"use client";

import Link from "next/link";
import { formatSGD, stars, visibleBadges } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";

export interface CardProduct {
  id: number;
  slug: string;
  sku: string;
  name: string;
  tagline: string;
  priceCents: number;
  compareAtCents: number | null;
  ratingAvg: string | number;
  ratingCount: number;
  imageUrls: string[];
  badges: string[];
  isNew: boolean;
}

export function Rating({ avg, count }: { avg: string | number; count: number }) {
  const v = typeof avg === "string" ? parseFloat(avg) : avg;
  // The shared stars() seam (unit-pinned): a 4.5 renders 4 full + a half —
  // inline Math.round used to show 5 full stars while the aria-label said 4.5.
  const s = stars(v);
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-[#5b5b5b]" role="img" aria-label={`Rated ${v} out of 5 from ${count} reviews`}>
      <span className="tracking-tight text-[#e5a000]" aria-hidden="true">
        {"★".repeat(s.full)}
        {s.half && <span className="text-[#e5a000]/40">★</span>}
        {"☆".repeat(s.empty)}
      </span>
      <span>({count})</span>
    </span>
  );
}

export function ProductCard({ p }: { p: CardProduct }) {
  const { add, toggleWish, isWished } = useCart();
  const wished = isWished(p.slug);
  const img = p.imageUrls[0] ?? "";
  const discount = p.compareAtCents && p.compareAtCents > p.priceCents
    ? Math.round(((p.compareAtCents - p.priceCents) / p.compareAtCents) * 100)
    : 0;
  // Several catalogue rows carry the computed chip value as a badge literal
  // (e.g. badges ["-24%"] on a −24% product) — render each chip once.
  const badges = visibleBadges(p.badges, { isNew: p.isNew, discountPercent: discount }).slice(0, 2);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-[#ece8df] transition hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)]">
      <Link href={`/product/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-[#f5f3ee] focus-ring" aria-label={p.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {p.isNew && <span className="rounded-full bg-[#0058a3] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">New</span>}
          {discount > 0 && <span className="rounded-full bg-[#cc0008] px-2.5 py-1 text-[11px] font-bold text-white">-{discount}%</span>}
          {badges.map((b) => (
            <span key={b} className="rounded-full bg-[#ffdb00] px-2.5 py-1 text-[11px] font-bold text-black">{b}</span>
          ))}
        </div>
      </Link>
      <button
        onClick={() => toggleWish(p.slug)}
        aria-pressed={wished}
        aria-label={wished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
        className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full shadow-sm focus-ring ${wished ? "bg-[#0058a3] text-white" : "bg-white/95 text-[#333] hover:bg-white"}`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9Z" strokeLinejoin="round" /></svg>
      </button>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-bold leading-snug">
              <Link href={`/product/${p.slug}`} className="hover:text-[#0058a3] hover:underline">{p.name}</Link>
            </h3>
            <p className="mt-0.5 text-[13px] text-[#5b5b5b]">{p.tagline}</p>
          </div>
        </div>
        <Rating avg={p.ratingAvg} count={p.ratingCount} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-[19px] font-black tracking-tight">{formatSGD(p.priceCents)}</p>
            {p.compareAtCents && p.compareAtCents > p.priceCents && (
              <p className="text-[13px] text-[#5b5b5b] line-through">{formatSGD(p.compareAtCents)}</p>
            )}
          </div>
          <button
            onClick={() => add({ productId: p.id, slug: p.slug, name: p.name, sku: p.sku, imageUrl: img, unitPriceCents: p.priceCents }, 1)}
            className="grid h-11 w-11 place-items-center rounded-full bg-[#0058a3] text-white transition hover:bg-[#004382] focus-ring"
            aria-label={`Add ${p.name} to bag`}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M6 8h15l-1.5 12h-12L6 8Z" strokeLinejoin="round" /><path d="M9 10V6a3 3 0 0 1 6 0v4" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
    </article>
  );
}

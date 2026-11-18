"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProductCard, type CardProduct } from "@/components/ProductCard";

const POPULAR = ["sofa", "extendable table", "storage bed", "bookshelf", "pendant", "task chair", "blackout", "trolley"];

function SearchInner() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  useEffect(() => {
    const needle = q.trim();
    if (!needle) { setItems([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(needle)}`);
        const json = (await res.json()) as { ok: boolean; data?: CardProduct[] };
        if (!cancelled && json.ok) setItems(json.data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-tight">Search the range</h1>
      <form onSubmit={(e) => e.preventDefault()} role="search" className="mt-4 flex max-w-2xl gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “oak bookshelf” or “washable sofa”…" aria-label="Search products" autoFocus
          className="flex-1 rounded-full border-2 border-[#111] px-5 py-3 text-[15px] outline-none focus:border-[#0058a3]" />
      </form>
      {!q.trim() && (
        <div className="mt-6">
          <p className="text-[13px] font-black uppercase tracking-wide text-[#8a8a8a]">Popular right now</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <button key={p} onClick={() => setQ(p)} className="rounded-full bg-[#f5f3ee] px-4 py-2 text-[14px] font-bold hover:bg-[#ffdb00] focus-ring">{p}</button>
            ))}
          </div>
        </div>
      )}
      {loading && <p className="mt-6 text-[#5b5b5b]" role="status">Searching…</p>}
      {!loading && q.trim() && (
        <p className="mt-6 text-[15px]" role="status"><strong>{items.length}</strong> result{items.length === 1 ? "" : "s"} for “{q.trim()}”</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((p, i) => <ProductCard key={p.id} p={{ ...p, ratingAvg: String(p.ratingAvg) }} index={i} />)}
      </div>
      {!loading && q.trim() && items.length === 0 && (
        <div className="mt-4 rounded-2xl bg-[#f5f3ee] p-8 text-center">
          <p className="font-black">No matches — try a broader word like “chair” or “lamp”.</p>
          <Link href="/shop" className="mt-3 inline-block font-bold text-[#0058a3] underline">Browse everything instead →</Link>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-16">Loading search…</div>}>
      <SearchInner />
    </Suspense>
  );
}

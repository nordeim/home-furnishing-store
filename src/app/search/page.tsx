"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProductCard, type CardProduct } from "@/components/ProductCard";

const POPULAR = ["sofa", "extendable table", "storage bed", "bookshelf", "pendant", "task chair", "blackout", "trolley"];

function SearchInner() {
  const params = useSearchParams();
  const paramQ = params.get("q") ?? "";
  const [q, setQ] = useState(paramQ);

  // Follow the URL's q (header search submits push /search?q=…) via the
  // adjust-during-render pattern — no setState in an effect body.
  const [prevParamQ, setPrevParamQ] = useState(paramQ);
  if (paramQ !== prevParamQ) {
    setPrevParamQ(paramQ);
    setQ(paramQ);
  }

  const [items, setItems] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const needle = q.trim();
  // The empty-needle case is a render derivation, not a state reset — with no
  // query there is simply nothing to show (and the popular chips render).
  const shown = needle ? items : [];

  useEffect(() => {
    if (!needle) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true); // inside the async callback — not sync in the effect body
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(needle)}`);
        const json = (await res.json()) as { ok: boolean; data?: CardProduct[] };
        if (!cancelled && json.ok) setItems(json.data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [needle]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-tight">Search the range</h1>
      <form onSubmit={(e) => e.preventDefault()} role="search" className="mt-4 flex max-w-2xl gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “oak bookshelf” or “washable sofa”…" aria-label="Search products" autoFocus
          className="flex-1 rounded-full border-2 border-[#111] px-5 py-3 text-[15px] outline-none focus:border-[#0058a3]" />
      </form>
      {!needle && (
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
      {!loading && needle && (
        <p className="mt-6 text-[15px]" role="status"><strong>{shown.length}</strong> result{shown.length === 1 ? "" : "s"} for “{needle}”</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {shown.map((p, i) => <ProductCard key={p.id} p={{ ...p, ratingAvg: String(p.ratingAvg) }} index={i} />)}
      </div>
      {!loading && needle && shown.length === 0 && (
        <div className="mt-4 rounded-xl bg-[#f5f3ee] p-10 text-center">
          <p className="text-[18px] font-black">No products found for “{needle}”</p>
          <Link href="/shop" className="mt-3 inline-block font-bold text-[#0058a3] underline">Browse everything instead →</Link>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-16">Loading…</div>}>
      <SearchInner />
    </Suspense>
  );
}

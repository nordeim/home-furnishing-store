"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/catalog";
import { ProductCard, type CardProduct } from "@/components/ProductCard";

const SORTS = [
  { v: "featured", l: "Featured" },
  { v: "popular", l: "Most popular" },
  { v: "price-asc", l: "Price: low to high" },
  { v: "price-desc", l: "Price: high to low" },
  { v: "rating", l: "Highest rated" },
  { v: "new", l: "Newest" },
];

function ShopInner() {
  const params = useSearchParams();
  const router = useRouter();
  // Filter state lives in the URL (shareable, back-button correct, and in
  // lockstep with the header's ?cat= links) — derived during render instead
  // of synced through an effect (react-hooks/set-state-in-effect).
  const cat = params.get("cat") ?? "all";
  const sortParam = params.get("sort");
  const sort = sortParam ?? "featured";
  const [q, setQ] = useState("");
  const [max, setMax] = useState(0);
  const [items, setItems] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      // Loading/error flags flip inside the async callback — never
      // synchronously in the effect body (cascading-render rule).
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/products", window.location.origin);
        url.searchParams.set("cat", cat);
        url.searchParams.set("sort", sort);
        url.searchParams.set("q", q);
        if (max > 0) url.searchParams.set("max", String(max));
        const res = await fetch(url.toString());
        const json = (await res.json()) as { ok: boolean; data?: CardProduct[]; error?: { message: string } };
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error?.message ?? "Failed to load");
        setItems((json.data ?? []).map((p) => ({ ...p, ratingAvg: String((p as unknown as { ratingAvg: string }).ratingAvg) })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [cat, sort, q, max]);

  const catName = cat === "all" ? "All products" : (CATEGORIES.find((c) => c.slug === cat)?.name ?? "Products");

  function pickCat(slug: string) {
    const sp = new URLSearchParams();
    if (slug !== "all") sp.set("cat", slug);
    if (sortParam) sp.set("sort", sortParam);
    router.replace(sp.size ? `/shop?${sp.toString()}` : "/shop", { scroll: false });
  }

  function pickSort(v: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("sort", v);
    router.replace(`/shop?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#0058a3]">NORDHEM range</p>
      <h1 className="mt-1 text-[clamp(1.8rem,4vw,2.8rem)] font-black tracking-tight">{catName}</h1>
      <p className="mt-2 text-[15px] text-[#5b5b5b]">{items.length} products · prices include 9% GST · free delivery over $200</p>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filter by room">
          {[{ slug: "all", name: "All" }, ...CATEGORIES].map((c) => (
            <button
              key={c.slug}
              role="tab"
              aria-selected={cat === c.slug}
              onClick={() => pickCat(c.slug)}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-bold focus-ring ${cat === c.slug ? "bg-[#111] text-white" : "bg-[#f5f3ee] hover:bg-[#e9e5da]"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:justify-end">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter in this view…"
            aria-label="Filter products by keyword"
            className="rounded-full border border-[#e5e1d8] px-4 py-2 text-[14px] outline-none focus:border-[#0058a3] focus:ring-2 focus:ring-[#0058a3]/20"
          />
          <label className="flex items-center gap-2 text-[13px] font-semibold">
            Max ${max === 0 ? "∞" : max}
            <input type="range" min={0} max={1500} step={50} value={max} onChange={(e) => setMax(Number(e.target.value))} aria-label="Maximum price" className="w-32 accent-[#0058a3]" />
          </label>
          <select value={sort} onChange={(e) => pickSort(e.target.value)} aria-label="Sort products" className="rounded-full border border-[#e5e1d8] px-4 py-2 text-[14px] font-semibold focus-ring">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading products">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-xl ring-1 ring-[#ece8df]">
              <div className="aspect-[4/3] bg-[#eee]" />
              <div className="space-y-2 p-4"><div className="h-4 w-2/3 rounded bg-[#eee]" /><div className="h-4 w-1/3 rounded bg-[#eee]" /></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-8 rounded-xl bg-[#fff4f4] p-8 text-center ring-1 ring-[#f3c2c2]" role="alert">
          <p className="font-bold">We could not load products</p>
          <p className="mt-1 text-sm text-[#5b5b5b]">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-full bg-[#111] px-6 py-2.5 text-sm font-bold text-white">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-xl bg-[#f5f3ee] p-12 text-center">
          <p className="text-[20px] font-black">Nothing matches those filters</p>
          <p className="mt-1 text-[#5b5b5b]">Try widening the price or clearing the keyword.</p>
          <button onClick={() => { setQ(""); setMax(0); pickCat("all"); }} className="mt-4 rounded-full bg-[#0058a3] px-6 py-2.5 text-sm font-bold text-white">Clear filters</button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {items.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-16">Loading shop…</div>}>
      <ShopInner />
    </Suspense>
  );
}

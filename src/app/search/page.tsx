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
  // Task 121 F-1: `loading` starts false and only flips inside the 250ms
  // debounce callback — on the primary entry path (header search → /search?q=…)
  // the hydrated page used to render "0 results for …" during that window.
  // The verdict blocks gate on the search having SETTLED for the CURRENT
  // needle; a changed needle hides them again until its own search lands.
  const [settledFor, setSettledFor] = useState<string | null>(null);
  // A failed fetch is an error — distinct from a genuine zero-result query.
  const [error, setError] = useState(false);
  // Bumping this re-runs the search effect (retry button) without changing q.
  const [retry, setRetry] = useState(0);

  const needle = q.trim();

  // Task 122 F-17: the URL is the shareable record of the search — the page
  // READS ?q= on entry (header search pushes it) but its own form and chips
  // never WROTE it, so refresh/share lost the query. replaceState (not push)
  // keeps the history stack clean while making every settled needle
  // reloadable. Called on explicit actions (submit/chip), not per keystroke.
  function syncUrl(next: string) {
    const target = next.trim()
      ? `/search?q=${encodeURIComponent(next.trim())}`
      : "/search";
    window.history.replaceState(null, "", target);
  }

  // The empty-needle case is a render derivation, not a state reset — with no
  // query there is simply nothing to show (and the popular chips render).
  const shown = needle ? items : [];

  useEffect(() => {
    if (!needle) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true); // inside the async callback — not sync in the effect body
      setError(false);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(needle)}`);
        const json = (await res.json()) as { ok: boolean; data?: CardProduct[] };
        if (!cancelled && json.ok) setItems(json.data ?? []);
        else if (!cancelled) setError(true);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSettledFor(needle);
        }
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [needle, retry]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-tight">Search the range</h1>
      <form onSubmit={(e) => { e.preventDefault(); syncUrl(q); setRetry((r) => r + 1); }} role="search" className="mt-4 flex max-w-2xl gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “oak bookshelf” or “washable sofa”…" aria-label="Search products" autoFocus
          className="flex-1 rounded-full border-2 border-[#111] px-5 py-3 text-[15px] outline-none focus:border-[#0058a3]" />
        <button type="submit" className="shrink-0 rounded-full bg-[#0058a3] px-7 py-3 text-[15px] font-bold text-white hover:bg-[#004382] focus-ring">Search</button>
      </form>
      {!needle && (
        <div className="mt-6">
          <p className="text-[13px] font-black uppercase tracking-wide text-[#5b5b5b]">Popular right now</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <button key={p} onClick={() => { setQ(p); syncUrl(p); }} className="rounded-full bg-[#f5f3ee] px-4 py-2 text-[14px] font-bold hover:bg-[#ffdb00] focus-ring">{p}</button>
            ))}
          </div>
        </div>
      )}
      {loading && <p className="mt-6 text-[#5b5b5b]" role="status">Searching…</p>}
      {/* Task 123 F-4: the error box gates on the settled needle exactly like
          the result verdicts below — after a FAILED search, typing a new
          needle used to keep the old "couldn't load results" box on screen
          through the debounce + fetch window (loading is false during it). A
          changed needle hides it until its own search settles. */}
      {error && !loading && settledFor === needle && (
        <div className="mt-4 rounded-xl bg-[#fff4f4] p-10 text-center" role="alert">
          <p className="text-[18px] font-black text-[#a00008]">We couldn’t load results</p>
          <p className="mt-1 text-[#5b5b5b]">The catalogue service didn’t answer. Check your connection and try again.</p>
          <button onClick={() => setRetry((n) => n + 1)} className="mt-3 rounded-full bg-[#0058a3] px-6 py-2.5 text-[14px] font-bold text-white hover:bg-[#004382] focus-ring">Try again</button>
        </div>
      )}
      {!loading && !error && needle && settledFor === needle && (
        <p className="mt-6 text-[15px]" role="status"><strong>{shown.length}</strong> result{shown.length === 1 ? "" : "s"} for “{needle}”</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {shown.map((p) => <ProductCard key={p.id} p={{ ...p, ratingAvg: String(p.ratingAvg) }} />)}
      </div>
      {!loading && !error && needle && settledFor === needle && shown.length === 0 && (
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

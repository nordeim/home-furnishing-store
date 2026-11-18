"use client";

import { useState } from "react";

export interface ReviewVM { id: number; author: string; rating: number; title: string; body: string; verified: boolean; createdAt: string; }

export function ReviewSection({ productId, initial }: { productId: number; initial: ReviewVM[] }) {
  const [list, setList] = useState<ReviewVM[]>(initial);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  // Whether the current message is an error (role="alert") or a success note
  // (role="status") — failures must announce assertively (Task 119 F-17).
  const [msgIsError, setMsgIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, author, rating, title, body }),
      });
      const json = (await res.json()) as { ok: boolean; data?: ReviewVM; error?: { message: string } };
      if (!json.ok || !json.data) throw new Error(json.error?.message ?? "Could not save review");
      // Trust the server-issued timestamp (the API returns createdAt); the
      // client clock is only a fallback for a malformed response.
      const saved = json.data;
      setList((prev) => [{ ...saved, createdAt: saved.createdAt || new Date().toISOString() }, ...prev]);
      setAuthor(""); setTitle(""); setBody(""); setRating(5);
      setMsg("Thanks — your review is live.");
      setMsgIsError(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save review.");
      setMsgIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="reviews" className="mt-12 scroll-mt-24">
      <h2 className="text-[22px] font-black">Reviews ({list.length})</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          {list.length === 0 && <li className="rounded-xl bg-[#f5f3ee] p-6 text-[#5b5b5b]">No reviews yet — be the first to share how it fits your home.</li>}
          {list.map((r) => (
            <li key={r.id} className="rounded-xl p-5 ring-1 ring-[#ece8df]">
              <p className="text-[#e5a000]" aria-label={`${r.rating} out of 5 stars`}><span aria-hidden="true">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></p>
              {r.title && <p className="mt-1 font-bold">{r.title}</p>}
              <p className="mt-1 text-[14px] text-[#444]">{r.body}</p>
              <p className="mt-2 text-[13px] text-[#8a8a8a]">{r.author} {r.verified && <span className="ml-1 rounded-full bg-[#e8f3e9] px-2 py-0.5 font-bold text-[#2e6b34]">Verified buyer</span>}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="h-fit rounded-2xl bg-[#f5f3ee] p-5">
          <h3 className="font-black">Write a review</h3>
          <label className="mt-3 block text-[13px] font-bold">Your name<input value={author} onChange={(e) => setAuthor(e.target.value)} required minLength={2} maxLength={60} className="mt-1 w-full rounded-lg border border-[#ddd] bg-white px-3 py-2 font-normal outline-none focus:border-[#0058a3]" placeholder="e.g. Priya R." /></label>
          <label className="mt-3 block text-[13px] font-bold">Rating
            <span className="mt-1 flex gap-1" role="group" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} aria-pressed={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className={`grid h-9 w-9 place-items-center rounded-full text-[20px] focus-ring ${n <= rating ? "text-[#e5a000]" : "text-[#ccc]"}`}>★</button>
              ))}
            </span>
          </label>
          <label className="mt-3 block text-[13px] font-bold">Headline<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-[#ddd] bg-white px-3 py-2 font-normal outline-none focus:border-[#0058a3]" placeholder="Sum it up" /></label>
          <label className="mt-3 block text-[13px] font-bold">Review<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} className="mt-1 w-full rounded-lg border border-[#ddd] bg-white px-3 py-2 font-normal outline-none focus:border-[#0058a3]" placeholder="How is the quality, comfort, assembly?" /></label>
          {msg && <p className="mt-3 text-[13px] font-bold" role={msgIsError ? "alert" : "status"}>{msg}</p>}
          <button disabled={busy} className="mt-4 w-full rounded-full bg-[#111] py-3 text-[14px] font-bold text-white hover:bg-[#0058a3] disabled:opacity-60 focus-ring">
            {busy ? "Publishing…" : "Publish review"}
          </button>
        </form>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

export interface ReviewVM { id: number; author: string; rating: number; title: string; body: string; verified: boolean; createdAt: string; }

export function ReviewSection({ productId, initial, total, unavailable }: { productId: number; initial: ReviewVM[]; total?: number; unavailable?: boolean }) {
  const [list, setList] = useState<ReviewVM[]>(initial);
  // Task 137 F-1: the SSR unavailable state is RECOVERABLE client state — a
  // successful POST proves the DB answered, so the note unmounts and the
  // heading resumes its count claim instead of staying frozen at mount
  // (the old render read the prop directly: a recovered write left the new
  // review BELOW the stale "unavailable" note with no count anywhere).
  const [sectionUnavailable, setSectionUnavailable] = useState(!!unavailable);
  // Task 123 F-10: the heading quotes the TRUE review count (the server-side
  // count(*) query), not the capped rendered list — defaults to the list
  // length when no count is passed, and bumps with each successful POST.
  // Task 136 F-3: under outage (unavailable) the heading makes NO count
  // claim — the old degrade answered "Reviews (0)" for a product with live
  // reviews.
  const [count, setCount] = useState(total ?? initial.length);
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
    // Task 140 F-1: capture whether this POST is a RECOVERY — the section
    // was unavailable when the write landed (the write proves the DB
    // answered). The recovery branch owes a refetch: the count seeded at
    // zero under a full outage must not resume as "the ones I saw plus
    // one" — the heading resumes at the server's TRUE count or the
    // understatement the Task-139 register documented becomes a rendered
    // number. wasUnavailable is read BEFORE the flip below.
    const wasUnavailable = sectionUnavailable;
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
      setCount((c) => c + 1);
      setSectionUnavailable(false);
      setAuthor(""); setTitle(""); setBody(""); setRating(5);
      setMsg("Thanks — your review is live.");
      setMsgIsError(false);
      // Task 140 F-1: the recovery refetch — a failed refetch keeps the
      // POST-applied state (degrade-never-fail); a successful one adopts
      // the server truth for BOTH the list and the count (the additive GET
      // `count` field — the count(*) that never saturates at the 20-row
      // cap). Fires ONLY on the recovery path; the normal path keeps the
      // SSR-count + increment design.
      if (wasUnavailable) {
        try {
          const refetch = await fetch(`/api/reviews?productId=${productId}`);
          const rjson = (await refetch.json()) as {
            ok: boolean;
            data?: Array<{ id: number; author: string; rating: number; title: string | null; body: string; verified: boolean; createdAt: string }>;
            count?: number;
          };
          if (rjson.ok && Array.isArray(rjson.data)) {
            // The PDP's initial-mapping discipline (title is nullable at the
            // seam; the VM is not).
            setList(rjson.data.map((r) => ({ id: r.id, author: r.author, rating: r.rating, title: r.title ?? "", body: r.body, verified: r.verified, createdAt: r.createdAt || new Date().toISOString() })));
            setCount(typeof rjson.count === "number" ? rjson.count : rjson.data.length);
          }
        } catch {
          // The POST already landed and the section already flipped — a
          // failed refetch degrades to the POST-applied view.
        }
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save review.");
      setMsgIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="reviews" className="mt-12 scroll-mt-24">
      {/* Task 136 F-3: under outage the honest posture is the BuyBox degrade
          sibling — an unavailable note, NO count claim, never the false
          "No reviews yet — be the first" invitation for a reviewed product. */}
      <h2 className="text-[22px] font-black">{sectionUnavailable ? "Reviews" : `Reviews (${count})`}</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          {sectionUnavailable && <li className="rounded-xl bg-[#f5f3ee] p-6 text-[#5b5b5b]">Reviews are unavailable right now — please try again in a moment.</li>}
          {!sectionUnavailable && list.length === 0 && <li className="rounded-xl bg-[#f5f3ee] p-6 text-[#5b5b5b]">No reviews yet — be the first to share how it fits your home.</li>}
          {list.map((r) => (
            <li key={r.id} className="rounded-xl p-5 ring-1 ring-[#ece8df]">
              <p className="text-[#e5a000]" role="img" aria-label={`${r.rating} out of 5 stars`}><span aria-hidden="true">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></p>
              {r.title && <p className="mt-1 font-bold">{r.title}</p>}
              <p className="mt-1 text-[14px] text-[#444]">{r.body}</p>
              <p className="mt-2 text-[13px] text-[#5b5b5b]">{r.author} {r.verified && <span className="ml-1 rounded-full bg-[#e8f3e9] px-2 py-0.5 font-bold text-[#2e6b34]">Verified buyer</span>}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="h-fit rounded-2xl bg-[#f5f3ee] p-5">
          <h3 className="font-black">Write a review</h3>
          <label className="mt-3 block text-[13px] font-bold">Your name<input value={author} onChange={(e) => setAuthor(e.target.value)} required minLength={2} maxLength={60} autoComplete="name" className="mt-1 w-full rounded-lg border border-[#ddd] bg-white px-3 py-2 font-normal outline-none focus:border-[#0058a3]" placeholder="e.g. Priya R." /></label>
          <label className="mt-3 block text-[13px] font-bold">Rating
            <span className="mt-1 flex gap-1" role="group" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((n) => (
                // Task 124 F-10 (WCAG 1.4.11): selected/unselected used to
                // differ by text color alone (#e5a000 vs #ccc — both under
                // the 3:1 non-text minimum on the form background). The
                // selected star additionally carries a ring + filled chip —
                // a non-color cue for low-vision users (aria-pressed covers
                // AT users).
                <button type="button" key={n} aria-pressed={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className={`grid h-9 w-9 place-items-center rounded-full text-[20px] focus-ring ${n <= rating ? "bg-white font-black text-[#e5a000] ring-2 ring-[#e5a000]" : "text-[#ccc]"}`}>★</button>
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

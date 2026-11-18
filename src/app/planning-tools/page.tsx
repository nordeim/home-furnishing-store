"use client";

import { useMemo, useState } from "react";
import { sgTomorrowISO } from "@/lib/utils";

const STEPS = ["Measure", "Plan in 3D", "Shop the list", "We install"];

// Sessions book from tomorrow onward — the SGT calendar day after SGT now
// (Task 122 F-1: the old UTC arithmetic shipped "today" as the minimum
// between 00:00–07:59 SGT). Computed at module load (not during render —
// react-hooks/purity); per-process is fine for a demo booking form.
const MIN_DATE = sgTomorrowISO();

export default function PlanningPage() {
  const [room, setRoom] = useState<"living" | "bedroom" | "kitchen">("living");
  const [len, setLen] = useState(4.2);
  const [wid, setWid] = useState(3.1);
  const [date, setDate] = useState("");
  const [booked, setBooked] = useState(false);

  const area = useMemo(() => len * wid, [len, wid]);
  const suggestion = useMemo(() => {
    if (room === "kitchen") return area < 8 ? "Single-wall MODUL run + HDB trolley island" : "L-shape MODUL + trolley + wall storage to ceiling";
    if (room === "bedroom") return area < 10 ? "TAMPINES storage bed + sliding wardrobe + KATONG tables" : "Queen storage bed + JURONG 3-door + reading corner";
    return area < 15 ? "FJORD compact 2-seater + SKAGEN bench + NORDLYS lamp" : "SOLBAKKEN 3-seater + lounge chair + media wall";
  }, [room, area]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#0058a3]">Planning tools</p>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,3rem)] font-black tracking-tight">Measure once, furnish right</h1>
      <ol className="mt-4 flex flex-wrap gap-2">
        {STEPS.map((s, i) => <li key={s} className="rounded-full bg-[#f5f3ee] px-4 py-2 text-[13px] font-bold"><span className="mr-1 inline-grid h-5 w-5 place-items-center rounded-full bg-[#111] text-[11px] text-white">{i + 1}</span>{s}</li>)}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-[#f5f3ee] p-6">
          <h2 className="font-black">Room size explorer</h2>
          <div className="mt-3 flex gap-2" role="group" aria-label="Room type">
            {(["living", "bedroom", "kitchen"] as const).map((r) => (
              <button key={r} type="button" aria-pressed={room === r} onClick={() => setRoom(r)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold capitalize focus-ring ${room === r ? "bg-[#111] text-white" : "bg-white"}`}>{r}</button>
            ))}
          </div>
          <label className="mt-4 block text-[13px] font-bold">Length: {len.toFixed(1)} m
            <input type="range" min={2} max={8} step={0.1} value={len} onChange={(e) => setLen(Number(e.target.value))} className="w-full accent-[#0058a3]" aria-label="Room length in metres" />
          </label>
          <label className="mt-2 block text-[13px] font-bold">Width: {wid.toFixed(1)} m
            <input type="range" min={2} max={6} step={0.1} value={wid} onChange={(e) => setWid(Number(e.target.value))} className="w-full accent-[#0058a3]" aria-label="Room width in metres" />
          </label>
          <div className="mt-4 rounded-xl bg-white p-4" aria-live="polite">
            <p className="text-[13px] text-[#5b5b5b]">Your room · {area.toFixed(1)} sqm</p>
            <div className="mt-2 h-28 w-full rounded-lg bg-[#e9eef5] p-2">
              <div className="h-full rounded bg-[#0058a3]/25 ring-2 ring-[#0058a3]" style={{ width: `${Math.min(100, (area / 40) * 100)}%` }} />
            </div>
            <p className="mt-2 text-[14px]"><strong>Planner suggests:</strong> {suggestion}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111] p-6 text-white">
          <h2 className="font-black">Book a free 45-min planning session</h2>
          <p className="mt-1 text-[14px] text-white/70">Video call or in-store at Tampines · bring your floor plan (HDB MyNiceHome PDF works).</p>
          {booked ? (
            <div className="mt-4 rounded-xl bg-[#1d3a24] p-4 font-bold" role="status">
              Session requested for {date} — we&apos;ll confirm by SMS.
              <p className="mt-1 text-[12px] font-normal text-white/70">Demo storefront: no email or SMS is actually sent.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (date) setBooked(true); }} className="mt-4 space-y-3">
              <label className="block text-[13px] font-bold">Preferred date<input required type="date" value={date} onChange={(e) => setDate(e.target.value)} min={MIN_DATE} className="mt-1 w-full rounded-xl px-4 py-3 text-black outline-none focus:ring-2 focus:ring-white/80" /></label>
              <label className="block text-[13px] font-bold">Email<input required type="email" placeholder="you@email.com" className="mt-1 w-full rounded-xl px-4 py-3 text-black outline-none focus:ring-2 focus:ring-white/80" /></label>
              <button className="w-full rounded-full bg-[#ffdb00] py-3.5 font-black text-black hover:bg-white focus-ring">Request session</button>
            </form>
          )}
          <ul className="mt-4 space-y-1.5 text-[13px] text-white/70">
            <li>✓ Measurement checklist PDF after booking</li>
            <li>✓ 3D views + fixed installation quote</li>
            <li>✓ HDB/BCA compliance notes for kitchens</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

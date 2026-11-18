"use client";

import { useMemo, useState } from "react";
import { formatSGD } from "@/lib/utils";

export default function SustainabilityPage() {
  const [age, setAge] = useState(3);
  const [cond, setCond] = useState<"like-new" | "good" | "well-loved">("good");
  const [paid, setPaid] = useState(899);

  const credit = useMemo(() => {
    const base = paid * (cond === "like-new" ? 0.5 : cond === "good" ? 0.35 : 0.2);
    const ageFactor = Math.max(0.4, 1 - age * 0.08);
    return Math.round(base * ageFactor);
  }, [age, cond, paid]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#2e6b34]">People & planet</p>
      <h1 className="mt-1 max-w-3xl text-[clamp(1.9rem,4vw,3rem)] font-black tracking-tight">Good furniture should live more than one life</h1>
      {/* The stats below are illustrative demo figures (Task 119 F-23): this
          storefront's footer disclaimer covers product names/copy/prices — ESG
          numbers deserve their own honest framing so nothing reads as a
          corporate sustainability claim. */}
      <p className="mt-2 text-[13px] text-[#5b5b5b]">Concept demo storefront — the figures on this page are illustrative, not audited claims.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[["100% renewable electricity", "All 3 SG stores + warehouse since 2024."], ["73% recycled materials", "Across textiles and board — audited yearly."], ["41,203 pieces re-homed", "Through As-Is corners and buy-back in 2025."]].map(([a, b]) => (
          <div key={a} className="rounded-2xl bg-[#e8f3e9] p-6"><p className="text-[24px] font-black text-[#1d4d22]">{a}</p><p className="mt-1 text-[14px]">{b}</p></div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 rounded-2xl bg-[#111] p-8 text-white lg:grid-cols-2">
        <div>
          <h2 className="text-[22px] font-black">Buy-back estimator</h2>
          <p className="mt-1 text-white/75">Tell us what you paid, its age and condition — get an instant buy-back credit estimate redeemable in-store.</p>
          <label className="mt-4 block text-[13px] font-bold">You paid: {formatSGD(paid * 100)}
            <input type="range" min={50} max={3000} step={10} value={paid} onChange={(e) => setPaid(Number(e.target.value))} className="mt-1 w-full accent-[#ffdb00]" aria-label="Original price in dollars" />
          </label>
          <label className="mt-3 block text-[13px] font-bold">Age: {age} year{age === 1 ? "" : "s"}
            <input type="range" min={0} max={12} value={age} onChange={(e) => setAge(Number(e.target.value))} className="mt-1 w-full accent-[#ffdb00]" aria-label="Furniture age in years" />
          </label>
          <div className="mt-3 flex gap-2" role="group" aria-label="Condition">
            {(["like-new", "good", "well-loved"] as const).map((c) => (
              <button key={c} type="button" aria-pressed={cond === c} onClick={() => setCond(c)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold focus-ring ${cond === c ? "bg-[#ffdb00] text-black" : "bg-white/10"}`}>{c}</button>
            ))}
          </div>
        </div>
        <div className="grid place-items-center rounded-2xl bg-white p-8 text-center text-black">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#5b5b5b]">Estimated credit</p>
            <p className="text-[56px] font-black tracking-tight" aria-live="polite">{formatSGD(credit * 100)}</p>
            <p className="text-[13px] text-[#5b5b5b]">Paid as a NORDHEM voucher · final value confirmed at the As-Is counter.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

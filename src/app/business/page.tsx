"use client";

import { useMemo, useState } from "react";
import { formatSGD } from "@/lib/utils";

const UNITS = [
  { id: "desk", label: "Workstation (desk + chair)", cents: 77800 },
  { id: "meet4", label: "4-pax meeting set", cents: 129800 },
  { id: "pantry", label: "Pantry module", cents: 219800 },
  { id: "locker", label: "Staff locker tower", cents: 34900 },
];

export default function BusinessPage() {
  const [qty, setQty] = useState<Record<string, number>>({ desk: 10, meet4: 1, pantry: 1, locker: 2 });
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const subtotal = useMemo(
    () => UNITS.reduce((a, u) => a + u.cents * (qty[u.id] ?? 0), 0),
    [qty],
  );
  const trade = useMemo(() => Math.round(subtotal * 0.12), [subtotal]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#0058a3]">NORDHEM for Business</p>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,3rem)] font-black tracking-tight">Fit out your office in one quote</h1>
      <p className="mt-2 max-w-2xl text-[#5b5b5b]">Cafés, clinics, studios and satellite offices: pick modules, get an instant trade estimate, and our team confirms installation within one business day.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {UNITS.map((u) => (
            <div key={u.id} className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-[#ece8df]">
              <div className="flex-1">
                <p className="font-bold">{u.label}</p>
                <p className="text-[13px] text-[#5b5b5b]">{formatSGD(u.cents)} each · installation included over 5 units</p>
              </div>
              <div className="flex items-center rounded-full border border-[#ddd]">
                <button onClick={() => setQty((q) => ({ ...q, [u.id]: Math.max(0, (q[u.id] ?? 0) - 1) }))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f5f3ee] focus-ring" aria-label={`Fewer ${u.label}`}>−</button>
                <span className="w-8 text-center font-black" aria-live="polite">{qty[u.id] ?? 0}</span>
                <button onClick={() => setQty((q) => ({ ...q, [u.id]: Math.min(200, (q[u.id] ?? 0) + 1) }))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f5f3ee] focus-ring" aria-label={`More ${u.label}`}>+</button>
              </div>
            </div>
          ))}
          <ul className="grid gap-2 text-[14px] text-[#444] sm:grid-cols-3">
            {[["Dedicated trade desk", "One human, WhatsApp-fast"], ["Bulk delivery windows", "After-hours available"], ["3-yr business warranty", "Spares on priority"]].map(([a, b]) => (
              <li key={a} className="rounded-xl bg-[#f5f3ee] p-4"><p className="font-bold">{a}</p><p className="text-[13px]">{b}</p></li>
            ))}
          </ul>
        </div>
        <aside className="h-fit rounded-2xl bg-[#111] p-6 text-white lg:sticky lg:top-40">
          <h2 className="font-black">Instant trade estimate</h2>
          <dl className="mt-3 space-y-2 text-[14px]">
            <div className="flex justify-between"><dt className="text-white/70">List total</dt><dd>{formatSGD(subtotal)}</dd></div>
            <div className="flex justify-between text-[#8fe388]"><dt>Trade saving (12%)</dt><dd>−{formatSGD(trade)}</dd></div>
            <div className="flex justify-between border-t border-white/15 pt-3 text-[19px] font-black"><dt>Estimate</dt><dd>{formatSGD(subtotal - trade)}</dd></div>
          </dl>
          {sent ? (
            <div className="mt-4 rounded-xl bg-[#1d3a24] p-4 text-[14px] font-bold" role="status">
              Request received — our trade desk replies within one business day.
              <p className="mt-1 text-[12px] font-normal text-white/70">Demo storefront: no request is actually sent.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) setSent(true); }} className="mt-4 space-y-2">
              <label className="block text-[13px] font-bold">Work email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@company.sg" className="mt-1 w-full rounded-xl px-4 py-3 text-black outline-none" /></label>
              <button className="w-full rounded-full bg-[#ffdb00] py-3.5 font-black text-black hover:bg-white focus-ring">Request formal quote</button>
            </form>
          )}
          <p className="mt-2 text-[12px] text-white/60">Estimate only — final quote confirms stock, delivery & GST.</p>
        </aside>
      </div>
    </div>
  );
}

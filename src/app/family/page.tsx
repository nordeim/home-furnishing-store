"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { familyVoucherCents, formatSGD, FAMILY_VOUCHER_CENTS, FAMILY_POINTS_PER_VOUCHER, FAMILY_POINTS_PER_DOLLAR } from "@/lib/utils";

export default function FamilyPage() {
  const [spend, setSpend] = useState(1200);
  const [joined, setJoined] = useState(false);
  const points = useMemo(() => Math.floor(spend * FAMILY_POINTS_PER_DOLLAR), [spend]);
  const reward = useMemo(() => familyVoucherCents(points), [points]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid overflow-hidden rounded-2xl bg-[#0058a3] text-white lg:grid-cols-2">
        <div className="p-8 sm:p-12">
          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#ffdb00]">NORDHEM Family · free to join</p>
          <h1 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] font-black leading-tight">Members get more (and pay less)</h1>
          <ul className="mt-4 space-y-2 text-[15px] text-white/85">
            <li>✓ Vouchers apply to the whole catalogue, every day</li>
            <li>✓ Free Click & Collect + free coffee Mon–Fri</li>
            <li>✓ {FAMILY_POINTS_PER_DOLLAR} points per $1 — ${FAMILY_VOUCHER_CENTS / 100} voucher every {FAMILY_POINTS_PER_VOUCHER.toLocaleString("en-SG")} pts</li>
            <li>✓ Free assembly on your birthday month*</li>
          </ul>
          {/* The join form confirms honestly (Task 119 F-6): the business and
              planning-tools pattern — sent state + the demo disclosure, not a
              silent no-op that harvests an email with zero feedback. */}
          {joined ? (
            <div className="mt-6 max-w-md rounded-2xl bg-white/10 p-4 text-[14px] font-bold" role="status">
              Welcome to the Family — points start on your first order.
              <p className="mt-1 text-[12px] font-normal text-white/70">Demo storefront: no membership request is actually sent.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setJoined(true); }} className="mt-6 flex max-w-md gap-2">
              <label htmlFor="fam-email" className="sr-only">Email</label>
              <input id="fam-email" type="email" required placeholder="you@email.com" className="flex-1 rounded-full px-5 py-3 text-black outline-none focus:ring-2 focus:ring-white/80" />
              <button className="rounded-full bg-[#ffdb00] px-6 py-3 font-black text-black hover:bg-white focus-ring">Join free</button>
            </form>
          )}
        </div>
        <div className="bg-[#ffdb00] p-8 text-black sm:p-12">
          <h2 className="text-[20px] font-black">Points calculator</h2>
          <p className="text-[14px]">Drag to your yearly furnishing spend:</p>
          <p className="mt-3 text-[40px] font-black">{formatSGD(spend * 100)}<span className="text-[16px] font-bold">/yr</span></p>
          <input type="range" min={200} max={10000} step={100} value={spend} onChange={(e) => setSpend(Number(e.target.value))} className="mt-2 w-full accent-black" aria-label="Yearly spend" />
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-black p-4 text-white"><p className="text-[24px] font-black">{points.toLocaleString()}</p><p className="text-[12px]">points earned</p></div>
            <div className="rounded-xl bg-white p-4"><p className="text-[24px] font-black">{formatSGD(reward)}</p><p className="text-[12px]">in vouchers</p></div>
          </div>
        </div>
      </div>
      <div className="mt-8 flex gap-3">
        <Link href="/offers" className="rounded-full bg-[#111] px-6 py-3 text-[14px] font-bold text-white">This week&apos;s offers</Link>
        <Link href="/food" className="rounded-full border px-6 py-3 text-[14px] font-bold">Free coffee, you say?</Link>
      </div>
      <p className="mt-3 text-[12px] text-[#5b5b5b]">*One item up to $80 assembly value. Points expire after 24 months.</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ORDER_STEPS, formatSGD, orderStepIndex } from "@/lib/utils";
import { storeName } from "@/lib/catalog";

interface Found {
  order: { orderNumber: string; fullName: string; status: string; deliveryMethod: string; deliverySlot: string; storeSlug: string; totalCents: number };
  items: Array<{ id: number; name: string; qty: number; unitPriceCents: number; imageUrl: string }>;
}

export default function TrackOrderPage() {
  const [num, setNum] = useState("");
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFound(null);
    try {
      // Task 142 H-6: the transport failure renders FIXED copy (never the
      // browser's TypeError text); the envelope refusal below keeps the
      // server's honest copy.
      let json: { ok: boolean; data?: Found; error?: { message: string } };
      try {
        const res = await fetch("/api/orders/track", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderNumber: num, email }),
        });
        json = (await res.json()) as { ok: boolean; data?: Found; error?: { message: string } };
      } catch {
        throw new Error("We couldn't reach the tracking service — please try again.");
      }
      // Task 144 K-2: a JSON-null body parses successfully — the json.data
      // read below threw the raw TypeError into the outer catch (the H-6
      // leak class). The null guard joins the transport catch.
      if (!json || typeof json !== "object") throw new Error("We couldn't reach the tracking service — please try again.");
      // Task 141 F-3 + Task 142 H-1: the gate reaches the NESTED shape the
      // success render interpolates — every order scalar the card copies
      // (orderNumber, fullName, status, deliveryMethod, deliverySlot,
      // storeSlug, totalCents) AND the items element shape the list maps
      // (id, name, qty, unitPriceCents). The old checks let a
      // contract-violating envelope through in two steps: `!json.data`
      // truthiness crashed on ANY nested read, and the orderNumber+array
      // form still crashed inside `storeName(found.order.storeSlug)`
      // (`slug.trim()` on undefined) when a sibling scalar was absent —
      // the Task-128 boundary discipline at the full interpolated set.
      const o = json.data?.order;
      const validOrder =
        typeof o?.orderNumber === "string" &&
        typeof o?.fullName === "string" &&
        typeof o?.status === "string" &&
        typeof o?.deliveryMethod === "string" &&
        typeof o?.deliverySlot === "string" &&
        typeof o?.storeSlug === "string" &&
        typeof o?.totalCents === "number";
      const validItems =
        Array.isArray(json.data?.items) &&
        json.data.items.every((i) => !!i && typeof i.id === "number" && typeof i.name === "string" && typeof i.qty === "number" && typeof i.unitPriceCents === "number");
      if (!json.ok || !json.data || !validOrder || !validItems)
        throw new Error(json.error?.message ?? "Order not found");
      setFound(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found.");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-xl border border-[#ddd] px-4 py-3 text-[15px] outline-none focus:border-[#0058a3] focus:ring-2 focus:ring-[#0058a3]/20";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#0058a3]">Self-service</p>
      <h1 className="mt-1 text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-tight">Track your order</h1>
      <p className="mt-2 text-[#5b5b5b]">Enter your order number (e.g. NH-20261118-XXXXXX) and the email you used at checkout — the demo storefront sends no emails.</p>

      <form onSubmit={lookup} className="mt-6 space-y-3 rounded-2xl bg-[#f5f3ee] p-6">
        <label className="block text-[13px] font-bold">Order number<input value={num} onChange={(e) => setNum(e.target.value)} required placeholder="NH-…" className={input} autoComplete="off" /></label>
        <label className="block text-[13px] font-bold">Email used at checkout<input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@email.com" className={input} autoComplete="email" /></label>
        {error && <p className="rounded-xl bg-[#fff0f0] p-3 text-[14px] font-bold text-[#a00008]" role="alert">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-[#0058a3] py-3.5 font-black text-white disabled:opacity-60 focus-ring">{busy ? "Looking up…" : "Track order"}</button>
      </form>

      {found && (
        <div className="mt-6 rounded-2xl p-6 ring-1 ring-[#ece8df]" aria-live="polite">
          <p className="text-[13px] text-[#5b5b5b]">Order {found.order.orderNumber} · {found.order.fullName}</p>
          <ol className="mt-3 grid grid-cols-4 gap-2" aria-label="Delivery progress">
            {ORDER_STEPS.map((s, i) => (
              <li key={s} className={`rounded-xl p-2 text-center text-[12px] font-bold ${i <= orderStepIndex(found.order.status) ? "bg-[#111] text-white" : "bg-[#f5f3ee] text-[#5b5b5b]"}`}>{s}</li>
            ))}
          </ol>
          <p className="mt-3 text-[14px]">{found.order.deliveryMethod === "click-collect" ? `Pickup at NORDHEM ${storeName(found.order.storeSlug)}` : "Home delivery"} · {found.order.deliverySlot}</p>
          <ul className="mt-3 space-y-2 border-t border-[#eee] pt-3">
            {found.items.map((i) => (
              <li key={i.id} className="flex justify-between text-[14px]"><span>{i.qty}× {i.name}</span><span className="font-bold">{formatSGD(i.unitPriceCents * i.qty)}</span></li>
            ))}
          </ul>
          <p className="mt-2 text-right font-black">Total {formatSGD(found.order.totalCents)}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { effectivePromo, findPromoMinimumCents } from "@/lib/catalog";
import { formatSGD, priceTotals } from "@/lib/utils";

export default function CartPage() {
  const { lines, setQty, remove, promoCode, setPromo, subtotalCents } = useCart();
  const [code, setCode] = useState(promoCode ?? "");
  // Follow an externally-applied promo (e.g. hydrated from localStorage after
  // mount) via adjust-during-render — the input mirrors the live promo state.
  const [prevPromo, setPrevPromo] = useState(promoCode);
  if (promoCode !== prevPromo) {
    setPrevPromo(promoCode);
    setCode(promoCode ?? "");
  }
  // Transient apply/error feedback only — the "applied" state itself is
  // derived from the store, so a revisit with a persisted promo shows its
  // discount immediately (previously the summary forgot it until re-applied).
  const [applyMsg, setApplyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);

  // Totals preview client-side via the effectivePromo gate (Task 122 F-5:
  // a below-minimum code must not display a discount the server refuses);
  // checkout re-derives server-side (server is truth). Computed BEFORE the
  // message so both halves of the promo UI agree.
  const promo = effectivePromo(promoCode, subtotalCents);

  // Task 123 F-2: the message must agree with the gate. applyMsg reflects the
  // apply MOMENT — persisted below the minimum it kept advertising
  // "WELCOME10 applied" beside a vanished Discount row (browser-reproduced),
  // and the code still submitted to a server INVALID_PROMO. The CURRENT bag
  // state owns the message: below the minimum, quote the minimum instead.
  const promoMinCents = promoCode ? findPromoMinimumCents(promoCode) : null;
  const promoMsg =
    promoCode && !promo
      ? { ok: false, text: `${promoCode} needs a ${formatSGD(promoMinCents ?? 0)} minimum — add more to use it` }
      : (applyMsg ?? (promoCode ? { ok: true, text: `${promoCode} applied` } : null));

  async function applyPromo() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setChecking(true);
    setApplyMsg(null);
    try {
      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: c, subtotalCents }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { label: string }; error?: { message: string } };
      if (!json.ok) throw new Error(json.error?.message ?? "Invalid code");
      setPromo(c);
      setApplyMsg({ ok: true, text: `${c} applied — ${json.data?.label ?? "discount"}` });
    } catch (e) {
      // A failed apply must NOT destroy an already-applied code (Task 118
      // F-13): the user's discount vanished silently on a typo. Removal is an
      // explicit action — the Remove button below.
      setApplyMsg({ ok: false, text: e instanceof Error ? e.message : "Invalid code" });
    } finally {
      setChecking(false);
    }
  }

  function removePromo() {
    setPromo(null);
    setApplyMsg(null);
    setCode("");
  }

  const t = priceTotals({ subtotalCents, promo, deliveryMethod: "delivery" });

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="text-[56px]" aria-hidden="true">🛒</p>
        <h1 className="mt-2 text-[28px] font-black">Your bag is empty</h1>
        <p className="mt-2 text-[#5b5b5b]">Beautiful rooms start with a single shelf. Let&apos;s find yours.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/shop" className="rounded-full bg-[#0058a3] px-7 py-3 font-bold text-white hover:bg-[#004382] focus-ring">Start shopping</Link>
          <Link href="/inspiration" className="rounded-full border px-7 py-3 font-bold hover:bg-[#f5f3ee] focus-ring">Get inspired</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-tight">Your bag ({lines.reduce((a, l) => a + l.qty, 0)})</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.productId} className="flex gap-4 rounded-2xl p-4 ring-1 ring-[#ece8df]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.imageUrl} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/product/${l.slug}`} className="font-bold hover:text-[#0058a3] hover:underline">{l.name}</Link>
                    <p className="text-[13px] text-[#5b5b5b]">{l.sku}</p>
                  </div>
                  <button onClick={() => remove(l.productId)} className="rounded-full p-2 text-[#5b5b5b] hover:bg-[#f5f3ee] hover:text-black focus-ring" aria-label={`Remove ${l.name}`}>✕</button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-full border border-[#ddd]">
                    <button onClick={() => setQty(l.productId, l.qty - 1)} disabled={l.qty <= 1} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f5f3ee] focus-ring disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Decrease quantity of ${l.name}`}>−</button>
                    <span className="w-8 text-center font-black" aria-live="polite">{l.qty}</span>
                    <button onClick={() => setQty(l.productId, l.qty + 1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f5f3ee] focus-ring" aria-label={`Increase quantity of ${l.name}`}>+</button>
                  </div>
                  <p className="font-black">{formatSGD(l.unitPriceCents * l.qty)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl bg-[#f5f3ee] p-6 lg:sticky lg:top-40">
          <h2 className="font-black">Order summary</h2>
          <div className="mt-3 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Promo code (try WELCOME10)" aria-label="Promo code" className="flex-1 rounded-full border border-[#ddd] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[#0058a3]" />
            <button onClick={applyPromo} disabled={checking} className="rounded-full bg-[#111] px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-60 focus-ring">{checking ? "…" : "Apply"}</button>
            {promoCode && (
              <button onClick={removePromo} className="rounded-full border border-[#ddd] px-4 py-2.5 text-[14px] font-bold text-[#5b5b5b] hover:bg-[#f5f3ee] hover:text-black focus-ring" aria-label={`Remove code ${promoCode}`}>Remove</button>
            )}
          </div>
          {promoMsg && <p className={`mt-2 text-[13px] font-bold ${promoMsg.ok ? "text-[#2e6b34]" : "text-[#cc0008]"}`} role={promoMsg.ok ? "status" : "alert"}>{promoMsg.text}</p>}
          <dl className="mt-4 space-y-2 text-[14px]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-bold">{formatSGD(t.subtotalCents)}</dd></div>
            {t.discountCents > 0 && <div className="flex justify-between text-[#2e6b34]"><dt>Discount</dt><dd className="font-bold">−{formatSGD(t.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd className="font-bold">{t.deliveryFeeCents === 0 ? "FREE" : formatSGD(t.deliveryFeeCents)}</dd></div>
            <div className="flex justify-between text-[#5b5b5b]"><dt>Incl. 9% GST</dt><dd>{formatSGD(t.gstCents)}</dd></div>
            <div className="flex justify-between border-t border-[#ddd] pt-3 text-[18px] font-black"><dt>Total</dt><dd>{formatSGD(t.totalCents)}</dd></div>
          </dl>
          <Link href="/checkout" className="mt-4 block rounded-full bg-[#0058a3] py-3.5 text-center font-black text-white hover:bg-[#004382] focus-ring">Go to checkout →</Link>
          <Link href="/shop" className="mt-2 block text-center text-[14px] font-bold text-[#0058a3] hover:underline">Continue shopping</Link>
          <p className="mt-3 text-[12px] text-[#5b5b5b]">Free delivery over $200 · 365-day returns · Secure checkout</p>
        </aside>
      </div>
    </div>
  );
}

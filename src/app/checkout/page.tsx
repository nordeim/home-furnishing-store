"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { effectivePromo, STORES, storeName } from "@/lib/catalog";
import { availableDeliverySlots, formatSGD, mintIdempotencyKey, priceTotals, EXPRESS_DELIVERY_FEE_CENTS, FREE_DELIVERY_THRESHOLD_CENTS, GST_RATE, STANDARD_DELIVERY_FEE_CENTS } from "@/lib/utils";

type Method = "delivery" | "click-collect" | "express";

// Slot options derive from the selected fulfilment method (Task 119 F-22) and
// live in the SHARED seam src/lib/utils.ts (Task 123 F-3): the checkout API
// validates submissions against the same map, so a crafted client cannot
// persist a slot the UI would never offer.

export default function CheckoutPage() {
  const { lines, subtotalCents, promoCode, clear } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", fullName: "", phone: "", address: "", postal: "", slot: "Standard (3–5 days)", store: "tampines", pay: "card" });
  const [method, setMethod] = useState<Method>("delivery");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Task 126 F-1: ONE key per checkout-page mount — a double-click, a network
  // retry or an impatient re-submit re-sends the same key and the boundary
  // replays the first order instead of placing a second. useState re-runs the
  // initializer on hydration (the key is never rendered, so no mismatch) and
  // a page REMOUNT mints fresh (a new visit is a new intent).
  const [idemKey] = useState(() => mintIdempotencyKey());

  // Display totals use the shared effectivePromo gate (Task 122 F-5: a
  // below-minimum code must not display a discount the server refuses);
  // the server re-derives at order time.
  const promo = effectivePromo(promoCode, subtotalCents);
  const t = priceTotals({ subtotalCents, promo, deliveryMethod: method });

  // Task 125 F-6: a slot held in state can leave the available set when the
  // clock crosses its own cutoff (click-collect "Today 2pm" after 14:00 SGT)
  // — the controlled select then DISPLAYS the first remaining option while
  // the payload still carries the stale slot. Adjust-during-render (the
  // Header prevPathname pattern): reset a held slot the moment it leaves
  // the offered set, so display and submission always agree. Every method
  // always offers at least one slot, so this converges in one render.
  if (method === "click-collect" && !availableDeliverySlots(method).includes(form.slot)) {
    set("slot", availableDeliverySlots(method)[0]);
  }

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.email, fullName: form.fullName, phone: form.phone,
          address: form.address, postal: form.postal, deliveryMethod: method,
          deliverySlot: form.slot, storeSlug: form.store, paymentMethod: form.pay,
          promoCode, lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
          idempotencyKey: idemKey,
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { orderNumber: string }; error?: { message: string } };
      if (!json.ok || !json.data) throw new Error(json.error?.message ?? "Checkout failed");
      clear();
      router.push(`/order/${json.data.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[26px] font-black">Nothing to check out yet</h1>
        <p className="mt-2 text-[#5b5b5b]">Your bag is empty — add a few favourites first.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-[#0058a3] px-7 py-3 font-bold text-white">Browse the range</Link>
      </div>
    );
  }

  const input = "w-full rounded-xl border border-[#ddd] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#0058a3] focus:ring-2 focus:ring-[#0058a3]/20";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black tracking-tight">Checkout</h1>
      {/* Task 121 F-12: the alert is the form's shared error surface — a
          contact-field failure used to render physically inside "3 · Payment",
          far from the offending inputs. It now precedes every section. */}
      {error && <p className="mt-4 rounded-xl bg-[#fff0f0] p-3 text-[14px] font-bold text-[#a00008]" role="alert">{error}</p>}
      <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl p-6 ring-1 ring-[#ece8df]" aria-labelledby="contact-h">
            <h2 id="contact-h" className="font-black">1 · Contact & delivery address</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-bold">Email<input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" className={input} autoComplete="email" /></label>
              <label className="text-[13px] font-bold">Full name<input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Recipient name" className={input} autoComplete="name" /></label>
              <label className="text-[13px] font-bold">Phone<input required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+65 8XXX XXXX" className={input} autoComplete="tel" /></label>
              <label className="text-[13px] font-bold">Postal code<input required value={form.postal} onChange={(e) => set("postal", e.target.value)} placeholder="6 digits" inputMode="numeric" maxLength={6} className={input} autoComplete="postal-code" /></label>
              <label className="text-[13px] font-bold sm:col-span-2">Address<input required value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Blk, street, unit number" className={input} autoComplete="street-address" /></label>
            </div>
          </section>

          <section className="rounded-2xl p-6 ring-1 ring-[#ece8df]" aria-labelledby="method-h">
            <h2 id="method-h" className="font-black">2 · Fulfilment</h2>
            {/* Toggle-button group (Task 119 F-7): these never implemented the
                radiogroup keyboard pattern — plain buttons with aria-pressed are
                honest semantics (Tab-reachable, correctly announced). */}
            <div className="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label="Delivery method">
              {([["delivery", "Delivery", `From $${STANDARD_DELIVERY_FEE_CENTS / 100} · free $${FREE_DELIVERY_THRESHOLD_CENTS / 100}+`], ["click-collect", "Click & Collect", "Free · ready in 2 hrs"], ["express", "Express", `Next-day · $${EXPRESS_DELIVERY_FEE_CENTS / 100}`]] as Array<[Method, string, string]>).map(([v, title, sub]) => (
                <button type="button" key={v} aria-pressed={method === v} onClick={() => { setMethod(v); set("slot", availableDeliverySlots(v)[0]); }}
                  className={`rounded-xl border-2 p-4 text-left focus-ring ${method === v ? "border-[#0058a3] bg-[#f0f6fc]" : "border-[#eee]"}`}>
                  <span className="block font-black">{title}</span><span className="text-[13px] text-[#5b5b5b]">{sub}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-bold">Fulfilment store
                <select value={form.store} onChange={(e) => set("store", e.target.value)} className={input}>
                  {/* Task 129 F-11: the options derive from the STORES seed (the
                      storeName display seam) — no hand-duplicated store list. */}
                  {STORES.map((s) => (
                    <option key={s.slug} value={s.slug}>{storeName(s.slug)}</option>
                  ))}
                </select>
              </label>
              <label className="text-[13px] font-bold">Time slot
                <select value={form.slot} onChange={(e) => set("slot", e.target.value)} className={input}>
                  {/* Task 124 F-8: options come from the temporal seam — the
                      already-past "Today 2pm" pickup slot hides after 14:00 SGT
                      (the API boundary still accepts the full set: grace for
                      stale tabs, method coherence unchanged). */}
                  {availableDeliverySlots(method).map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl p-6 ring-1 ring-[#ece8df]" aria-labelledby="pay-h">
            <h2 id="pay-h" className="font-black">3 · Payment <span className="ml-1 rounded-full bg-[#e8f3e9] px-2 py-0.5 text-[12px] text-[#2e6b34]">Demo — no charge</span></h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Payment method">
              {[["card", "Card"], ["paynow", "PayNow"], ["grabpay", "GrabPay"], ["atome", "Atome ×3"]].map(([v, l]) => (
                <button type="button" key={v} aria-pressed={form.pay === v} onClick={() => set("pay", v)}
                  className={`rounded-xl border-2 py-3 font-bold focus-ring ${form.pay === v ? "border-[#0058a3] bg-[#f0f6fc]" : "border-[#eee]"}`}>{l}</button>
              ))}
            </div>
            {form.pay === "card" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {/* Task 124 F-9 (WCAG 1.3.5): the card fields carry their
                    standard autocomplete purpose tokens like every contact
                    field on the page — the demo-payment stance never excuses
                    a missing input purpose. */}
                <label className="text-[13px] font-bold sm:col-span-2">Card number<input inputMode="numeric" placeholder="4111 1111 1111 1111" className={input} autoComplete="cc-number" /></label>
                <label className="text-[13px] font-bold">Expiry<input placeholder="MM/YY" className={input} autoComplete="cc-exp" /></label>
                <label className="text-[13px] font-bold">CVC<input inputMode="numeric" placeholder="123" maxLength={4} className={input} autoComplete="cc-csc" /></label>
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-[#111] p-6 text-white lg:sticky lg:top-40">
          <h2 className="font-black">Your order</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-[13px]">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-2"><span className="text-white/80">{l.qty}× {l.name}</span><span className="font-bold">{formatSGD(l.unitPriceCents * l.qty)}</span></li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-white/15 pt-4 text-[14px]">
            <div className="flex justify-between"><dt className="text-white/70">Subtotal</dt><dd className="font-bold">{formatSGD(t.subtotalCents)}</dd></div>
            {t.discountCents > 0 && <div className="flex justify-between text-[#8fe388]"><dt>Discount {promoCode && `(${promoCode})`}</dt><dd className="font-bold">−{formatSGD(t.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-white/70">Delivery</dt><dd className="font-bold">{t.deliveryFeeCents === 0 ? "FREE" : formatSGD(t.deliveryFeeCents)}</dd></div>
            <div className="flex justify-between text-white/60"><dt>Incl. {Math.round(GST_RATE * 100)}% GST</dt><dd>{formatSGD(t.gstCents)}</dd></div>
            <div className="flex justify-between border-t border-white/15 pt-3 text-[19px] font-black"><dt>Total</dt><dd>{formatSGD(t.totalCents)}</dd></div>
          </dl>
          <button disabled={busy} className="mt-4 w-full rounded-full bg-[#ffdb00] py-4 font-black text-black hover:bg-white disabled:opacity-60 focus-ring">
            {busy ? "Placing order…" : `Pay ${formatSGD(t.totalCents)}`}
          </button>
          <p className="mt-3 text-center text-[12px] text-white/60">Demo checkout — no real payment is processed.</p>
        </aside>
      </form>
    </div>
  );
}

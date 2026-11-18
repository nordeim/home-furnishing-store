"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-store";

const STORE_LABEL: Record<string, string> = { tampines: "Tampines", jurong: "Jurong", alexandra: "Alexandra" };

export interface StockRow { storeSlug: string; quantity: number; aisleBin: string; }

export function BuyBox({ product, stock }: {
  product: { productId: number; slug: string; name: string; sku: string; imageUrl: string; unitPriceCents: number };
  stock: StockRow[];
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(product, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  return (
    <div className="mt-5 rounded-2xl border-2 border-[#111] p-5">
      <div className="flex items-center gap-3">
        <label htmlFor="qty" className="text-[14px] font-bold">Qty</label>
        <div className="flex items-center rounded-full border border-[#ddd]">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#f5f3ee] focus-ring" aria-label="Decrease quantity">−</button>
          <input id="qty" value={qty} onChange={(e) => setQty(Math.min(99, Math.max(1, Math.floor(Number(e.target.value) || 1))))} className="w-10 text-center font-black outline-none" inputMode="numeric" />
          <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#f5f3ee] focus-ring" aria-label="Increase quantity">+</button>
        </div>
        <button
          onClick={handleAdd}
          className={`flex-1 rounded-full py-3.5 text-[15px] font-black focus-ring ${added ? "bg-[#2e6b34] text-white" : "bg-[#0058a3] text-white hover:bg-[#004382]"}`}
        >
          {added ? "✓ Added to bag" : "Add to bag"}
        </button>
      </div>

      <div className="mt-4" aria-live="polite">
        <p className="text-[13px] font-black uppercase tracking-wide text-[#5b5b5b]">Check store stock</p>
        <ul className="mt-2 space-y-2">
          {stock.length === 0 ? (
            // Degrade path (Postgres unreachable / no inventory rows): never
            // fabricate availability — say so honestly.
            <li className="rounded-lg bg-[#f5f3ee] px-3 py-2 text-[13px] text-[#5b5b5b]">
              Stock information is unavailable right now — call any store to check.
            </li>
          ) : (
            stock.map((s) => (
              <li key={s.storeSlug} className="flex items-center justify-between rounded-lg bg-[#f5f3ee] px-3 py-2 text-[13px]">
                <span className="font-bold">{STORE_LABEL[s.storeSlug] ?? s.storeSlug}</span>
                <span className={s.quantity > 5 ? "text-[#2e6b34] font-bold" : s.quantity > 0 ? "text-[#b5502a] font-bold" : "text-[#cc0008] font-bold"}>
                  {s.quantity > 5 ? `● In stock (${s.quantity})` : s.quantity > 0 ? `● Only ${s.quantity} left` : "○ Out of stock"}
                </span>
                {s.aisleBin && <span className="hidden text-[#8a8a8a] sm:block">Aisle {s.aisleBin}</span>}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

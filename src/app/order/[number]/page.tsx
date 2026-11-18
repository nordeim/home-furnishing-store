import Link from "next/link";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatSGD } from "@/lib/utils";
import { maskEmail } from "@/lib/mask";

export const dynamic = "force-dynamic";

const STEPS = ["Confirmed", "Picking", "On the way", "Delivered"];

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const decoded = decodeURIComponent(number);
  let order = null;
  let items: typeof orderItems.$inferSelect[] = [];
  try {
    const rows = await db.select().from(orders).where(eq(orders.orderNumber, decoded)).limit(1);
    order = rows[0] ?? null;
    if (order) items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  } catch { /* show friendly state below */ }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[26px] font-black">We can&apos;t find that order</h1>
        <p className="mt-2 text-[#5b5b5b]">Check the order number, or look it up with your email on the tracking page.</p>
        <Link href="/track-order" className="mt-6 inline-block rounded-full bg-[#0058a3] px-7 py-3 font-bold text-white">Track your order</Link>
      </div>
    );
  }

  const stepIdx = order.status === "delivered" ? 3 : order.status === "shipped" ? 2 : order.status === "picking" ? 1 : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl bg-[#e8f3e9] p-8 text-center">
        <p className="text-[44px]" aria-hidden="true">✓</p>
        <h1 className="text-[clamp(1.6rem,4vw,2.4rem)] font-black">Tak! Your order is confirmed</h1>
        <p className="mt-2">Order <strong>{order.orderNumber}</strong> · confirmation sent to <strong>{maskEmail(order.email)}</strong></p>
        {/* Public by order number — street address and postal stay off this
            page; the full detail lives behind the email match on /track-order. */}
        <p className="mt-1 text-[14px] text-[#2e6b34]">{order.deliveryMethod === "click-collect" ? `Ready for pickup at NORDHEM ${order.storeSlug} · ${order.deliverySlot}` : `Arriving ${order.deliverySlot}`}</p>
      </div>

      <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Order progress">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-xl p-3 text-center text-[13px] font-bold ${i <= stepIdx ? "bg-[#111] text-white" : "bg-[#f5f3ee] text-[#8a8a8a]"}`}>
            <span className="block text-[18px]">{i < stepIdx ? "✓" : i === stepIdx ? "●" : "○"}</span>{s}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl p-6 ring-1 ring-[#ece8df]">
        <h2 className="font-black">Items ({items.reduce((a, i) => a + i.qty, 0)})</h2>
        <ul className="mt-3 space-y-3">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <span className="flex-1 text-[14px]"><strong>{i.name}</strong> <span className="text-[#8a8a8a]">× {i.qty}</span></span>
              <span className="font-bold">{formatSGD(i.unitPriceCents * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-[#eee] pt-4 text-[14px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatSGD(order.subtotalCents)}</dd></div>
          {order.discountCents > 0 && <div className="flex justify-between text-[#2e6b34]"><dt>Discount</dt><dd>−{formatSGD(order.discountCents)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{order.deliveryFeeCents === 0 ? "FREE" : formatSGD(order.deliveryFeeCents)}</dd></div>
          <div className="flex justify-between text-[18px] font-black"><dt>Total paid ({order.paymentMethod})</dt><dd>{formatSGD(order.totalCents)}</dd></div>
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/shop" className="rounded-full bg-[#0058a3] px-6 py-3 text-[14px] font-bold text-white">Keep shopping</Link>
        <Link href="/track-order" className="rounded-full border px-6 py-3 text-[14px] font-bold">Track this order</Link>
        <Link href="/services" className="rounded-full border px-6 py-3 text-[14px] font-bold">Add assembly service</Link>
      </div>
    </div>
  );
}

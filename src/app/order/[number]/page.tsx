import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ORDER_STEPS, formatSGD, orderStepIndex } from "@/lib/utils";
import { maskEmail } from "@/lib/mask";
import { storeName } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Belt-and-suspenders with robots.txt's /order/ disallow (Task 119 F-10): a
// disallowed URL can still enter the index URL-only if externally linked;
// this page-level noindex keeps the PII surface out of results wherever the
// crawler CAN read it. The pinned robots/sitemap policy itself is unchanged.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  let order = null;
  let items: typeof orderItems.$inferSelect[] = [];
  let outage = false;
  try {
    // Malformed percent-encoding (e.g. /order/%ZZ) throws URIError — decode
    // inside the guard so it lands in the friendly not-found state, not the
    // error boundary (Task 118 F-15).
    // Task 133 F-5: normalize like trackOrder() does (trim + uppercase) —
    // the order number is minted uppercase (NH-YYYYMMDD-XXXXXX), and a
    // hand-typed lowercase URL used to answer "We can't find that order"
    // for an order the tracking page found with the SAME input. Two
    // surfaces, one identifier, one discipline.
    const decoded = decodeURIComponent(number).trim().toUpperCase();
    const rows = await db.select().from(orders).where(eq(orders.orderNumber, decoded)).limit(1);
    order = rows[0] ?? null;
    if (order) items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  } catch (err) {
    // Task 120 F-14: a URIError is a malformed number (not-found below);
    // anything else means the DB itself could not answer — telling the
    // shopper their just-placed order "can't be found" would be a lie.
    if (!(err instanceof URIError)) outage = true;
  }

  // Task 122 F-4: the outage state is authoritative regardless of whether the
  // order row arrived — if the ITEMS query failed (pool exhaustion, connection
  // flake), rendering "Tak! Your order is confirmed" above an empty "Items (0)"
  // list is the most alarming possible read of a just-placed order. The
  // order-is-safe copy below is the honest answer for both query failures.
  if (!order || outage) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        {outage ? (
          <>
            <h1 className="text-[26px] font-black">We can&apos;t check orders right now</h1>
            <p className="mt-2 text-[#5b5b5b]">Your order is safe — the order service is not responding. Please try again in a moment.</p>
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-black">We can&apos;t find that order</h1>
            <p className="mt-2 text-[#5b5b5b]">Check the order number, or look it up with your email on the tracking page.</p>
          </>
        )}
        <Link href="/track-order" className="mt-6 inline-block rounded-full bg-[#0058a3] px-7 py-3 font-bold text-white">Track your order</Link>
      </div>
    );
  }

  const stepIdx = orderStepIndex(order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl bg-[#e8f3e9] p-8 text-center">
        <p className="text-[44px]" aria-hidden="true">✓</p>
        <h1 className="text-[clamp(1.6rem,4vw,2.4rem)] font-black">Tak! Your order is confirmed</h1>
        <p className="mt-2">Order <strong>{order.orderNumber}</strong> · <span>order summary for <strong>{maskEmail(order.email)}</strong></span></p>
        {/* Public by order number — street address and postal stay off this
            page; the full detail lives behind the email match on /track-order. */}
        <p className="mt-1 text-[14px] text-[#2e6b34]">{order.deliveryMethod === "click-collect" ? `Ready for pickup at NORDHEM ${storeName(order.storeSlug)} · ${order.deliverySlot}` : `Arriving ${order.deliverySlot}`}</p>
      </div>

      <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Order progress">
        {ORDER_STEPS.map((s, i) => (
          <li key={s} className={`rounded-xl p-3 text-center text-[13px] font-bold ${i <= stepIdx ? "bg-[#111] text-white" : "bg-[#f5f3ee] text-[#5b5b5b]"}`}>
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
              <span className="flex-1 text-[14px]"><strong>{i.name}</strong> <span className="text-[#5b5b5b]">× {i.qty}</span></span>
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

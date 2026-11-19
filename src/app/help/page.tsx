import Link from "next/link";

import { SITE_ORIGIN } from "@/lib/utils";
export const metadata = {
  title: "Help & contact",
  description:
    "How can we help? Answers on delivery fees, returns, promo codes and order tracking — plus phone and email contact for NORDHEM Singapore.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help & contact · NORDHEM Singapore",
    description: "How can we help? Delivery, returns, promo codes and tracking answers, plus phone and email contact.",
    type: "website",
    siteName: "NORDHEM Singapore",
    url: `${SITE_ORIGIN}/help`,
  },
};

const FAQS = [
  { q: "How much is delivery?", a: "Standard delivery (3–5 days) from $12, free over $200. Express next-day is $29. Click & Collect is always free and ready in about 2 hours." },
  { q: "Can I return assembled furniture?", a: "Yes — within 365 days with proof of purchase. Unopened flat-packs get a full refund; assembled pieces are assessed at our As-Is counter and refunded or exchanged on the spot." },
  { q: "Do you deliver to walk-up apartments and Sentosa?", a: "Yes, island-wide including walk-ups (a $10 stair-carry applies above level 3 without lift) and Sentosa (entry fees waived for our trucks on weekdays)." },
  { q: "Can I use more than one promo code?", a: "No — one promo code per order, applied to the goods subtotal before delivery fees. Codes never stack, and there are no separate member prices in this store." },
  { q: "Where are spare parts and screws?", a: "Free at any store's customer-service counter — bring the 6-digit article number from your manual. Hinges and runners carry up to 25-year warranties." },
  { q: "I lost my receipt — can I still track my order?", a: "Yes. Use Track order with your order number and email, or any store can reprint receipts from your Family card or payment card." },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#0058a3]">Help & contact</p>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,2.8rem)] font-black tracking-tight">How can we help?</h1>
      <div className="mt-6 space-y-2">
        {FAQS.map((f) => (
          <details key={f.q} className="rounded-xl ring-1 ring-[#ece8df]">
            <summary className="cursor-pointer p-4 font-bold">{f.q}</summary>
            <p className="px-4 pb-4 text-[14px] text-[#444]">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[["Track order", "Order number + email, online"], ["Call 6788 0600", "Daily 9am–9pm"], ["Stores", "Service counters till close"]].map(([a, b]) => (
          <div key={a} className="rounded-2xl bg-[#f5f3ee] p-5 text-center"><p className="font-black">{a}</p><p className="text-[13px] text-[#5b5b5b]">{b}</p></div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/track-order" className="rounded-full bg-[#0058a3] px-6 py-3 text-[14px] font-bold text-white">Track your order</Link>
        <Link href="/services" className="rounded-full border px-6 py-3 text-[14px] font-bold">Delivery & returns info</Link>
      </div>
    </div>
  );
}

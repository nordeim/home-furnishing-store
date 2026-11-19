import Link from "next/link";

import { EXPRESS_DELIVERY_FEE_CENTS, FREE_DELIVERY_THRESHOLD_CENTS, SITE_ORIGIN, STANDARD_DELIVERY_FEE_CENTS } from "@/lib/utils";
// Task 126 F-3: fee copy derives from the utils constants — a fee change is a
// one-line edit, not a ~10-site marketing sweep (the $-divided form keeps the
// marketing-string style "$12"/"$200", formatSGD is for money displays).
const STD = STANDARD_DELIVERY_FEE_CENTS / 100;
const FREE_OVER = FREE_DELIVERY_THRESHOLD_CENTS / 100;
const EXPRESS = EXPRESS_DELIVERY_FEE_CENTS / 100;
export const metadata = {
  title: "Services — delivery, assembly & planning",
  description:
    `We deliver, assemble, plan — you relax. Delivery from $${STD} island-wide, assembly from $25, free Click & Collect in 2 hours and a home design service from $190.`,
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Services — delivery, assembly & planning · NORDHEM Singapore",
    description: "We deliver, assemble, plan — you relax. Island-wide delivery, assembly and home design services.",
    type: "website",
    siteName: "NORDHEM Singapore",
    url: `${SITE_ORIGIN}/services`,
  },
};

const CARDS = [
  { t: "Delivery", price: `from $${STD} · free over $${FREE_OVER}`, d: "Evening and weekend slots island-wide, including walk-up apartments. Tracked delivery with a 2-hour window (demo storefront — no live SMS is sent).", points: [`Standard 3–5 days from $${STD}`, `Express next-day $${EXPRESS}`, `Free over $${FREE_OVER} (standard)`] },
  { t: "Assembly", price: "from $25 per item", d: "Certified crews assemble, level and anchor — and take every scrap of packaging away for recycling.", points: ["Wardrobes & kitchens our specialty", "Wall-anchoring included", "Re-assembly if you move (members)"] },
  { t: "Click & Collect", price: "free · ready in 2 hours", d: "Order online, collect at Tampines, Jurong or Alexandra. Drive-through bays — we load, you go.", points: ["Ready-in-2-hours promise", "21-day collection window", "Free trolley & rope loan"] },
  { t: "Home Design Service", price: "from $190 · redeemable", d: "A planner measures (or video-calls), draws 3D views and gives a shoppable list for one room or the whole flat.", points: ["BTO & resale specialists", "Lighting & paint advice", "Fee offsets your purchase"] },
  { t: "Kitchen planning", price: "free 45-min consult", d: "Bring your floor plan; leave with a 20 cm-grid kitchen layout, appliance list and fixed installation quote.", points: ["3D views in-session", "Countertop templating", "HDB permit guidance"] },
  { t: "Returns & Buy-back", price: "365-day returns", d: "Changed your mind within a year? Full refund with proof of purchase. Pre-loved furniture earns buy-back credit.", points: ["Free return for Family members* ", "Spare parts for 10 years", "Re-home via As-Is corners"] },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#0058a3]">Services</p>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,3rem)] font-black tracking-tight">We deliver, assemble, plan — you relax</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <article key={c.t} className="flex flex-col rounded-2xl p-6 ring-1 ring-[#ece8df]">
            <h2 className="text-[19px] font-black">{c.t}</h2>
            <p className="mt-0.5 text-[14px] font-bold text-[#0058a3]">{c.price}</p>
            <p className="mt-2 text-[14px] text-[#444]">{c.d}</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-[#5b5b5b]">
              {c.points.map((p) => <li key={p}>✓ {p}</li>)}
            </ul>
          </article>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/planning-tools" className="rounded-full bg-[#0058a3] px-7 py-3 font-bold text-white">Book a planning session</Link>
        <Link href="/track-order" className="rounded-full border px-7 py-3 font-bold">Track a delivery</Link>
      </div>
      <p className="mt-4 text-[12px] text-[#5b5b5b]">*Family-member free returns apply to unopened flat-packs within 365 days; opened items via As-Is assessment.</p>
    </div>
  );
}

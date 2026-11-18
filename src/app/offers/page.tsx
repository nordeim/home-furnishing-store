import Link from "next/link";
import { getAllProducts } from "@/lib/server-data";
import { formatSGD } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";
import { PROMOS } from "@/lib/catalog";
import { campaignEndLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Offers & Last chance",
  description:
    "Up to 24% off dining, decor and sleep across the NORDHEM catalogue — plus one promo code per order. Festive market offers refreshed with the season.",
  alternates: { canonical: "/offers" },
  openGraph: {
    title: "Offers & Last chance · NORDHEM Singapore",
    description: "Up to 24% off dining, decor and sleep — one promo code per order.",
    type: "website",
    siteName: "NORDHEM Singapore",
    url: "https://nordhem.sg/offers",
  },
};

export default async function OffersPage() {
  // Task 122 F-10: per-render, not module-load (see home page — a frozen
  // module value goes stale inside the Dec 29–31 window for long-lived pods).
  const CAMPAIGN_END = campaignEndLabel();
  const all = await getAllProducts();
  const deals = all.filter((p) => p.compareAtCents && p.compareAtCents > p.priceCents);
  const bundles = all.filter((p) => ["hdb-kitchen-trolley", "makan-extendable-table", "tampines-storage-bed"].includes(p.slug));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="inline-block rounded-full bg-[#cc0008] px-3 py-1 text-[12px] font-black uppercase tracking-[0.12em] text-white">Ends {CAMPAIGN_END}</p>
      <h1 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] font-black tracking-tight">Festive market offers</h1>
      <p className="mt-2 text-[#5b5b5b]">Up to 24% off lighting, decor and everyday essentials — plus a promo code below (one code per order).</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {PROMOS.map((p) => (
          <div key={p.code} className="rounded-2xl border-2 border-dashed border-[#0058a3] bg-[#f0f6fc] p-5">
            <p className="text-[22px] font-black tracking-tight text-[#0058a3]">{p.code}</p>
            <p className="mt-1 text-[14px]">{p.label}</p>
            <Link href="/cart" className="mt-3 inline-block rounded-full bg-[#0058a3] px-5 py-2 text-[13px] font-bold text-white">Use in bag →</Link>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-[22px] font-black">Discounted now ({deals.length})</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {deals.map((p) => <ProductCard key={p.id} p={{ ...p, ratingAvg: String(p.ratingAvg) }} />)}
      </div>

      <div className="mt-10 rounded-2xl bg-[#111] p-8 text-white">
        <h2 className="text-[22px] font-black">First-home starter kit</h2>
        <p className="mt-1 text-white/75">Bed + extendable table + kitchen trolley — our first-home picks. Pair the set with code <strong className="text-[#ffdb00]">FLAT20</strong> for $20 off orders over $250.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[14px]">
          {bundles.map((b) => <span key={b.id} className="rounded-full bg-white/10 px-4 py-2">{b.name} · {formatSGD(b.priceCents)}</span>)}
        </div>
        <Link href="/shop" className="mt-5 inline-block rounded-full bg-[#ffdb00] px-6 py-3 text-[14px] font-black text-black">Shop the picks →</Link>
      </div>
    </div>
  );
}

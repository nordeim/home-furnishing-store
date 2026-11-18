import Link from "next/link";
import { getAllProducts } from "@/lib/server-data";
import { formatSGD } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";
import { PROMOS } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offers & Last chance" };

export default async function OffersPage() {
  const all = await getAllProducts();
  const deals = all.filter((p) => p.compareAtCents && p.compareAtCents > p.priceCents);
  const bundles = all.filter((p) => ["hdb-kitchen-trolley", "makan-extendable-table", "tampines-storage-bed"].includes(p.slug));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="inline-block rounded-full bg-[#cc0008] px-3 py-1 text-[12px] font-black uppercase tracking-[0.12em] text-white">Ends 28 Dec</p>
      <h1 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] font-black tracking-tight">Festive market offers</h1>
      <p className="mt-2 text-[#5b5b5b]">Up to 30% off dining, decor and sleep — plus stackable promo codes below.</p>

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
        {deals.map((p, i) => <ProductCard key={p.id} p={{ ...p, ratingAvg: String(p.ratingAvg) }} index={i} />)}
      </div>

      <div className="mt-10 rounded-2xl bg-[#111] p-8 text-white">
        <h2 className="text-[22px] font-black">Bundle & save: the first-home starter kit</h2>
        <p className="mt-1 text-white/75">Bed + extendable table + kitchen trolley — use code <strong className="text-[#ffdb00]">FLAT20</strong> for an extra $20 off $250.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[14px]">
          {bundles.map((b) => <span key={b.id} className="rounded-full bg-white/10 px-4 py-2">{b.name} · {formatSGD(b.priceCents)}</span>)}
        </div>
        <Link href="/shop" className="mt-5 inline-block rounded-full bg-[#ffdb00] px-6 py-3 text-[14px] font-black text-black">Build your bundle →</Link>
      </div>
    </div>
  );
}

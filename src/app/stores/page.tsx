import Link from "next/link";
import { STORES } from "@/lib/catalog";

export const metadata = { title: "Our stores" };

export default function StoresPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#0058a3]">Visit us</p>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,3rem)] font-black tracking-tight">Three stores, one island</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {STORES.map((s) => (
          <article key={s.slug} className="overflow-hidden rounded-2xl ring-1 ring-[#ece8df]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.imageUrl} alt={s.name} loading="lazy" className="aspect-[16/9] w-full object-cover" />
            <div className="p-6">
              <h2 className="text-[20px] font-black">{s.name}</h2>
              <p className="mt-1 text-[14px] text-[#444]">{s.address}</p>
              <p className="mt-1 text-[14px] font-bold text-[#0058a3]">{s.hours}</p>
              <p className="mt-1 text-[14px] text-[#5b5b5b]">{s.phone}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold">
                <span className="rounded-full bg-[#f5f3ee] px-3 py-1.5">Restaurant</span>
                <span className="rounded-full bg-[#f5f3ee] px-3 py-1.5">Småland play</span>
                <span className="rounded-full bg-[#f5f3ee] px-3 py-1.5">As-Is corner</span>
                <span className="rounded-full bg-[#f5f3ee] px-3 py-1.5">Click & Collect drive-through</span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-2xl bg-[#0058a3] p-8 text-white">
        <h2 className="text-[20px] font-black">Getting here is half the fun</h2>
        <p className="mt-1 text-white/80">Free shuttle weekends from Tampines, Boon Lay & Woodlands interchanges · Free parking for Family members · Nearest MRT listed on each store card above.</p>
        <Link href="/food" className="mt-4 inline-block rounded-full bg-[#ffdb00] px-6 py-3 text-[14px] font-black text-black">See the restaurant menu →</Link>
      </div>
    </div>
  );
}

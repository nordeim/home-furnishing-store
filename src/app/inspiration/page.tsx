import Link from "next/link";
import { getInspirations } from "@/lib/server-data";
import { formatSGD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Room inspiration & ideas" };

export default async function InspirationPage() {
  const list = await getInspirations();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#2e6b34]">Ideas & inspiration</p>
      <h1 className="mt-1 text-[clamp(1.8rem,4vw,2.8rem)] font-black tracking-tight">Real Singapore homes, shoppable rooms</h1>
      <p className="mt-2 max-w-2xl text-[#5b5b5b]">BTOs, condos and rentals styled with the NORDHEM range. Open any home to shop the exact pieces with live prices and stock.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <Link key={r.slug} href={`/inspiration/${r.slug}`} className="group overflow-hidden rounded-2xl bg-white ring-1 ring-[#ece8df] hover:shadow-xl focus-ring">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.imageUrl} alt={r.title} loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
            <span className="block p-5">
              <span className="text-[12px] font-black uppercase tracking-wide text-[#0058a3]">{r.room}</span>
              <span className="mt-1 block text-[18px] font-black leading-snug">{r.title}</span>
              <span className="mt-2 block text-[14px] text-[#5b5b5b]">{r.description}</span>
              <span className="mt-3 flex items-center justify-between text-[14px]">
                <span className="font-black">Shop this room · {formatSGD(r.budgetCents)}</span>
                <span className="rounded-full bg-[#ffdb00] px-3 py-1 font-bold">→</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

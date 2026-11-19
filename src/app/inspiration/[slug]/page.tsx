import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getInspirations } from "@/lib/server-data";
import { formatSGD, SITE_ORIGIN } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";
import type { ProductRow } from "@/lib/server-data";

export const dynamic = "force-dynamic";

const SITE = SITE_ORIGIN;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const list = await getInspirations();
  const room = list.find((r) => r.slug === slug);
  if (!room) return { title: "Room story not found" };
  return {
    title: room.title,
    description: room.description,
    alternates: { canonical: `/inspiration/${room.slug}` },
    openGraph: {
      title: room.title,
      description: room.description,
      type: "website",
      siteName: "NORDHEM Singapore",
      url: `${SITE}/inspiration/${room.slug}`,
      images: [{ url: room.imageUrl, alt: room.title }],
    },
  };
}

export default async function InspirationDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getInspirations();
  const room = list.find((r) => r.slug === slug);
  if (!room) notFound();
  const all = await getAllProducts();
  const pieces = room.productSlugs
    .map((s) => all.find((p) => p.slug === s))
    .filter((p): p is ProductRow => !!p);
  const total = pieces.reduce((a, p) => a + p.priceCents, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="text-[13px] text-[#5b5b5b]" aria-label="Breadcrumb"><Link href="/inspiration" className="hover:underline">Inspiration</Link> · <span className="font-semibold text-black">{room.title}</span></nav>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={room.imageUrl} alt={room.title} className="aspect-[4/3] w-full rounded-2xl object-cover" fetchPriority="high" />
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#0058a3]">{room.room}</p>
          <h1 className="mt-1 text-[clamp(1.7rem,3.5vw,2.6rem)] font-black tracking-tight">{room.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#444]">{room.description}</p>
          <dl className="mt-5 grid grid-cols-4 gap-3 text-center">
            {/* Task 119 F-4: both figures, honestly labelled — the room budget is
              the editorial planning figure; the pieces total is the sum of the
              listed products (they used to share one contradictory label). */}
            {[["Floor area", `${room.sqm} sqm`], ["Room budget", formatSGD(room.budgetCents)], ["These pieces", formatSGD(total)], ["Pieces", String(pieces.length)]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[#f5f3ee] p-3"><dt className="text-[12px] text-[#5b5b5b]">{k}</dt><dd className="font-black">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-5 flex gap-3">
            <Link href="/planning-tools" className="rounded-full bg-[#111] px-6 py-3 text-[14px] font-bold text-white">Book this look with a planner</Link>
            <Link href="/shop" className="rounded-full border px-6 py-3 text-[14px] font-bold">Shop similar</Link>
          </div>
        </div>
      </div>
      <h2 className="mt-10 text-[22px] font-black">Shop this room</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {pieces.map((p) => <ProductCard key={p.id} p={{ ...p, ratingAvg: String(p.ratingAvg) }} />)}
      </div>
    </div>
  );
}

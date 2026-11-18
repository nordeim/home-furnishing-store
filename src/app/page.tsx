import Link from "next/link";
import type { Metadata } from "next";
import { getAllProducts, getInspirations } from "@/lib/server-data";
import { campaignEndLabel } from "@/lib/utils";
import { CATEGORIES, STORES } from "@/lib/catalog";
import { formatSGD } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

// The campaign banner's end date is computed, not hardcoded (Task 119 F-21) —
// and rolls forward inside the Dec 29–31 window instead of advertising a
// already-past date (Task 121 F-19; the pure seam is unit-pinned in utils).
// Hero price derives from the loaded catalogue (Task 119 F-13): the hero card
// previously hard-coded 79900 — a catalogue edit would have made the hero
// contradict the PDP it links to.
const HERO_SLUG = "makan-extendable-table";

// Task 119: the home page previously shipped only the root layout's default
// title — a sitemap-indexed storefront root warrants its own claim.
export const metadata: Metadata = {
  title: {
    absolute: "NORDHEM Singapore — Scandinavian furniture, beds, dining & more",
  },
  description:
    "Shop Scandinavian-designed furniture for Singapore homes — 24 products across 8 room categories with island-wide delivery, free Click & Collect at Tampines, Jurong and Alexandra, and 365-day returns. Prices include 9% GST.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NORDHEM Singapore — Scandinavian furniture, beds, dining & more",
    description:
      "Scandinavian-designed furniture for Singapore homes — island-wide delivery, free Click & Collect, 365-day returns.",
    type: "website",
    siteName: "NORDHEM Singapore",
    url: "https://nordhem.sg/",
    // Task 121 F-18: products always shipped og:image; the most-shared page
    // on the site shipped none. The hero's licensed Pexels frame.
    images: [{ url: "https://images.pexels.com/photos/7546218/pexels-photo-7546218.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" }],
  },
};

export default async function HomePage() {
  const [all, inspo] = await Promise.all([getAllProducts(), getInspirations()]);
  const best = all.filter((p) => p.isBestseller).slice(0, 8);
  const fresh = all.filter((p) => p.isNew).slice(0, 4);
  const deals = all.filter((p) => p.compareAtCents && p.compareAtCents > p.priceCents).slice(0, 4);
  // Task 122 F-10: computed per render, not at module load — the module-init
  // value froze for the process lifetime, so a server started Dec 20 kept
  // advertising "ends 28 Dec" on Dec 30 (force-dynamic re-runs this component
  // every request; the pure function is cheap).
  const CAMPAIGN_END = campaignEndLabel();

  return (
    <div>
      {/* Hero — editorial split, IKEA-style campaign banner */}
      <section className="bg-[#0058a3] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-16">
          <div className="reveal-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#ffdb00] px-3 py-1 text-[12px] font-black uppercase tracking-[0.1em] text-black">
              Festive market · ends {CAMPAIGN_END}
            </p>
            <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.8rem)] font-black leading-[1.02] tracking-tight">
              A merrier home starts with makan-ready spaces
            </h1>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-white/85">
              {/* Task 122 F-19: the catalogue max discount (24%) is the NORDLYS
                  floor lamp — attribute the headline to what actually carries
                  it (the old copy led with extendable dining tables, the one
                  discounted-set member with NO deal). */}
              Up to 24% off lighting, cookware and home favourites —
              plus free Click &amp; Collect at Tampines, Jurong and Alexandra.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/offers" className="rounded-full bg-[#ffdb00] px-7 py-3.5 text-[15px] font-black text-black hover:bg-white focus-ring">
                Shop festive offers
              </Link>
              <Link href="/inspiration" className="rounded-full border-2 border-white/70 px-7 py-3 text-[15px] font-bold hover:bg-white/10 focus-ring">
                Explore real homes
              </Link>
            </div>
            <dl className="mt-8 flex gap-8 text-[13px] text-white/80">
              <div><dt className="text-[22px] font-black text-white">365</dt><dd>day returns</dd></div>
              <div><dt className="text-[22px] font-black text-white">$200+</dt><dd>free delivery</dd></div>
              <div><dt className="text-[22px] font-black text-white">3</dt><dd>SG stores</dd></div>
            </dl>
          </div>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.pexels.com/photos/7546218/pexels-photo-7546218.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"
              alt="Festive dining room with extendable table and pendant lights"
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl"
              fetchPriority="high"
            />
            <Link href="/product/makan-extendable-table" className="absolute bottom-4 left-4 flex items-center gap-3 rounded-xl bg-white/95 p-3 pr-5 shadow-lg backdrop-blur hover:bg-white focus-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.pexels.com/photos/3773579/pexels-photo-3773579.png?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" alt="" className="h-12 w-12 rounded-lg object-cover" />
              <span>
                <span className="block text-[13px] font-bold">MAKAN extendable table</span>
                {/* Task 121 F-18: the fallback re-hardcoded the exact magic
                    number the Task-119 fix removed — if the hero product ever
                    leaves the catalogue the card links without a price rather
                    than quoting one the PDP would contradict. */}
                <span className="block text-[13px] text-[#0058a3] font-bold">{all.find((p) => p.slug === HERO_SLUG) ? `${formatSGD(all.find((p) => p.slug === HERO_SLUG)!.priceCents)} · ` : ""}Shop now →</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Happening now strip */}
      <section className="border-b border-[#eee] bg-white">
        <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 py-4 no-scrollbar sm:px-6">
          {[
            { t: "NORDHEM Family — members get more", h: "/family", c: "bg-[#ffdb00]" },
            { t: "Business? Get a quote in 5 minutes", h: "/business", c: "bg-[#0058a3] text-white" },
            { t: "Swedish Restaurant festive menu", h: "/food", c: "bg-[#2e6b34] text-white" },
            { t: "Buy-back & re-home pre-loved furniture", h: "/sustainability", c: "bg-[#111] text-white" },
          ].map((x) => (
            <Link key={x.t} href={x.h} className={`shrink-0 rounded-full px-5 py-2.5 text-[14px] font-bold ${x.c} focus-ring`}>{x.t} →</Link>
          ))}
        </div>
      </section>

      {/* Shop by room */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#0058a3]">Shop by room</p>
            <h2 className="mt-1 text-[clamp(1.5rem,3vw,2.2rem)] font-black tracking-tight">Every corner, covered</h2>
          </div>
          <Link href="/shop" className="hidden rounded-full border px-5 py-2.5 text-[14px] font-bold hover:bg-[#f5f3ee] sm:block focus-ring">Shop all →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/shop?cat=${c.slug}`} className="group relative overflow-hidden rounded-xl focus-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt={c.name} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105 sm:aspect-[3/3.4]" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
              <span className="absolute bottom-0 p-4 text-white">
                <span className="block text-[17px] font-black">{c.name}</span>
                <span className="block text-[13px] text-white/80">{c.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="bg-[#f7f5f0]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#b5502a]">Loved island-wide</p>
              <h2 className="mt-1 text-[clamp(1.5rem,3vw,2.2rem)] font-black tracking-tight">Bestsellers right now</h2>
            </div>
            <Link href="/shop?sort=popular" className="rounded-full bg-[#111] px-5 py-2.5 text-[14px] font-bold text-white hover:bg-[#0058a3] focus-ring">View all →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {best.map((p) => (
              <ProductCard key={p.id} p={{ ...p, ratingAvg: String(p.ratingAvg) }} />
            ))}
          </div>
        </div>
      </section>

      {/* Design service feature — mirrors "Home design service" */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid overflow-hidden rounded-2xl bg-[#111] text-white lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#ffdb00]">NORDHEM Home Design Service</p>
            <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-black leading-tight">A 2-room Flexi BTO that feels like a hug</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">
              Our planners turned a 47 sqm Tampines flat into a calm, low-maintenance retreat —
              washable fabrics, reachable storage, one warm pendant. From $190 including 3D views.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/planning-tools" className="rounded-full bg-[#ffdb00] px-6 py-3 text-[14px] font-black text-black hover:bg-white focus-ring">Book a planner</Link>
              <Link href="/inspiration/2-room-flexi-bto-tampines" className="rounded-full border border-white/40 px-6 py-3 text-[14px] font-bold hover:bg-white/10 focus-ring">Tour this home</Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.pexels.com/photos/6492391/pexels-photo-6492391.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" alt="Calm 2-room Flexi BTO living space" loading="lazy" className="h-72 w-full object-cover lg:h-full" />
        </div>
      </section>

      {/* New + deals split */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-[#0058a3] p-8 text-white">
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#ffdb00]">Just landed</p>
            <h2 className="mt-1 text-[24px] font-black">New shapes for small flats</h2>
            <div className="mt-4 space-y-3">
              {fresh.map((p) => (
                <Link key={p.id} href={`/product/${p.slug}`} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 hover:bg-white/20 focus-ring">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrls[0]} alt="" className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                  <span className="flex-1"><span className="block text-[14px] font-bold">{p.name}</span><span className="text-[13px] text-white/75">{p.tagline}</span></span>
                  <span className="font-black">{formatSGD(p.priceCents)}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-[#ffdb00] p-8">
            <p className="text-[12px] font-black uppercase tracking-[0.16em]">Last chance</p>
            <h2 className="mt-1 text-[24px] font-black">Deals disappearing daily</h2>
            <div className="mt-4 space-y-3">
              {deals.map((p) => (
                <Link key={p.id} href={`/product/${p.slug}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm hover:shadow focus-ring">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrls[0]} alt="" className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                  <span className="flex-1"><span className="block text-[14px] font-bold">{p.name}</span><span className="text-[13px] text-[#5b5b5b] line-through">{p.compareAtCents ? formatSGD(p.compareAtCents) : ""}</span></span>
                  <span className="font-black text-[#b5502a]">{formatSGD(p.priceCents)}</span>
                </Link>
              ))}
            </div>
            <Link href="/offers" className="mt-4 inline-block rounded-full bg-black px-6 py-3 text-[14px] font-bold text-white hover:bg-[#333] focus-ring">All offers →</Link>
          </div>
        </div>
      </section>

      {/* Room inspiration */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#2e6b34]">Ideas & inspiration</p>
            <h2 className="mt-1 text-[clamp(1.5rem,3vw,2.2rem)] font-black tracking-tight">Real Singapore homes</h2>
          </div>
          <Link href="/inspiration" className="hidden rounded-full border px-5 py-2.5 text-[14px] font-bold hover:bg-[#f5f3ee] sm:block focus-ring">All ideas →</Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {inspo.slice(0, 3).map((r) => (
            <Link key={r.slug} href={`/inspiration/${r.slug}`} className="group overflow-hidden rounded-xl bg-white ring-1 ring-[#ece8df] hover:shadow-lg focus-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.imageUrl} alt={r.title} loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
              <span className="block p-4">
                <span className="text-[12px] font-bold uppercase tracking-wide text-[#0058a3]">{r.room}</span>
                <span className="mt-1 block text-[16px] font-black leading-snug">{r.title}</span>
                <span className="mt-1 block text-[13px] text-[#5b5b5b]">From {formatSGD(r.budgetCents)} · {r.sqm} sqm</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Services band */}
      <section className="bg-[#111] text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-4">
          {[
            { t: "Delivery from $12", d: "Free over $200. Slots incl. evenings & weekends.", h: "/services" },
            { t: "Assembly from $25", d: "Certified crews, packaging taken away.", h: "/services" },
            { t: "Click & Collect in 2 hrs", d: "Free at all 3 stores. We load your car.", h: "/stores" },
            { t: "365-day returns", d: "Changed your mind? No drama, full refund.", h: "/help" },
          ].map((s) => (
            <Link key={s.t} href={s.h} className="rounded-xl bg-white/5 p-5 hover:bg-white/10 focus-ring">
              <span className="block text-[17px] font-black">{s.t}</span>
              <span className="mt-1 block text-[14px] text-white/70">{s.d}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stores */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-[clamp(1.5rem,3vw,2.2rem)] font-black tracking-tight">Visit us island-wide</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STORES.map((s) => (
            <Link key={s.slug} href="/stores" className="overflow-hidden rounded-xl bg-white ring-1 ring-[#ece8df] hover:shadow-lg focus-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.imageUrl} alt={s.name} loading="lazy" className="aspect-[16/9] w-full object-cover" />
              <span className="block p-4">
                <span className="block text-[16px] font-black">{s.name}</span>
                <span className="mt-1 block text-[13px] text-[#5b5b5b]">{s.address}</span>
                <span className="mt-1 block text-[13px] font-bold text-[#0058a3]">{s.hours}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getInventory, getProductBySlug, getReviews } from "@/lib/server-data";
import { formatSGD, stars, visibleBadges } from "@/lib/utils";
import { CATEGORIES } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { BuyBox } from "@/components/BuyBox";
import { ReviewSection } from "@/components/ReviewSection";

export const dynamic = "force-dynamic";

const SITE = "https://nordhem.sg";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  return {
    title: `${p.name} — ${p.tagline}`,
    description: p.description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      title: `${p.name} — ${p.tagline}`,
      description: p.description,
      type: "website",
      siteName: "NORDHEM Singapore",
      url: `${SITE}/product/${p.slug}`,
      images: [{ url: p.imageUrls[0], alt: p.name }],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const [stock, reviews, all] = await Promise.all([getInventory(p.id), getReviews(p.id), getAllProducts()]);
  const related = all.filter((x) => x.categorySlug === p.categorySlug && x.id !== p.id).slice(0, 4);
  // Breadcrumb label uses the category's display name, not the raw slug
  // (Task 119 F-16: "living" → "Living room"; CATEGORIES is the single map).
  const categoryName = CATEGORIES.find((c) => c.slug === p.categorySlug)?.name ?? p.categorySlug;
  const discount = p.compareAtCents && p.compareAtCents > p.priceCents
    ? Math.round(((p.compareAtCents - p.priceCents) / p.compareAtCents) * 100)
    : 0;
  // Shared star seam: a 4.5 renders 4 full + a faded half, not 5 full stars
  // while the aria-label truthfully says 4.5 (Task 118 F-14).
  const ratingStars = stars(parseFloat(String(p.ratingAvg)));
  // Availability truth is the SAME live per-store inventory rows the BuyBox
  // renders (Task 119 F-3): products.stockTotal is a seed figure no order ever
  // decrements, so deriving from it let the structured data claim InStock
  // while every store honestly showed none. When inventory data is
  // unavailable (degrade path — empty rows), NO availability claim is made
  // rather than asserting a state the page cannot know.
  const availableQty = stock.reduce((a, s) => a + s.quantity, 0);

  // schema.org Product structured data — server-controlled catalogue values
  // only; `<` is escaped so no string can break out of the script element.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.sku,
    image: p.imageUrls,
    brand: { "@type": "Brand", name: "NORDHEM" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(p.ratingAvg),
      reviewCount: p.ratingCount,
    },
    offers: {
      "@type": "Offer",
      url: `${SITE}/product/${p.slug}`,
      priceCurrency: "SGD",
      price: (p.priceCents / 100).toFixed(2),
      ...(stock.length > 0
        ? { availability: availableQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" }
        : {}),
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="text-[13px] text-[#5b5b5b]">
        <Link href="/" className="hover:underline">Home</Link> ·{" "}
        <Link href={`/shop?cat=${p.categorySlug}`} className="hover:underline">{categoryName}</Link> ·{" "}
        <span className="font-semibold text-black">{p.name}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-2xl bg-[#f5f3ee]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrls[0]} alt={p.name} className="aspect-[4/3] w-full object-cover" fetchPriority="high" />
          </div>
          {p.imageUrls.length > 1 && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {p.imageUrls.slice(0, 3).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`${p.name} view ${i + 1}`} loading="lazy" className="aspect-[4/3] rounded-xl object-cover ring-1 ring-[#ece8df]" />
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[13px]">
            {[["Flat-pack", "Fits any lift"], ["Assembly", "from $25"], ["365-day", "returns"]].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-[#f5f3ee] p-3">
                <p className="font-black text-[15px]">{a}</p><p className="text-[#5b5b5b]">{b}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            {p.isNew && <span className="rounded-full bg-[#0058a3] px-3 py-1 text-[12px] font-bold text-white">NEW</span>}
            {discount > 0 && <span className="rounded-full bg-[#cc0008] px-3 py-1 text-[12px] font-bold text-white">-{discount}% NOW</span>}
            {visibleBadges(p.badges, { isNew: p.isNew, discountPercent: discount }).map((b) => (
              <span key={b} className="rounded-full bg-[#ffdb00] px-3 py-1 text-[12px] font-bold">{b}</span>
            ))}
          </div>
          <h1 className="mt-2 text-[clamp(1.7rem,3.5vw,2.6rem)] font-black tracking-tight">{p.name}</h1>
          <p className="mt-1 text-[16px] text-[#5b5b5b]">{p.tagline}</p>
          <p className="mt-2 text-[14px]" aria-label={`Rated ${p.ratingAvg} from ${p.ratingCount} reviews`}>
            <span className="text-[#e5a000]" aria-hidden="true">
              {"★".repeat(ratingStars.full)}
              {ratingStars.half && <span className="text-[#e5a000]/40">★</span>}
              {"☆".repeat(ratingStars.empty)}
            </span>{" "}
            <span className="font-bold">{String(p.ratingAvg)}</span> · <a href="#reviews" className="text-[#0058a3] underline">{p.ratingCount} reviews</a> · SKU {p.sku}
          </p>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="text-[34px] font-black tracking-tight">{formatSGD(p.priceCents)}</p>
            {p.compareAtCents && p.compareAtCents > p.priceCents && (
              <p className="text-[17px] text-[#5b5b5b] line-through">{formatSGD(p.compareAtCents)}</p>
            )}
          </div>
          <p className="text-[13px] text-[#5b5b5b]">Price includes 9% GST · or 3 interest-free payments from {formatSGD(Math.floor(p.priceCents / 3))}</p>

          <p className="mt-5 text-[15px] leading-relaxed">{p.description}</p>

          <div className="mt-4 rounded-xl bg-[#f5f3ee] p-4 text-[14px]">
            <p><strong>Materials:</strong> {p.materials}</p>
            <p className="mt-1"><strong>Dimensions:</strong> {p.dimensions}</p>
            <p className="mt-1"><strong>Colours:</strong> {p.colors.join(" · ")}</p>
          </div>

          <BuyBox
            product={{ productId: p.id, slug: p.slug, name: p.name, sku: p.sku, imageUrl: p.imageUrls[0] ?? "", unitPriceCents: p.priceCents }}
            stock={stock.map((s) => ({ storeSlug: s.storeSlug, quantity: s.quantity, aisleBin: s.aisleBin }))}
          />

          <details className="mt-4 rounded-xl ring-1 ring-[#ece8df]">
            <summary className="cursor-pointer p-4 font-bold">Product details & care</summary>
            <p className="px-4 pb-4 text-[14px] leading-relaxed text-[#444]">{p.details} Wipe clean with a damp cloth. Fittings included; tools sold separately.</p>
          </details>
          <details className="mt-2 rounded-xl ring-1 ring-[#ece8df]">
            <summary className="cursor-pointer p-4 font-bold">Delivery, assembly & returns</summary>
            <p className="px-4 pb-4 text-[14px] leading-relaxed text-[#444]">
              Delivery from $12 (free over $200) · Express next-day $29 · Click &amp; Collect free in 2 hours ·
              Assembly from $25 · 365-day returns with proof of purchase.
            </p>
          </details>
        </div>
      </div>

      <ReviewSection
        productId={p.id}
        initial={reviews.map((r) => ({ id: r.id, author: r.author, rating: r.rating, title: r.title ?? "", body: r.body ?? "", verified: r.verified, createdAt: String(r.createdAt) }))}
      />

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[22px] font-black">Pairs well with</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={{ ...r, ratingAvg: String(r.ratingAvg) }} />)}
          </div>
        </section>
      )}
    </div>
  );
}

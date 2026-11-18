import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const cat = url.searchParams.get("cat") ?? "all";
    const sort = url.searchParams.get("sort") ?? "featured";
    const max = Number(url.searchParams.get("max") ?? "0");

    let list = await getAllProducts();
    if (cat !== "all") list = list.filter((p) => p.categorySlug === cat);
    if (q) list = list.filter((p) => `${p.name} ${p.tagline} ${p.description} ${p.sku}`.toLowerCase().includes(q));
    if (max > 0) list = list.filter((p) => p.priceCents <= max * 100);

    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.priceCents - b.priceCents);
    else if (sort === "price-desc") sorted.sort((a, b) => b.priceCents - a.priceCents);
    else if (sort === "rating") sorted.sort((a, b) => parseFloat(String(b.ratingAvg)) - parseFloat(String(a.ratingAvg)));
    else if (sort === "popular") sorted.sort((a, b) => b.ratingCount - a.ratingCount);
    else if (sort === "new") sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew));

    return NextResponse.json({ ok: true, data: sorted });
  } catch (err) {
    console.error("[api/products]", err);
    return NextResponse.json({ ok: false, error: { code: "PRODUCTS_FAILED", message: "Could not load products." } }, { status: 500 });
  }
}

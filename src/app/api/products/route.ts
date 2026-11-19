import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/server-data";
import { matchesProductQuery } from "@/lib/catalog";
import { sortProductList } from "@/lib/utils";

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
    // Task 123 F-5 + Task 124 F-12: the keyword filter IS the
    // searchProducts seam — both consume matchesProductQuery (categorySlug
    // included; one recall definition). The API used to match
    // name/tagline/description/sku only, so q=outdoor returned 0 while the
    // shop SSR grid returned the two outdoor-category products.
    if (q) list = list.filter((p) => matchesProductQuery(p, q));
    if (max > 0) list = list.filter((p) => p.priceCents <= max * 100);

    // Display sort lives in the shared sortProductList seam (Task 121 F-17)
    // — the shop page's SSR path renders the identical order.
    return NextResponse.json({ ok: true, data: sortProductList(list, sort) });
  } catch (err) {
    console.error("[api/products]", err);
    return NextResponse.json({ ok: false, error: { code: "PRODUCTS_FAILED", message: "Could not load products." } }, { status: 500 });
  }
}

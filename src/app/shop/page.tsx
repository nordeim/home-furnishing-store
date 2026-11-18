import { searchProducts } from "@/lib/server-data";
import { sortProductList } from "@/lib/utils";
import { ShopInner } from "./shop-inner";

export const dynamic = "force-dynamic";

// Task 121 F-17: the shop listing was a client-fetch island — its
// sitemap-indexed URL served an empty grid to non-JS crawlers and link
// unfurlers. The server component now ships the initial (cat/sort-filtered)
// grid in the HTML; the client takes over for interactive filtering.
// Degrade, Never Fail holds: searchProducts falls back to the static
// catalogue when Postgres is unreachable.
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const cat = typeof params.cat === "string" ? params.cat : "all";
  const sort = typeof params.sort === "string" ? params.sort : "featured";
  const items = sortProductList(await searchProducts("", cat), sort).map((p) => ({
    ...p,
    ratingAvg: String(p.ratingAvg),
  }));
  // No Suspense boundary: it only existed for the useSearchParams CSR
  // bailout, and a streamed Suspense payload lands in a <div hidden> that
  // only JavaScript can reveal — defeating the whole point for no-JS
  // crawlers. With the params read server-side, the grid renders inline.
  return <ShopInner initial={{ items, cat, sort }} />;
}

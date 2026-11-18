import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CATEGORIES, PRODUCTS } from "@/lib/catalog";

// The /shop page is a server component that SSRs the filtered grid (Task 121
// F-17) with an interactive client inner (ShopInner) for filter/sort changes.
// This layout stays the server surface carrying its SEO metadata (Task 119
// F-1: the page is sitemap-indexed and previously published only the layout
// default title).
// Task 122 F-13: the counts are DERIVED from the catalogue constants, not
// hardcoded — a catalogue edit must never leave the metadata quoting a stale
// total (the drift class the home page's "24 products" line hunts).
export const metadata: Metadata = {
  title: "Shop all furniture",
  description:
    `Browse the full NORDHEM catalogue: ${PRODUCTS.length} furniture and furnishing products across ${CATEGORIES.length} room categories — living, bedroom, dining, kitchen, workspace, kids, outdoor and decor. Filter by room, keyword and price, sort by rating, price or popularity — prices include 9% GST, free delivery over $200.`,
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop all furniture · NORDHEM Singapore",
    description:
      `Browse ${PRODUCTS.length} furniture and furnishing products across ${CATEGORIES.length} room categories — filter by room, keyword and price.`,
    type: "website",
    siteName: "NORDHEM Singapore",
    url: "https://nordhem.sg/shop",
  },
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return children;
}

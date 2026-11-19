import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CATEGORIES, PRODUCTS } from "@/lib/catalog";

import { SITE_ORIGIN, GST_RATE, FREE_DELIVERY_THRESHOLD_CENTS } from "@/lib/utils";
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
  // Task 125 F-12: the category-name enumeration derives too — a rename or a
  // ninth category must not leave the prose contradicting its own counts.
  description:
    `Browse the full NORDHEM catalogue: ${PRODUCTS.length} furniture and furnishing products across ${CATEGORIES.length} room categories — ${CATEGORIES.map((c) => c.name.toLowerCase()).join(", ")}. Filter by room, keyword and price, sort by rating, price or popularity — prices include ${Math.round(GST_RATE * 100)}% GST, free delivery over $${FREE_DELIVERY_THRESHOLD_CENTS / 100}.`,
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop all furniture · NORDHEM Singapore",
    description:
      `Browse ${PRODUCTS.length} furniture and furnishing products across ${CATEGORIES.length} room categories — filter by room, keyword and price.`,
    type: "website",
    siteName: "NORDHEM Singapore",
    url: `${SITE_ORIGIN}/shop`,
  },
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return children;
}

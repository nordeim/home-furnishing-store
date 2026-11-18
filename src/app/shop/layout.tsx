import type { Metadata } from "next";
import type { ReactNode } from "react";

// The /shop page itself is a client component (interactive filters) — a route
// layout is the server surface that carries its SEO metadata (Task 119 F-1:
// the page is sitemap-indexed but previously published only the layout default
// title, and its SSR HTML carried no product content).
export const metadata: Metadata = {
  title: "Shop all furniture",
  description:
    "Browse the full NORDHEM catalogue: 24 furniture and furnishing products across living room, bedroom, dining, kitchen, workspace, kids, outdoor and decor. Filter by room, price and rating — prices include 9% GST, free delivery over $200.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop all furniture · NORDHEM Singapore",
    description:
      "Browse 24 furniture and furnishing products across 8 room categories — filter by room, price and rating.",
    type: "website",
    siteName: "NORDHEM Singapore",
    url: "https://nordhem.sg/shop",
  },
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return children;
}

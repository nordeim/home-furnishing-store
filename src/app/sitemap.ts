import type { MetadataRoute } from "next";
import { PRODUCTS, INSPIRATIONS } from "@/lib/catalog";

// Indexable static routes only. Cart/checkout/track-order/wishlist/search are
// robots-disallowed utility surfaces (see robots.ts) and never belong in a
// sitemap; /order/[number] is email-scoped and personal.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://nordhem.sg";
  const staticRoutes = [
    "", "/shop", "/inspiration", "/offers",
    "/services", "/stores", "/family", "/business", "/food", "/sustainability",
    "/planning-tools", "/help",
  ].map((r) => ({ url: `${base}${r || "/"}`, lastModified: new Date() }));
  const products = PRODUCTS.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: new Date() }));
  const rooms = INSPIRATIONS.map((r) => ({ url: `${base}/inspiration/${r.slug}`, lastModified: new Date() }));
  return [...staticRoutes, ...products, ...rooms];
}

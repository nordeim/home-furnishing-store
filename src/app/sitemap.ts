import type { MetadataRoute } from "next";
import { PRODUCTS, INSPIRATIONS } from "@/lib/catalog";

// Indexable static routes only. Cart/checkout/track-order/wishlist/search are
// robots-disallowed utility surfaces (see robots.ts) and never belong in a
// sitemap; /order/[number] is email-scoped and personal.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://nordhem.sg";
  // Task 121 F-9: no lastModified — a timestamp that always equals "now"
  // (the build/request time) is pure noise that erodes the lastmod signal;
  // these URLs have no honest mtime source, so they ship bare.
  const staticRoutes = [
    "", "/shop", "/inspiration", "/offers",
    "/services", "/stores", "/family", "/business", "/food", "/sustainability",
    "/planning-tools", "/help",
  ].map((r) => ({ url: `${base}${r || "/"}` }));
  const products = PRODUCTS.map((p) => ({ url: `${base}/product/${p.slug}` }));
  const rooms = INSPIRATIONS.map((r) => ({ url: `${base}/inspiration/${r.slug}` }));
  return [...staticRoutes, ...products, ...rooms];
}

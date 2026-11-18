import type { MetadataRoute } from "next";
import { PRODUCTS, INSPIRATIONS } from "@/lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://nordhem.sg";
  const staticRoutes = [
    "", "/shop", "/cart", "/checkout", "/track-order", "/inspiration", "/offers",
    "/services", "/stores", "/family", "/business", "/food", "/sustainability",
    "/planning-tools", "/help", "/search", "/wishlist",
  ].map((r) => ({ url: `${base}${r || "/"}`, lastModified: new Date() }));
  const products = PRODUCTS.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: new Date() }));
  const rooms = INSPIRATIONS.map((r) => ({ url: `${base}/inspiration/${r.slug}`, lastModified: new Date() }));
  return [...staticRoutes, ...products, ...rooms];
}

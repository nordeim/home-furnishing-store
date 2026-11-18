import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Utility and personal surfaces: no index value, and /order/ pages can
        // carry buyer details (email-scoped knowledge via /track-order).
        // Mirrored by the sitemap, which lists indexable routes only.
        disallow: ["/cart", "/checkout", "/track-order", "/order/", "/wishlist", "/search", "/api/"],
      },
    ],
    sitemap: "https://nordhem.sg/sitemap.xml",
  };
}

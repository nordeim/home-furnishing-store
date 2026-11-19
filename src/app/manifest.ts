import type { MetadataRoute } from "next";

// Task 125 G-6: installable-PWA metadata (the homenest posture). Served at
// /manifest.webmanifest and linked from every page's <head> by the App
// Router's file convention. Brand colors mirror the @theme tokens.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NORDHEM Singapore — Furniture & Home Furnishing Store",
    short_name: "NORDHEM",
    description:
      "Scandinavian-designed furniture for Singapore homes — shop the catalogue, check store stock, order with island-wide delivery and free Click & Collect.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#0058a3",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

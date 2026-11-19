import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart-store";

import { SITE_ORIGIN, jsonLdScript } from "@/lib/utils";
export const metadata: Metadata = {
  title: {
    default: "NORDHEM Singapore — Furniture & Home Furnishing",
    template: "%s · NORDHEM Singapore",
  },
  description:
    "Scandinavian-designed furniture for Singapore homes: sofas, beds, dining, kitchens, workspaces and more. Delivery island-wide, Click & Collect at Tampines, Jurong and Alexandra.",
  metadataBase: new URL(SITE_ORIGIN),
};

// Site-level structured data (Task 119 F-26): Organization + WebSite with
// only verifiable fields — the fictional brand's name, canonical origin and
// a catalogue search pointer. No invented sameAs profiles or logo assets.
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "NORDHEM Singapore",
      url: `${SITE_ORIGIN}/`,
    },
    {
      "@type": "WebSite",
      name: "NORDHEM Singapore",
      url: `${SITE_ORIGIN}/`,
      // Task 121 F-14: the comment claimed a "catalogue search pointer" that
      // the node never carried — the search page backs this action for real.
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_ORIGIN}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-SG" data-scroll-behavior="smooth">
      <body className="bg-white text-[#111111] antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(siteJsonLd) }}
        />
        <CartProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#ffdb00] focus:px-5 focus:py-3 focus:text-sm focus:font-bold"
          >
            Skip to content
          </a>
          <Header />
          <main id="main" className="min-h-[60vh]">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

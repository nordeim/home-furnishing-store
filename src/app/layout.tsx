import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart-store";

export const metadata: Metadata = {
  title: {
    default: "NORDHEM Singapore — Furniture & Home Furnishing",
    template: "%s · NORDHEM Singapore",
  },
  description:
    "Scandinavian-designed furniture for Singapore homes: sofas, beds, dining, kitchens, workspaces and more. Delivery island-wide, Click & Collect at Tampines, Jurong and Alexandra.",
  metadataBase: new URL("https://nordhem.sg"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-SG">
      <body className="bg-white text-[#111111] antialiased">
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

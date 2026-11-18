import type { Metadata } from "next";
import type { ReactNode } from "react";

// /family is a client page (interactive voucher calculator) — this route
// layout carries its SEO metadata (Task 119: sitemap-indexed client pages
// previously published no title of their own).
export const metadata: Metadata = {
  title: "NORDHEM Family programme",
  description:
    "Join NORDHEM Family: earn 5 points per $10 spent, unlock a $5 voucher for every 1,000 points, enjoy members-only workshops and Click & Collect perks. Free to join, open to everyone.",
  alternates: { canonical: "/family" },
  openGraph: {
    title: "NORDHEM Family programme · NORDHEM Singapore",
    description:
      "Earn 5 points per $10 spent and a $5 voucher for every 1,000 points — free to join.",
    type: "website",
    siteName: "NORDHEM Singapore",
    url: "https://nordhem.sg/family",
  },
};

export default function FamilyLayout({ children }: { children: ReactNode }) {
  return children;
}

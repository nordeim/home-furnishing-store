import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SITE_ORIGIN } from "@/lib/utils";
// /sustainability is a client page (interactive buy-back estimator) — this
// route layout carries its SEO metadata (Task 119).
export const metadata: Metadata = {
  title: "Sustainability — circular furniture, buy-back and As-Is",
  description:
    "NORDHEM's circular programme: furniture buy-back, As-Is corners, spare-parts availability and repair-friendly flat-pack design — keep good furniture living more than one life.",
  alternates: { canonical: "/sustainability" },
  openGraph: {
    title: "Sustainability — circular furniture, buy-back and As-Is · NORDHEM Singapore",
    description:
      "Furniture buy-back, As-Is corners and repair-friendly design.",
    type: "website",
    siteName: "NORDHEM Singapore",
    url: `${SITE_ORIGIN}/sustainability`,
  },
};

export default function SustainabilityLayout({ children }: { children: ReactNode }) {
  return children;
}

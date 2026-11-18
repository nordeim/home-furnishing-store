import type { Metadata } from "next";
import type { ReactNode } from "react";

// /business is a client page (instant quote calculator) — this route layout
// carries its SEO metadata (Task 119).
export const metadata: Metadata = {
  title: "NORDHEM Business — office fit-out in one quote",
  description:
    "Fit out cafés, clinics, studios and satellite offices: pick modular workspace units and get an instant trade estimate, then book a consultation. B2B delivery island-wide with one consolidated invoice.",
  alternates: { canonical: "/business" },
  openGraph: {
    title: "NORDHEM Business — office fit-out in one quote · NORDHEM Singapore",
    description:
      "Pick modular units, get an instant trade estimate and book a consultation.",
    type: "website",
    siteName: "NORDHEM Singapore",
    url: "https://nordhem.sg/business",
  },
};

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return children;
}

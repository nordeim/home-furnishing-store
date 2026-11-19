import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SITE_ORIGIN } from "@/lib/utils";
import { INSPIRATIONS } from "@/lib/catalog";
// /planning-tools is a client page (room explorer + booking) — this route
// layout carries its SEO metadata (Task 119).
export const metadata: Metadata = {
  title: "Planning tools — room planners and measurement help",
  description: `Free NORDHEM planning tools: explore ${INSPIRATIONS.length} shoppable room stories, book a video or in-store planning session at Tampines, and measure your space right the first time.`,
  alternates: { canonical: "/planning-tools" },
  openGraph: {
    title: "Planning tools — room planners and measurement help · NORDHEM Singapore",
    description:
      "Explore shoppable room stories and book a free planning session.",
    type: "website",
    siteName: "NORDHEM Singapore",
    url: `${SITE_ORIGIN}/planning-tools`,
  },
};

export default function PlanningToolsLayout({ children }: { children: ReactNode }) {
  return children;
}

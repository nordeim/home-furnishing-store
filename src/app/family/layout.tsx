import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SITE_ORIGIN, FAMILY_VOUCHER_CENTS, FAMILY_POINTS_PER_VOUCHER, FAMILY_POINTS_PER_DOLLAR } from "@/lib/utils";
// /family is a client page (interactive voucher calculator) — this route
// layout carries its SEO metadata (Task 119: sitemap-indexed client pages
// previously published no title of their own).
// Task 127 F-4: the voucher half of the copy derives from the same
// constants the calculator uses (familyVoucherCents) — a rule edit
// self-corrects the metadata instead of contradicting the page's own math.
const VOUCHER_RULE = `$${FAMILY_VOUCHER_CENTS / 100} voucher for every ${FAMILY_POINTS_PER_VOUCHER.toLocaleString("en-SG")} points`;
const EARN_RULE = `earn ${FAMILY_POINTS_PER_DOLLAR} points per $1 spent`;
export const metadata: Metadata = {
  // Task 120 F-4: the description must agree with the page's own calculator
  // (familyVoucherCents in src/lib/utils.ts) instead of the 20×-off "5 points
  // per $10" it previously shipped, and promise only perks the surface
  // actually has (no "members-only workshops").
  title: "NORDHEM Family programme",
  description:
    `Join NORDHEM Family: ${EARN_RULE}, unlock a ${VOUCHER_RULE}, and enjoy free Click & Collect plus free coffee Mon–Fri. Free to join, open to everyone.`,
  alternates: { canonical: "/family" },
  openGraph: {
    title: "NORDHEM Family programme · NORDHEM Singapore",
    description:
      `${EARN_RULE.charAt(0).toUpperCase()}${EARN_RULE.slice(1)} and a ${VOUCHER_RULE} — free to join.`,
    type: "website",
    siteName: "NORDHEM Singapore",
    url: `${SITE_ORIGIN}/family`,
  },
};

export default function FamilyLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { ReactNode } from "react";
import type { Metadata } from "next";

// Task 124 F-17: belt-and-suspenders with robots.txt's disallow (the
// Task-119 F-10 stance on /order/[number]): a disallowed URL can still
// enter the index URL-only if externally linked — the page itself must
// declare noindex wherever it IS readable. The robots/sitemap policy
// (sitemap = indexable only) is unchanged.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function WishlistLayout({ children }: { children: ReactNode }) {
  return children;
}

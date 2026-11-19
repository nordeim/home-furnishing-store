import Link from "next/link";
import { GST_RATE } from "@/lib/utils";

// Task 128 F-11: the copyright year derives on the UTC+8 clock — the last
// bare server-local calendar read in src/ (orderNumber/campaignEnd
// discipline; an SGT new-year would otherwise lag the server TZ by hours).
const SGT_YEAR = () => new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCFullYear();

const COLS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Shop",
    links: [
      { href: "/shop?cat=living", label: "Living room" },
      { href: "/shop?cat=bedroom", label: "Bedroom" },
      { href: "/shop?cat=dining", label: "Dining" },
      { href: "/shop?cat=kitchen", label: "Kitchen" },
      { href: "/offers", label: "Offers & Last chance" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/services", label: "Delivery & assembly" },
      { href: "/planning-tools", label: "Planning tools" },
      { href: "/business", label: "NORDHEM for Business" },
      { href: "/family", label: "NORDHEM Family" },
      { href: "/track-order", label: "Track your order" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/inspiration", label: "Room inspiration" },
      { href: "/sustainability", label: "Sustainability & Buy-back" },
      { href: "/food", label: "Restaurant & Bistro" },
      { href: "/stores", label: "Our stores" },
      { href: "/help", label: "Help & contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-[#f5f3ee] text-[#222]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="inline-grid place-items-center rounded-md bg-[#0058a3] px-3 py-1.5 text-[20px] font-black text-white">NORDHEM</p>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-[#5b5b5b]">
              Scandinavian-designed furniture for Singapore homes — well-designed, functional and affordable,
              delivered island-wide with 365-day returns.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[13px] font-semibold">
              <span className="rounded-full bg-white px-3 py-1.5">Tampines</span>
              <span className="rounded-full bg-white px-3 py-1.5">Jurong</span>
              <span className="rounded-full bg-white px-3 py-1.5">Alexandra</span>
              <span className="rounded-full bg-[#ffdb00] px-3 py-1.5">Island-wide delivery</span>
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
            {COLS.map((c) => (
              <div key={c.title}>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#5b5b5b]">{c.title}</h3>
                <ul className="mt-3 space-y-2.5 text-[14px]">
                  {c.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className="hover:text-[#0058a3] hover:underline">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-[#e5e1d8] pt-6 text-[12px] text-[#5b5b5b] sm:flex-row sm:items-center sm:justify-between">
          <p>© {SGT_YEAR()} NORDHEM Singapore Pte. Ltd. · Concept demo storefront inspired by Scandinavian retail patterns. All product names, copy and prices are fictional.</p>
          <p>Prices include {Math.round(GST_RATE * 100)}% GST · 365-day returns</p>
        </div>
      </div>
    </footer>
  );
}

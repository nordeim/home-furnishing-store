"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/local-store";
import { useCart } from "@/lib/cart-store";
import { CATEGORIES, catalogMaxDiscountPercent } from "@/lib/catalog";

const TOP_LINKS = [
  { href: "/offers", label: "Offers" },
  { href: "/inspiration", label: "Inspiration" },
  { href: "/services", label: "Services" },
  { href: "/stores", label: "Stores" },
  { href: "/track-order", label: "Track order" },
];

// Persisted store picker (nordhem_store) as an external store — the same
// useSyncExternalStore pattern as the cart (see cart-store.tsx for why).
// Task 121 F-4: the parsed shape is validated (a wrong-shape payload in the
// key degrades to the "Tampines" fallback instead of poisoning the header).
const storePick = createLocalStore<string>("nordhem_store", "Tampines", (v) => typeof v === "string");

export function Header() {
  const { count, wishlist } = useCart();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const store = useSyncExternalStore(storePick.subscribe, storePick.getSnapshot, storePick.getServerSnapshot);
  const router = useRouter();
  const pathname = usePathname();

  // Close the drawer when the route changes. Adjust-during-render (the
  // React-docs pattern) instead of a pathname-keyed effect — effects must not
  // call setState synchronously (react-hooks/set-state-in-effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Escape closes the mobile drawer (overlay a11y baseline). State changes
  // happen in the event callback, not synchronously in the effect body.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pickStore(s: string) {
    storePick.set(s);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/shop");
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_#e5e1d8]">
      {/* utility strip */}
      <div className="bg-[#111] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[12px] sm:px-6">
          {/* Task 121 F-5: the truncate used to swallow the LAST inline
              content — the strip's only CTA — past the mobile viewport while
              it stayed focusable (WCAG 2.4.7). The message truncates; the
              link is a shrink-0 sibling that can never clip. */}
          <p className="min-w-0 truncate">
            <span className="mr-2 inline-block rounded-sm bg-[#ffdb00] px-1.5 py-0.5 font-bold text-black">NEW</span>
            {/* Task 125 F-4: honest attribution (dining's max is −17%; the
                −24% is NORDLYS lighting, WOKHEY cookware −23%, PANDAN decor
                −21%) — the hero's Task-122 F-19 set, mirrored. */}
            Festive market is on — up to {catalogMaxDiscountPercent()}% off lighting, cookware & decor
          </p>
          <Link href="/offers" className="shrink-0 underline underline-offset-2 focus-ring rounded">Shop offers</Link>
          <nav className="hidden items-center gap-4 md:flex" aria-label="Utility">
            {TOP_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-white/85 hover:text-white hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* main bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
        <button
          className="rounded-full p-2 hover:bg-[#f5f3ee] lg:hidden focus-ring"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2 focus-ring rounded" aria-label="NORDHEM home">
          <span className="grid h-10 place-items-center rounded-md bg-[#0058a3] px-3 text-[20px] font-black tracking-tight text-white sm:text-[22px]">
            NORDHEM
          </span>
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0058a3] sm:block">Singapore</span>
        </Link>

        <form onSubmit={submit} role="search" className="relative hidden flex-1 md:block">
          <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5b5b5b]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sofas, beds, bookshelves, pendant lights…"
            className="w-full rounded-full bg-[#f5f3ee] py-3 pl-11 pr-24 text-[15px] outline-none placeholder:text-[#5b5b5b] focus:bg-white focus:ring-2 focus:ring-[#0058a3]"
            aria-label="Search products"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[#0058a3] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#004382] focus-ring">
            Search
          </button>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="relative hidden lg:block">
            <label htmlFor="store-pick" className="sr-only">Choose store</label>
            <select
              id="store-pick"
              value={store}
              onChange={(e) => pickStore(e.target.value)}
              className="cursor-pointer rounded-full border border-[#e5e1d8] bg-white px-3 py-2 text-[13px] font-semibold focus-ring"
            >
              {["Tampines", "Jurong", "Alexandra"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Link href="/wishlist" className="relative rounded-full p-2.5 hover:bg-[#f5f3ee] focus-ring" aria-label={`Wishlist, ${wishlist.length} item${wishlist.length === 1 ? "" : "s"}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9Z" strokeLinejoin="round" /></svg>
            {wishlist.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#0058a3] px-1 text-[11px] font-bold text-white">{wishlist.length}</span>
            )}
          </Link>
          <Link href="/cart" className="relative rounded-full p-2.5 hover:bg-[#f5f3ee] focus-ring" aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 8h15l-1.5 12h-12L6 8Z" strokeLinejoin="round" /><path d="M9 10V6a3 3 0 0 1 6 0v4" strokeLinecap="round" /></svg>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffdb00] px-1 text-[11px] font-bold text-black">{count}</span>
            )}
          </Link>
        </div>
      </div>

      {/* mobile search */}
      <div className="px-4 pb-3 md:hidden">
        <form onSubmit={submit} role="search" className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-full bg-[#f5f3ee] py-2.5 pl-4 pr-16 text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-[#0058a3]"
            aria-label="Search products"
          />
          <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-[#0058a3] px-3 py-1 text-[13px] font-bold text-white focus-ring">Go</button>
        </form>
      </div>

      {/* category nav */}
      <nav className="hidden border-t border-[#f0ede6] lg:block" aria-label="Shop by room">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
          <Link href="/shop" className="rounded-full px-4 py-2.5 text-[14px] font-bold hover:bg-[#f5f3ee]">Shop all</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/shop?cat=${c.slug}`} className="rounded-full px-4 py-2.5 text-[14px] font-medium text-[#2b2b2b] hover:bg-[#f5f3ee] hover:font-bold">
              {c.name}
            </Link>
          ))}
          <Link href="/planning-tools" className="ml-auto rounded-full bg-[#ffdb00] px-4 py-1.5 text-[13px] font-bold hover:bg-[#e5c400]">Planning tools</Link>
        </div>
      </nav>

      {/* mobile drawer */}
      {open && (
        <div className="border-t border-[#eee] bg-white px-4 py-4 lg:hidden">
          {/* Task 125 F-7: drawer links close on click — the pathname guard
              below never fires for param-only navigations (/shop?cat=a →
              /shop?cat=b keeps usePathname() at "/shop"), so the drawer
              stayed open over the re-filtered grid. */}
          <div className="grid gap-1">
            <Link href="/shop" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 font-bold hover:bg-[#f5f3ee]">Shop all products</Link>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/shop?cat=${c.slug}`} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-[#f5f3ee]">{c.name}</Link>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#eee] pt-3 text-sm">
            {TOP_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg bg-[#f5f3ee] px-3 py-2.5 font-semibold">{l.label}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

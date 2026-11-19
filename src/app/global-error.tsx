"use client";

// Task 122 F-2: a render crash inside the ROOT LAYOUT (CartProvider and the
// persisted-state stores live there) is above the app/error.tsx route
// boundary — without this file those crashes landed on Next's unbranded
// default error page. global-error replaces the root <html>/<body>, so it
// must render its own document shell. The recovery for the historical crash
// class (a poisoned persisted payload captured in module memory at import)
// is remove + RELOAD — reset() alone re-renders against the same poisoned
// module snapshot and would loop; only a reload re-evaluates the modules.

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Diagnostics: this boundary is the last line before the default page —
  // leave a client-side trace (digest pairs with the server log entry).
  console.error("[global-error]", error);

  const clearAndReload = () => {
    for (const key of ["nordhem_cart_v1", "nordhem_wish_v1", "nordhem_promo", "nordhem_store"]) {
      try {
        localStorage.removeItem(key);
      } catch {
        // storage can be unavailable (private mode) — reload still re-evaluates modules
      }
    }
    window.location.reload();
  };

  return (
    <html lang="en">
      <body className="m-0 font-sans text-[#111]">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-[44px]" aria-hidden="true">⚠</p>
          <h1 className="mt-2 text-[clamp(1.6rem,4vw,2.2rem)] font-black tracking-tight">Something went sideways</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#5b5b5b]">
            The store hit an unexpected error. If it keeps happening, your saved bag
            or wishlist data may be damaged — clearing this site&apos;s saved data
            fixes that.
          </p>
          {error.digest && <p className="mt-2 text-[12px] text-[#5b5b5b]">Ref: {error.digest}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="rounded-full bg-[#0058a3] px-6 py-3 text-[15px] font-black text-white hover:bg-[#004382] focus-ring"
            >
              Try again
            </button>
            <button
              onClick={clearAndReload}
              className="rounded-full bg-[#ffdb00] px-6 py-3 text-[15px] font-black text-black hover:bg-[#e5c400] focus-ring"
            >
              Clear saved bag &amp; restart
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

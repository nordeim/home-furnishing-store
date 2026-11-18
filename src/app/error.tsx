"use client";

// Task 121 F-4 safety net: a render-time crash inside any client component
// (historically reachable via an unvalidated localStorage payload reaching
// CartProvider) previously replaced every route with Next's generic error
// page. This boundary keeps the failure branded, explains the recovery path
// (the persisted state is the usual suspect) and offers a real reset action.

export default function GlobalRouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[44px]" aria-hidden="true">⚠</p>
      <h1 className="mt-2 text-[clamp(1.6rem,4vw,2.2rem)] font-black tracking-tight">Something went sideways</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#5b5b5b]">
        This page hit an unexpected error. If it keeps happening, your saved bag or
        wishlist data may be damaged — clearing this site&apos;s saved data fixes that.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full bg-[#0058a3] px-6 py-3 text-[15px] font-black text-white hover:bg-[#004382] focus-ring"
        >
          Try again
        </button>
        <button
          onClick={() => {
            // Last resort, clearly labelled: drop the persisted client state
            // that a crashed consumer most likely failed to tolerate.
            for (const key of ["nordhem_cart_v1", "nordhem_wish_v1", "nordhem_promo", "nordhem_store"]) {
              try {
                localStorage.removeItem(key);
              } catch {
                // storage can be unavailable (private mode) — reset() is still useful.
              }
            }
            reset();
          }}
          className="rounded-full bg-[#ffdb00] px-6 py-3 text-[15px] font-black text-black hover:bg-[#e5c400] focus-ring"
        >
          Clear saved bag &amp; retry
        </button>
      </div>
    </div>
  );
}

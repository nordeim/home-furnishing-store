"use client";

import { PERSISTED_STORAGE_KEYS } from "@/lib/local-store";

// Task 121 F-4 safety net: a render-time crash inside any client component
// (historically reachable via an unvalidated localStorage payload reaching
// CartProvider) previously replaced every route with Next's generic error
// page. This boundary keeps the failure branded, explains the recovery path
// (the persisted state is the usual suspect) and offers a real reset action.
//
// Task 122 F-2 corrections: (1) boundary placement — crashes inside the ROOT
// LAYOUT (CartProvider) are above this boundary and land in global-error.tsx
// (see that file); this boundary covers route/page-subtree crashes. (2) the
// clear-and-retry action now RELOADS — a poisoned persisted payload is
// captured in module memory at import, so reset() alone re-renders against
// the same poison and loops. (3) diagnostics are no longer swallowed: the
// error is logged and the digest rendered.

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Diagnostics: production crashes from this boundary leave a client trace
  // that pairs with the server log entry via the digest.
  console.error("[route-error]", error);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[44px]" aria-hidden="true">⚠</p>
      <h1 className="mt-2 text-[clamp(1.6rem,4vw,2.2rem)] font-black tracking-tight">Something went sideways</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#5b5b5b]">
        This page hit an unexpected error. If it keeps happening, your saved bag or
        wishlist data may be damaged — clearing this site&apos;s saved data fixes that.
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
          onClick={() => {
            // Last resort, clearly labelled: drop the persisted client state
            // and RELOAD — the module-level store snapshot is read once at
            // import, so reset() alone cannot recover from a poisoned value.
            for (const key of PERSISTED_STORAGE_KEYS) {
              try {
                localStorage.removeItem(key);
              } catch {
                // storage can be unavailable (private mode) — reload still re-evaluates modules
              }
            }
            window.location.reload();
          }}
          className="rounded-full bg-[#ffdb00] px-6 py-3 text-[15px] font-black text-black hover:bg-[#e5c400] focus-ring"
        >
          Clear saved bag &amp; restart
        </button>
      </div>
    </div>
  );
}

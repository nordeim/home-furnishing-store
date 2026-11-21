import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Task 125 G-1: platform-level security headers (the homenest posture) —
  // nosniff, frame denial, referrer trimming, a permissions lockout for
  // capabilities this storefront never uses, and HSTS. Values are
  // platform-level (nothing brand-specific); pinned by the security-headers
  // e2e spec.
  // Task 141 F-4: the reduced CSP joins the set — the register's CSP split,
  // promoted half. object-src closes the plugin/object embed vector,
  // base-uri defeats <base>-injection URL hijacking, frame-ancestors
  // complements XFO for legacy contexts, and form-action pins form
  // submissions to self (no cross-origin form targets exist — the search
  // form is router.push). Deliberately NO default-src/script-src/img-src:
  // Next.js hydration needs inline flight scripts; the full nonce CSP
  // stays deferred (the silent-no-hydration trap on prerendered hydrating
  // shells — see the PAD register).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
        ],
      },
    ];
  },
  // Next 16 blocks cross-origin dev-resource requests (e.g. the /_next/hmr
  // websocket) when the browser origin host differs from the server's own
  // banner host: a page opened via http://127.0.0.1:3000 while the dev server
  // announces http://localhost:3000 gets its HMR handshake dropped, the RSC
  // client then discards the inline flight payload and waits forever — the
  // page renders but NEVER hydrates (no drawer, no cart, no search). The
  // e2e suite is unaffected (it boots the production build, which has no
  // HMR), which is exactly why this stayed invisible to the gates. Allow the
  // loopback aliases explicitly so 127.0.0.1 consumers (agent-browser, curl
  // smoke probes, Playwright's 127.0.0.1 baseURL habit) hydrate normally.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

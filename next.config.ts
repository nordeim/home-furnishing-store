import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

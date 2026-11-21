import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

/**
 * The shared fixed-window limiter factory (Task 119). Before this seam the
 * four POST routes each carried an identical in-process Map limiter whose
 * entries were never evicted — unbounded memory on a long-lived single-node
 * process, and 4× duplicated window logic. These tests pin the factory
 * contract the routes rely on: same fixed-window semantics (allow the first
 * `limit`, throttle beyond), a Retry-After source, and bounded memory.
 */

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("allows the first `limit` requests from one key and throttles the next", () => {
  const lim = createRateLimiter({ limit: 3, windowMs: 60_000 });
  expect(lim.throttled("ip-a")).toBe(false);
  expect(lim.throttled("ip-a")).toBe(false);
  expect(lim.throttled("ip-a")).toBe(false);
  expect(lim.throttled("ip-a")).toBe(true);
  expect(lim.throttled("ip-a")).toBe(true);
});

test("keys are independent buckets", () => {
  const lim = createRateLimiter({ limit: 1, windowMs: 60_000 });
  expect(lim.throttled("ip-a")).toBe(false);
  expect(lim.throttled("ip-a")).toBe(true);
  expect(lim.throttled("ip-b")).toBe(false);
});

test("the window resets after windowMs (fixed window)", () => {
  const lim = createRateLimiter({ limit: 1, windowMs: 30_000 });
  expect(lim.throttled("ip-a")).toBe(false);
  expect(lim.throttled("ip-a")).toBe(true);
  vi.setSystemTime(Date.now() + 30_001);
  expect(lim.throttled("ip-a")).toBe(false);
});

test("retryAfterSec is 0 while allowed and >= 1 while throttled, bounded by the window", () => {
  const lim = createRateLimiter({ limit: 1, windowMs: 60_000 });
  expect(lim.retryAfterSec("ip-a")).toBe(0);
  lim.throttled("ip-a");
  expect(lim.throttled("ip-a")).toBe(true);
  const ra = lim.retryAfterSec("ip-a");
  expect(ra).toBeGreaterThanOrEqual(1);
  expect(ra).toBeLessThanOrEqual(60);
  vi.setSystemTime(Date.now() + 60_001);
  expect(lim.retryAfterSec("ip-a")).toBe(0);
});

test("expired keys are purged opportunistically — memory stays bounded", () => {
  const lim = createRateLimiter({ limit: 5, windowMs: 1_000 });
  // Push many unique keys past the internal purge threshold, all fresh.
  for (let i = 0; i < 600; i++) lim.throttled(`ip-${i}`);
  const peak = lim.size();
  // Nothing has expired yet, so the sweep cannot shrink it below the key count.
  expect(peak).toBeGreaterThan(500);
  // After the window passes, one more call sweeps the expired keys out.
  vi.setSystemTime(Date.now() + 1_001);
  lim.throttled("ip-final");
  expect(lim.size()).toBeLessThanOrEqual(5); // only fresh keys survive
});

test("size() reflects the live key count (tests/ops observability)", () => {
  const lim = createRateLimiter({ limit: 10, windowMs: 60_000 });
  expect(lim.size()).toBe(0);
  lim.throttled("ip-a");
  expect(lim.size()).toBe(1);
});

/**
 * Task 125 G-2: the client-IP derivation seam. The four POST routes used to
 * inline `x-forwarded-for.split(",")[0]` — the LEFTMOST hop, which is exactly
 * the client-forgeable form (a direct-deploy client rotates its own
 * rate-limit buckets by sending changing fake XFF values). The shared
 * derivation takes the RIGHTMOST hop (the value the nearest proxy appended)
 * and falls back to a shared "direct" bucket when no proxy header exists.
 */
test("clientIp under TRUST_PROXY=1: takes the rightmost x-forwarded-for hop, not the forgeable leftmost", () => {
  vi.stubEnv("TRUST_PROXY", "1");
  const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
  expect(clientIp(h)).toBe("5.6.7.8");
  vi.unstubAllEnvs();
});

test("clientIp under TRUST_PROXY=1: a single-hop value passes through unchanged (the e2e identity pattern)", () => {
  vi.stubEnv("TRUST_PROXY", "1");
  const h = new Headers({ "x-forwarded-for": "10.9.125.2" });
  expect(clientIp(h)).toBe("10.9.125.2");
  vi.unstubAllEnvs();
});

test("clientIp: absent or empty header falls back to the shared direct bucket", () => {
  expect(clientIp(new Headers())).toBe("direct");
  expect(clientIp(new Headers({ "x-forwarded-for": "" }))).toBe("direct");
  expect(clientIp(new Headers({ "x-forwarded-for": "  " }))).toBe("direct");
});

test("clientIp: TRUST_PROXY unset ignores XFF entirely — the direct-deploy bypass closes (Task 141 G)", () => {
  // THE register promotion: on a direct deploy the client's spoofed XFF is
  // the rightmost hop, so a rotating header minted a fresh 20/min bucket
  // per request. With the gate unset, any XFF — however well-formed —
  // collapses into the shared "direct" bucket: honest visitors (who send
  // no XFF) see NO change, and spoofers lose the rotation.
  vi.stubEnv("TRUST_PROXY", "");
  expect(clientIp(new Headers({ "x-forwarded-for": "10.9.125.2" }))).toBe("direct");
  expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("direct");
  vi.unstubAllEnvs();
});

test("clientIp: TRUST_PROXY fails closed on every non-\"1\" value (Task 141 G)", () => {
  // The web-application §5 proxy-hop contract: unparsable/ambiguous hop
  // declarations fail CLOSED. "0", "true", "yes" and garbage are all
  // refused — the operator must say exactly "1" to open XFF trust.
  for (const v of ["0", "true", "yes", "on", "garbage"]) {
    vi.stubEnv("TRUST_PROXY", v);
    expect(clientIp(new Headers({ "x-forwarded-for": "10.9.125.2" })), `TRUST_PROXY=${v}`).toBe("direct");
  }
  vi.unstubAllEnvs();
});

test("clientIp: TRUST_PROXY=\"1\" is the one value that trusts the proxy-appended hop (Task 141 G)", () => {
  // The promoted-behavior pin: behind exactly one appending proxy, the
  // rightmost hop is the proxy-appended client IP and the limiter keys on
  // it. (Mutation-honest: a gate that returns "direct" unconditionally
  // fails this test — the promotion must not overcorrect.)
  vi.stubEnv("TRUST_PROXY", "1");
  expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.4" }))).toBe("10.0.0.4");
  vi.unstubAllEnvs();
});

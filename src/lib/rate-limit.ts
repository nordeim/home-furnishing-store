/**
 * Fixed-window rate limiter factory (Task 119).
 *
 * The four POST boundaries (checkout, reviews POST, orders/track,
 * promotions/validate) each carried an identical in-process Map limiter whose
 * entries were never evicted: unbounded memory on a long-lived single-node
 * process plus 4× duplicated window logic. This is the single shared seam —
 * same fixed-window semantics, a Retry-After source, and an opportunistic
 * sweep that keeps the key set bounded.
 *
 * Scope: in-process (documented single-node limitation — no shared store, so
 * multi-instance deployments throttle per instance). Keyed by the caller's
 * extracted identity (routes pass the x-forwarded-for first hop or "local").
 */

export interface RateLimiter {
  /** Record a request; true = over the limit → respond 429. */
  throttled(ip: string): boolean;
  /** Seconds until the key's window resets; 0 when the key is allowed. */
  retryAfterSec(ip: string): number;
  /** Live key count (tests/ops observability). */
  size(): number;
}

export interface RateLimiterOptions {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

// Sweep the expired keys once the live set grows past this many entries, so
// memory stays O(recent-activity) instead of O(all-time keys). Kept well above
// the routes' 20/min limits so the sweep cost is amortized and rare.
const PURGE_THRESHOLD = 256;

interface WindowRow {
  n: number;
  reset: number;
}

export function createRateLimiter({ limit, windowMs }: RateLimiterOptions): RateLimiter {
  if (!Number.isFinite(limit) || limit < 1) throw new Error("rate-limit: limit must be >= 1");
  if (!Number.isFinite(windowMs) || windowMs < 1) throw new Error("rate-limit: windowMs must be >= 1");
  const rate = new Map<string, WindowRow>();

  function sweep(now: number): void {
    for (const [key, row] of rate) {
      if (now > row.reset) rate.delete(key);
    }
  }

  return {
    throttled(ip: string): boolean {
      const now = Date.now();
      const row = rate.get(ip);
      if (!row || now > row.reset) {
        if (rate.size >= PURGE_THRESHOLD) sweep(now);
        rate.set(ip, { n: 1, reset: now + windowMs });
        return false;
      }
      row.n += 1;
      return row.n > limit;
    },
    retryAfterSec(ip: string): number {
      const row = rate.get(ip);
      if (!row) return 0;
      const remainingMs = row.reset - Date.now();
      if (remainingMs <= 0) return 0;
      return Math.max(1, Math.ceil(remainingMs / 1000));
    },
    size(): number {
      return rate.size;
    },
  };
}

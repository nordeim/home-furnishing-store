import { NextResponse } from "next/server";
import { validatePromo } from "@/lib/server-data";
import { createRateLimiter, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Every validation is a Postgres read (ensureSeed + select) — shared fixed-window
// seam (src/lib/rate-limit.ts): 20 req/min/IP, in-process, expired keys swept;
// bounds the unauthenticated DB hit rate.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(req: Request) {
  const ip = clientIp(req.headers); // rightmost XFF hop (Task 125 G-2)
  if (limiter.throttled(ip)) {
    return NextResponse.json({ ok: false, error: { code: "RATE_LIMIT", message: "Too many attempts. Please wait a minute." } }, { status: 429, headers: { "Retry-After": String(limiter.retryAfterSec(ip)) } });
  }
  let body: { code?: string; subtotalCents?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // Malformed payload is a client error, not a server fault.
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Expected a JSON body." } }, { status: 400 });
  }
  // Task 128 F-1: a valid-JSON NON-OBJECT body (`null`) is the same
  // client-fault class — the property reads below are TypeErrors on it
  // (a 500 for a client fault). Guard the shape beside the parse guard.
  if (typeof body !== "object" || body === null)
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Expected a JSON body." } }, { status: 400 });
  try {
    // Task 126 F-5: TYPE-strict (the checkout/reviews-POST stance) — the old
    // String()/Number() coercions let a numeric code ride the lookup and a
    // numeric-string subtotal ride the promo math. Caps (Task 125 F-3) stay.
    if (typeof body.code !== "string" || typeof body.subtotalCents !== "number" || !Number.isFinite(body.subtotalCents)) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Promo code and subtotal must be their documented types." } }, { status: 422 });
    }
    const code = body.code;
    if (code.length > 32) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Promo codes are at most 32 characters." } }, { status: 422 });
    }
    const result = await validatePromo(code, Math.max(0, Math.round(body.subtotalCents)));
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_PROMO", message: result.error } }, { status: 422 });
    }
    return NextResponse.json({ ok: true, data: result.promo });
  } catch (err) {
    console.error("[api/promo]", err);
    return NextResponse.json({ ok: false, error: { code: "PROMO_FAILED", message: "Could not validate this code." } }, { status: 500 });
  }
}

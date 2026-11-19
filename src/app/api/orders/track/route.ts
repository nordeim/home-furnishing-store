import { NextResponse } from "next/server";
import { trackOrder } from "@/lib/server-data";
import { createRateLimiter, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// PII lookup boundary — shared fixed-window seam (src/lib/rate-limit.ts):
// 20 req/min/IP, in-process, expired keys swept. The order-number+email pair
// makes enumeration hard, but the limiter still bounds the probe surface.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(req: Request) {
  const ip = clientIp(req.headers); // rightmost XFF hop (Task 125 G-2)
  if (limiter.throttled(ip)) {
    return NextResponse.json({ ok: false, error: { code: "RATE_LIMIT", message: "Too many attempts. Please wait a minute." } }, { status: 429, headers: { "Retry-After": String(limiter.retryAfterSec(ip)) } });
  }
  let body: { orderNumber?: string; email?: string };
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
    // Task 126 F-5: TYPE-strict, mirroring the checkout (Task-124 F-5) and
    // reviews-POST (Task-125 F-2) stance — the old String() coercions let a
    // numeric/object orderNumber or email sail into the parameterized lookup
    // as a silent 404. A crafted TYPE is a client error on every boundary.
    // Caps (Task 125 F-3) stay: order numbers ≤32 (NH-YYYYMMDD-XXXXXX is 17),
    // emails ≤254 (the checkout shape).
    if (typeof body.orderNumber !== "string" || typeof body.email !== "string") {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Order number and email must be text." } }, { status: 422 });
    }
    const orderNumber = body.orderNumber;
    const email = body.email;
    if (orderNumber.length > 32 || email.length > 254) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Order number or email is too long." } }, { status: 422 });
    }
    const found = await trackOrder(orderNumber, email);
    if (!found) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "No order matches that number and email." } }, { status: 404 });
    }
    // Data minimization: the requester matched the email, but the envelope
    // still ships only the fields the tracking page renders — the full order
    // row (phone, street address, postal) never leaves the server needlessly.
    return NextResponse.json({
      ok: true,
      data: {
        order: {
          orderNumber: found.order.orderNumber,
          fullName: found.order.fullName,
          status: found.order.status,
          deliveryMethod: found.order.deliveryMethod,
          deliverySlot: found.order.deliverySlot,
          storeSlug: found.order.storeSlug,
          totalCents: found.order.totalCents,
        },
        items: found.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, unitPriceCents: i.unitPriceCents, imageUrl: i.imageUrl })),
      },
    });
  } catch (err) {
    console.error("[api/track]", err);
    return NextResponse.json({ ok: false, error: { code: "TRACK_FAILED", message: "Could not look up your order." } }, { status: 500 });
  }
}

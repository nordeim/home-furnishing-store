import { NextResponse } from "next/server";
import { trackOrder } from "@/lib/server-data";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// PII lookup boundary — shared fixed-window seam (src/lib/rate-limit.ts):
// 20 req/min/IP, in-process, expired keys swept. The order-number+email pair
// makes enumeration hard, but the limiter still bounds the probe surface.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
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
  try {
    const found = await trackOrder(String(body.orderNumber ?? ""), String(body.email ?? ""));
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

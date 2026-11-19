import { NextResponse } from "next/server";
import { OrderRefusalError, placeOrder } from "@/lib/server-data";
import { clampInt, isValidDeliverySlot, isValidEmail, isValidPhone, isValidPostal } from "@/lib/utils";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Shared fixed-window seam (src/lib/rate-limit.ts): 20 req/min/IP, in-process,
// expired keys swept — the Task-119 consolidation of the four per-route Maps.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (limiter.throttled(ip)) {
      return NextResponse.json({ ok: false, error: { code: "RATE_LIMIT", message: "Too many attempts. Please wait a minute." } }, { status: 429, headers: { "Retry-After": String(limiter.retryAfterSec(ip)) } });
    }
    // Parse guard (Task 120 F-1): every sibling POST route parse-guards its
    // body; a malformed payload is a client fault → 400 with fixed copy, not
    // a 500 whose envelope echoes the parse failure text.
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Please send a valid request body." } }, { status: 400 });
    }
    // Field caps (Task 120 F-3): minimum-length checks alone left email,
    // fullName and address unbounded — unauthenticated writes persisted
    // verbatim. Order fields are REFUSED, never silently truncated (a
    // truncated delivery address is a broken order, and truncation must
    // never transform invalid input into a valid one at a write boundary).
    const email = String(body.email ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const postal = String(body.postal ?? "").trim();
    const address = String(body.address ?? "").trim();
    const rawLines = Array.isArray(body.lines) ? (body.lines as unknown[]) : [];
    // Task 122 F-7: the bag payload is bounded — a 101-line array must not
    // become a 101-row insert per request (every other field has always been
    // capped; lines was the unbounded residue).
    if (rawLines.length > 100)
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Your bag has too many lines — keep it under 100." } }, { status: 422 });
    // Per-line boundary validation (Task 118 F-17): a crafted non-finite qty or
    // productId must drop out here, not slip past Math.min/max as NaN into a
    // Postgres 500. qty clamps through the shared clampInt seam — the same
    // 1–99 clamp placeOrder itself applies; productId must be a positive
    // integer (unknown ids drop downstream, as they always have).
    const lines = rawLines
      .map((l) => {
        const line = (l ?? {}) as Record<string, unknown>;
        const productId = Number(line.productId);
        // Task 122 F-8: Number(null) === 0 is FINITE, so a null qty used to
        // min-clamp to 1 and place a quiet single-unit order — null/undefined
        // must drop the line like every other non-numeric qty.
        const rawQty = line.qty;
        const qtyNum = rawQty == null ? Number.NaN : Number(rawQty);
        return Number.isInteger(productId) && productId > 0
          ? { productId, qty: clampInt(qtyNum, 1, 99, Number.NaN) }
          : null;
      })
      .filter((l): l is { productId: number; qty: number } => l !== null && Number.isInteger(l.qty));

    if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter a valid email address." } }, { status: 422 });
    if (fullName.length < 2) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter the recipient's name." } }, { status: 422 });
    if (!isValidPhone(phone)) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter a valid phone number." } }, { status: 422 });
    if (!isValidPostal(postal)) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Postal code must be 6 digits." } }, { status: 422 });
    if (address.length < 6) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter your block, street and unit number." } }, { status: 422 });
    if (email.length > 254 || fullName.length > 80 || phone.length > 20 || address.length > 200)
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "One or more fields are too long — keep each under its stated limit." } }, { status: 422 });
    if (rawLines.length === 0 || lines.length === 0) return NextResponse.json({ ok: false, error: { code: "EMPTY_BAG", message: "Your bag is empty." } }, { status: 422 });

    // Task 121 F-7: storeSlug is validated against the three real stores (the
    // order/track pages render it as copy via storeName — a crafted slug
    // persisted verbatim was junk data in customer-facing text), and
    // deliverySlot is refused overlong like every other field — the Task-120
    // "refuse, never truncate" rule now has no slice() exceptions.
    const STORE_SLUGS = ["tampines", "jurong", "alexandra"];
    const storeSlug = String(body.storeSlug ?? "tampines");
    if (!STORE_SLUGS.includes(storeSlug))
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Choose one of our three stores." } }, { status: 422 });
    const deliverySlot = String(body.deliverySlot ?? "Standard (3–5 days)");
    if (deliverySlot.length > 80)
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Choose one of the offered time slots." } }, { status: 422 });
    // Task 123 F-3: length alone let crafted junk persist into customer-facing
    // copy ("Arriving {slot}" on the confirmation + tracking pages). The slot
    // must now be one the selected method actually offers (the shared
    // DELIVERY_SLOTS map — the same contract the UI's <select> enforces).
    const deliveryMethod = ["delivery", "click-collect", "express"].includes(String(body.deliveryMethod)) ? String(body.deliveryMethod) : "delivery";
    if (!isValidDeliverySlot(deliveryMethod, deliverySlot))
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Choose one of the offered time slots." } }, { status: 422 });
    // Task 122 F-7: promoCode joins the capped fields (the DB would refuse
    // any unknown code anyway — this refuses oversized payloads at the
    // boundary before the round-trip).
    const promoCode = typeof body.promoCode === "string" ? body.promoCode : null;
    if (promoCode !== null && promoCode.length > 32)
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "One or more fields are too long — keep each under its stated limit." } }, { status: 422 });

    const order = await placeOrder({
      email,
      fullName,
      phone,
      address,
      postal,
      deliveryMethod,
      deliverySlot,
      storeSlug,
      paymentMethod: ["card", "paynow", "grabpay", "atome"].includes(String(body.paymentMethod)) ? String(body.paymentMethod) : "card",
      promoCode,
      lines,
    });
    // Data minimization (Task 119, matching the track route): the confirmation
    // page needs only the order number — the full inserted row (email, phone,
    // address, postal) never ships back in the envelope.
    return NextResponse.json({ ok: true, data: { orderNumber: order.orderNumber } }, { status: 201 });
  } catch (err) {
    // Domain refusals carry their own stable envelope code (EMPTY_BAG /
    // INVALID_PROMO / LOW_STOCK) as a 422 — a client-correctable state.
    if (err instanceof OrderRefusalError) {
      return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: 422 });
    }
    // Fixed copy only (Task 120 F-1): the raw err.message (parse text, driver
    // connection strings) never reaches the public envelope — the detail
    // stays in the server log.
    console.error("[api/checkout]", err);
    return NextResponse.json({ ok: false, error: { code: "CHECKOUT_FAILED", message: "Checkout failed on our side — please try again in a moment." } }, { status: 500 });
  }
}

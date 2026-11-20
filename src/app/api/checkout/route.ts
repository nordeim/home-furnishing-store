import { NextResponse } from "next/server";
import { OrderRefusalError, placeOrder } from "@/lib/server-data";
import { clampInt, IDEMPOTENCY_KEY_RE, isValidDeliverySlot, isValidEmail, isValidPhone, isValidPostal } from "@/lib/utils";
import { STORES } from "@/lib/catalog";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Shared fixed-window seam (src/lib/rate-limit.ts): 20 req/min/IP, in-process,
// expired keys swept — the Task-119 consolidation of the four per-route Maps.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(req: Request) {
  try {
    const ip = clientIp(req.headers); // rightmost XFF hop (Task 125 G-2)
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
    // Task 128 F-1: valid-JSON NON-OBJECT bodies are the same client-fault
    // class as malformed JSON — `null` (and any primitive) parses cleanly but
    // is not a record, and the first `field in body` below is a TypeError on
    // them (a 500 "failed on our side" for a client fault, browser-verified).
    // An array body is refused here too: it limped to a 422 downstream as a
    // "bag" of nothing; it is not a JSON object and gets the 400 parse class.
    if (typeof body !== "object" || body === null || Array.isArray(body))
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Please send a valid request body." } }, { status: 400 });
    // Field caps (Task 120 F-3): minimum-length checks alone left email,
    // fullName and address unbounded — unauthenticated writes persisted
    // verbatim. Order fields are REFUSED, never silently truncated (a
    // truncated delivery address is a broken order, and truncation must
    // never transform invalid input into a valid one at a write boundary).
    // Task 127 F-2: the free-text fields are also TYPE-strict — String()
    // coercion let a single-element ARRAY pass every validator below
    // (String(["a@b.sg"]) === "a@b.sg"), the last coercing seam at this
    // boundary (lines went type-strict in Task 124 F-5). Present-but-not-a-
    // string is a 422; an ABSENT field still falls through to the empty
    // string and the existing min-length refusals.
    for (const field of ["email", "fullName", "phone", "postal", "address"] as const) {
      if (field in body && typeof body[field] !== "string")
        return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "One or more fields have an invalid type — please resend your order details." } }, { status: 422 });
    }
    // Task 126 F-1: optional client-minted idempotency key — a double-submit
    // or network retry re-POSTs the same bag and must replay the first order
    // instead of placing a second. Malformed keys are dropped to null (dedupe
    // is an enhancement, never a persisted field; a key-less POST behaves
    // exactly as before). Extracted early (Task 127 F-5) so the canonical
    // replay can bypass the empty-bag refusal below — a post-success
    // resubmit carries an already-cleared bag.
    // Task 128 F-6: the route consumes the EXPORTED seam (utils.ts) — the
    // inlined literal could drift from IDEMPOTENCY_KEY_RE while the unit pin
    // (which tests the constant, not the route) stayed green, silently
    // disabling dedupe for keys minted under the new shape.
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && IDEMPOTENCY_KEY_RE.test(body.idempotencyKey)
        ? body.idempotencyKey
        : null;
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
        // Task 124 F-5: TYPE-strict boundary. The Task-122 F-8 value-level
        // check (null/undefined) still let crafted TYPES through —
        // Number(true) === 1, Number([5]) === 5 and Number("3") === 3 are
        // all finite, so a boolean/array/string qty coerced to a real
        // quantity and placed a quiet order (Number("7") likewise coerced a
        // string productId). A non-number type now drops the line like every
        // other non-numeric value; qty still clamps through clampInt.
        const rawProductId = line.productId;
        const rawQty = line.qty;
        if (typeof rawProductId !== "number" || !Number.isInteger(rawProductId) || rawProductId <= 0) return null;
        if (typeof rawQty !== "number" || !Number.isFinite(rawQty)) return null;
        return { productId: rawProductId, qty: clampInt(rawQty, 1, 99, Number.NaN) };
      })
      .filter((l): l is { productId: number; qty: number } => l !== null && Number.isInteger(l.qty));

    if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter a valid email address." } }, { status: 422 });
    if (fullName.length < 2) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter the recipient's name." } }, { status: 422 });
    if (!isValidPhone(phone)) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter a valid phone number." } }, { status: 422 });
    if (!isValidPostal(postal)) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Postal code must be 6 digits." } }, { status: 422 });
    if (address.length < 6) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter your block, street and unit number." } }, { status: 422 });
    if (email.length > 254 || fullName.length > 80 || phone.length > 20 || address.length > 200)
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "One or more fields are too long — keep each under its stated limit." } }, { status: 422 });
    // Task 127 F-5: with an idempotency key present, the empty-bag refusal
    // defers to placeOrder — the canonical replay (key already bound to an
    // order with this email) must answer with that order even though the
    // client cleared its bag after the success redirect. A key with NO bound
    // order still EMPTY_BAG-refuses inside placeOrder (fresh intent).
    if ((rawLines.length === 0 || lines.length === 0) && !idempotencyKey) return NextResponse.json({ ok: false, error: { code: "EMPTY_BAG", message: "Your bag is empty." } }, { status: 422 });

    // Task 121 F-7: storeSlug is validated against the three real stores (the
    // order/track pages render it as copy via storeName — a crafted slug
    // persisted verbatim was junk data in customer-facing text), and
    // deliverySlot is refused overlong like every other field — the Task-120
    // "refuse, never truncate" rule now has no slice() exceptions.
    // Task 129 F-11: the whitelist derives from the STORES seed — the last
    // hand-duplicated store list (a fourth store previously needed four
    // coordinated edits across route/page/Header).
    const STORE_SLUGS = STORES.map((s) => s.slug);
    // Task 130 F-1: storeSlug joins the TYPE-strict set (the lesson-43
    // field-class rule, one field short in Task 129) — String(["tampines"])
    // coerced to a real slug and rode the whitelist into a 201 order on a
    // crafted type. There is no UI null-encoding to preserve (unlike
    // promoCode): the checkout page's store select always sends a real
    // string, and an absent field keeps the documented "tampines" default.
    if ("storeSlug" in body && typeof body.storeSlug !== "string")
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: `Choose one of our ${STORES.length} stores.` } }, { status: 422 });
    const storeSlug = String(body.storeSlug ?? "tampines");
    if (!STORE_SLUGS.includes(storeSlug))
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: `Choose one of our ${STORES.length} stores.` } }, { status: 422 });
    // Task 127 F-2: deliverySlot joins the TYPE-strict set — String() coercion
    // let a single-element array ride into the DELIVERY_SLOTS coherence check
    // below (same class as the five free-text fields above; an absent slot
    // still falls to the documented default).
    if ("deliverySlot" in body && typeof body.deliverySlot !== "string")
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Choose one of the offered time slots." } }, { status: 422 });
    const deliverySlot = String(body.deliverySlot ?? "Standard (3–5 days)");
    if (deliverySlot.length > 80)
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Choose one of the offered time slots." } }, { status: 422 });
    // Task 123 F-3: length alone let crafted junk persist into customer-facing
    // copy ("Arriving {slot}" on the confirmation + tracking pages). The slot
    // must now be one the selected method actually offers (the shared
    // DELIVERY_SLOTS map — the same contract the UI's <select> enforces).
    // Task 129 F-3: deliveryMethod joins the TYPE-strict + whitelist posture
    // its enum siblings already enforce (storeSlug Task 121 F-7, deliverySlot
    // Task 123 F-3 / 127 F-2) — String() coercion let crafted values ride a
    // silent default. Present-but-invalid (wrong type OR unknown string) is a
    // 422; an ABSENT field keeps the documented "delivery" default.
    const DELIVERY_METHODS = ["delivery", "click-collect", "express"];
    let deliveryMethod = "delivery";
    if ("deliveryMethod" in body) {
      const dm = body.deliveryMethod;
      if (typeof dm !== "string" || !DELIVERY_METHODS.includes(dm))
        return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Choose a delivery method." } }, { status: 422 });
      deliveryMethod = dm;
    }
    if (!isValidDeliverySlot(deliveryMethod, deliverySlot))
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Choose one of the offered time slots." } }, { status: 422 });
    // Task 122 F-7: promoCode joins the capped fields (the DB would refuse
    // any unknown code anyway — this refuses oversized payloads at the
    // boundary before the round-trip).
    // Task 129 F-3: promoCode is also TYPE-strict — `promoCode: 42` used to
    // null-drop silently. `promoCode: null` STAYS accepted: it is the
    // checkout UI's own "no promo" encoding (the page always sends the key;
    // cart-store types it string | null).
    if ("promoCode" in body && body.promoCode !== null && typeof body.promoCode !== "string")
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter a valid promo code." } }, { status: 422 });
    const promoCode = typeof body.promoCode === "string" ? body.promoCode : null;
    if (promoCode !== null && promoCode.length > 32)
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "One or more fields are too long — keep each under its stated limit." } }, { status: 422 });
    // Task 129 F-3 (the enum trio's last member): paymentMethod TYPE-strict +
    // whitelist-strict — String(["card"]) === "card" placed a REAL 201 order
    // on a crafted type. Absent keeps the documented "card" default.
    const PAYMENT_METHODS = ["card", "paynow", "grabpay", "atome"];
    let paymentMethod = "card";
    if ("paymentMethod" in body) {
      const pm = body.paymentMethod;
      if (typeof pm !== "string" || !PAYMENT_METHODS.includes(pm))
        return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Choose a payment method." } }, { status: 422 });
      paymentMethod = pm;
    }

    const { order, replayed } = await placeOrder({
      email,
      fullName,
      phone,
      address,
      postal,
      deliveryMethod,
      deliverySlot,
      storeSlug,
      paymentMethod,
      promoCode,
      lines,
      idempotencyKey,
    });
    // Data minimization (Task 119, matching the track route): the confirmation
    // page needs only the order number — the full inserted row (email, phone,
    // address, postal) never ships back in the envelope. A replay answers 200
    // (nothing was created) with the SAME number the first call returned.
    return NextResponse.json({ ok: true, data: { orderNumber: order.orderNumber } }, { status: replayed ? 200 : 201 });
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

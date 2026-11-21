import { NextResponse } from "next/server";
import { getReviewCount, getReviews, submitReview } from "@/lib/server-data";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { MAX_INT4 } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Unauthenticated write boundary — shared fixed-window seam
// (src/lib/rate-limit.ts): 20 req/min/IP, in-process, expired keys swept.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("productId");
  // Task 126 F-5: whole-number strings only — the old Number() coercion let
  // ?productId=1.5 floor into a real product's review list (and any junk
  // text hit the DB layer as NaN). Missing stays a 400; a present-but-
  // malformed value is a 422 (the boundary stance).
  if (!raw) return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "productId is required." } }, { status: 400 });
  // Task 126 F-5 whole-number discipline + Task 133 F-1: the int4 ceiling —
  // a 10-digit id passes the regex but the driver rejects the parameter for
  // the integer column (22003 → degrade-to-[] here, a silent inconsistency
  // with the 1.5 refusal). Present-but-above-MAX_INT4 is a 422 like every
  // other malformed value.
  if (!/^\d+$/.test(raw) || Number(raw) <= 0 || Number(raw) > MAX_INT4) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "productId must be a whole number." } }, { status: 422 });
  }
  const productId = Number(raw);
  // Task 140 F-1: the TRUE row count rides beside the capped list (the
  // additive `count` field) — the ReviewSection recovery refetch adopts it
  // instead of minting a count from client-side arithmetic (list length
  // saturates at the 20-row cap; the count(*) never does). A null count
  // joins the null list in the DB_DOWN envelope — the Task-137 unified
  // outage signal, mirrored at the boundary.
  const [data, count] = await Promise.all([getReviews(productId), getReviewCount(productId)]);
  // Task 136 F-3: the outage signal is null — an honest failure envelope
  // beats the old degrade-to-[] (a false "no reviews" answer for a product
  // with live reviews — the ok-with-data discipline at a boundary that has
  // NO static fallback). The health route's DB_DOWN posture.
  if (data === null || count === null)
    return NextResponse.json({ ok: false, error: { code: "DB_DOWN", message: "Reviews are unavailable right now — please try again in a moment." } }, { status: 500 });
  return NextResponse.json({ ok: true, data, count });
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req.headers); // rightmost XFF hop (Task 125 G-2)
    if (limiter.throttled(ip)) {
      return NextResponse.json({ ok: false, error: { code: "RATE_LIMIT", message: "Too many attempts. Please wait a minute." } }, { status: 429, headers: { "Retry-After": String(limiter.retryAfterSec(ip)) } });
    }

    let body: { productId?: number; author?: string; rating?: number; title?: string; body?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      // Malformed payload is a client error, not a server fault.
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Expected a JSON body." } }, { status: 400 });
    }
    // Task 128 F-1: a valid-JSON NON-OBJECT body (`null`) is the same
    // client-fault class — the property reads below are TypeErrors on it
    // (a 500 for a client fault). Guard the shape beside the parse guard.
    // Task 130 F-5: arrays join the class (the checkout parity — an array
    // is typeof "object" and parses cleanly, but it is not the record the
    // field reads assume; it used to limp to a 422 on fields it never had).
    if (typeof body !== "object" || body === null || Array.isArray(body))
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Expected a JSON body." } }, { status: 400 });

    // Task 125 F-2: TYPE-strict, mirroring the checkout boundary's Task-124
    // F-5 stance. The old Number()/String() coercions let crafted TYPES
    // persist junk: Number(true)===1, Number([3])===3, Number("5")===5, and
    // String(1e19) is a 20-char "name" that sails past the ≤60 cap. Non-number
    // productId/rating and non-string author/title/body are client errors now.
    const productId = body.productId;
    const rating = body.rating;
    // Task 122 F-11: REFUSE overlong fields, never silently truncate — the
    // checkout route's Task-120 rule, now applied consistently across write
    // boundaries. A sliced 3000-char review is the user's words mangled into
    // a "valid" row; the client maxLengths (60/120/2000) match these caps.
    // Positive-integer productId: a non-existent or negative id is a client
    // error (422), not an FK-crash 500. The existence check closes the gap the
    // comment always claimed: an unknown-but-positive id used to reach the
    // insert and fail as a Postgres FK violation (500).
    // Task 133 F-1: the int4 ceiling on the numeric-arg sibling — 2^31
    // passed every JS gate below and the products.id lookup answered 22003
    // → 500 REVIEW_FAILED for a pure client fault (the Task-118 F-6 class,
    // upper-bound corner; observed live). Same 422 as the unknown-id gate.
    if (
      typeof productId !== "number" || !Number.isInteger(productId) || productId <= 0 || productId > MAX_INT4 ||
      typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5 ||
      typeof body.author !== "string" || body.author.trim().length < 2 ||
      !(typeof body.title === "string" || body.title == null) ||
      !(typeof body.body === "string" || body.body == null)
    ) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Please add your name and a 1–5 star rating." } }, { status: 422 });
    }
    const author = body.author.trim();
    const title = (typeof body.title === "string" ? body.title : "").trim();
    const text = (typeof body.body === "string" ? body.body : "").trim();
    if (author.length > 60 || title.length > 120 || text.length > 2000) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "One or more fields are too long — keep the name under 60, the headline under 120 and the review under 2000 characters." } }, { status: 422 });
    }
    // Task 136 F-2: the product-existence read and the insert delegate to the
    // server-data funnel seam (the golden rule — this was the only write path
    // outside it). Unknown product → the 422 envelope; DB faults propagate as
    // exceptions to the fixed-copy 500 below (unchanged posture).
    const saved = await submitReview({ productId, author, rating, title, body: text });
    if (!saved.ok) return NextResponse.json(saved, { status: 422 });
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("[api/reviews]", err);
    return NextResponse.json({ ok: false, error: { code: "REVIEW_FAILED", message: "Could not save your review." } }, { status: 500 });
  }
}

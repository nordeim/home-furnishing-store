import { NextResponse } from "next/server";
import { db } from "@/db";
import { getReviews } from "@/lib/server-data";
import { products, reviews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Unauthenticated write boundary — shared fixed-window seam
// (src/lib/rate-limit.ts): 20 req/min/IP, in-process, expired keys swept.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = Number(url.searchParams.get("productId") ?? "0");
  if (!productId) return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "productId is required." } }, { status: 400 });
  const data = await getReviews(productId);
  return NextResponse.json({ ok: true, data });
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
    if (
      typeof productId !== "number" || !Number.isInteger(productId) || productId <= 0 ||
      typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5 ||
      typeof body.author !== "string" || body.author.trim().length < 2 ||
      !(typeof body.title === "string" || body.title == null) ||
      !(typeof body.body === "string" || body.body == null)
    ) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Please add your name and a 1–5 star rating." } }, { status: 422 });
    }
    const author = body.author.trim();
    const known = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
    if (known.length === 0) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "That product does not exist." } }, { status: 422 });
    }
    const title = (typeof body.title === "string" ? body.title : "").trim();
    const text = (typeof body.body === "string" ? body.body : "").trim();
    if (author.length > 60 || title.length > 120 || text.length > 2000) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "One or more fields are too long — keep the name under 60, the headline under 120 and the review under 2000 characters." } }, { status: 422 });
    }
    const ins = await db.insert(reviews).values({ productId, author, rating, title, body: text, verified: false }).returning();
    return NextResponse.json({ ok: true, data: ins[0] }, { status: 201 });
  } catch (err) {
    console.error("[api/reviews]", err);
    return NextResponse.json({ ok: false, error: { code: "REVIEW_FAILED", message: "Could not save your review." } }, { status: 500 });
  }
}

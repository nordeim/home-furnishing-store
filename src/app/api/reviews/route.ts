import { NextResponse } from "next/server";
import { db } from "@/db";
import { getReviews } from "@/lib/server-data";
import { reviews } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = Number(url.searchParams.get("productId") ?? "0");
  if (!productId) return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "productId is required." } }, { status: 400 });
  const data = await getReviews(productId);
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { productId?: number; author?: string; rating?: number; title?: string; body?: string };
    const productId = Math.floor(Number(body.productId));
    const rating = Math.floor(Number(body.rating));
    const author = String(body.author ?? "").trim().slice(0, 60);
    if (!productId || !(rating >= 1 && rating <= 5) || author.length < 2) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Please add your name and a 1–5 star rating." } }, { status: 422 });
    }
    const title = String(body.title ?? "").trim().slice(0, 120);
    const text = String(body.body ?? "").trim().slice(0, 2000);
    const ins = await db.insert(reviews).values({ productId, author, rating, title, body: text, verified: false }).returning();
    return NextResponse.json({ ok: true, data: ins[0] }, { status: 201 });
  } catch (err) {
    console.error("[api/reviews]", err);
    return NextResponse.json({ ok: false, error: { code: "REVIEW_FAILED", message: "Could not save your review." } }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { validatePromo } from "@/lib/server-data";

export const dynamic = "force-dynamic";

// Every validation is a Postgres read (ensureSeed + select) — same fixed-window
// limiter posture as the checkout and reviews routes (20 req/min/IP, in-process;
// documented single-node limitation) bounds the unauthenticated DB hit rate.
const rate = new Map<string, { n: number; reset: number }>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const row = rate.get(ip);
  if (!row || now > row.reset) {
    rate.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  row.n += 1;
  return row.n > 20;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) {
    return NextResponse.json({ ok: false, error: { code: "RATE_LIMIT", message: "Too many attempts. Please wait a minute." } }, { status: 429 });
  }
  let body: { code?: string; subtotalCents?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // Malformed payload is a client error, not a server fault.
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Expected a JSON body." } }, { status: 400 });
  }
  try {
    const result = await validatePromo(String(body.code ?? ""), Math.max(0, Math.round(Number(body.subtotalCents) || 0)));
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_PROMO", message: result.error } }, { status: 422 });
    }
    return NextResponse.json({ ok: true, data: result.promo });
  } catch (err) {
    console.error("[api/promo]", err);
    return NextResponse.json({ ok: false, error: { code: "PROMO_FAILED", message: "Could not validate this code." } }, { status: 500 });
  }
}

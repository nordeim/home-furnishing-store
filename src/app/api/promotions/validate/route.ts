import { NextResponse } from "next/server";
import { validatePromo } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

import { NextResponse } from "next/server";
import { validatePromo } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { code?: string; subtotalCents?: number };
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

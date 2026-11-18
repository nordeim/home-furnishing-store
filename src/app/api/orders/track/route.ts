import { NextResponse } from "next/server";
import { trackOrder } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { orderNumber?: string; email?: string };
    const found = await trackOrder(String(body.orderNumber ?? ""), String(body.email ?? ""));
    if (!found) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "No order matches that number and email." } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: found });
  } catch (err) {
    console.error("[api/track]", err);
    return NextResponse.json({ ok: false, error: { code: "TRACK_FAILED", message: "Could not look up your order." } }, { status: 500 });
  }
}

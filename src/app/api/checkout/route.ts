import { NextResponse } from "next/server";
import { placeOrder } from "@/lib/server-data";
import { clampInt, isValidEmail, isValidPhone, isValidPostal } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (throttled(ip)) {
      return NextResponse.json({ ok: false, error: { code: "RATE_LIMIT", message: "Too many attempts. Please wait a minute." } }, { status: 429 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const phone = String(body.phone ?? "");
    const postal = String(body.postal ?? "");
    const address = String(body.address ?? "").trim();
    const rawLines = Array.isArray(body.lines) ? (body.lines as unknown[]) : [];
    // Per-line boundary validation (Task 118 F-17): a crafted non-finite qty or
    // productId must drop out here, not slip past Math.min/max as NaN into a
    // Postgres 500. qty clamps through the shared clampInt seam — the same
    // 1–99 clamp placeOrder itself applies; productId must be a positive
    // integer (unknown ids drop downstream, as they always have).
    const lines = rawLines
      .map((l) => {
        const line = (l ?? {}) as Record<string, unknown>;
        const productId = Number(line.productId);
        return Number.isInteger(productId) && productId > 0
          ? { productId, qty: clampInt(Number(line.qty), 1, 99, Number.NaN) }
          : null;
      })
      .filter((l): l is { productId: number; qty: number } => l !== null && Number.isInteger(l.qty));

    if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter a valid email address." } }, { status: 422 });
    if (fullName.length < 2) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter the recipient's name." } }, { status: 422 });
    if (!isValidPhone(phone)) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter a valid phone number." } }, { status: 422 });
    if (!isValidPostal(postal)) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Postal code must be 6 digits." } }, { status: 422 });
    if (address.length < 6) return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Enter your block, street and unit number." } }, { status: 422 });
    if (rawLines.length === 0 || lines.length === 0) return NextResponse.json({ ok: false, error: { code: "EMPTY_BAG", message: "Your bag is empty." } }, { status: 422 });

    const order = await placeOrder({
      email,
      fullName,
      phone,
      address,
      postal,
      deliveryMethod: ["delivery", "click-collect", "express"].includes(String(body.deliveryMethod)) ? String(body.deliveryMethod) : "delivery",
      deliverySlot: String(body.deliverySlot ?? "Standard (3–5 days)").slice(0, 80),
      storeSlug: String(body.storeSlug ?? "tampines").slice(0, 40),
      paymentMethod: ["card", "paynow", "grabpay", "atome"].includes(String(body.paymentMethod)) ? String(body.paymentMethod) : "card",
      promoCode: typeof body.promoCode === "string" ? body.promoCode : null,
      lines,
      totals: { subtotalCents: 0, discountCents: 0, deliveryFeeCents: 0, gstCents: 0, totalCents: 0 },
    });
    return NextResponse.json({ ok: true, data: order }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed.";
    console.error("[api/checkout]", err);
    const status = /promo|bag|minimum|valid/i.test(message) ? 422 : 500;
    return NextResponse.json({ ok: false, error: { code: "CHECKOUT_FAILED", message } }, { status });
  }
}

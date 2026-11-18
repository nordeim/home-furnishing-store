import { describe, expect, it } from "vitest";
import { formatSGD, priceTotals, clampInt, isValidEmail, isValidPhone, isValidPostal, orderNumber, stars, GST_RATE, FREE_DELIVERY_THRESHOLD_CENTS } from "@/lib/utils";

describe("formatSGD", () => {
  // The currency symbol depends on the node build's ICU data ($ vs S$) — assert
  // the cents→dollars conversion and the 2-decimal money shape, not the symbol.
  it("formats integer cents as dollars with 2 decimals and thousands separators", () => {
    expect(formatSGD(129900)).toMatch(/1,299\.00$/);
    expect(formatSGD(0)).toMatch(/0\.00$/);
    expect(formatSGD(590)).toMatch(/5\.90$/);
    expect(formatSGD(123456789)).toMatch(/1,234,567\.89$/);
  });
  it("degrades non-finite input to zero", () => {
    expect(formatSGD(Number.NaN)).toMatch(/0\.00$/);
    expect(formatSGD(Number.POSITIVE_INFINITY)).toMatch(/0\.00$/);
  });
});

describe("priceTotals (server-truth pricing rules)", () => {
  it("no promo, standard delivery under threshold → $12 fee", () => {
    const t = priceTotals({ subtotalCents: 5000, promo: null, deliveryMethod: "delivery" });
    expect(t).toEqual({ subtotalCents: 5000, discountCents: 0, deliveryFeeCents: 1200, gstCents: Math.round(6200 * GST_RATE / 1.09), totalCents: 6200 });
  });
  it("net ≥ $200 → free standard delivery", () => {
    const t = priceTotals({ subtotalCents: FREE_DELIVERY_THRESHOLD_CENTS, promo: null, deliveryMethod: "delivery" });
    expect(t.deliveryFeeCents).toBe(0);
    expect(t.totalCents).toBe(20000);
  });
  it("percent promo: MAKAN15 on $799 table (documented journey)", () => {
    const t = priceTotals({ subtotalCents: 79900, promo: { kind: "percent", value: 15 }, deliveryMethod: "delivery" });
    expect(t.discountCents).toBe(11985); // 15% of 799.00
    expect(t.deliveryFeeCents).toBe(0);  // net 679.15 ≥ 200
    expect(t.totalCents).toBe(67915);
  });
  it("fixed promo is capped at the subtotal", () => {
    const t = priceTotals({ subtotalCents: 1500, promo: { kind: "fixed", value: 2000 }, deliveryMethod: "click-collect" });
    expect(t.discountCents).toBe(1500);
    expect(t.totalCents).toBe(0);
  });
  it("percent discount frees delivery when the NET crosses the threshold", () => {
    // 210.00 − 10% = 189.00 < 200 → delivery applies (rule is on net, not subtotal)
    const t = priceTotals({ subtotalCents: 21000, promo: { kind: "percent", value: 10 }, deliveryMethod: "delivery" });
    expect(t.deliveryFeeCents).toBe(1200);
    expect(t.totalCents).toBe(20100);
  });
  it("express always costs $29; click & collect is always free", () => {
    expect(priceTotals({ subtotalCents: 5000, promo: null, deliveryMethod: "express" }).deliveryFeeCents).toBe(2900);
    expect(priceTotals({ subtotalCents: 5000, promo: null, deliveryMethod: "click-collect" }).deliveryFeeCents).toBe(0);
  });
  it("GST is back-calculated from the GST-inclusive total", () => {
    const t = priceTotals({ subtotalCents: 259800, promo: { kind: "percent", value: 10 }, deliveryMethod: "delivery" });
    // The verified live order: subtotal 2598.00, WELCOME10 −259.80, free delivery, total 2338.20
    expect(t.discountCents).toBe(25980);
    expect(t.totalCents).toBe(233820);
    expect(t.gstCents).toBe(19306); // 233820 × 0.09 / 1.09
    expect(t.subtotalCents - t.discountCents + t.deliveryFeeCents).toBe(t.totalCents);
  });
});

describe("validators", () => {
  it("email", () => {
    expect(isValidEmail("me@example.sg")).toBe(true);
    expect(isValidEmail("  me@example.sg  ")).toBe(true);
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });
  it("phone accepts +65 and spaced formats, rejects short junk", () => {
    expect(isValidPhone("+65 9123 4567")).toBe(true);
    expect(isValidPhone("91234567")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("++--")).toBe(false);
  });
  it("postal: exactly 6 digits", () => {
    expect(isValidPostal("521123")).toBe(true);
    expect(isValidPostal(" 521123 ")).toBe(true);
    expect(isValidPostal("52112")).toBe(false);
    expect(isValidPostal("5211234")).toBe(false);
    expect(isValidPostal("52A123")).toBe(false);
  });
});

describe("clampInt", () => {
  it("clamps into range and floors non-integers", () => {
    expect(clampInt(150, 1, 99, 1)).toBe(99);
    expect(clampInt(0, 1, 99, 1)).toBe(1);
    expect(clampInt(2.9, 1, 99, 1)).toBe(2);
    expect(clampInt(NaN, 1, 99, 7)).toBe(7);
    expect(clampInt("nope", 1, 99, 7)).toBe(7);
  });
});

describe("orderNumber", () => {
  it("matches NH-YYYYMMDD-XXXXXX with today's date", () => {
    const n = orderNumber();
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    expect(n).toMatch(new RegExp(`^NH-${ymd}-[A-Z0-9]{6}$`));
  });
});

describe("stars", () => {
  it("rounds halves up and clamps to 0–5", () => {
    expect(stars(4.5)).toEqual({ full: 4, half: true, empty: 0 });
    expect(stars(4.4)).toEqual({ full: 4, half: false, empty: 1 });
    expect(stars(7)).toEqual({ full: 5, half: false, empty: 0 });
    expect(stars(-1)).toEqual({ full: 0, half: false, empty: 5 });
  });
});

import { describe, expect, it } from "vitest";
import { formatSGD, priceTotals, clampInt, isValidEmail, isValidPhone, isValidPostal, orderNumber, stars, GST_RATE, FREE_DELIVERY_THRESHOLD_CENTS, familyVoucherCents, visibleBadges, ORDER_STEPS, orderStepIndex } from "@/lib/utils";

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

describe("familyVoucherCents (Family programme rule: $5 voucher per 1,000 pts)", () => {
  // The rule is printed on the /family page itself: "10 points per $1 —
  // $5 voucher every 1,000 pts". Expected values are worked examples of that
  // rule, NOT recomputations of the implementation.
  it("default $1,200/yr spend → 12,000 pts → 12 × $5 = $60", () => {
    expect(familyVoucherCents(12000)).toBe(6000);
  });
  it("sub-threshold points earn nothing", () => {
    expect(familyVoucherCents(999)).toBe(0);
  });
  it("exactly 1,000 pts → one $5 voucher", () => {
    expect(familyVoucherCents(1000)).toBe(500);
  });
  it("partial vouchers floor down: 2,999 pts → 2 vouchers", () => {
    expect(familyVoucherCents(2999)).toBe(1000);
  });
  it("zero and negative inputs earn nothing", () => {
    expect(familyVoucherCents(0)).toBe(0);
    expect(familyVoucherCents(-500)).toBe(0);
  });
});

describe("visibleBadges (dedupe catalogue badge literals against computed chips)", () => {
  // ProductCard renders a computed red "-{discount}%" chip and a blue "New"
  // chip; several catalogue rows ALSO carry the same value as a badge literal
  // (e.g. nordlys badges ["-24%"] with compareAt −24%). The helper must keep
  // legitimate badges and drop only the duplicates.
  it("drops a percent literal that matches the computed discount", () => {
    expect(visibleBadges(["-24%"], { isNew: false, discountPercent: 24 })).toEqual([]);
    expect(visibleBadges(["Bestseller", "-19%"], { isNew: false, discountPercent: 19 })).toEqual(["Bestseller"]);
  });
  it("keeps a percent literal that does NOT match the computed discount", () => {
    expect(visibleBadges(["-17%"], { isNew: false, discountPercent: 23 })).toEqual(["-17%"]);
  });
  it("drops a literal 'New' when the isNew chip already renders, keeps it otherwise", () => {
    expect(visibleBadges(["New"], { isNew: true, discountPercent: 0 })).toEqual([]);
    expect(visibleBadges(["New"], { isNew: false, discountPercent: 0 })).toEqual(["New"]);
  });
  it("keeps qualitative badges untouched", () => {
    expect(visibleBadges(["Family pick"], { isNew: true, discountPercent: 10 })).toEqual(["Family pick"]);
    expect(visibleBadges([], { isNew: true, discountPercent: 10 })).toEqual([]);
  });
  it("dedupes repeated literals within the badge list itself", () => {
    expect(visibleBadges(["Bestseller", "Bestseller"], { isNew: false, discountPercent: 0 })).toEqual(["Bestseller"]);
  });
});

describe("orderStepIndex + ORDER_STEPS (the shared order-progress ladder)", () => {
  // Task 120 F-16: track-order and the order page each hand-rolled a copy of
  // the status→step mapping; the seam keeps one truth. Unknown/na statuses
  // floor at "Confirmed" (the documented default for freshly placed orders).
  it("maps each documented status to its ladder step", () => {
    expect(orderStepIndex("confirmed")).toBe(0);
    expect(orderStepIndex("picking")).toBe(1);
    expect(orderStepIndex("shipped")).toBe(2);
    expect(orderStepIndex("delivered")).toBe(3);
  });
  it("floors unknown statuses at step 0 (honest default)", () => {
    expect(orderStepIndex("unknown-status")).toBe(0);
    expect(orderStepIndex("")).toBe(0);
  });
  it("ladder has the four documented steps in order", () => {
    expect(ORDER_STEPS).toEqual(["Confirmed", "Picking", "On the way", "Delivered"]);
  });
});

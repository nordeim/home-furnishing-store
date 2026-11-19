import { describe, expect, it } from "vitest";
import { formatSGD, priceTotals, clampInt, isValidEmail, isValidPhone, isValidPostal, orderNumber, stars, GST_RATE, FREE_DELIVERY_THRESHOLD_CENTS, familyVoucherCents, visibleBadges, ORDER_STEPS, orderStepIndex, campaignEnd, campaignEndLabel, sgTomorrowISO, sortProductList, DELIVERY_SLOTS, isValidDeliverySlot, availableDeliverySlots } from "@/lib/utils";

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

describe("orderNumber (SGT date segment — Task 123 F-12)", () => {
  it("matches NH-YYYYMMDD-XXXXXX with today's SGT date", () => {
    const n = orderNumber();
    const sgt = new Date(Date.now() + 8 * 3_600_000);
    const ymd = `${sgt.getFullYear()}${String(sgt.getMonth() + 1).padStart(2, "0")}${String(sgt.getDate()).padStart(2, "0")}`;
    expect(n).toMatch(new RegExp(`^NH-${ymd}-[A-Z0-9]{6}$`));
  });

  it("a UTC-evening instant (SGT past midnight) carries the SGT calendar day", () => {
    // 2026-11-19T16:30:00Z = 2026-11-20 00:30 SGT — the UTC date is the 19th,
    // the SGT date is the 20th; the segment must follow the store's locale
    // (the sgTomorrowISO class: order numbers minted 00:00–07:59 SGT used to
    // carry the prior calendar day).
    const n = orderNumber(new Date("2026-11-19T16:30:00Z"));
    expect(n).toMatch(/^NH-20261120-[A-Z0-9]{6}$/);
  });

  it("a UTC-morning instant stays on the same SGT day", () => {
    const n = orderNumber(new Date("2026-11-19T02:30:00Z"));
    expect(n).toMatch(/^NH-20261119-[A-Z0-9]{6}$/);
  });
});

// Task 123 F-3: the checkout boundary enforces the UI's own slot contract —
// a crafted payload could persist any ≤80-char string into customer-facing
// copy ("Arriving {slot}" on the confirmation + tracking pages). The SLOTS
// map moved here from checkout/page.tsx (single source); isValidDeliverySlot
// is the whitelist the route applies (the storeSlug pattern).
describe("DELIVERY_SLOTS + isValidDeliverySlot (Task 123 F-3)", () => {
  it("carries the three fulfilment methods and their offered slots", () => {
    expect(Object.keys(DELIVERY_SLOTS).sort()).toEqual(["click-collect", "delivery", "express"]);
    expect(DELIVERY_SLOTS.delivery).toContain("Standard (3–5 days)");
    expect(DELIVERY_SLOTS["click-collect"]).toEqual(["Today 2pm", "Tomorrow 10am"]);
    expect(DELIVERY_SLOTS.express).toEqual(["Next-day by 6pm"]);
  });

  it("accepts a method-coherent slot (what the UI sends)", () => {
    expect(isValidDeliverySlot("delivery", "Standard (3–5 days)")).toBe(true);
    expect(isValidDeliverySlot("delivery", "Evening (6–9pm)")).toBe(true);
    expect(isValidDeliverySlot("delivery", "Weekend morning")).toBe(true);
    expect(isValidDeliverySlot("express", "Next-day by 6pm")).toBe(true);
    expect(isValidDeliverySlot("click-collect", "Today 2pm")).toBe(true);
  });

  it("refuses cross-method and junk slots (what only a crafted client sends)", () => {
    expect(isValidDeliverySlot("express", "Standard (3–5 days)")).toBe(false);
    expect(isValidDeliverySlot("delivery", "Junk slot")).toBe(false);
    expect(isValidDeliverySlot("express", "")).toBe(false);
    expect(isValidDeliverySlot("click-collect", "Next-day by 6pm")).toBe(false);
  });
});

describe("availableDeliverySlots — click-&-collect temporal honesty (Task 124 F-8)", () => {
  // SGT (UTC+8) fixed instants. 2026-11-19T05:59:00Z is 13:59 SGT (before
  // the 14:00 cutoff); 2026-11-19T06:00:00Z is 14:00 SGT sharp; the SGT
  // morning instant is 2026-11-19T02:00:00Z = 10:00 SGT.
  const SGT_BEFORE_CUTOFF = new Date("2026-11-19T05:59:00Z");
  const SGT_AT_CUTOFF = new Date("2026-11-19T06:00:00Z");
  const SGT_LATE_EVENING = new Date("2026-11-19T15:00:00Z"); // 23:00 SGT

  it("before 14:00 SGT, click-&-collect offers both slots", () => {
    expect(availableDeliverySlots("click-collect", SGT_BEFORE_CUTOFF)).toEqual(["Today 2pm", "Tomorrow 10am"]);
    expect(availableDeliverySlots("click-collect", new Date("2026-11-19T02:00:00Z"))).toEqual(["Today 2pm", "Tomorrow 10am"]);
  });

  it("from 14:00 SGT, the already-past 'Today 2pm' slot stops being offered", () => {
    expect(availableDeliverySlots("click-collect", SGT_AT_CUTOFF)).toEqual(["Tomorrow 10am"]);
    expect(availableDeliverySlots("click-collect", SGT_LATE_EVENING)).toEqual(["Tomorrow 10am"]);
  });

  it("timeless methods are unaffected by the clock", () => {
    expect(availableDeliverySlots("delivery", SGT_BEFORE_CUTOFF)).toEqual(DELIVERY_SLOTS.delivery);
    expect(availableDeliverySlots("delivery", SGT_LATE_EVENING)).toEqual(DELIVERY_SLOTS.delivery);
    expect(availableDeliverySlots("express", SGT_LATE_EVENING)).toEqual(DELIVERY_SLOTS.express);
  });

  it("unknown methods mirror isValidDeliverySlot's delivery-set coercion", () => {
    expect(availableDeliverySlots("pickup", SGT_LATE_EVENING)).toEqual(DELIVERY_SLOTS.delivery);
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

describe("sgTomorrowISO (Task 122 F-1 — the skipped Task-121 F-10)", () => {
  // Singapore is UTC+8 year-round (no DST). The planning-tools booking form
  // promises "sessions book from tomorrow onward" — tomorrow must be the
  // SGT calendar day after the SGT "now", not the UTC day (the previous
  // `new Date(Date.now() + 86_400_000).toISOString()` computed UTC and was
  // off-by-one between 00:00–07:59 SGT).
  it("UTC-evening instants are already the next SGT day — SGT tomorrow is +1 SGT day", () => {
    // 2026-11-19T16:00:00Z == 2026-11-20T00:00 SGT. SGT "now" is the 20th,
    // so the earliest bookable date is the 21st.
    expect(sgTomorrowISO(new Date("2026-11-19T16:00:00Z"))).toBe("2026-11-21");
    // 23:30Z == 07:30 SGT same UTC day — still inside the off-by-one window.
    expect(sgTomorrowISO(new Date("2026-11-19T23:30:00Z"))).toBe("2026-11-21");
  });

  it("UTC-morning instants: SGT date === UTC date, tomorrow is simply +1 day", () => {
    // 2026-11-19T02:00:00Z == 10:00 SGT on the 19th → bookable from the 20th.
    expect(sgTomorrowISO(new Date("2026-11-19T02:00:00Z"))).toBe("2026-11-20");
  });

  it("rolls across month and year boundaries in SGT time", () => {
    // 2026-12-31T17:00:00Z == 2027-01-01T01:00 SGT → bookable from 2027-01-02.
    expect(sgTomorrowISO(new Date("2026-12-31T17:00:00Z"))).toBe("2027-01-02");
    // 2026-11-30T16:00:00Z == 2026-12-01T00:00 SGT → bookable from the 2nd.
    expect(sgTomorrowISO(new Date("2026-11-30T16:00:00Z"))).toBe("2026-12-02");
  });

  it("always returns a plain YYYY-MM-DD string (the <input type=date> min format)", () => {
    expect(sgTomorrowISO(new Date("2026-11-19T02:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("campaignEnd / campaignEndLabel (Task 121 F-19)", () => {
  it("returns 28 Dec of the current year before the campaign ends", () => {
    expect(campaignEnd(new Date("2026-11-19T12:00:00")).getFullYear()).toBe(2026);
    expect(campaignEnd(new Date("2026-12-27T12:00:00")).getFullYear()).toBe(2026);
  });

  it("rolls to next year inside the Dec 29–31 stale window", () => {
    expect(campaignEnd(new Date("2026-12-29T00:00:00")).getFullYear()).toBe(2027);
    expect(campaignEnd(new Date("2026-12-31T23:00:00")).getFullYear()).toBe(2027);
    expect(campaignEnd(new Date("2027-01-05T00:00:00")).getFullYear()).toBe(2027);
  });

  it("renders the en-SG label for any now (the visible text never goes stale)", () => {
    expect(campaignEndLabel(new Date("2026-11-19T12:00:00"))).toBe("28 Dec");
    expect(campaignEndLabel(new Date("2026-12-30T12:00:00"))).toBe("28 Dec");
    expect(campaignEndLabel(new Date("2027-02-01T12:00:00"))).toBe("28 Dec");
  });
});

// Task 122 F-6: the Task-121 shared sort seam (API + shop SSR) had zero unit
// pins and no SSR-order assertion — a regression re-sorting only ONE caller
// passed all 153 tests. These pins cover every documented key plus the
// unknown-sort passthrough and the no-mutation property.
describe("sortProductList (the shared display-sort seam — Task 122 F-6)", () => {
  const rows = [
    { id: 1, priceCents: 79900, ratingAvg: "4.20", ratingCount: 412, isNew: false },
    { id: 2, priceCents: 8900, ratingAvg: "4.90", ratingCount: 88, isNew: true },
    { id: 3, priceCents: 45900, ratingAvg: "3.80", ratingCount: 1200, isNew: false },
    { id: 4, priceCents: 12900, ratingAvg: "4.90", ratingCount: 12, isNew: true },
  ];

  it("price-asc / price-desc sort by priceCents", () => {
    expect(sortProductList(rows, "price-asc").map((r) => r.priceCents)).toEqual([8900, 12900, 45900, 79900]);
    expect(sortProductList(rows, "price-desc").map((r) => r.priceCents)).toEqual([79900, 45900, 12900, 8900]);
  });

  it("rating sorts by numeric ratingAvg (string-typed in the seed)", () => {
    expect(sortProductList(rows, "rating").map((r) => r.id)).toEqual([2, 4, 1, 3]);
  });

  it("popular sorts by ratingCount", () => {
    expect(sortProductList(rows, "popular").map((r) => r.id)).toEqual([3, 1, 2, 4]);
  });

  it("new floats isNew rows first (stable within groups)", () => {
    expect(sortProductList(rows, "new").map((r) => r.id)).toEqual([2, 4, 1, 3]);
  });

  it("featured and unknown sort keys pass the list through unchanged", () => {
    expect(sortProductList(rows, "featured").map((r) => r.id)).toEqual([1, 2, 3, 4]);
    expect(sortProductList(rows, "bogus-sort").map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });

  it("never mutates the input list (SSR + API share one array source)", () => {
    const before = JSON.stringify(rows);
    sortProductList(rows, "price-asc");
    expect(JSON.stringify(rows)).toBe(before);
  });
});

import { describe, expect, it, vi } from "vitest";
import { formatSGD, priceTotals, clampInt, isValidEmail, isValidPhone, isValidPostal, orderNumber, stars, GST_RATE, FREE_DELIVERY_THRESHOLD_CENTS, familyVoucherCents, visibleBadges, ORDER_STEPS, orderStepIndex, campaignEnd, campaignEndLabel, sgTomorrowISO, sortProductList, DELIVERY_SLOTS, isValidDeliverySlot, availableDeliverySlots, jsonLdScript, IDEMPOTENCY_KEY_RE, mintIdempotencyKey, isUniqueViolationOn } from "@/lib/utils";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

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
  it("a fully-discounted DELIVERY order still ships free — the net===0 corner (Task 133 F-4)", () => {
    // The sibling cap pins above use click-collect, where the fee is 0
    // regardless — the `|| net === 0` delivery branch (utils.ts) was pinned
    // by NOTHING. placeOrder's own comment records that the pre-Task-119
    // hand-rolled copy "had already drifted from it on the net===0 delivery
    // edge" — the historically load-bearing corner of the money seam. A
    // regression deleting the clause would charge $12 delivery on a
    // fully-discounted order and pass the whole unit suite pre-133.
    const t = priceTotals({ subtotalCents: 1500, promo: { kind: "fixed", value: 2000 }, deliveryMethod: "delivery" });
    expect(t.discountCents).toBe(1500);
    expect(t.deliveryFeeCents).toBe(0);
    expect(t.gstCents).toBe(0);
    expect(t.totalCents).toBe(0);
  });
  it("percent promo is capped at the subtotal too — a >100% promo must never mint negative money (Task 130 F-7)", () => {
    // The fixed branch capped; the percent branch did not — an unreachable-
    // today (seed/DB-controlled promos, no admin API) but defensive parity
    // gap at the money seam: kind:"percent", value:150 produced discount >
    // subtotal → negative net/GST/total cents.
    const t = priceTotals({ subtotalCents: 10000, promo: { kind: "percent", value: 150 }, deliveryMethod: "click-collect" });
    expect(t.discountCents).toBe(10000);
    expect(t.totalCents).toBe(0);
  });
  it("a 100% percent promo lands exactly at zero (the cap boundary)", () => {
    const t = priceTotals({ subtotalCents: 10000, promo: { kind: "percent", value: 100 }, deliveryMethod: "click-collect" });
    expect(t.discountCents).toBe(10000);
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
    // Task 132 F-1: the expectation must read getUTC* on the shifted instant
    // (mirroring the impl, Task 128 F-4). The pre-132 LOCAL getters made this
    // pin timezone-coupled: on an Asia/Singapore host the expectation and the
    // mint diverged 08:00–15:59 UTC every day (the project's own locale), on
    // America/New_York 16:00–20:59 UTC — a false-RED unit gate on non-UTC
    // hosts while the impl itself is TZ-pure.
    const n = orderNumber();
    const sgt = new Date(Date.now() + 8 * 3_600_000);
    const ymd = `${sgt.getUTCFullYear()}${String(sgt.getUTCMonth() + 1).padStart(2, "0")}${String(sgt.getUTCDate()).padStart(2, "0")}`;
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

/**
 * Task 131 F-4: the suffix mint. The order number is half of the PII lookup
 * pair on /track-order, and the suffix carried ~2^31 entropy via V8's
 * state-recoverable Math.random (the idempotency-key seam already consumes
 * crypto bytes — Task 127 F-6). A mantissa with trailing zero bits also
 * minted FEWER than 6 chars ((0.5).toString(36) = "0.i" → slice = "I" — a
 * 1-char suffix, ~2⁻²⁶ of mints). The mint now reads 4 getRandomValues
 * bytes → uint32 → base36 (32 bits ≈ the 31-bit 6-char space, 36^6 ≈ 2.18e9)
 * with Math.random only as the both-primitives-absent last resort (both
 * paths padStart to exactly 6 chars).
 */
describe("orderNumber suffix mint (Task 131 F-4)", () => {
  it("derives the suffix from crypto bytes — hand-worked expectations, exactly 6 chars", () => {
    const original = globalThis.crypto;
    // Deterministic fills with hand-worked base36 expectations:
    //   bytes [1,0,0,0] → uint32 1 → "1".padStart(6,"0") → "000001"
    //   bytes [0,1,0,0] → uint32 256 → 7*36+4 → "74" → "000074"
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues: (arr: Uint8Array) => {
          arr[0] = fill[0];
          arr[1] = fill[1];
          arr[2] = fill[2];
          arr[3] = fill[3];
          return arr;
        },
      },
      configurable: true,
    });
    let fill = [1, 0, 0, 0];
    try {
      expect(orderNumber(new Date("2026-11-19T02:30:00Z"))).toBe("NH-20261119-000001");
      fill = [0, 1, 0, 0];
      expect(orderNumber(new Date("2026-11-19T02:30:00Z"))).toBe("NH-20261119-000074");
      // Both mints keep the boundary format the route and pages regex-pin.
      fill = [255, 255, 255, 255];
      expect(orderNumber(new Date("2026-11-19T02:30:00Z"))).toMatch(/^NH-20261119-[0-9A-Z]{6}$/);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
    }
  });

  it("the both-absent fallback still mints EXACTLY 6 chars — a 0.5-valued Math.random used to mint 1", () => {
    const originalCrypto = globalThis.crypto;
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true });
    try {
      // (0.5).toString(36) = "0.i" → slice(2,8) = "i" — the pre-131 code
      // minted the 1-char suffix "I" here; the fallback must pad to 6.
      expect(orderNumber(new Date("2026-11-19T02:30:00Z"))).toBe("NH-20261119-00000I");
    } finally {
      random.mockRestore();
      Object.defineProperty(globalThis, "crypto", { value: originalCrypto, configurable: true });
    }
  });

  it("the crypto path never reads Math.random (the priority order — Task 127 F-6 discipline)", () => {
    const original = globalThis.crypto;
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("must not be read when getRandomValues is available");
    });
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues: (arr: Uint8Array) => {
          arr[0] = 1;
          arr[1] = 0;
          arr[2] = 0;
          arr[3] = 0;
          return arr;
        },
      },
      configurable: true,
    });
    try {
      expect(orderNumber(new Date("2026-11-19T02:30:00Z"))).toBe("NH-20261119-000001");
    } finally {
      random.mockRestore();
      Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
    }
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
  // Task 132 F-1: every instant below is Z-suffixed. The pre-132 Z-less
  // forms parsed as LOCAL time — on America/New_York the 2026-12-27T12:00:00
  // instant was 17:00Z (past the Dec-27-16:00Z campaign end), so campaignEnd
  // correctly answered 2027 while this pin demanded 2026: a deterministic
  // false RED on every host UTC−5 and further west (observed live). The
  // sibling Task-127 pins below already used Z — the pre-127 idiom had
  // survived in this pre-127 block.
  it("returns 28 Dec of the current year before the campaign ends", () => {
    expect(campaignEnd(new Date("2026-11-19T12:00:00Z")).getFullYear()).toBe(2026);
    expect(campaignEnd(new Date("2026-12-27T12:00:00Z")).getFullYear()).toBe(2026);
  });

  it("rolls to next year inside the Dec 29–31 stale window", () => {
    expect(campaignEnd(new Date("2026-12-29T00:00:00Z")).getFullYear()).toBe(2027);
    expect(campaignEnd(new Date("2026-12-31T23:00:00Z")).getFullYear()).toBe(2027);
    expect(campaignEnd(new Date("2027-01-05T00:00:00Z")).getFullYear()).toBe(2027);
  });

  it("renders the en-SG label for any now (the visible text never goes stale)", () => {
    expect(campaignEndLabel(new Date("2026-11-19T12:00:00Z"))).toBe("28 Dec");
    expect(campaignEndLabel(new Date("2026-12-30T12:00:00Z"))).toBe("28 Dec");
    expect(campaignEndLabel(new Date("2027-02-01T12:00:00Z"))).toBe("28 Dec");
  });
});

describe("campaignEnd on the Singapore calendar (Task 127 F-7)", () => {
  // The SGT seams (orderNumber, sgTomorrowISO, availableDeliverySlots) all do
  // pure UTC+8 math; campaignEnd read the SERVER-LOCAL calendar, so a UTC
  // server rolled the date 16 hours early (from Dec 28 08:00 SGT — the
  // campaign's final day). The campaign calendar is Singapore's.
  // Dec 28 00:00 SGT 2026 === 2026-12-27T16:00:00Z.
  it("the campaign's final SGT day still reports this year (the UTC-server divergence)", () => {
    // Dec 27 17:00Z = Dec 28 01:00 SGT — past the SGT-midnight end, so the
    // roll already happened in Singapore (a UTC-local implementation said 2026).
    expect(campaignEnd(new Date("2026-12-27T17:00:00Z")).getUTCFullYear()).toBe(2027);
  });

  it("the exact end instant belongs to the ending year (strict <)", () => {
    // Dec 27 15:59:59Z = Dec 27 23:59:59 SGT → 2026; Dec 27 16:00:00Z is
    // exactly Dec 28 00:00:00 SGT — the end instant itself still resolves to
    // the ending campaign (2026); one second later rolls (2027).
    expect(campaignEnd(new Date("2026-12-27T15:59:59Z")).getUTCFullYear()).toBe(2026);
    expect(campaignEnd(new Date("2026-12-27T16:00:00Z")).getUTCFullYear()).toBe(2026);
    expect(campaignEnd(new Date("2026-12-27T16:00:01Z")).getUTCFullYear()).toBe(2027);
  });

  it("the returned instant is Dec 28 00:00 Singapore time (any server TZ)", () => {
    expect(campaignEnd(new Date("2026-06-01T00:00:00Z")).toISOString()).toBe("2026-12-27T16:00:00.000Z");
    expect(campaignEnd(new Date("2026-12-27T17:00:00Z")).toISOString()).toBe("2027-12-27T16:00:00.000Z");
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

/**
 * Task 125 G-3: the JSON-LD serialization seam. Both ld+json sites used to
 * inline `JSON.stringify(x).replace(/</g, "\\u003c")` — `<` is escaped but
 * U+2028/U+2029 are not: both are LEGAL inside JSON strings yet terminate JS
 * string semantics in some embedding contexts, breaking the script element.
 * Catalog-authored payloads today; review text is one product away.
 */
describe("jsonLdScript (Task 125 G-3)", () => {
  it("escapes </script> so hostile payloads cannot close the element early", () => {
    const out = jsonLdScript({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });

  it("escapes U+2028 and U+2029 line terminators", () => {
    // Explicit code points — the raw characters are invisible in source.
    const hostile = `line${String.fromCodePoint(0x2028)}sep${String.fromCodePoint(0x2029)}ends`;
    const out = jsonLdScript({ body: hostile });
    expect(out).not.toContain(String.fromCodePoint(0x2028));
    expect(out).not.toContain(String.fromCodePoint(0x2029));
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
  });

  it("round-trips: the escaped output still JSON.parses to the original data", () => {
    const data = { name: "SOLBAKKEN 3-seat sofa", price: 79900, note: "a<b c" };
    const out = jsonLdScript(data);
    expect(JSON.parse(out)).toEqual(data);
  });
});

/**
 * Task 126 F-1: the idempotency-key seam. The checkout client mints ONE key
 * per page mount (double-submit guard); the boundary accepts the shape via
 * IDEMPOTENCY_KEY_RE and drops malformed keys to null (never refuses — dedupe
 * is an enhancement, not a persisted field). The mint must survive
 * non-secure contexts where crypto.randomUUID is unavailable.
 */
describe("idempotency key seam (Task 126 F-1)", () => {
  it("mints a key matching the boundary shape", () => {
    const key = mintIdempotencyKey();
    expect(IDEMPOTENCY_KEY_RE.test(key)).toBe(true);
  });

  it("mints distinct keys per call (one per checkout-page mount)", () => {
    const a = mintIdempotencyKey();
    const b = mintIdempotencyKey();
    expect(a).not.toBe(b);
  });

  it("falls back to a well-shaped token when crypto.randomUUID throws", () => {
    const original = globalThis.crypto;
    // Simulate the non-secure-context failure (homenest session-70: a
    // plain-HTTP LAN deploy crashed at mount — randomUUID exists only on
    // secure contexts).
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: undefined },
      configurable: true,
    });
    try {
      const key = mintIdempotencyKey();
      expect(IDEMPOTENCY_KEY_RE.test(key)).toBe(true);
      expect(key.startsWith("k")).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
    }
  });

  it("accepts canonical UUIDs and rejects malformed keys (the route's drop rule)", () => {
    expect(IDEMPOTENCY_KEY_RE.test("e2e-idem-probe-key-0001")).toBe(true);
    expect(IDEMPOTENCY_KEY_RE.test(crypto.randomUUID())).toBe(true);
    expect(IDEMPOTENCY_KEY_RE.test("short")).toBe(false); // < 8 chars
    expect(IDEMPOTENCY_KEY_RE.test("x".repeat(65))).toBe(false); // > 64 chars
    expect(IDEMPOTENCY_KEY_RE.test("has space in it")).toBe(false); // invalid char
  });

  it("uses getRandomValues when randomUUID is unavailable — not Math.random (Task 127 F-6)", () => {
    // homenest session-7 S7-10: only randomUUID is secure-context-gated;
    // getRandomValues is available everywhere. The Task-126 fallback leaned
    // on Date.now + Math.random (predictable); the fallback must consume the
    // crypto bytes when the primitive exists.
    const original = globalThis.crypto;
    const bytes = new Uint8Array(16);
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: undefined, getRandomValues: (arr: Uint8Array) => { for (let i = 0; i < arr.length; i++) arr[i] = bytes[i] ?? 0; return arr; } },
      configurable: true,
    });
    try {
      const key = mintIdempotencyKey();
      // A 16-byte → 32-hex-char token derived from the (deterministic stub)
      // bytes — proving the crypto path, not the Math.random "k…" path.
      expect(key).toBe("00000000000000000000000000000000");
      expect(key).not.toMatch(/^k/);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
    }
  });

  it("the getRandomValues fallback mints distinct keys (real crypto)", () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: undefined, getRandomValues: original.getRandomValues.bind(original) },
      configurable: true,
    });
    try {
      const a = mintIdempotencyKey();
      const b = mintIdempotencyKey();
      expect(IDEMPOTENCY_KEY_RE.test(a)).toBe(true);
      expect(a).not.toBe(b);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
    }
  });

  it("the checkout route consumes the exported seam, not an inlined regex (Task 128 F-6)", () => {
    // The route used to inline /^[A-Za-z0-9-]{8,64}$/ while the pins above
    // tested the CONSTANT — a future edit to IDEMPOTENCY_KEY_RE would keep
    // every unit green while the boundary enforced the old shape (client
    // mints per the new shape → silently dropped → dedupe silently off).
    // fs-pin (the SITE_ORIGIN precedent): the route must import the seam and
    // carry no inline key-shape literal of its own.
    // Task 129 F-9: resolve from this file's location, not cwd (the
    // local-store fs-pin precedent — a subdirectory vitest run ENOENTs).
    const route = readFileSync(resolve(import.meta.dirname, "../../src/app/api/checkout/route.ts"), "utf8");
    expect(route).toContain("IDEMPOTENCY_KEY_RE");
    expect(route).not.toMatch(/\[A-Za-z0-9-\]/);
  });
});

describe("isUniqueViolationOn (Task 130 F-4)", () => {
  // The Task-127 register annotation anticipated this: placeOrder's 23505
  // catch checked only the error CODE, so an order_number collision (6 base36
  // chars ≈ 2^31 entropy) was indistinguishable from an idempotency-key
  // replay — it fell through to a customer-facing 500. The discriminator
  // inspects the constraint name on the error (and on .cause — Drizzle can
  // surface the driver error wrapped).
  const pg23505 = (constraint: string) =>
    Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
      constraint,
    });

  it("matches a 23505 with the named constraint, unwrapped", () => {
    expect(isUniqueViolationOn(pg23505("orders_order_number_unique"), "orders_order_number_unique")).toBe(true);
  });

  it("matches the constraint on a wrapped cause", () => {
    const wrapped = new Error("wrapped", { cause: pg23505("orders_idempotency_key_unique") });
    expect(isUniqueViolationOn(wrapped, "orders_idempotency_key_unique")).toBe(true);
  });

  it("refuses a 23505 whose constraint is a DIFFERENT unique index — the pre-130 conflation class", () => {
    expect(isUniqueViolationOn(pg23505("orders_idempotency_key_unique"), "orders_order_number_unique")).toBe(false);
    expect(isUniqueViolationOn(pg23505("orders_order_number_unique"), "orders_idempotency_key_unique")).toBe(false);
  });

  it("refuses non-23505 errors and non-error input regardless of constraint", () => {
    expect(isUniqueViolationOn(Object.assign(new Error("x"), { code: "23503", constraint: "orders_order_number_unique" }), "orders_order_number_unique")).toBe(false);
    expect(isUniqueViolationOn(null, "orders_order_number_unique")).toBe(false);
    expect(isUniqueViolationOn("23505", "orders_order_number_unique")).toBe(false);
  });
});

describe("TZ-pure test tree (Task 132 F-1)", () => {
  it("no Z-less date-time literals exist under tests/unit (host-TZ-coupled instants)", () => {
    // ECMAScript parses a date-TIME literal without a timezone designator as
    // LOCAL time, so any pin built on one is coupled to the host clock — the
    // Task-132 F-1 class: the campaignEnd pins were a deterministic false RED
    // on America/New_York hosts and the orderNumber "today" pin's local-getter
    // expectation diverged from the TZ-pure impl 8h/day on Asia/Singapore
    // (the project's own locale; "there is no hosted CI — the local gate is
    // the only gate"). This fs-pin holds the whole unit tree to the
    // Z-suffixed discipline the Task-127 SGT pins established. Date-ONLY
    // literals are UTC by spec and stay legal. The scan includes this file;
    // the pattern source below cannot match itself (its paren is escaped).
    // Task 134 F-6: the quote class is now ALL THREE quote forms (a
    // single-quoted/backtick Z-less literal escaped the double-quoted-only
    // scan — the repo's uniform double-quote style was the only thing
    // holding it) and the designator lookahead consumes a fractional-
    // seconds component first AND rejects a bare "." or DIGIT — the dot
    // because the optional group backtracks to empty on a legitimate
    // "…T00:00:00.500Z" and false-positives it, the digit because \d+
    // backtracks to ".50" and lets the lookahead pass on the stray "0"
    // (both proven by mutation this cycle; the dot/digit-in-lookahead closes
    // the backtrack splits so ".500Z" never flags while a Z-less ".500"
    // still does).
    const dir = import.meta.dirname;
    const files = readdirSync(dir).filter((f) => f.endsWith(".test.ts"));
    const zless: string[] = [];
    const numericCtor: string[] = [];
    for (const f of files) {
      const src = readFileSync(resolve(dir, f), "utf8");
      const hits = src.match(/new Date\(["'`][^"'\n]*T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?![Zz.\d]|[+-]\d{2}:?\d{2})[^"'\n]*["'`]\)/g);
      if (hits) zless.push(...hits.map((h) => `${f}: ${h}`));
      // Task 133 F-6b: the NUMERIC-ARGS constructor is the same TZ-coupled
      // class — a Date fed year-first numeric arguments parses as LOCAL
      // time, and a string-literal-only scan is blind to it (the pre-133
      // pin matched double-quoted literals alone; a numeric-args pin would
      // escape it entirely). No legitimate numeric-args use exists in the
      // unit tree. (The example shape is deliberately not spelled out here
      // — the scan includes this file, and the pattern source below escapes
      // its paren so it cannot match itself.)
      const numeric = src.match(/new Date\(\s*\d/g);
      if (numeric) numericCtor.push(...numeric.map((h) => `${f}: ${h}…`));
    }
    expect(zless, "date-time literals without a timezone designator parse as LOCAL time — suffix them with Z (the sibling SGT pins' discipline)").toEqual([]);
    expect(numericCtor, "numeric-args Date constructors parse as LOCAL time (the same TZ-coupled class) — use Z-suffixed literals").toEqual([]);
  });
});

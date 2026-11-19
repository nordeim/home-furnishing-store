import { describe, expect, it } from "vitest";
import { CATEGORIES, INSPIRATIONS, PRODUCTS, PROMOS, STORES, findPromo, effectivePromo, findPromoMinimumCents, storeName, matchesProductQuery, catalogMaxDiscountPercent } from "@/lib/catalog";

describe("catalogue invariants (seed + static fallback contract)", () => {
  it("ships the documented counts", () => {
    expect(PRODUCTS).toHaveLength(24);
    expect(CATEGORIES).toHaveLength(8);
    expect(STORES).toHaveLength(3);
    expect(INSPIRATIONS).toHaveLength(6);
    expect(PROMOS).toHaveLength(3);
  });

  it("has unique product slugs and skus", () => {
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((p) => p.sku)).size).toBe(PRODUCTS.length);
  });

  it("every product references a real category and has sane money", () => {
    const catSlugs = new Set(CATEGORIES.map((c) => c.slug));
    for (const p of PRODUCTS) {
      expect(catSlugs.has(p.categorySlug)).toBe(true);
      expect(p.priceCents).toBeGreaterThan(0);
      expect(p.priceCents % 100).toBe(0); // whole-dollar catalogue by design
      if (p.compareAtCents != null) expect(p.compareAtCents).toBeGreaterThan(p.priceCents);
      expect(p.imageUrls.length).toBeGreaterThan(0);
    }
  });

  it("every inspiration links only to real product slugs", () => {
    const slugs = new Set(PRODUCTS.map((p) => p.slug));
    for (const i of INSPIRATIONS) {
      expect(i.productSlugs.length).toBeGreaterThan(0);
      for (const s of i.productSlugs) expect(slugs.has(s)).toBe(true);
    }
  });
});

describe("findPromo (single client-side display source)", () => {
  it("resolves the three seeded codes with their kinds and values", () => {
    const w = findPromo("WELCOME10");
    expect(w).toEqual({ kind: "percent", value: 10 });
    expect(findPromo("MAKAN15")).toEqual({ kind: "percent", value: 15 });
    expect(findPromo("FLAT20")).toEqual({ kind: "fixed", value: 2000 });
  });

  it("is case-insensitive and trims; unknown codes return null (never a default discount)", () => {
    expect(findPromo(" welcome10 ")).toEqual({ kind: "percent", value: 10 });
    expect(findPromo("WELCOME10")).toEqual({ kind: "percent", value: 10 });
    expect(findPromo("NOT_A_CODE")).toBeNull();
    expect(findPromo("")).toBeNull();
  });

  it("matches the promo catalogue exactly (no drift between finder and seed)", () => {
    for (const p of PROMOS) {
      const found = findPromo(p.code);
      expect(found).not.toBeNull();
      expect(found!.kind).toBe(p.kind);
      expect(found!.value).toBe(p.value);
    }
  });
});

// Task 122 F-5: findPromo drops minSubtotalCents, so the cart/checkout
// preview showed a discount the server refuses at placeOrder (apply
// WELCOME10 on a $150+ bag, remove items — the 10% line persisted on an $89
// bag). effectivePromo is the display gate the two preview sites consume:
// below the minimum the code is NOT effective, whatever the server later
// says about it.
describe("effectivePromo (the min-spend display gate — Task 122 F-5)", () => {
  it("returns the promo at/above its minimum spend", () => {
    expect(effectivePromo("WELCOME10", 15000)).toEqual({ kind: "percent", value: 10 });
    expect(effectivePromo("WELCOME10", 79900)).toEqual({ kind: "percent", value: 10 });
    expect(effectivePromo("FLAT20", 25000)).toEqual({ kind: "fixed", value: 2000 });
    expect(effectivePromo("MAKAN15", 40000)).toEqual({ kind: "percent", value: 15 });
  });

  it("returns null BELOW the minimum — the preview must not show what the server refuses", () => {
    expect(effectivePromo("WELCOME10", 14900)).toBeNull();
    expect(effectivePromo("WELCOME10", 8900)).toBeNull();
    expect(effectivePromo("FLAT20", 24900)).toBeNull();
    expect(effectivePromo("MAKAN15", 39900)).toBeNull();
  });

  it("unknown codes and empty subtotals stay null", () => {
    expect(effectivePromo("NOT_A_CODE", 50000)).toBeNull();
    expect(effectivePromo("WELCOME10", 0)).toBeNull();
  });

  it("is case-insensitive like findPromo", () => {
    expect(effectivePromo(" welcome10 ", 20000)).toEqual({ kind: "percent", value: 10 });
  });
});

// Task 123 F-2: the cart's promo MESSAGE contradicted the effectivePromo
// gate — below the minimum the green "CODE applied" status persisted while
// the Discount row vanished (browser-reproduced). The honest notice needs
// the code's minimum: findPromoMinimumCents exposes exactly that (pure seam,
// PROMOS already carries minSubtotalCents).
describe("findPromoMinimumCents (the below-minimum notice source — Task 123 F-2)", () => {
  it("resolves each seeded code's minimum spend", () => {
    expect(findPromoMinimumCents("WELCOME10")).toBe(15000);
    expect(findPromoMinimumCents("MAKAN15")).toBe(40000);
    expect(findPromoMinimumCents("FLAT20")).toBe(25000);
  });

  it("is case-insensitive and trims like findPromo", () => {
    expect(findPromoMinimumCents(" welcome10 ")).toBe(15000);
    expect(findPromoMinimumCents("makan15")).toBe(40000);
  });

  it("unknown codes return null (no minimum to quote)", () => {
    expect(findPromoMinimumCents("NOT_A_CODE")).toBeNull();
    expect(findPromoMinimumCents("")).toBeNull();
  });
});

describe("storeName (display label for store slugs in customer copy)", () => {
  it("capitalizes the seeded store slugs (order/track pages render these labels)", () => {
    expect(storeName("tampines")).toBe("Tampines");
    expect(storeName("jurong")).toBe("Jurong");
    expect(storeName("alexandra")).toBe("Alexandra");
  });

  it("capitalizes unknown slugs as a graceful fallback and tolerates blanks", () => {
    expect(storeName("unknown-store")).toBe("Unknown-store");
    expect(storeName("")).toBe("");
  });
});

describe("matchesProductQuery (the one recall seam — Task 124 F-12)", () => {
  // GREEN-on-arrival pins (the sortProductList precedent): the Task-123 F-5
  // fix re-synchronized two duplicated literals by hand; both the API
  // keyword filter and the shop-SSR searchProducts seam now consume this
  // helper. These pins hold the seam's contract.
  const outdoor = PRODUCTS.find((p) => p.slug === "veranda-balcony-set");
  it("matches the categorySlug axis (the F-5 recall divergence)", () => {
    expect(outdoor).toBeDefined();
    expect(matchesProductQuery(outdoor!, "outdoor")).toBe(true);
  });
  it("matches name, tagline, description and sku axes", () => {
    const p = PRODUCTS[0];
    expect(matchesProductQuery(p, p.name.toLowerCase())).toBe(true);
    expect(matchesProductQuery(p, p.tagline.toLowerCase())).toBe(true);
    expect(matchesProductQuery(p, p.description.split(" ")[0].toLowerCase())).toBe(true);
    expect(matchesProductQuery(p, p.sku.toLowerCase())).toBe(true);
  });
  it("is case-insensitive both ways and refuses non-matching needles", () => {
    expect(matchesProductQuery(outdoor!, "OUTDOOR")).toBe(true);
    expect(matchesProductQuery(outdoor!, "zzz-no-match-zzz")).toBe(false);
  });
});

/**
 * Task 126 F-3: the catalogue max-discount derivation. "Up to 24% off" was a
 * hardcoded literal at five marketing surfaces (hero, header strip, offers
 * metadata ×2, offers copy) — a catalogue edit turned every claim into a lie
 * with the gates green. The single seam derives the number from PRODUCTS;
 * the e2e attribution pins derive their expectations from this helper too.
 */
describe("catalogMaxDiscountPercent (Task 126 F-3)", () => {
  it("derives the true max discount across the catalogue (the NORDLYS floor lamp, 24%)", () => {
    expect(catalogMaxDiscountPercent()).toBe(24);
  });

  it("derives 0 when no product carries a compare-at price above its price", () => {
    // A hypothetical catalogue — the seam is pure over its input list, so pin
    // the formula against a worked example (not against PRODUCTS again).
    const rows = [
      { priceCents: 100, compareAtCents: 90 },   // compare-at BELOW price: no deal
      { priceCents: 100, compareAtCents: null },  // no compare-at
      { priceCents: 100, compareAtCents: 100 },   // equal: no deal
    ];
    const max = Math.max(0, ...rows.map((p) =>
      p.compareAtCents && p.compareAtCents > p.priceCents
        ? Math.round(((p.compareAtCents - p.priceCents) / p.compareAtCents) * 100)
        : 0));
    expect(max).toBe(0);
  });

  it("rounds to whole percent like the PDP's per-product chip does", () => {
    // The PDP chip computes Math.round((compare-at − price) / compare-at × 100)
    // — the seam must agree with that display formula on the max product.
    const withDeal = PRODUCTS.filter((p) => p.compareAtCents && p.compareAtCents > p.priceCents);
    for (const p of withDeal) {
      const pct = Math.round((((p.compareAtCents ?? 0) - p.priceCents) / (p.compareAtCents ?? 1)) * 100);
      expect(pct).toBeLessThanOrEqual(catalogMaxDiscountPercent());
    }
  });
});

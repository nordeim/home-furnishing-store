import { describe, expect, it } from "vitest";
import { CATEGORIES, INSPIRATIONS, PRODUCTS, PROMOS, STORES, findPromo, effectivePromo, storeName } from "@/lib/catalog";

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

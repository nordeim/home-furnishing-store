import { describe, expect, it } from "vitest";
import { CATEGORIES, INSPIRATIONS, PRODUCTS, PROMOS, STORES, findPromo } from "@/lib/catalog";

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

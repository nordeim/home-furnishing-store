import { describe, expect, it } from "vitest";
// Route modules are importable pure functions — no server needed.
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { PRODUCTS, INSPIRATIONS } from "@/lib/catalog";

const SITE = "https://nordhem.sg";

// Coherent SEO policy: the sitemap lists INDEXABLE routes only; robots.ts
// excludes utility/personal surfaces (bag, checkout, tracking, orders,
// wishlist, search, API) from crawling. A URL never appears in both.
const INDEXABLE_STATIC = [
  "/", "/shop", "/inspiration", "/offers", "/services", "/stores", "/family",
  "/business", "/food", "/sustainability", "/planning-tools", "/help",
];
const EXCLUDED = ["/cart", "/checkout", "/track-order", "/order/", "/wishlist", "/search", "/api/"];

describe("robots.txt policy", () => {
  const policy = robots();
  const rulesArr = Array.isArray(policy.rules) ? policy.rules : [policy.rules];

  it("allows the whole site for the catch-all agent", () => {
    expect(rulesArr).toContainEqual(expect.objectContaining({ userAgent: "*", allow: "/" }));
  });

  it("disallows private and utility surfaces that must not be indexed", () => {
    const disallow = rulesArr.flatMap((r) => r.disallow ?? []);
    for (const path of EXCLUDED) {
      expect(disallow, `robots must disallow ${path}`).toContain(path);
    }
  });

  it("points at the sitemap on the canonical origin", () => {
    expect(robots().sitemap).toBe(`${SITE}/sitemap.xml`);
  });
});

describe("sitemap.xml", () => {
  const urls = sitemap().map((e) => e.url);

  it("contains exactly the indexable static routes + all products + all rooms", () => {
    for (const r of INDEXABLE_STATIC) expect(urls).toContain(`${SITE}${r}`);
    expect(urls).toHaveLength(INDEXABLE_STATIC.length + PRODUCTS.length + INSPIRATIONS.length); // 12 + 24 + 6 = 42
  });

  it("never lists a robots-excluded URL (cart, checkout, orders, wishlist, search)", () => {
    for (const u of urls) {
      for (const ex of EXCLUDED) {
        if (ex === "/order/") expect(u).not.toContain("/order/");
        else expect(u).not.toBe(`${SITE}${ex.replace(/\/$/, "")}`);
      }
    }
  });

  it("contains every product and inspiration URL", () => {
    for (const p of PRODUCTS) expect(urls).toContain(`${SITE}/product/${p.slug}`);
    for (const i of INSPIRATIONS) expect(urls).toContain(`${SITE}/inspiration/${i.slug}`);
  });

  it("uses the canonical origin only", () => {
    expect(urls.every((u) => u.startsWith(SITE))).toBe(true);
  });

  it("carries no lastModified — every entry would report 'now' on every crawl (Task 121 F-9)", () => {
    // A lastmod that always equals the build/request time is noise that
    // erodes the signal; stable URLs without a honest mtime source ship no
    // lastmod at all.
    for (const entry of sitemap()) {
      expect(Object.keys(entry), entry.url).toEqual(["url"]);
    }
  });
});

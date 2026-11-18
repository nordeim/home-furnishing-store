import { expect, test } from "@playwright/test";

// Storefront + commerce journey (desktop 1440×900). Doubles as the
// characterization net for the cart-store refactor: every behaviour here must
// hold before AND after the useSyncExternalStore migration.

test.describe("storefront", () => {
  test("home renders hero, rooms and bestsellers", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A merrier home");
    await expect(page.getByRole("heading", { name: "Bestsellers right now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Every corner, covered" })).toBeVisible();
    // Pexels imagery renders.
    await expect(page.locator("main img").first()).toBeVisible();
  });

  test("shop filters by category via URL and API", async ({ page }) => {
    await page.goto("/shop?cat=dining");
    await expect(page.getByRole("heading", { name: "Dining", level: 1 })).toBeVisible();
    await expect(page.getByText(/^[1-9]\d* products ·/)).toBeVisible();
    const cards = page.locator("article");
    // Auto-wait for the fetch to land before counting (count() does not wait).
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("unknown page returns the branded 404", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
  });
});

test.describe("product page + SEO", () => {
  test("PDP shows money, stock and reviews; metadata + JSON-LD present", async ({ page }) => {
    await page.goto("/product/solbakken-3-seat-sofa");
    await expect(page.getByRole("heading", { name: "SOLBAKKEN 3-seat sofa" })).toBeVisible();
    await expect(page.getByText("Price includes 9% GST")).toBeVisible();

    // SEO: OpenGraph + canonical (F-3).
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /SOLBAKKEN 3-seat sofa/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://nordhem.sg/product/solbakken-3-seat-sofa",
    );

    // SEO: schema.org Product structured data (F-3).
    const jsonld = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    const parsed = JSON.parse(jsonld ?? "null") as { "@type": string; offers?: { price?: string } };
    expect(parsed["@type"]).toBe("Product");
    expect(parsed.offers?.price).toBe("1299.00");
  });

  test("html carries data-scroll-behavior for Next 16 smooth-scroll handling", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-scroll-behavior", "smooth");
  });
});

test.describe("SEO endpoints", () => {
  test("robots.txt disallows utility surfaces and points at the sitemap", async ({ request }) => {
    const txt = await (await request.get("/robots.txt")).text();
    expect(txt).toContain("Allow: /");
    for (const path of ["/cart", "/checkout", "/track-order", "/order/", "/wishlist", "/search", "/api/"]) {
      expect(txt, `robots must disallow ${path}`).toContain(`Disallow: ${path}`);
    }
    expect(txt).toContain("Sitemap: https://nordhem.sg/sitemap.xml");
  });

  test("sitemap serves 42 URLs (12 static + 24 products + 6 rooms)", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect((xml.match(/<url>/g) ?? []).length).toBe(42);
    expect(xml).toContain("https://nordhem.sg/product/solbakken-3-seat-sofa");
    expect(xml).not.toContain("/order/");
  });
});

test.describe("API envelope", () => {
  test("health returns ok with the live DB", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toEqual({ ok: true });
  });

  test("products API filters and sorts; envelope shape holds", async ({ request }) => {
    const res = await request.get("/api/products?cat=dining&sort=price-asc");
    const json = (await res.json()) as { ok: boolean; data: Array<{ priceCents: number; categorySlug: string }> };
    expect(json.ok).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data.every((p) => p.categorySlug === "dining")).toBe(true);
    const prices = json.data.map((p) => p.priceCents);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test("checkout validates input (422 envelope)", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      data: { email: "not-an-email", lines: [] },
    });
    expect(res.status()).toBe(422);
    const json = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("VALIDATION");
  });

  test("promo validation rejects below-minimum spend (422)", async ({ request }) => {
    const res = await request.post("/api/promotions/validate", {
      data: { code: "WELCOME10", subtotalCents: 5000 }, // min $150
    });
    expect(res.status()).toBe(422);
    const json = (await res.json()) as { ok: boolean; error: { code: string; message: string } };
    expect(json.error.code).toBe("INVALID_PROMO");
    expect(json.error.message).toContain("minimum spend");
  });
});

test.describe("bag → checkout → order journey (live DB)", () => {
  test("full journey with promo, order masking and tracking", async ({ page }) => {
    // 1. PDP → add to bag
    await page.goto("/product/makan-extendable-table");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(page.getByRole("button", { name: /Added to bag/ })).toBeVisible();

    // 2. Header badge shows 1 item; open the bag
    await expect(page.getByRole("link", { name: /Shopping bag, 1 item/ })).toBeVisible();
    await page.getByRole("link", { name: /Shopping bag, 1 item/ }).click();
    await expect(page.getByRole("heading", { name: /Your bag \(1\)/ })).toBeVisible();

    // 3. Apply MAKAN15 (min spend $400; table is $799)
    await page.getByLabel(/Promo code/i).fill("MAKAN15");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(/MAKAN15 applied/i)).toBeVisible();

    // 4. Checkout with the promo carried over
    await page.getByRole("link", { name: /Checkout/i }).first().click();
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("MAKAN15").first()).toBeVisible();
    // Display totals use the shared findPromo source: 15% off $799 = $679.15, free delivery.
    await expect(page.getByText("$679.15").first()).toBeVisible();

    await page.getByLabel("Email").fill("journey@nordhem.sg");
    await page.getByLabel("Full name").fill("Journey Tester");
    await page.getByLabel("Phone").fill("+65 91234567");
    await page.getByLabel("Postal code").fill("521123");
    await page.getByPlaceholder("Blk, street, unit number").fill("Blk 123 Tampines St 11 #05-678");
    await page.getByRole("button", { name: /Pay \$679\.15/ }).click();

    // 5. Order confirmation: number shown, email MASKED (F-5), no street address.
    await expect(page).toHaveURL(/\/order\/NH-/, { timeout: 15_000 });
    await expect(page.getByText(/Order NH-\d{8}-[A-Z0-9]{6}/)).toBeVisible();
    await expect(page.getByText("j***@nordhem.sg")).toBeVisible();
    await expect(page.getByText("journey@nordhem.sg")).toHaveCount(0);
    await expect(page.getByText("Blk 123 Tampines St 11")).toHaveCount(0);

    const orderUrl = page.url();

    // 6. Track the order with the matching email → timeline + items.
    await page.goto("/track-order");
    await page.getByLabel(/Order number/i).fill(orderUrl.split("/order/")[1]);
    await page.getByLabel(/Email used at checkout/i).fill("journey@nordhem.sg");
    await page.getByRole("button", { name: /Track order/i }).click();
    await expect(page.getByText("Journey Tester").first()).toBeVisible();
    await expect(page.getByText(/1× MAKAN extendable table/).first()).toBeVisible();

    // 7. Reload the bag — it cleared after checkout.
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
  });
});

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
    const parsed = JSON.parse(jsonld ?? "null") as { "@type": string; offers?: { price?: string; availability?: string } };
    expect(parsed["@type"]).toBe("Product");
    expect(parsed.offers?.price).toBe("1299.00");
    // Availability is derived from the product's stock, never hardcoded
    // InStock (Task 118 F-10) — a stocked PDP must assert InStock.
    expect(parsed.offers?.availability).toBe("https://schema.org/InStock");
  });

  test("PDP badge chips are deduped against the computed NEW/discount chips", async ({ page }) => {
    // Task 118 F-5: the PDP renders a computed red "-{discount}% NOW" chip and
    // a blue NEW chip; catalogue literal badges duplicating those values must
    // be filtered by visibleBadges() (Task 117 wired it into ProductCard only).
    await page.goto("/product/nordlys-floor-lamp"); // badges: ["-24%"], computed 24, isNew false
    await expect(page.getByText("-24% NOW")).toBeVisible();
    await expect(page.getByText("-24%", { exact: true })).toHaveCount(0);

    await page.goto("/product/solbakken-3-seat-sofa"); // badges: ["Bestseller", "-19%"], computed 19
    await expect(page.getByText("Bestseller", { exact: true })).toBeVisible();
    await expect(page.getByText("-19% NOW")).toBeVisible();
    await expect(page.getByText("-19%", { exact: true })).toHaveCount(0);
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

  test("reviews POST rejects an invalid productId with 422 (not a 500 FK crash)", async ({ request }) => {
    const res = await request.post("/api/reviews", {
      data: { productId: -1, author: "E2E Tester", rating: 5, title: "n/a", body: "validation probe" },
    });
    expect(res.status()).toBe(422);
    const json = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("VALIDATION");
  });

  test("reviews POST rejects an unknown productId with 422 (not a 500 FK crash)", async ({ page }) => {
    // Task 118 F-6: a positive but non-existent productId passes the integer
    // gate and crashes on the products FK → 500 REVIEW_FAILED. The route's own
    // comment claims client-error classification; pin it. (Sent via the browser
    // fetch — same raw-body discipline as the malformed-JSON spec.)
    await page.goto("/");
    const { status, code } = await page.evaluate(async () => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: 999999, author: "E2E Tester", rating: 5, body: "unknown-id probe" }),
      });
      const json = (await res.json()) as { ok: boolean; error: { code: string } };
      return { status: res.status, code: json.error?.code };
    });
    expect(status).toBe(422);
    expect(code).toBe("VALIDATION");
  });

  test("reviews POST rejects a bad rating / short name with 422", async ({ request }) => {
    const res = await request.post("/api/reviews", {
      data: { productId: 1, author: "X", rating: 9, body: "n/a" },
    });
    expect(res.status()).toBe(422);
    const json = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(json.error.code).toBe("VALIDATION");
  });

  test("malformed JSON body is a 400 client error, not a 500 (envelope on every route)", async ({ page }) => {
    // reviews / promotions/validate / orders/track all parse req.json() at the
    // boundary; a non-JSON body must be a 400 envelope, never a thrown 500.
    // NOTE: Playwright's request API JSON-serializes string `data` (wrapping it
    // in quotes makes it valid JSON), so send the raw bytes from the browser.
    await page.goto("/");
    const statuses = await page.evaluate(async () => {
      const out: Array<{ path: string; status: number; ok: boolean }> = [];
      for (const path of ["/api/reviews", "/api/promotions/validate", "/api/orders/track"]) {
        const res = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "not-json{",
        });
        const json = (await res.json()) as { ok: boolean };
        out.push({ path, status: res.status, ok: json.ok });
      }
      return out;
    });
    for (const r of statuses) {
      expect(r.status, `${r.path} malformed body`).toBe(400);
      expect(r.ok, `${r.path} envelope ok flag`).toBe(false);
    }
  });
});

test.describe("client resilience (fetch failure ≠ empty state)", () => {
  // The bag journey pins the happy path; these pin the FAILURE path — a dead
  // API must render an explicit error + retry, never the "empty" state.
  test("wishlist shows an error state (not 'Nothing saved yet') when the API fails", async ({ page }) => {
    // Seed the wishlist BEFORE app boot — the external store reads localStorage
    // once at module load, so a post-load setItem would never reach it.
    await page.addInitScript(() => {
      localStorage.setItem("nordhem_wish_v1", JSON.stringify(["solbakken-3-seat-sofa"]));
    });
    await page.route("**/api/products", (route) => route.abort());
    await page.goto("/wishlist");
    // Scope to <main>: Next's route announcer also carries role=alert.
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await expect(page.getByText(/couldn.?t load your wishlist/i)).toBeVisible();
    // The misleading empty-state copy must NOT render while items are saved.
    await expect(page.getByRole("heading", { name: /Your wishlist \(1\)/ })).toBeVisible();
    await expect(page.getByText("Nothing saved yet")).toHaveCount(0);
  });

  test("search shows an error state (not 'No products found') when the API fails", async ({ page }) => {
    await page.route("**/api/products*", (route) => route.abort());
    await page.goto("/search?q=sofa");
    // Scope to <main>: Next's route announcer also carries role=alert.
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await expect(page.getByText(/couldn.?t load results/i)).toBeVisible();
    await expect(page.getByText(/No products found/)).toHaveCount(0);
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

test.describe("API rate limits (20/min/IP fixed window)", () => {
  test("orders/track and promotions/validate throttle the 21st rapid request", async ({ request }) => {
    // Task 118 F-18: checkout and reviews enforce the limiter; track (the PII
    // lookup) and promo validation (a Postgres read per call) did not. Each
    // probe runs under its OWN x-forwarded-for identity so the shared "local"
    // bucket used by the journey/persistence specs stays clean (the limiter
    // keys on the first XFF hop — the documented single-trusted-hop posture).
    const probe = async (path: string, ip: string, data: Record<string, unknown>) => {
      // One FIXED identity per probe (all 21 requests share the bucket →
      // the 21st crosses the 20/min window).
      const statuses: number[] = [];
      for (let i = 0; i < 21; i++) {
        const res = await request.post(path, {
          headers: { "x-forwarded-for": ip },
          data,
        });
        statuses.push(res.status());
      }
      return statuses;
    };
    const track = await probe("/api/orders/track", "10.9.118.7", { orderNumber: "NH-00000000-XXXXXX", email: "probe@nordhem.sg" });
    const promo = await probe("/api/promotions/validate", "10.9.119.7", { code: "WELCOME10", subtotalCents: 5000 });
    for (const [name, statuses] of Object.entries({ track, promo })) {
      // The first 20 fall inside the window (404/422 by domain rules);
      // the 21st must be the limiter's 429.
      expect(statuses.slice(0, 20), `${name} first 20 unthrottled`).not.toContain(429);
      expect(statuses[20], `${name} 21st throttled`).toBe(429);
    }
  });
});

test.describe("cart promo persistence", () => {
  test("a failed promo apply keeps the applied code; Remove clears it", async ({ page }) => {
    // Task 118 F-13: a bad code (or transient fetch failure) used to wipe the
    // applied promo — the user's discount silently vanished from the summary.
    await page.goto("/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Shopping bag, 1 item/ }).click();
    await expect(page.getByRole("heading", { name: /Your bag \(1\)/ })).toBeVisible();

    // Apply a valid code ($1299 ≥ $150 min).
    await page.getByLabel(/Promo code/i).fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(/WELCOME10 applied/i)).toBeVisible();
    const discountRow = page.getByText("Discount", { exact: true });
    await expect(discountRow).toBeVisible();

    // A wrong code must NOT destroy the applied discount.
    await page.getByLabel(/Promo code/i).fill("BOGUSCODE");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(/not valid/i)).toBeVisible();
    await expect(discountRow).toBeVisible(); // ← the Task 118 fix

    // Remove restores the no-promo summary.
    await page.getByRole("button", { name: /Remove code/i }).click();
    await expect(discountRow).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Checkout/i }).first()).toBeVisible();
  });
});

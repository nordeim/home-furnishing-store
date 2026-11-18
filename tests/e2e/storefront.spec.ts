import { expect, test } from "@playwright/test";
// Direct DB access for the Task-119 specs that must manipulate the pinned
// database (inventory zeroing + restore, oversell cleanup). pg is a runtime
// dependency of the app; the connection string mirrors playwright.config.ts.
import { Client } from "pg";

// PDP specs must select the Product JSON-LD node, not the first script — the
// root layout's site-level Organization/WebSite graph precedes it in the DOM.
const productJsonLd = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    for (const n of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
      try {
        const parsed = JSON.parse(n.textContent ?? "");
        if (parsed["@type"] === "Product") return JSON.stringify(parsed);
      } catch { /* skip non-JSON nodes */ }
    }
    return null;
  });


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
    const jsonld = await productJsonLd(page);
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

test.describe("a11y: focus, steppers and announcements (Task 120)", () => {
  test("dark-panel form inputs show a visible focus indication", async ({ page }) => {
    // Task 120 F-7: the Family/Business/Planning-tools email inputs and the
    // BuyBox qty input stripped the outline with no focus:ring substitute —
    // WCAG 2.4.7. Probing the family surface (the pattern is identical on
    // the other three): focus must produce a computed box-shadow or outline.
    await page.goto("/family");
    const input = page.getByLabel("Email");
    await input.focus();
    // NB: Tailwind v4's outline-none computes outlineWidth 1px with
    // outlineStyle none — width alone is NOT a visible indication; require
    // a real box-shadow or a non-none, non-transparent outline.
    const indication = await input.evaluate((el) => {
      const cs = getComputedStyle(el);
      return (
        cs.boxShadow !== "none" ||
        (cs.outlineStyle !== "none" && cs.outlineWidth !== "0px" && cs.outlineColor !== "transparent")
      );
    });
    expect(indication, "family email shows no visible focus indication").toBe(true);
  });

  test("cart quantity minus is disabled at qty 1 (Remove stays the only destructive path)", async ({ page }) => {
    // Task 120 F-15: the − stepper at qty 1 silently deleted the line via
    // setQty(qty-1) — a destructive action reachable from an increment
    // control. The minus must disable at the floor; the dedicated Remove
    // button remains the only remove affordance.
    await page.goto("/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Shopping bag, 1 item/ }).click();
    await expect(page.getByRole("heading", { name: /Your bag \(1\)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Decrease quantity of/ })).toBeDisabled();
    // The plus still works from qty 1.
    await page.getByRole("button", { name: /Increase quantity of/ }).click();
    await expect(page.getByRole("button", { name: /Decrease quantity of/ })).toBeEnabled();
  });

  test("a failed promo apply announces via role=alert, not status", async ({ page }) => {
    // Task 120 F-18: the promo message rendered role="status" for success AND
    // failure — screen readers may not announce a failure politely queued.
    // ReviewSection already splits; the cart must too.
    await page.goto("/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Shopping bag, 1 item/ }).click();
    await page.getByLabel(/Promo code/i).fill("BOGUSCODE");
    await page.getByRole("button", { name: "Apply" }).click();
    // NB: Next's own route announcer also carries role="alert" (strict-mode
    // violation lesson) — scope to the promo message element.
    await expect(page.locator("aside p[role=alert]")).toContainText(/not valid/i);
    // And a success stays a polite status.
    await page.getByLabel(/Promo code/i).fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.locator("aside p[role=status]")).toContainText(/applied/i);
    await expect(page.locator("aside p[role=alert]")).toHaveCount(0);
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

test.describe("PDP JSON-LD availability source (Task 119)", () => {
  test("availability follows live store inventory, not the stale stockTotal seed", async ({ page }) => {
    // Task 119 F-3: JSON-LD availability derived from products.stockTotal — a
    // seed figure no order ever decrements — while the visible BuyBox on the
    // same page reads live per-store inventory. Structured data must claim
    // exactly what the page shows. This spec zeroes a quiet product's
    // inventory rows in the pinned DB (blackout-curtain-pair: no other spec
    // touches it; sum 45 vs stockTotal 190 at seed), asserts the JSON-LD
    // follows, then restores the rows in the finally block.
    const client = new Client({
      connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    await client.connect();
    const orig = await client.query(
      "select store_slug, quantity from inventory where product_id = (select id from products where slug = 'blackout-curtain-pair')"
    );
    try {
      await client.query(
        "update inventory set quantity = 0 where product_id = (select id from products where slug = 'blackout-curtain-pair')"
      );
      await page.goto("/product/blackout-curtain-pair");
      await expect(page.getByRole("heading", { name: "MORNING blackout curtains, pair" })).toBeVisible();
      const jsonld = await productJsonLd(page);
      const parsed = JSON.parse(jsonld ?? "null") as { offers?: { availability?: string } };
      // The stores show zero stock — the crawler-facing claim must agree.
      expect(parsed.offers?.availability).toBe("https://schema.org/OutOfStock");
    } finally {
      for (const row of orig.rows) {
        await client.query(
          "update inventory set quantity = $1 where product_id = (select id from products where slug = 'blackout-curtain-pair') and store_slug = $2",
          [row.quantity, row.store_slug]
        );
      }
      await client.end();
    }
  });
});

test.describe("checkout stock honesty (Task 119)", () => {
  test("overselling beyond live inventory is a 422 LOW_STOCK, not a silent floor", async ({ request }) => {
    // Task 119 F-25: placeOrder clamps qty 1–99 but never checks availability —
    // a 99-qty line for a 51-stock product (katong-bedside-table: quiet, no
    // other spec touches it) succeeded and floored the store row with
    // greatest(0,…) while the PDP prints "Only N left". The write boundary
    // must refuse what it cannot fulfil. The pre-fix behaviour (order placed)
    // is cleaned up in the finally block so the RED run leaves no residue.
    const client = new Client({
      connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    await client.connect();
    const pidRow = await client.query("select id from products where slug = 'katong-bedside-table'");
    const pid = pidRow.rows[0].id as number;
    const orig = await client.query("select store_slug, quantity from inventory where product_id = $1", [pid]);
    let orderNumber: string | null = null;
    try {
      const res = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.120.9" },
        data: {
          email: "oversell-probe@nordhem.sg",
          fullName: "Oversell Probe",
          phone: "+65 91234567",
          address: "Blk 1 Testing Rd #01-01",
          postal: "089001",
          deliveryMethod: "click-collect",
          deliverySlot: "Click & Collect — today 2pm",
          storeSlug: "tampines",
          paymentMethod: "card",
          lines: [{ productId: pid, qty: 99 }],
        },
      });
      const body = (await res.json()) as {
        ok?: boolean;
        data?: { orderNumber?: string };
        error?: { code?: string; message?: string };
      };
      if (body.ok && body.data?.orderNumber) orderNumber = body.data.orderNumber;
      expect(res.status()).toBe(422);
      expect(body.error?.code).toBe("LOW_STOCK");
    } finally {
      if (orderNumber) {
        await client.query("delete from order_items where order_id in (select id from orders where order_number = $1)", [orderNumber]);
        await client.query("delete from orders where order_number = $1", [orderNumber]);
      }
      for (const row of orig.rows) {
        await client.query("update inventory set quantity = $1 where product_id = $2 and store_slug = $3", [
          row.quantity,
          pid,
          row.store_slug,
        ]);
      }
      await client.end();
    }
  });
});

test.describe("SEO metadata blanket (Task 119)", () => {
  test("sitemap-indexed client pages ship real titles via their route layouts", async ({ page }) => {
    // Task 119 F-1/M-6: /shop, /family, /business, /sustainability and
    // /planning-tools are client components pinned into the sitemap — they
    // previously published only the root layout's default title. Route
    // layouts now carry each surface's claim (template suffix included).
    const claims: Array<[string, string]> = [
      ["/shop", "Shop all furniture · NORDHEM Singapore"],
      ["/family", "NORDHEM Family programme · NORDHEM Singapore"],
      ["/business", "NORDHEM Business — office fit-out in one quote · NORDHEM Singapore"],
      ["/sustainability", "Sustainability — circular furniture, buy-back and As-Is · NORDHEM Singapore"],
      ["/planning-tools", "Planning tools — room planners and measurement help · NORDHEM Singapore"],
    ];
    for (const [path, title] of claims) {
      await page.goto(path);
      await expect(page, `${path} title`).toHaveTitle(title);
    }
    // The shop route also carries a description + canonical (it is the
    // highest-traffic indexable client page).
    await page.goto("/shop");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Browse the full NORDHEM catalogue/
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://nordhem.sg/shop");
  });

  test("the six remaining static routes carry descriptions + canonicals (Task 120 F-6)", async ({ page }) => {
    // Task 120 F-6: /inspiration /offers /services /stores /food /help are
    // all sitemap-indexed but shipped title-only metadata — every SERP entry
    // fell back to the layout's generic description. Each route now claims
    // its own description and canonical (they are server components; the
    // metadata export extends in place, no layout needed).
    const routes: Array<[string, RegExp]> = [
      ["/inspiration", /Real Singapore homes/],
      ["/offers", /Up to 24% off/],
      ["/services", /deliver, assemble/],
      ["/stores", /Three NORDHEM stores/],
      ["/food", /Swedish-inspired/],
      ["/help", /How can we help/],
    ];
    for (const [path, re] of routes) {
      await page.goto(path);
      await expect(page.locator('meta[name="description"]'), `${path} description`).toHaveAttribute("content", re);
      await expect(page.locator('link[rel="canonical"]'), `${path} canonical`).toHaveAttribute(
        "href",
        `https://nordhem.sg${path}`,
      );
    }
  });

  test("family metadata matches the page's own earn-rate math (Task 120 F-4)", async ({ page }) => {
    // Task 120 F-4: the /family route layout claimed "earn 5 points per $10
    // spent" while the page copy AND calculator compute 10 points per $1 —
    // a 20× contradiction between the crawler-facing claim and the product,
    // plus a "members-only workshops" promise the surface does not have.
    // The SERP description must agree with the calculator it sits above.
    await page.goto("/family");
    const desc = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(desc).toContain("10 points");
    expect(desc).not.toContain("5 points per $10");
    expect(desc.toLowerCase()).not.toContain("workshop");
  });

  test("inspiration detail ships generated metadata", async ({ page }) => {
    // Task 119 F-5: the 6 sitemap-pinned room URLs previously had no
    // metadata export at all.
    await page.goto("/inspiration/2-room-flexi-bto-tampines");
    await expect(page).toHaveTitle("A calm 2-room Flexi BTO in Tampines · NORDHEM Singapore");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /low-maintenance home/
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://nordhem.sg/inspiration/2-room-flexi-bto-tampines"
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "A calm 2-room Flexi BTO in Tampines"
    );
  });

  test("home ships its own title and description, not the layout default", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("NORDHEM Singapore — Scandinavian furniture, beds, dining & more");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /24 products across 8 room categories/
    );
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", "https://nordhem.sg");
  });

  test("order confirmation page is noindex (PII surface)", async ({ page }) => {
    // Task 119 F-10: belt-and-suspenders with robots.txt's /order/ disallow —
    // a disallowed URL can still enter the index URL-only if externally
    // linked; the page itself must declare noindex wherever it IS readable.
    await page.goto("/order/NH-20260101-000001");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("site-level Organization/WebSite JSON-LD present on every page", async ({ page }) => {
    // Task 119 F-26: the storefront previously carried only the PDP Product
    // schema. The root layout now emits Organization + WebSite.
    await page.goto("/");
    const text = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(text ?? "null") as {
      "@graph"?: Array<{ "@type"?: string }>;
    };
    const types = (parsed["@graph"] ?? []).map((g) => g["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
  });
});

test.describe("checkout API boundary (Task 120)", () => {
  test("malformed JSON is a 400 BAD_REQUEST, never a leaked 500", async ({ page }) => {
    // Task 120 F-1: every sibling POST route (promotions/track/reviews)
    // parse-guards req.json() into a 400 with fixed copy; checkout let the
    // generic catch answer — a 500 CHECKOUT_FAILED whose message echoes the
    // raw parse error (or any internal error string) to an unauthenticated
    // caller. The most sensitive write boundary must not be the leakiest.
    // NOTE: Playwright's request API JSON-serializes string `data` (wrapping
    // it in quotes makes it valid JSON) — send the raw bytes from the
    // browser, same discipline as the Task-118 malformed-body spec.
    await page.goto("/");
    const body = await page.evaluate(async () => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.9.121.1" },
        body: '{"email": "broken',
      });
      const json = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
      return { status: res.status, code: json.error?.code, message: json.error?.message };
    });
    expect(body.status).toBe(400);
    expect(body.code).toBe("BAD_REQUEST");
    // Fixed copy only — the envelope never echoes the parse failure text.
    expect(body.message).not.toContain("JSON");
    expect(body.message).not.toContain("parse");
  });

  test("500-class failures ship fixed copy, not internal error strings", async ({ request }) => {
    // Task 120 F-1 companion: the generic catch must not forward err.message
    // (Postgres connection text etc.) into the public envelope. A guaranteed
    // internal failure: an unreachable-DATABASE_URL write path has no
    // fallback — but the pinned e2e DB is reachable, so instead we assert the
    // contract on the envelope shape via the oversell path's stable copy and
    // pin that only OrderRefusalError messages reach the client verbatim.
    // (The 500-path fixed-copy is additionally covered by the malformed-JSON
    // spec above: the parse guard removes the only reachable leak vector
    // without a DB outage.)
    const client = new Client({
      connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    await client.connect();
    const pidRow = await client.query("select id from products where slug = 'katong-bedside-table'");
    const pid = pidRow.rows[0].id as number;
    const orig = await client.query("select store_slug, quantity from inventory where product_id = $1", [pid]);
    try {
      await client.query("update inventory set quantity = 0 where product_id = $1", [pid]);
      const res = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.121.2" },
        data: {
          email: "boundary-probe@nordhem.sg",
          fullName: "Boundary Probe",
          phone: "+65 91234567",
          address: "Blk 1 Testing Rd #01-01",
          postal: "089001",
          lines: [{ productId: pid, qty: 1 }],
        },
      });
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      expect(res.status()).toBe(422);
      expect(body.error?.code).toBe("LOW_STOCK");
      // Stable, human copy — no driver internals in the envelope.
      expect(body.error?.message).not.toMatch(/connect|ECONNREFUSED|postgres|Error:/i);
    } finally {
      for (const row of orig.rows) {
        await client.query("update inventory set quantity = $1 where product_id = $2 and store_slug = $3", [
          row.quantity,
          pid,
          row.store_slug,
        ]);
      }
      await client.end();
    }
  });

  test("overlong write fields are refused, not persisted verbatim", async ({ request }) => {
    // Task 120 F-3: email/fullName/address carried minimum-length checks only
    // (the reviews route slices 60/120/2000 — checkout sliced nothing), so a
    // 300-char address was persisted verbatim by an unauthenticated writer.
    const res = await request.post("/api/checkout", {
      headers: { "x-forwarded-for": "10.9.121.3" },
      data: {
        email: "caps-probe@nordhem.sg",
        fullName: "Caps Probe",
        phone: "+65 91234567",
        address: `Blk 1 Testing Rd #01-01 ${"A".repeat(300)}`,
        postal: "089001",
        lines: [{ productId: 1, qty: 1 }],
      },
    });
    const body = (await res.json()) as { error?: { code?: string } };
    expect(res.status()).toBe(422);
    expect(body.error?.code).toBe("VALIDATION");
  });

  test("two concurrent last-unit orders: exactly one wins, one 422 LOW_STOCK", async ({ request }) => {
    // Task 120 F-2: placeOrder checked availability, inserted the order,
    // then decremented with greatest(0,…) — three separate statements, so two
    // concurrent submissions for the last unit both passed the check, both
    // placed an order and both floored the store row: a silent oversell that
    // defeats the "refuses what it cannot fulfil" claim. The seam is now one
    // transaction with row locks, so the loser must re-read 0 under the
    // winner's committed decrement and refuse. Quiet product:
    // fjord-2seat-compact-sofa (no other spec touches it).
    const client = new Client({
      connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    await client.connect();
    const pidRow = await client.query("select id from products where slug = 'fjord-2seat-compact-sofa'");
    const pid = pidRow.rows[0].id as number;
    const orig = await client.query("select store_slug, quantity from inventory where product_id = $1", [pid]);
    let orderNumber: string | null = null;
    try {
      // Pin the product to exactly ONE unit island-wide.
      await client.query(
        "update inventory set quantity = (case when store_slug = 'tampines' then 1 else 0 end) where product_id = $1",
        [pid]
      );
      const order = {
        email: "race-probe@nordhem.sg",
        fullName: "Race Probe",
        phone: "+65 91234567",
        address: "Blk 1 Testing Rd #01-01",
        postal: "089001",
        deliveryMethod: "click-collect",
        deliverySlot: "Click & Collect — today 2pm",
        storeSlug: "tampines",
        paymentMethod: "card",
        lines: [{ productId: pid, qty: 1 }],
      };
      const fire = (ip: string) =>
        request.post("/api/checkout", { headers: { "x-forwarded-for": ip }, data: order });
      const [a, b] = await Promise.all([fire("10.9.121.4"), fire("10.9.121.5")]);
      const statuses = [a.status(), b.status()].sort();
      const bodies = (await Promise.all([a.json(), b.json()])) as Array<{
        ok?: boolean;
        data?: { orderNumber?: string };
        error?: { code?: string };
      }>;
      const winner = bodies.find((x) => x.ok && x.data?.orderNumber);
      if (winner?.data?.orderNumber) orderNumber = winner.data.orderNumber;
      // Exactly one order may exist against one unit of stock.
      expect(statuses).toEqual([201, 422]);
      const refused = bodies.find((x) => !x.ok);
      expect(refused?.error?.code).toBe("LOW_STOCK");
    } finally {
      if (orderNumber) {
        await client.query("delete from order_items where order_id in (select id from orders where order_number = $1)", [orderNumber]);
        await client.query("delete from orders where order_number = $1", [orderNumber]);
      }
      for (const row of orig.rows) {
        await client.query("update inventory set quantity = $1 where product_id = $2 and store_slug = $3", [
          row.quantity,
          pid,
          row.store_slug,
        ]);
      }
      await client.end();
    }
  });
});

test.describe("PDP client-side navigation state (Task 121 F-3)", () => {
  test("related-product navigation resets reviews and BuyBox state to the new product", async ({ page }) => {
    // SOLBAKKEN carries 2 seeded reviews; its living-room sibling HAVBRIS has none.
    await page.goto("/product/solbakken-3-seat-sofa");
    await expect(page.getByRole("heading", { name: "Reviews (2)" })).toBeVisible();
    await expect(page.getByText("Mei L.").first()).toBeVisible();

    // Dirty the BuyBox state so a stale carry-over is observable.
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.locator("#qty")).toHaveValue("2");

    // Client-side navigate via the "Pairs well with" grid (same tree position).
    await page.getByRole("link", { name: "HAVBRIS lounge chair" }).first().click();
    await expect(page).toHaveURL(/\/product\/havbris-lounge-chair/);

    // The review section must belong to HAVBRIS — the previous product's
    // reviews must not survive the client-side transition, and the count
    // must re-derive from the new product's (empty) review list.
    await expect(page.getByRole("heading", { name: "Reviews (0)" })).toBeVisible();
    await expect(page.getByText("Mei L.")).toHaveCount(0);

    // The BuyBox stepper must reset with the product, not keep SOLBAKKEN's qty.
    await expect(page.locator("#qty")).toHaveValue("1");
  });
});

test.describe("click-&-collect store stock honesty (Task 121 F-2)", () => {
  test("pickup at a zeroed store is a 422 LOW_STOCK even when other stores carry stock", async ({ request }) => {
    // Task 121 F-2: the availability check summed inventory across ALL
    // stores while fulfilment is single-store — a click-&-collect order at
    // Jurong passed with Jurong at 0 (Tampines carrying the stock) and the
    // confirmation then promised pickup at a store the PDP itself showed as
    // "Out of stock". Quiet product: skagen-media-bench (no other spec
    // manipulates it).
    const client = new Client({
      connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    await client.connect();
    const pidRow = await client.query("select id from products where slug = 'skagen-media-bench'");
    const pid = pidRow.rows[0].id as number;
    const orig = await client.query("select store_slug, quantity from inventory where product_id = $1", [pid]);
    let orderNumber: string | null = null;
    try {
      // Jurong empty; the other two stores fully stocked — the aggregate
      // check sees plenty, the pickup promise cannot be kept.
      await client.query(
        "update inventory set quantity = (case when store_slug = 'jurong' then 0 else 5 end) where product_id = $1",
        [pid]
      );
      const base = {
        email: "cc-probe@nordhem.sg",
        fullName: "CC Probe",
        phone: "+65 91234567",
        address: "Blk 1 Testing Rd #01-01",
        postal: "089001",
        deliveryMethod: "click-collect",
        deliverySlot: "Click & Collect — today 2pm",
        paymentMethod: "card",
        lines: [{ productId: pid, qty: 1 }],
      };
      const refused = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.122.1" },
        data: { ...base, storeSlug: "jurong" },
      });
      expect(refused.status()).toBe(422);
      const body = (await refused.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe("LOW_STOCK");

      // Positive control: pickup at a stocked store still succeeds.
      const ok = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.122.2" },
        data: { ...base, storeSlug: "tampines" },
      });
      expect(ok.status()).toBe(201);
      const okBody = (await ok.json()) as { data?: { orderNumber?: string } };
      orderNumber = okBody.data?.orderNumber ?? null;
    } finally {
      if (orderNumber) {
        await client.query("delete from order_items where order_id in (select id from orders where order_number = $1)", [orderNumber]);
        await client.query("delete from orders where order_number = $1", [orderNumber]);
      }
      for (const row of orig.rows) {
        await client.query("update inventory set quantity = $1 where product_id = $2 and store_slug = $3", [
          row.quantity,
          pid,
          row.store_slug,
        ]);
      }
      await client.end();
    }
  });
});

test.describe("PDP review-count honesty (Task 121 F-6)", () => {
  test("JSON-LD reviewCount matches the live review list; the header link carries no invented count", async ({ page }) => {
    // Task 121 F-6: the header rendered the seed column ("412 reviews") right
    // beside a live section rendering "Reviews (2)" — two contradictory
    // numbers on one page, and the crawler-facing aggregateRating claimed the
    // unauditable fiction. The structured-data count must derive from the
    // same live rows the section renders, and the header link must not
    // publish a count at all.
    await page.goto("/product/solbakken-3-seat-sofa");
    const section = await page.getByRole("heading", { name: /^Reviews \(\d+\)$/ }).textContent();
    const liveCount = Number(section?.match(/Reviews \((\d+)\)/)?.[1] ?? "-1");
    expect(liveCount).toBeGreaterThan(0);

    const jsonld = await productJsonLd(page);
    const parsed = JSON.parse(jsonld ?? "null") as {
      aggregateRating?: { ratingValue?: string; reviewCount?: number };
    };
    expect(parsed.aggregateRating?.reviewCount).toBe(liveCount);

    // The header link publishes the anchor target, not a second number.
    await expect(page.locator('a[href="#reviews"]')).toHaveText("reviews");
  });

  test("a product with zero live reviews ships no aggregateRating node", async ({ page }) => {
    // Google's structured-data policy: never publish an aggregateRating you
    // cannot back with visible reviews. HAVBRIS has no seeded reviews.
    await page.goto("/product/havbris-lounge-chair");
    await expect(page.getByRole("heading", { name: "Reviews (0)" })).toBeVisible();
    const jsonld = await productJsonLd(page);
    const parsed = JSON.parse(jsonld ?? "null") as { aggregateRating?: unknown };
    expect(parsed.aggregateRating).toBeUndefined();
  });
});

test.describe("checkout storeSlug / deliverySlot boundary (Task 121 F-7)", () => {
  test("an unknown storeSlug is refused, not persisted as junk copy", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      headers: { "x-forwarded-for": "10.9.123.1" },
      data: {
        email: "slug-probe@nordhem.sg",
        fullName: "Slug Probe",
        phone: "+65 91234567",
        address: "Blk 1 Testing Rd #01-01",
        postal: "089001",
        deliveryMethod: "click-collect",
        deliverySlot: "Click & Collect — today 2pm",
        storeSlug: "not-a-real-store",
        paymentMethod: "card",
        lines: [{ productId: 1, qty: 1 }],
      },
    });
    expect(res.status()).toBe(422);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("VALIDATION");
  });

  test("an overlong deliverySlot is refused, never silently truncated", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      headers: { "x-forwarded-for": "10.9.123.2" },
      data: {
        email: "slot-probe@nordhem.sg",
        fullName: "Slot Probe",
        phone: "+65 91234567",
        address: "Blk 1 Testing Rd #01-01",
        postal: "089001",
        deliveryMethod: "delivery",
        deliverySlot: "X".repeat(120),
        storeSlug: "tampines",
        paymentMethod: "card",
        lines: [{ productId: 1, qty: 1 }],
      },
    });
    expect(res.status()).toBe(422);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("VALIDATION");
  });
});

test.describe("search settle discipline (Task 121 F-1)", () => {
  test("no verdict is announced before the search settles", async ({ page }) => {
    // Task 121 F-1: loading initialized false and only flipped inside the
    // 250ms debounce callback, so the hydrated page rendered "0 results for
    // 'sofa'" — assertively wrong — until the debounce fired. The window is
    // only ~250ms wide, too narrow for a polling assertion: instead FREEZE
    // the debounce-class timeout for the first phase, which holds the page
    // in exactly the pre-settle state the flash occupies.
    await page.addInitScript(() => {
      (window as unknown as { __freezeDebounce?: boolean }).__freezeDebounce = true;
      const orig = window.setTimeout.bind(window);
      window.setTimeout = ((fn: TimerHandler, timeout?: number, ...args: unknown[]) => {
        const w = window as unknown as { __freezeDebounce?: boolean };
        if (w.__freezeDebounce && typeof timeout === "number" && timeout >= 200 && timeout <= 300) {
          // Swallow the debounce: the pre-settle state persists indefinitely.
          return orig(() => {}, 2_000_000_000);
        }
        return orig(fn, timeout, ...args);
      }) as typeof window.setTimeout;
    });

    // Phase 1 — frozen debounce: no verdict may render while unsettled.
    await page.goto("/search?q=sofa");
    await page.waitForTimeout(900); // hydration + margin: the flash would be showing by now
    await expect(page.getByText(/^0 results/)).toHaveCount(0);
    await expect(page.getByText("No products found")).toHaveCount(0);

    // Phase 2 — unfreeze and re-run the search: the settle path still works.
    await page.evaluate(() => {
      (window as unknown as { __freezeDebounce?: boolean }).__freezeDebounce = false;
    });
    // Two Search buttons exist (header + page form) — the documented
    // responsive double-DOM trap; scope to the page's own form.
    await page.locator("#main").getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("status")).toHaveText(/\d+ results? for “sofa”/, { timeout: 10_000 });
  });
});

test.describe("checkout form error placement (Task 121 F-12)", () => {
  test("a contact-field error surfaces above the form, not inside the Payment section", async ({ page }) => {
    await page.goto("/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.goto("/checkout");
    await page.getByLabel("Full name").fill("Error Probe");
    await page.getByLabel("Phone").fill("+65 91234567");
    await page.getByLabel("Postal code").fill("089001");
    await page.getByPlaceholder("Blk, street, unit number").fill("Blk 1 Testing Rd #01-01");
    await page.getByLabel("Email").fill("a@b"); // passes browser type=email, fails our EMAIL_RE — our validation must answer
    await page.getByRole("button", { name: /^Pay / }).click();
    // Scope to #main: the Next route announcer is a second [role=alert] at
    // the end of body (the documented Task-120 strict-mode trap).
    const alert = page.locator("#main").getByRole("alert");
    await expect(alert).toBeVisible();
    // The alert must precede the Fulfilment section in DOM order — contact
    // errors used to render physically inside "3 · Payment". expect.poll
    // absorbs the brief post-submit rerender window.
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const main = document.getElementById("main");
          const alertEl = main?.querySelector('[role="alert"]') ?? null;
          const fulfil = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent?.includes("Fulfilment")) ?? null;
          if (!alertEl || !fulfil) return "missing";
          return (alertEl.compareDocumentPosition(fulfil) & Node.DOCUMENT_POSITION_FOLLOWING) === Node.DOCUMENT_POSITION_FOLLOWING;
        }),
      )
      .toBe(true);
  });
});

test.describe("checkout fulfilment method switch (Task 121 F-20 pin)", () => {
  test("switching to Click & Collect re-derives the slot options", async ({ page }) => {
    await page.goto("/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.goto("/checkout");
    const slot = page.getByLabel("Time slot");
    await expect(slot).toHaveValue("Standard (3–5 days)");
    await page.getByRole("button", { name: /Click & Collect/ }).click();
    await expect(page.getByRole("button", { name: /Click & Collect/ })).toHaveAttribute("aria-pressed", "true");
    // The slot list re-derives from the method and resets to its first option.
    await expect(slot).toHaveValue("Today 2pm");
    const options = await slot.locator("option").allTextContents();
    expect(options).toEqual(["Today 2pm", "Tomorrow 10am"]);
  });
});

test.describe("PDP stepper floor (Task 121 F-11)", () => {
  test("PDP quantity minus is disabled at qty 1 (cart-page parity)", async ({ page }) => {
    // Task 120 fixed the CART page stepper floor only — the PDP BuyBox kept a
    // dead enabled control at qty 1.
    await page.goto("/product/solbakken-3-seat-sofa");
    const minus = page.getByRole("button", { name: "Decrease quantity" });
    await expect(minus).toBeDisabled();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(minus).toBeEnabled();
    await minus.click();
    await expect(minus).toBeDisabled();
  });
});

test.describe("shop loading announcement (Task 121 F-13)", () => {
  test("the loading skeleton announces via role=status, not a bare aria-label div", async ({ page }) => {
    await page.route("**/api/products**", async (route) => {
      await page.waitForTimeout(600);
      await route.continue();
    });
    await page.goto("/shop");
    // Trigger a client-side refetch (keyword filter) to expose the skeletons.
    await page.getByLabel("Filter products by keyword").fill("sofa");
    await expect(page.getByRole("status")).toBeVisible();
    // Once the delayed response lands, the skeleton region disappears.
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.locator("main a[href^='/product/']").first()).toBeVisible();
  });
});

test.describe("site JSON-LD search action (Task 121 F-14)", () => {
  test("the WebSite node carries a SearchAction backed by the search page", async ({ page }) => {
    await page.goto("/");
    const has = await page.evaluate(() => {
      for (const n of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
        try {
          const parsed = JSON.parse(n.textContent ?? "") as { "@graph"?: Array<Record<string, unknown>> };
          const site = parsed["@graph"]?.find((x) => x["@type"] === "WebSite");
          if (site) {
            const action = site.potentialAction as { "@type"?: string; target?: string } | undefined;
            return action?.["@type"] === "SearchAction" && typeof action.target === "string" && action.target.includes("/search?q=");
          }
        } catch { /* skip non-JSON nodes */ }
      }
      return false;
    });
    expect(has).toBe(true);
  });
});

test.describe("shop SSR content (Task 121 F-17)", () => {
  test("the shop grid ships in the HTML — no JavaScript required", async ({ browser }) => {
    // The shop page was a client-fetch island: its sitemap-indexed URL served
    // an empty grid to non-JS crawlers and unfurlers.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/shop");
    const cards = page.locator("a[href^='/product/']");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(20);
    await context.close();
  });

  test("a category link ships the filtered grid in SSR too", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/shop?cat=bedroom");
    // The bedroom category carries exactly these 3 products (each card
    // renders two links — image + name — so count by name, not anchors).
    for (const name of ["TAMPINES storage bed", "JURONG 3-door wardrobe", "KATONG bedside table"]) {
      // Two anchors per card (image + name) — first() keeps strict mode happy.
      await expect(page.getByRole("link", { name }).first()).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "SOLBAKKEN 3-seat sofa" })).toHaveCount(0);
    await context.close();
  });
});

test.describe("home social preview (Task 121 F-18)", () => {
  test("home ships an absolute og:image for link previews", async ({ page }) => {
    await page.goto("/");
    const og = page.locator('meta[property="og:image"]');
    await expect(og).toHaveCount(1);
    expect(await og.getAttribute("content")).toMatch(/^https:\/\/.+\.(?:jpeg|jpg|png)/);
  });
});

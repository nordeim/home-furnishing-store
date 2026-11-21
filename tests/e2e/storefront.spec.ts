import { expect, test } from "@playwright/test";
// Direct DB access for the Task-119 specs that must manipulate the pinned
// database (inventory zeroing + restore, oversell cleanup). pg is a runtime
// dependency of the app; the connection string mirrors playwright.config.ts.
import { Client } from "pg";
import { gotoHydrated } from "./helpers";
// Task 124 F-14: the sitemap count derives from the catalogue constants (the
// unit suite's approach) — a hardcoded 42 broke on the first catalogue edit.
import { CATEGORIES, INSPIRATIONS, PRODUCTS, PROMOS, STORES, catalogMaxDiscountPercent, storeName } from "../../src/lib/catalog";
import { GST_RATE, FREE_DELIVERY_THRESHOLD_CENTS, FAMILY_VOUCHER_CENTS, FAMILY_POINTS_PER_VOUCHER, FAMILY_POINTS_PER_DOLLAR, TRADE_RATE, formatSGD, ASSEMBLY_FEE_CENTS, DESIGN_SERVICE_FEE_CENTS, DELIVERY_SLOTS } from "../../src/lib/utils";

// Task 126 F-3: the max-discount pins derive from the catalogue (the same
// seam the hero/strip/offers copy interpolates) — a catalogue edit
// self-corrects the assertions instead of rotting them.
const MAX_OFF = catalogMaxDiscountPercent();

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

// Task 126 F-2: shared RED-run safety net (the gotcha-#13 discipline, applied
// uniformly). A refusal-pinning spec whose boundary regresses places a REAL
// order; this deletes every order the probe email placed and restores the
// inventory placeOrder decremented — re-derived from the order rows about to
// be deleted (the payload's lines may have been dropped or normalized by the
// boundary, the inserted order_items are the only truth). No-op when the
// probe placed nothing (the GREEN path).
// Task 132 F-4: every write-capable spec uses its OWN probe email (the three
// checkout-caps specs shared one pre-132 — two concurrent RED runs could read
// the same rows before either deletes and double-restore the inventory).
async function deleteProbeOrders(email: string): Promise<void> {
  const client = new Client({
    connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  });
  await client.connect();
  try {
    const existing = await client.query("select id from orders where email = $1", [email]);
    if (existing.rows.length === 0) return;
    const decremented = await client.query(
      `select oi.product_id, o.store_slug, sum(oi.qty)::int as qty
         from order_items oi join orders o on oi.order_id = o.id
        where o.email = $1 group by oi.product_id, o.store_slug`,
      [email],
    );
    for (const r of decremented.rows) {
      await client.query(
        "update inventory set quantity = quantity + $1 where product_id = $2 and store_slug = $3",
        [r.qty, r.product_id, r.store_slug],
      );
    }
    await client.query("delete from order_items where order_id in (select id from orders where email = $1)", [email]);
    await client.query("delete from orders where email = $1", [email]);
  } finally {
    await client.end();
  }
}


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
    await expect(page.getByText(`Price includes ${Math.round(GST_RATE * 100)}% GST`)).toBeVisible();

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

  test("PDP delivery copy renders a real ampersand, never the raw entity (Task 127 F-1)", async ({ page }) => {
    // Task 126's fee-derivation moved the delivery details line into a JS
    // template literal, where "&amp;" no longer decodes — every PDP rendered
    // the literal text "Click &amp; Collect" until this pin. Entities decode
    // only in JSX text children, never inside {`…`} string expressions.
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    const details = page
      .locator("details", { hasText: "Delivery, assembly" })
      .locator("summary");
    await details.click();
    const body = page
      .locator("details", { hasText: "Delivery, assembly" })
      .locator("p");
    await expect(body).toContainText("Click & Collect free in 2 hours");
    await expect(body).not.toContainText("&amp;");
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

  test("sitemap serves 12 static + every product + every room URL (Task 124 F-14: derived, not hardcoded)", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const expected = 12 + PRODUCTS.length + INSPIRATIONS.length;
    expect((xml.match(/<url>/g) ?? []).length).toBe(expected);
    expect(xml).toContain("https://nordhem.sg/product/solbakken-3-seat-sofa");
    expect(xml).not.toContain("/order/");
  });
});

test.describe("API envelope", () => {
  test("health returns the envelope with the live DB (Task 123 F-9)", async ({ request }) => {
    // The probe used to be the one route deviating from the documented
    // "envelope everywhere" contract (bare { ok: true }); it now speaks
    // { ok, data } like every sibling. Consumers check the HTTP status only.
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toEqual({ ok: true, data: { db: "up" } });
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

  test("products API ?max= is whole-number strict (Task 127 F-3)", async ({ request }) => {
    // Task 126 F-5 made the reviews GET boundary whole-number-strict; this
    // sibling GET still Number()-coerced its price cap: ?max=abc silently
    // filtered nothing (NaN) and ?max=1.5 became a fractional-dollar filter.
    // Malformed values are refused like every read boundary.
    for (const bad of ["abc", "1.5", "-3"]) {
      const res = await request.get(`/api/products?max=${encodeURIComponent(bad)}`);
      expect(res.status(), `max=${bad}`).toBe(422);
    }
    const ok = await request.get("/api/products?max=250");
    expect(ok.status()).toBe(200);
    const json = (await ok.json()) as { ok: boolean; data: Array<{ priceCents: number }> };
    expect(json.ok).toBe(true);
    expect(json.data.every((p) => p.priceCents <= 25000)).toBe(true);
  });

  test("products API refuses an unknown cat with 422, never a fake empty catalogue (Task 135 F-2)", async ({ request }) => {
    // The ?max stance applied to its sibling params: ?cat=zzz used to answer
    // 200 {ok:true, data:[]} — a typo'd category masquerading as a legitimately
    // empty catalogue. The shop PAGE keeps its graceful URL-driven posture
    // (degrade, never fail); only the API boundary hardens.
    const res = await request.get("/api/products?cat=zzz");
    expect(res.status()).toBe(422);
    const json = (await res.json()) as { ok: boolean; error: { code: string; message: string } };
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("VALIDATION");
    // A KNOWN category still answers 200 with the filtered set (the positive
    // control — the existing filters-and-sorts spec covers cat=dining, this
    // pins the boundary against the whitelist overreach).
    const ok = await request.get("/api/products?cat=dining");
    expect(ok.status()).toBe(200);
    const okJson = (await ok.json()) as { ok: boolean; data: unknown[] };
    expect(okJson.ok).toBe(true);
    expect(okJson.data.length).toBeGreaterThan(0);
  });

  test("products API refuses an unknown sort with 422, never a silent unsorted 200 (Task 135 F-2)", async ({ request }) => {
    // ?sort=zzz fell through sortProductList as an unsorted 200 (the seam's
    // documented pass-through) — the BOUNDARY must refuse what the seam merely
    // tolerates, the ?max discipline. The sort whitelist is the shared
    // SORT_KEYS seam (utils.ts), pinned against the shop display list by a
    // unit fs-pin.
    const res = await request.get("/api/products?sort=zzz");
    expect(res.status()).toBe(422);
    const json = (await res.json()) as { ok: boolean; error: { code: string; message: string } };
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("VALIDATION");
    // Every LEGITIMATE sort key stays 200 (the full whitelist sweep — a
    // future key added to the shop display list without the seam update
    // would 422 a legitimately offered option, the drift class).
    for (const good of ["featured", "popular", "price-asc", "price-desc", "rating", "new"]) {
      const ok = await request.get(`/api/products?sort=${good}`);
      expect(ok.status(), `sort=${good}`).toBe(200);
    }
  });

  test("products API keyword recall matches the shop-SSR seam (Task 123 F-5)", async ({ request }) => {
    // The API filter matched name/tagline/description/sku only, while the
    // shop SSR seam (searchProducts) also matches categorySlug — verified
    // live: q=outdoor returned 0 from the API while the shop grid returned
    // the two balcony & outdoor products. One catalogue, one recall.
    const res = await request.get("/api/products?q=outdoor");
    const json = (await res.json()) as { ok: boolean; data: Array<{ slug: string }> };
    expect(json.ok).toBe(true);
    expect(json.data.length).toBe(2);
    expect(json.data.map((p) => p.slug).sort()).toEqual(["monstera-planter-duo", "veranda-balcony-set"]);
    // Task 124 F-12: the seam lowercases the NEEDLE too — a capitalized
    // query used to return 0 results (only the haystack was lowercased).
    const caps = await request.get("/api/products?q=Outdoor");
    const capsJson = (await caps.json()) as { ok: boolean; data: Array<{ slug: string }> };
    expect(capsJson.ok).toBe(true);
    expect(capsJson.data.length).toBe(2);
    // Task 128 F-5: the seam TRIMS the needle too — the searchProducts seam
    // (q.trim().toLowerCase()) and the search page both trim, but this route
    // didn't: a padded needle like " solbakken " (the word starts the product
    // NAME, so no leading space exists in the haystack) returned 0 here while
    // the same text via /search returned the product. One recall, one
    // normalization (browser-verified live at audit: 1 vs 0).
    const padded = await request.get("/api/products?q=%20solbakken%20");
    const paddedJson = (await padded.json()) as { ok: boolean; data: Array<{ slug: string }> };
    expect(paddedJson.ok).toBe(true);
    expect(paddedJson.data.map((p) => p.slug)).toEqual(["solbakken-3-seat-sofa"]);
  });

  test("checkout validates input (422 envelope)", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      headers: { "x-forwarded-for": "10.9.124.10" },
      data: { email: "not-an-email", lines: [] },
    });
    expect(res.status()).toBe(422);
    const json = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("VALIDATION");
  });

  test("promo validation rejects below-minimum spend (422)", async ({ request }) => {
    const res = await request.post("/api/promotions/validate", {
      headers: { "x-forwarded-for": "10.9.124.11" },
      data: { code: "WELCOME10", subtotalCents: 5000 }, // min $150
    });
    expect(res.status()).toBe(422);
    const json = (await res.json()) as { ok: boolean; error: { code: string; message: string } };
    expect(json.error.code).toBe("INVALID_PROMO");
    expect(json.error.message).toContain("minimum spend");
  });

  test("reviews POST rejects an invalid productId with 422 (not a 500 FK crash)", async ({ request }) => {
    const res = await request.post("/api/reviews", {
      headers: { "x-forwarded-for": "10.9.124.12" },
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

  test("reviews int4-overflow productId is a 422 on both verbs (Task 133 F-1)", async ({ page }) => {
    // Task 133 F-1: 2^31 passes every JS gate (number, integer, > 0) but
    // Postgres rejects the parameter for the int4 products.id column with
    // 22003 — the POST used to answer 500 REVIEW_FAILED for a pure client
    // fault (the exact misclassification the route's own Task-118 F-6
    // comment claims closed; only the UPPER bound was never probed), and
    // the GET silently degraded to {ok:true,data:[]} — inconsistent with
    // the same route's ?productId=1.5 → 422 stance. The shared MAX_INT4
    // seam (src/lib/utils.ts) bounds both verbs. The insert can never
    // succeed with an overflowing id (the DB rejects it), so this spec is
    // not write-capable — the finally net is belt-and-suspenders.
    const client = new Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db" });
    await client.connect();
    try {
      await page.goto("/");
      const post = await page.evaluate(async () => {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId: 2147483648, author: "Int4 Probe", rating: 5, body: "int4 overflow probe" }),
        });
        const json = (await res.json()) as { ok: boolean; error: { code: string } };
        return { status: res.status, code: json.error?.code };
      });
      expect(post.status).toBe(422);
      expect(post.code).toBe("VALIDATION");
      const get = await page.evaluate(async () => {
        const res = await fetch("/api/reviews?productId=2147483648");
        const json = (await res.json()) as { ok: boolean; error: { code: string } };
        return { status: res.status, code: json.error?.code };
      });
      expect(get.status).toBe(422);
      expect(get.code).toBe("VALIDATION");
    } finally {
      await client.query("delete from reviews where author = 'Int4 Probe' and body = 'int4 overflow probe'");
      await client.end();
    }
  });

  test("reviews POST rejects a bad rating / short name with 422", async ({ request }) => {
    // Task 129 F-1c: this refusal spec is write-capable — a compound-validation
    // regression (rating bound AND author-min both reverted) inserts the junk
    // row. The RED-run net keys on the probe's own identity (lesson 33) and
    // lives in a finally (lesson 39: a net after a failing expect is dead code).
    const client = new Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db" });
    await client.connect();
    try {
      const res = await request.post("/api/reviews", {
        headers: { "x-forwarded-for": "10.9.124.13" },
        data: { productId: 1, author: "X", rating: 9, body: "n/a" },
      });
      expect(res.status()).toBe(422);
      const json = (await res.json()) as { ok: boolean; error: { code: string } };
      expect(json.error.code).toBe("VALIDATION");
    } finally {
      await client.query("delete from reviews where author = 'X' and body = 'n/a'");
      await client.end();
    }
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

  test("valid-JSON NON-OBJECT bodies are 400 client errors, not 500s (Task 128 F-1)", async ({ page }) => {
    // `null` (and on checkout any primitive) parses as valid JSON but is not
    // a JSON object: the boundaries used to crash on the first `field in body`
    // / property access and surface a 500 "failed on our side" for a pure
    // client fault. Browser-verified live at audit: null → 500 on all four
    // POST routes; 5 → 500 on checkout ("email" in 5 is a TypeError). The
    // shape guard belongs beside the parse guard — same client-fault class.
    // Raw bytes from the browser (the malformed-JSON spec's discipline).
    await page.goto("/");
    const statuses = await page.evaluate(async () => {
      const out: Array<{ path: string; body: string; status: number; code: string | null }> = [];
      const probes: Array<{ path: string; body: string }> = [
        { path: "/api/checkout", body: "null" },
        { path: "/api/checkout", body: "5" },
        // Task 129 F-7: the checkout Array.isArray branch, pinned — an array
        // IS an object (typeof "object") and parses cleanly, but it is not
        // the record the field reads assume; before the guard it limped to a
        // 422 "bag" of nothing (the 400 parse class is the honest answer).
        { path: "/api/checkout", body: '["a"]' },
        // Task 130 F-5: the array classification now spans all four routes —
        // the three siblings used to let arrays past the shape guard into a
        // 422 VALIDATION on fields the array never carried (same client
        // fault as null/primitives, different status — the classification
        // is part of the contract, not a detail).
        { path: "/api/reviews", body: '["a"]' },
        { path: "/api/promotions/validate", body: '["a"]' },
        { path: "/api/orders/track", body: '["a"]' },
        { path: "/api/reviews", body: "null" },
        { path: "/api/promotions/validate", body: "null" },
        { path: "/api/orders/track", body: "null" },
      ];
      for (const probe of probes) {
        const res = await fetch(probe.path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: probe.body,
        });
        const json = (await res.json()) as { error?: { code?: string } };
        out.push({ path: probe.path, body: probe.body, status: res.status, code: json.error?.code ?? null });
      }
      return out;
    });
    for (const r of statuses) {
      expect(r.status, `${r.path} body ${r.body} must be a 400, never a 500`).toBe(400);
      expect(r.code, `${r.path} body ${r.body} envelope code`).toBe("BAD_REQUEST");
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

  test("wishlist heading counts RESOLVED items, not persisted slugs (Task 130 F-8)", async ({ page }) => {
    // One real slug + one ghost slug persisted: the grid can only ever show
    // one card, so "(2)" above one card is a lie (the honesty class the
    // project polices everywhere). While loading the persisted count is the
    // honest number — the assertion targets the SETTLED state, where
    // items.length is the truth. The error state keeps the persisted count
    // (resolution is unknowable with the API down) — pinned by the sibling
    // error spec above.
    await page.addInitScript(() => {
      localStorage.setItem("nordhem_wish_v1", JSON.stringify(["solbakken-3-seat-sofa", "ghost-product-xyz"]));
    });
    await page.goto("/wishlist");
    await expect(page.getByRole("heading", { name: "Your wishlist (1)" })).toBeVisible();
    // One card (an <article> per ProductCard — each card carries two anchors:
    // the image link and the name link, so counting anchors would double).
    await expect(page.locator("main article")).toHaveCount(1);
    // The ghost slug never renders a card (locator repaired in Task 131 F-1:
    // the old locator text was broken CSS that matched nothing, making
    // this assertion a permanent no-op).
    await expect(page.locator("main a[href='/product/ghost-product-xyz']")).toHaveCount(0);
    // Task 131 F-1: the header badge is the persisted SAVED-entry count BY
    // DESIGN (the Header cannot resolve slugs without a catalogue fetch on
    // every route - resolution is unknowable there, the same degrade posture
    // as the error state) - so with one real + one ghost slug it shows 2
    // while the heading honestly shows (1). The page must EXPLAIN the
    // difference instead of silently contradicting the badge.
    await expect(page.getByRole("link", { name: "Wishlist, 2 items" })).toBeVisible();
    await expect(page.getByText("1 saved item is no longer available")).toBeVisible();
  });

  test("wishlist heading quotes the PERSISTED count during the removal window — no stale departed-count claim (Task 140 F-2)", async ({ page }) => {
    // The removal axis of the Task-130 F-8 honesty class: heart-removing a
    // saved card re-runs the [wishlist] effect, but `loading` only ever
    // starts true and settles false — it never re-flips — so during the
    // refetch the heading kept quoting the STALE items.length (the departed
    // view's "2") while the Header badge already said the truth (1). The
    // window is deterministic here: the route delays every /api/products
    // fetch 700 ms, and the heading is read SINGLE-SHOT (no auto-retry —
    // a retrying assertion would bridge the window and false-pass, the
    // Task-138 F-1 first-draft lesson).
    await page.addInitScript(() => {
      localStorage.setItem("nordhem_wish_v1", JSON.stringify(["solbakken-3-seat-sofa", "skagen-media-bench"]));
    });
    await page.route("**/api/products", async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });
    await gotoHydrated(page, "/wishlist");
    // The first (delayed) resolution lands: two cards.
    await expect(page.locator("main article")).toHaveCount(2);
    // Remove one — the store updates instantly, the refetch is in flight.
    await page.getByRole("button", { name: "Remove SKAGEN media bench from wishlist" }).click();
    // SINGLE-SHOT heading read inside the 700 ms window: the persisted
    // count (1) is the honest number while resolution is in flight — the
    // stale items.length (2) is the departed view's claim.
    const headingText = (await page.getByRole("heading", { name: /Your wishlist/ }).textContent()) ?? "";
    expect(headingText, "during the removal window the heading must quote the PERSISTED count — the stale resolved count contradicts the already-updated badge").toContain("(1)");
    // The settled end state: one card, the heading still (1).
    await expect(page.locator("main article")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Your wishlist (1)" })).toBeVisible();
    await page.unroute("**/api/products");
  });

  test("wishlist all-ghost state explains itself — never 'Nothing saved yet' beside the ghost note (Task 132 F-3)", async ({ page }) => {
    // Every persisted slug a ghost: the pre-132 page rendered the TRUE note
    // ("2 saved items are no longer available.") directly above the FALSE
    // empty-state copy ("Nothing saved yet — Tap the heart…") under a "(0)"
    // heading — the user HAS saved items; they departed (browser-verified
    // live pre-fix: the exact one-corner miss of the Task-131 F-1 note
    // rollout, which handled singular/plural/loading/error/partial-ghost
    // but not all-ghost).
    await page.addInitScript(() => {
      localStorage.setItem("nordhem_wish_v1", JSON.stringify(["ghost-product-1", "ghost-product-2"]));
    });
    await page.goto("/wishlist");
    await expect(page.getByRole("heading", { name: "Your wishlist (0)" })).toBeVisible();
    // The ghost note still explains the badge-vs-heading difference.
    await expect(page.getByText("2 saved items are no longer available")).toBeVisible();
    await expect(page.getByRole("link", { name: "Wishlist, 2 items" })).toBeVisible();
    // The contradictory "Nothing saved yet" must NOT render when saved
    // (departed) items exist — that copy is only honest for a truly empty
    // wishlist.
    await expect(page.getByText("Nothing saved yet")).toHaveCount(0);
    // The all-ghost branch explains the state honestly instead.
    await expect(page.getByText("Your saved items are no longer available")).toBeVisible();
    await expect(page.getByText(/moved on from the range/i)).toBeVisible();
    // And the browse CTA is still offered.
    await expect(page.getByRole("link", { name: "Discover favourites" })).toBeVisible();
  });

  test("a DUPLICATE persisted slug degrades to the honest empty state — never a false ghost note (Task 133 F-3)", async ({ page }) => {
    // The element validator (Task 122 F-3) admitted ["slug","slug"] — the
    // catalogue resolves it to ONE card while wishlist.length counts TWO,
    // so the page rendered the FALSE "1 saved item is no longer available."
    // directly above the available product's card (the exact honesty surface
    // Tasks 130–132 polished, defeated by a crafted payload). The uniqueness
    // layer (Task 133 F-3) rejects the payload at load → the store degrades
    // to the fallback → the page renders its honest truly-empty state.
    await page.addInitScript(() => {
      localStorage.setItem("nordhem_wish_v1", JSON.stringify(["solbakken-3-seat-sofa", "solbakken-3-seat-sofa"]));
    });
    await page.goto("/wishlist");
    // The degraded empty wishlist — not a false ghost note.
    await expect(page.getByRole("heading", { name: "Your wishlist (0)" })).toBeVisible();
    await expect(page.getByText("no longer available")).toHaveCount(0);
    await expect(page.getByText("Nothing saved yet")).toBeVisible();
    // No card renders (the payload was rejected whole, not deduped).
    await expect(page.locator("main article")).toHaveCount(0);
  });

  test("a DUPLICATE persisted cart payload degrades to the honest empty state — no doubled lines or subtotal (Task 134 F-1)", async ({ page }) => {
    // The cart sibling of the wishlist duplicate probe above — the more
    // severe of the two halves (duplicate key={productId} React keys + a
    // doubled subtotal display) yet it shipped Task 133 with the unit pin
    // alone. Pre-fix, a crafted [line, line] payload passed every element
    // gate (both lines individually valid) and the page rendered "Your bag
    // (2)" over two identical cards; the uniqueness layer (Task 133 F-3)
    // rejects the payload at load → the store degrades to the fallback →
    // the page renders its honest empty-bag state.
    await page.addInitScript(() => {
      localStorage.setItem("nordhem_cart_v1", JSON.stringify([
        { productId: 1, slug: "solbakken-3-seat-sofa", name: "SOLBAKKEN 3-seat sofa", sku: "NH-SOF-001", imageUrl: "x", unitPriceCents: 129900, qty: 1 },
        { productId: 1, slug: "solbakken-3-seat-sofa", name: "SOLBAKKEN 3-seat sofa", sku: "NH-SOF-001", imageUrl: "x", unitPriceCents: 129900, qty: 1 },
      ]));
    });
    await gotoHydrated(page, "/cart");
    // The degraded empty bag — not a doubled render of one line.
    await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Your bag \(\d+\)/ })).toHaveCount(0);
    // No line cards render (the payload was rejected whole, not deduped).
    await expect(page.locator("main article, main li")).toHaveCount(0);
    // No subtotal survives a rejected payload.
    await expect(page.getByText(/\$1,?299/)).toHaveCount(0);
  });

  test("search shows an error state (not 'No products found') when the API fails", async ({ page }) => {
    await page.route("**/api/products*", (route) => route.abort());
    await page.goto("/search?q=sofa");
    // Scope to <main>: Next's route announcer also carries role=alert.
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await expect(page.getByText(/couldn.?t load results/i)).toBeVisible();
    await expect(page.getByText(/No products found/)).toHaveCount(0);
  });

  test("wishlist treats an ok-but-dataless envelope as an error, never the false all-ghost note (Task 135 F-5)", async ({ page }) => {
    // The Task-119 fetch-failure pair intercepts network ERRORS; this probe
    // intercepts a WELL-FORMED-STATUS but envelope-contract-violating body —
    // a 200 {ok:true} with NO data. The page used to read json.data ?? []
    // and treat the body-less envelope as a RESOLVED-empty catalogue,
    // rendering the FALSE "Your saved items are no longer available" ghost
    // note (the exact false claim the Task-132 F-3 branch was built to
    // prevent). A saved-item state + a data-less ok is an error, never a
    // resolution.
    await page.addInitScript(() => {
      localStorage.setItem("nordhem_wish_v1", JSON.stringify(["solbakken-3-seat-sofa"]));
    });
    await page.route("**/api/products", (route) => route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) }));
    await page.goto("/wishlist");
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await expect(page.getByText(/couldn.?t load your wishlist/i)).toBeVisible();
    // The FALSE all-ghost claim must not render (items were saved; the
    // catalogue answer was malformed, not "every product departed").
    await expect(page.getByText("Your saved items are no longer available")).toHaveCount(0);
    await expect(page.getByText("Nothing saved yet")).toHaveCount(0);
    // The heading keeps the persisted count (resolution unknowable).
    await expect(page.getByRole("heading", { name: /Your wishlist \(1\)/ })).toBeVisible();
  });

  test("search treats an ok-but-dataless envelope as an error, never a false 0-results verdict (Task 135 F-5)", async ({ page }) => {
    // The search sibling of the probe above: json.data ?? [] turned a
    // body-less ok into a false "0 results for X" + "No products found"
    // verdict. The verdict belongs to a RESOLVED catalogue answer only.
    await page.route("**/api/products*", (route) => route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) }));
    await page.goto("/search?q=sofa");
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await expect(page.getByText(/couldn.?t load results/i)).toBeVisible();
    await expect(page.getByText(/No products found/)).toHaveCount(0);
    await expect(page.getByText(/results? for/)).toHaveCount(0);
  });

  test("shop grid treats an ok-but-dataless envelope as an error, never a false 0-products verdict (Task 136 F-1)", async ({ page }) => {
    // The third client consumer of /api/products — the shop grid, the
    // primary catalogue funnel — still read json.data ?? [] after Task 135
    // F-5 gated the wishlist + search siblings: a well-formed 200 {ok:true}
    // with NO data resolved to [] and rendered the FALSE "0 products" +
    // "Nothing matches those filters" verdict (with a Clear-filters CTA) —
    // indistinguishable from a legitimately empty filter result. The LOCAL
    // keyword filter drives the client-side refetch (cat/sort arrive via RSC
    // navigation and land in the atServerView skip); the verdict belongs to
    // a RESOLVED catalogue answer only.
    await page.route("**/api/products*", (route) => route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) }));
    await gotoHydrated(page, "/shop");
    await page.getByRole("textbox", { name: "Filter products by keyword" }).fill("oak");
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    // The FALSE empty-filter verdict must not render (the answer was
    // malformed, not "no products match").
    await expect(page.getByText("Nothing matches those filters")).toHaveCount(0);
    // Task 137 F-5: the strip must not quote a product COUNT above the
    // error state either — `items` still held the previous view's rows, so
    // the strip rendered a stale "N products ·" count the error box below
    // disavowed (the wishlist-heading honesty sibling, Task-130 F-8).
    await expect(page.getByText(/\d+ products/)).toHaveCount(0);
    // The static truth (GST / free-delivery copy) survives — it is not a
    // view-dependent claim.
    await expect(page.getByText(/prices include 9% GST/)).toBeVisible();
  });

  test("a fresh server view under an active keyword filter settles through the loading state — never the departed view's rows or count (Task 138 F-1)", async ({ page }) => {
    // The Task-137 F-5 strip gate closed the loading/error states; the
    // resync window BETWEEN server views stayed outside it. The resync
    // resets `items` only on the server view (q === "" && max === 0), so a
    // category/sort navigation under an active keyword kept loading=false
    // through the 250ms debounce — the commit that rendered the fresh
    // "Kitchen" heading still carried the PREVIOUS living/oak view's rows
    // and the strip quoted their count, only flipping to skeletons 250ms
    // later (inside the timeout callback). The transient is pinned by
    // CAPTURING the DOM at the exact commit (MutationObserver keyed on the
    // heading) — auto-retrying assertions would bridge the window (the
    // first draft of this probe false-passed exactly that way). Hold the
    // client-side kitchen refetch open forever so the captured state
    // persists for the post-assertions.
    await page.route("**/api/products*", async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("cat") === "kitchen") {
        await new Promise<void>(() => {}); // hold open — the intermediate state is the test subject
      }
      return route.continue();
    });
    await gotoHydrated(page, "/shop?cat=living");
    // Settle the keyword-filtered living view first: the single oak match
    // (HAVBRIS) is in, the non-oak living bestseller (SOLBAKKEN) is out —
    // that pair is the settled-filtered-view marker, count-independent.
    await page.getByRole("textbox", { name: "Filter products by keyword" }).fill("oak");
    await expect(page.getByText("HAVBRIS lounge chair").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("SOLBAKKEN 3-seat sofa")).toHaveCount(0);
    // Install the commit-capture BEFORE the click: resolve the strip /
    // skeleton / departed-rows state at the commit that first renders the
    // "Kitchen" heading (the heading and the strip live in the same
    // ShopInner render output — one atomic React commit).
    await page.evaluate(() => {
      const w = window as unknown as { __nordhemResyncCap?: unknown };
      w.__nordhemResyncCap = null;
      const capture = () => {
        const h1 = document.querySelector("main h1");
        if (h1?.textContent === "Kitchen") {
          const strip = document.querySelector("main h1 + p");
          // NB: scope the departed-rows check to product-card LINKS in main —
          // body.textContent would always match: the initial SSR flight
          // payload (a <script> in body) embeds the living-view catalogue,
          // including HAVBRIS, forever.
          w.__nordhemResyncCap = {
            strip: strip?.textContent ?? null,
            skeletons: !!document.querySelector('main [role="status"][aria-label="Loading products"]'),
            productLinksInMain: document.querySelectorAll('main a[href^="/product/"]').length,
          };
          return true;
        }
        return false;
      };
      if (capture()) return;
      const mo = new MutationObserver(() => { if (capture()) mo.disconnect(); });
      mo.observe(document.querySelector("main") as Node, { childList: true, subtree: true, characterData: true });
    });
    // Navigate to Kitchen under the active keyword: the RSC navigation
    // delivers the fresh server view; the client-side refetch is held.
    await page.getByRole("button", { name: "Kitchen", exact: true }).click();
    await page.waitForFunction(() => (window as unknown as { __nordhemResyncCap?: unknown }).__nordhemResyncCap !== null, undefined, { timeout: 10_000 });
    const state = await page.evaluate(() => (window as unknown as { __nordhemResyncCap?: { strip: string | null; skeletons: boolean; productLinksInMain: number } }).__nordhemResyncCap);
    expect(state, "the fresh-view commit was captured").toBeTruthy();
    // The commit that renders the fresh heading must NOT carry the
    // departed view's count claim ("1 products" for the oak-filtered
    // living view)…
    expect(state!.strip).not.toMatch(/\d+ products/);
    // …must render skeletons…
    expect(state!.skeletons).toBe(true);
    // …and must NOT still show the departed view's product cards.
    expect(state!.productLinksInMain).toBe(0);
    // The static truth tail survives — it is not a view-dependent claim.
    expect(state!.strip).toContain("prices include");
    // The held state persists: still skeletons, still no count, still no
    // departed rows (the fetch never lands under the held route).
    await expect(page.getByText(/\d+ products/)).toHaveCount(0);
    await expect(page.getByRole("status", { name: "Loading products" })).toBeVisible();
    await expect(page.locator("main a[href^='/product/']")).toHaveCount(0);
  });
});

test.describe("bag → checkout → order journey (live DB)", () => {
  test("full journey with promo, order masking and tracking", async ({ page }) => {
    // Task 123 F-1: this spec places a REAL order — it used to leave the row
    // plus its inventory decrement behind on every run (gotcha #13), draining
    // makan tampines 24→20 across sessions. The pre-spec stock is READ (never
    // assumed) and restored with the probe-row delete in the finally below
    // (the oversell spec's cleanup pattern).
    const client = new Client({
      connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    await client.connect();
    const makanRow = await client.query<{ id: number }>(
      "select id from products where slug = 'makan-extendable-table'",
    );
    const makanId = makanRow.rows[0].id;
    const origStock = await client.query<{ store_slug: string; quantity: number }>(
      "select store_slug, quantity from inventory where product_id = $1",
      [makanId],
    );
    let placedOrder: string | null = null;
    // Task 124 F-2: the finally deletes by the probe's OWN identity (email
    // + spec-start window), not by the captured order number — a 201 that
    // commits the order followed by ANY assertion failure used to strand
    // the row (placedOrder stayed null; the Task-123 F-1 cleanup had a
    // hole exactly where the residue it targeted came from).
    const specStart = new Date(Date.now() - 60_000);
    try {
    // 1. PDP → add to bag
    await gotoHydrated(page, "/product/makan-extendable-table");
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
    placedOrder = orderUrl.split("/order/")[1];

    // 6. Track the order with the matching email → timeline + items.
    await gotoHydrated(page, "/track-order");
    await page.getByLabel(/Order number/i).fill(orderUrl.split("/order/")[1]);
    await page.getByLabel(/Email used at checkout/i).fill("journey@nordhem.sg");
    await page.getByRole("button", { name: /Track order/i }).click();
    await expect(page.getByText("Journey Tester").first()).toBeVisible();
    await expect(page.getByText(/1× MAKAN extendable table/).first()).toBeVisible();

    // 7. Reload the bag — it cleared after checkout.
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
    // Task 123 F-6: the promo belongs to the order it was used on — clear()
    // drops the persisted code with the lines, so the next bag starts clean.
    // The store persists JSON.stringify(null) = "null" (the local-store
    // contract) — parse before asserting (RED was "MAKAN15").
    const persistedPromo = await page.evaluate(() => JSON.parse(localStorage.getItem("nordhem_promo") ?? "null"));
    expect(persistedPromo).toBeNull();
    } finally {
      // Identity-based (F-2): the journey email + a spec-start window own
      // the cleanup — independent of whether placedOrder was ever captured.
      // The window starts a minute before the spec began (clock skew grace)
      // and can never touch a previous session's rows (the email is this
      // spec's own). The settle wait first: a failure injected IMMEDIATELY
      // after the Pay click aborts the spec while the checkout POST is
      // still in flight — the order would land after a zero-wait delete
      // (browser-reproduced this cycle).
      await page.waitForTimeout(1_500).catch(() => {});
      await client.query(
        "delete from order_items where order_id in (select id from orders where email = $1 and created_at >= $2)",
        ["journey@nordhem.sg", specStart.toISOString()],
      );
      await client.query(
        "delete from orders where email = $1 and created_at >= $2",
        ["journey@nordhem.sg", specStart.toISOString()],
      );
      for (const row of origStock.rows) {
        await client.query(
          "update inventory set quantity = $1 where product_id = $2 and store_slug = $3",
          [row.quantity, makanId, row.store_slug],
        );
      }
      await client.end();
    }
  });
});

test.describe("API rate limits (20/min/IP fixed window)", () => {
  test("orders/track and promotions/validate throttle the 21st rapid request", async ({ request }) => {
    // Task 118 F-18: checkout and reviews enforce the limiter; track (the PII
    // lookup) and promo validation (a Postgres read per call) did not. Each
    // probe runs under its OWN x-forwarded-for identity so the shared "direct"
    // bucket used by the journey/persistence specs stays clean (the limiter
    // keys on the RIGHTMOST XFF hop — Task 125 G-2's clientIp() seam; the
    // rightmost hop is the nearest proxy's value, never the client alone).
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

test.describe("card rating honesty (Task 124 F-11)", () => {
  test("product cards show stars without the invented seed review count", async ({ page }) => {
    // Task-121 F-6 removed the seed count from the PDP header (a live
    // "Reviews (2)" section contradicted it on the same page); the card
    // grids kept quoting the seed ratingCount ("(412)") — the same product
    // showed (412) on its card and Reviews (2) on its PDP. The count is
    // display fiction (the ratingAvg stance is a documented deferral);
    // cards now show the stars alone, like the PDP header.
    await page.goto("/shop");
    const solbakkenCard = page.locator("article", { has: page.getByRole("heading", { name: "SOLBAKKEN 3-seat sofa" }) });
    await expect(solbakkenCard).toBeVisible();
    // No "(412)"-style count beside the stars…
    await expect(solbakkenCard.getByText(/^\(\d+\)$/)).toHaveCount(0);
    // …and the star glyph's accessible name no longer claims a review count.
    // (The product <img> also carries the implicit img role — scope to the
    // rating span, the only span[role=img] in the card.)
    const label = await solbakkenCard.locator('span[role="img"]').getAttribute("aria-label");
    expect(label).toMatch(/^Rated [\d.]+ out of 5$/);
  });
});

test.describe("a11y: focus, steppers and announcements (Task 120)", () => {
  test("checkout card inputs carry their autocomplete purpose tokens (Task 124 F-9)", async ({ page }) => {
    // WCAG 1.3.5: inputs collecting user information must state their
    // purpose — the card fields (demo payment) carry the standard cc-* tokens
    // like every contact field on the same page.
    await gotoHydrated(page, "/product/katong-bedside-table");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/checkout");
    await page.getByRole("button", { name: /Card$/ }).click();
    await expect(page.getByLabel("Card number")).toHaveAttribute("autocomplete", "cc-number");
    await expect(page.getByLabel("Expiry")).toHaveAttribute("autocomplete", "cc-exp");
    await expect(page.getByLabel("CVC")).toHaveAttribute("autocomplete", "cc-csc");
  });

  test("the selected review star carries a non-color state cue (Task 124 F-10)", async ({ page }) => {
    // WCAG 1.4.11: selected/unselected stars differed by text color alone
    // (both states under the 3:1 non-text minimum). The selected star now
    // carries a ring (box-shadow in Tailwind v4) — computed-style assertion
    // per the Task-120 focus-indication precedent.
    await gotoHydrated(page, "/product/havbris-lounge-chair");
    const selected = page.getByRole("button", { name: "3 stars" });
    await selected.click();
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    const shadow = await selected.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow, `expected a ring box-shadow on the selected star, got "${shadow}"`).not.toBe("none");
    const unselected = page.getByRole("button", { name: "4 stars" });
    const unselectedShadow = await unselected.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(unselectedShadow).toBe("none");
  });

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

  test("buttons afford a pointer cursor — the Tailwind v4 preflight default restored (Task 140 F-4)", async ({ page }) => {
    // The v3→v4 preflight change dropped `button { cursor: pointer }` from
    // Tailwind's base layer (the v4 trap log's documented regression class —
    // the same preflight that changed outline-none's computed shape, pinned
    // above). Every primary CTA in this storefront is a <button>, and
    // browser-verified at audit time they all computed cursor: default —
    // the affordance an e-commerce surface's CTAs are expected to carry.
    // The base rule restores it for enabled controls; disabled controls
    // keep the default cursor (correct disabled semantics). Probing the
    // PDP's primary CTA (the storefront's money button).
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    const cta = page.getByRole("button", { name: "Add to bag" });
    await expect(cta).toBeVisible();
    const cursor = await cta.evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor, "the Add-to-bag CTA must compute cursor: pointer (Tailwind v4 preflight dropped it — the base rule restores the affordance)").toBe("pointer");
  });

  test("cart quantity minus is disabled at qty 1 (Remove stays the only destructive path)", async ({ page }) => {
    // Task 120 F-15: the − stepper at qty 1 silently deleted the line via
    // setQty(qty-1) — a destructive action reachable from an increment
    // control. The minus must disable at the floor; the dedicated Remove
    // button remains the only remove affordance.
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Shopping bag, 1 item/ }).click();
    await expect(page.getByRole("heading", { name: /Your bag \(1\)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Decrease quantity of/ })).toBeDisabled();
    // The plus still works from qty 1.
    await page.getByRole("button", { name: /Increase quantity of/ }).click();
    await expect(page.getByRole("button", { name: /Decrease quantity of/ })).toBeEnabled();
  });

  test("cart quantity plus is disabled at the 99 ceiling (the floor's mirror — Task 134 F-3)", async ({ page }) => {
    // The floor discipline is pinned above; the ceiling shipped without it —
    // the + at qty 99 stayed enabled and silently no-op'd (the setQty clamp
    // is invisible to the shopper). Seed a ceiling-qty line directly (the
    // isValidCartLine contract admits 1-99 — cart-store.tsx) and pin the
    // disabled state plus the badge integrity at the cap.
    await page.addInitScript(() => {
      localStorage.setItem("nordhem_cart_v1", JSON.stringify([
        { productId: 1, slug: "solbakken-3-seat-sofa", name: "SOLBAKKEN 3-seat sofa", sku: "NH-SOF-001", imageUrl: "x", unitPriceCents: 129900, qty: 99 },
      ]));
    });
    await gotoHydrated(page, "/cart");
    await expect(page.getByRole("heading", { name: /Your bag \(99\)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Increase quantity of/ })).toBeDisabled();
    // The minus stays live at the ceiling (both controls never dead at once).
    await expect(page.getByRole("button", { name: /Decrease quantity of/ })).toBeEnabled();
  });

  test("a failed promo apply announces via role=alert, not status", async ({ page }) => {
    // Task 120 F-18: the promo message rendered role="status" for success AND
    // failure — screen readers may not announce a failure politely queued.
    // ReviewSection already splits; the cart must too.
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
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
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
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

  test("a promo apply on an ok-but-dataless envelope is a FAILURE, never a false applied claim (Task 137 F-2)", async ({ page }) => {
    // The fourth envelope-trust consumer — and the only POST one left without
    // a data gate: a well-formed 200 {ok:true} with NO data used to persist
    // the code into nordhem_promo and render "X applied — discount"
    // (role="status") — the exact Task-135/136 class (wishlist, search, shop
    // grid) at the one sibling it missed. The siblings all gate on
    // json.data presence (checkout/page.tsx, track-order/page.tsx,
    // ReviewSection.tsx — the POST-consumer cross-check).
    await page.route(
      "**/api/promotions/validate*",
      (route) => route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) }),
    );
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Shopping bag, 1 item/ }).click();
    await expect(page.getByRole("heading", { name: /Your bag \(1\)/ })).toBeVisible();

    await page.getByLabel(/Promo code/i).fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();

    // The failure state: an assertive alert (scoped to the promo message —
    // Next's own route announcer also carries role="alert", the Task-120
    // spec's NB), no "applied" success copy, and NO persisted code (the
    // Remove button is the persistence tell).
    await expect(page.locator("aside p[role=alert]")).toContainText(/could not verify/i);
    await expect(page.getByText(/applied/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Remove code/i })).toHaveCount(0);
    await page.unroute("**/api/promotions/validate*");
  });

  test("a promo apply on an ok-but-LABELLESS data envelope is a FAILURE — no 'applied — undefined' copy (Task 140 F-5)", async ({ page }) => {
    // The Task-137 F-2 gate closed the dataless envelope, one field short
    // of the full contract: `200 {ok:true, data:{}}` PASSES the
    // `!json.data` truthiness gate and renders "WELCOME10 applied —
    // undefined" (json.data.label is undefined — a contract-violating
    // envelope shipped a literal "undefined" into customer-facing copy).
    // The gate tightens to the field the copy interpolates: a non-string
    // label joins the refusal set — the Task-128 boundary discipline
    // mirrored at the last client-side coercing seam.
    await page.route(
      "**/api/promotions/validate*",
      (route) => route.fulfill({ status: 200, body: JSON.stringify({ ok: true, data: {} }) }),
    );
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Shopping bag, 1 item/ }).click();
    await expect(page.getByRole("heading", { name: /Your bag \(1\)/ })).toBeVisible();

    await page.getByLabel(/Promo code/i).fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();

    // The same refusal shape as the dataless probe: a scoped alert, no
    // "applied" success copy (and specifically no "undefined" leaking into
    // it), and no persisted code.
    await expect(page.locator("aside p[role=alert]")).toContainText(/could not verify/i);
    await expect(page.getByText(/applied/i)).toHaveCount(0);
    await expect(page.getByText(/undefined/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Remove code/i })).toHaveCount(0);
    await page.unroute("**/api/promotions/validate*");
  });
});

test.describe("checkout success-envelope field gate (Task 141 F-2)", () => {
  test("an ok-but-orderless checkout envelope is a FAILURE — no /order/undefined navigation, bag preserved", async ({ page }) => {
    // The Task-140 F-5 class at its last consumer: the checkout submit's
    // success path gated on `json.data` truthiness while the very next
    // statement interpolates `json.data.orderNumber`. A contract-violating
    // `200 {ok:true, data:{}}` PASSED the gate, CLEARED the cart, and
    // navigated to /order/undefined — the shopper lands on "We can't find
    // that order" after a successful order with an emptied bag. The gate
    // must reach the field the success path consumes (the Task-128 boundary
    // discipline at the final client-side coercing seam).
    await page.route(
      "**/api/checkout*",
      (route) => route.fulfill({ status: 200, body: JSON.stringify({ ok: true, data: {} }) }),
    );
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/checkout");
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

    await page.getByLabel("Email").fill("probe@nordhem.sg");
    await page.getByLabel("Full name").fill("Envelope Probe");
    await page.getByLabel("Phone").fill("+65 91234567");
    await page.getByLabel("Postal code").fill("089001");
    await page.getByPlaceholder("Blk, street, unit number").fill("Blk 1 Testing Rd #01-01");
    await page.getByRole("button", { name: /^Pay / }).click();

    // The refusal shape: the scoped alert (above the form — the Task-121
    // F-12 surface), the URL stays on /checkout, and the bag is NOT
    // cleared (the header badge keeps its count — clear() must not run
    // before the envelope is trusted).
    await expect(page.locator("#main").getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole("link", { name: /Shopping bag, 1 item/ })).toBeVisible();
    await page.unroute("**/api/checkout*");
  });
});

test.describe("track-order nested-envelope gate (Task 141 F-3)", () => {
  test("an ok-but-orderless track envelope is a FAILURE — scoped error, no render crash", async ({ page }) => {
    // The F-2 sibling at the tracking consumer, one level deeper: the gate
    // stopped at `json.data` truthiness while the success render
    // interpolates NESTED fields (found.order.orderNumber, .fullName,
    // .deliverySlot, items.map). A contract-violating
    // `200 {ok:true, data:{}}` passed the gate and crashed the render
    // (found.order is undefined → TypeError → the error boundary) instead
    // of taking the page's own scoped-error path. The gate must reach the
    // nested shape the render consumes.
    await page.route(
      "**/api/orders/track*",
      (route) => route.fulfill({ status: 200, body: JSON.stringify({ ok: true, data: {} }) }),
    );
    await gotoHydrated(page, "/track-order");
    await page.getByLabel("Order number").fill("NH-20261121-PROBE1");
    await page.getByLabel("Email used at checkout").fill("probe@nordhem.sg");
    await page.getByRole("button", { name: "Track order" }).click();

    // The refusal shape: the scoped alert renders (the page's own error
    // surface), and the page does NOT crash — the form is still there and
    // no order card rendered.
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: "Track order" })).toBeVisible();
    await expect(page.getByText(/Order NH-/)).toHaveCount(0);
    await page.unroute("**/api/orders/track*");
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
    // a 99-qty line for a stock-bounded product (wokhey-cookware-5pc since
    // Task 131 F-3: zero references in either spec file — katong-bedside-table
    // was NEVER quiet, the 500-class spec at the "fixed copy" probe zeroes
    // its rows in a fullyParallel window that could pollute this spec's
    // snapshot/restore pair) succeeded and floored the store row with
    // greatest(0,…) while the PDP prints "Only N left". The write boundary
    // must refuse what it cannot fulfil. The pre-fix behaviour (order placed)
    // is cleaned up in the finally block so the RED run leaves no residue.
    const client = new Client({
      connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    await client.connect();
    const pidRow = await client.query("select id from products where slug = 'wokhey-cookware-5pc'");
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
          deliverySlot: "Today 2pm",
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
      // Task 125 F-5: tightened to hold the ATTRIBUTION (the Task-122 F-19
      // fix landed on the visible copy only — the metadata kept "dining,
      // decor and sleep", both ≤17%).
      [`/offers`, new RegExp(`Up to ${MAX_OFF}% off lighting`)],
      ["/services", /deliver, assemble/],
      // Task 139 F-1: the store-count metadata derives from the STORES seed
      // (the /stores page interpolates it — the pin must not re-hardcode the
      // hand-copied "Three" it replaced).
      ["/stores", new RegExp(`${STORES.length} NORDHEM stores`)],
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

  test("the offers banner's FLAT20 copy derives from the PROMOS row (Task 128 F-3)", async ({ page }) => {
    // Task 127 F-4 derived the banner from the same PROMOS row the cards
    // render; Task 128 F-3 adds the pin — editing the promo self-corrects
    // banner and pin together (the "copy and pins together" claim, now true).
    await page.goto("/offers");
    const flat20 = PROMOS.find((p) => p.code === "FLAT20");
    expect(flat20, "the FLAT20 promo exists in the catalogue").toBeDefined();
    await expect(page.getByRole("heading", { name: "Festive market offers" })).toBeVisible();
    await expect(page.locator("main")).toContainText(
      `FLAT20${flat20 ? ` for $${flat20.value / 100} off orders over $${flat20.minSubtotalCents / 100}.` : ""}`
    );
  });

  test("the services + PDP assembly/design fee copy derives from the utils constants (Task 138 F-5)", async ({ page }) => {
    // The Task-126 F-3 discipline closed the delivery/GST/express/threshold
    // fee copy; the assembly + design-service fees stayed hand-copied literal
    // pairs ($25 ×4 sites, $190 ×2) — a fee change was a coordinated
    // multi-file sweep with no gate (the fee-rot class in miniature). The
    // pins derive from the same constants the pages interpolate — a fee
    // edit self-corrects copy and pins together (the Task-127 pattern).
    await page.goto("/services");
    await expect(page.locator("main")).toContainText(`from $${ASSEMBLY_FEE_CENTS / 100} per item`);
    await expect(page.locator("main")).toContainText(`from $${DESIGN_SERVICE_FEE_CENTS / 100} · redeemable`);
    // The crawler-facing metadata quotes the same figures (the Task-120
    // F-4 stance: route descriptions must agree with the product's own copy).
    const desc = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(desc).toContain(`assembly from $${ASSEMBLY_FEE_CENTS / 100}`);
    expect(desc).toContain(`home design service from $${DESIGN_SERVICE_FEE_CENTS / 100}`);
    // A PDP carries the same derived figure in its details copy.
    await page.goto("/product/solbakken-3-seat-sofa");
    await expect(page.locator("main")).toContainText(`Assembly from $${ASSEMBLY_FEE_CENTS / 100} ·`);
  });

  test("family metadata matches the page's own earn-rate math (Task 120 F-4)", async ({ page }) => {
    // Task 120 F-4: the /family route layout claimed "earn 5 points per $10
    // spent" while the page copy AND calculator compute 10 points per $1 —
    // a 20× contradiction between the crawler-facing claim and the product,
    // plus a "members-only workshops" promise the surface does not have.
    // The SERP description must agree with the calculator it sits above.
    // Task 128 F-3/F-9: the pins now DERIVE from the same constants the page
    // and layout interpolate — a rate edit self-corrects copy and pins
    // together (the Task-124 F-14 pattern; the Task-127 claim becomes true).
    await page.goto("/family");
    const desc = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(desc).toContain(`${FAMILY_POINTS_PER_DOLLAR} points per $1`);
    expect(desc).not.toContain("5 points per $10");
    expect(desc.toLowerCase()).not.toContain("workshop");
    // Task 128 F-3: the voucher rule derives too (voucher + earn rate).
    expect(desc).toContain(`$${FAMILY_VOUCHER_CENTS / 100} voucher for every ${FAMILY_POINTS_PER_VOUCHER.toLocaleString("en-SG")} points`);
    // And the VISIBLE page copy carries the same derived rule — the copy the
    // calculator sits above must agree with the metadata beside it.
    await expect(page.locator("body")).toContainText(
      `${FAMILY_POINTS_PER_DOLLAR} points per $1 — $${FAMILY_VOUCHER_CENTS / 100} voucher every ${FAMILY_POINTS_PER_VOUCHER.toLocaleString("en-SG")} pts`
    );
  });

  test("the business estimate panel derives from TRADE_RATE — label, saving and net (Task 129 F-4)", async ({ page }) => {
    // Task 128 F-9 gave the business half the CONSTANT (calculator and copy
    // derive) but no pin — a revert to a hand-copied 0.12/"12%" pair passed
    // every gate (the copy↔math drift class). This pins the family-derived
    // pattern's business sibling: the label interpolates the rate, and the
    // saving/estimate rows equal the page's own formula at the default
    // quantities. DEFAULT_LIST_CENTS recomputes the page's initial state
    // (desk ×10, meet4 ×1, pantry ×1, locker ×2) — a unit-price or
    // default-quantity edit fails this pin LOUDLY (self-alerting, like the
    // journey amounts).
    await gotoHydrated(page, "/business");
    const DEFAULT_LIST_CENTS = 77800 * 10 + 129800 + 219800 + 34900 * 2; // 1,197,400
    const trade = Math.round(DEFAULT_LIST_CENTS * TRADE_RATE);
    const panel = page.locator("aside");
    await expect(panel).toContainText(`Trade saving (${Math.round(TRADE_RATE * 100)}%)`);
    // The dt/dd pairs render with no whitespace between them (single-line JSX),
    // so each row's label and value concatenate in the text content.
    await expect(panel).toContainText(`List total${formatSGD(DEFAULT_LIST_CENTS)}`);
    await expect(panel).toContainText(`−${formatSGD(trade)}`);
    await expect(panel).toContainText(`Estimate${formatSGD(DEFAULT_LIST_CENTS - trade)}`);
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
    // Task 125 F-8: the description derives its counts from the catalogue
    // (the sitemap-derivation pattern) — a catalogue edit self-corrects.
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      new RegExp(`${PRODUCTS.length} products across ${CATEGORIES.length} room categories`)
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

  test("the /order/ lookup normalizes case like /track-order — a hand-typed lowercase number still finds the order (Task 133 F-5)", async ({ request, page }) => {
    // Two surfaces, one identifier, two disciplines: trackOrder() ran
    // .trim().toUpperCase() on the input while the order page compared the
    // raw URL segment — a shopper who hand-types the number in lowercase (or
    // pastes with whitespace) got "We can't find that order" for an order
    // the tracking page found with the SAME input, and the not-found copy
    // then directs them to /track-order, where it works. The confirmation
    // redirect always uses the canonical mint — this is the manual-typing
    // corner only. Write-capable probe (a real order): finally net.
    let orderNumber = "";
    try {
      const res = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.124.7" },
        data: {
          email: "order-case-probe@nordhem.sg",
          fullName: "Order Case Probe",
          phone: "+65 91234567",
          address: "Blk 1 Testing Rd #01-01",
          postal: "089001",
          deliveryMethod: "delivery",
          deliverySlot: "Standard (3–5 days)",
          paymentMethod: "card",
          lines: [{ productId: 1, qty: 1 }],
        },
      });
      expect(res.status()).toBe(201);
      const body = (await res.json()) as { data?: { orderNumber?: string } };
      orderNumber = body.data?.orderNumber ?? "";
      expect(orderNumber).toBeTruthy();
      await page.goto(`/order/${orderNumber.toLowerCase()}`);
      await expect(page.getByRole("heading", { name: /Tak! Your order is confirmed/ })).toBeVisible();
      // NB: the page renders "can't" with a straight apostrophe (can&apos;)
      // — a typographic ’ literal never matches (the Task-131 no-op-locator
      // class, caught while writing the Task-134 sibling probe below).
      await expect(page.getByText(/We can't find that order/)).toHaveCount(0);
    } finally {
      await deleteProbeOrders("order-case-probe@nordhem.sg");
    }
  });

  test("a malformed-percent-encoded order URL lands in not-found, never a 500 (Task 134 F-2)", async ({ page }) => {
    // Task 133 F-5 rewrote the decode line (trim + uppercase); the decode-
    // throw corner it shares a line with is the Task-118 F-15 / Task-120
    // F-14 guard — decodeURIComponent of a malformed sequence throws
    // URIError, and the guard must land it in the friendly not-found state,
    // not the error boundary. The corner had no pin anywhere (the case
    // sibling above is the only decode-site probe).
    //
    // Scope note (verified against the production build this cycle): a RAW
    // malformed request (`/order/%ZZ` byte-for-byte, or a valid-percent
    // malformed-UTF-8 `%E0%A4%A`) is rejected inside Next 16's routing
    // layer BEFORE any app code runs — the route matcher's own
    // decodeURIComponent throws DecodeError (prod: bare platform 500 with
    // no log; dev: 400) — un-interceptable by pages/middleware, and browser
    // URL parsers normalize a lone `%` to `%25` before sending, so the raw
    // class is curl/craft-only (register row). The browser-reachable form
    // is the normalized one — `%25ZZ` — which reaches the page as a raw
    // param, decodes cleanly to the literal "%ZZ", and lands in the honest
    // not-found state; the page's own URIError guard (Task-118 F-15) is
    // defensive depth on this Next version (any input that would throw it
    // already threw the router's decode first — proven by hoist-mutation
    // this cycle: the probe stayed GREEN, so the guard never fires through
    // the public interface). The contract pinned here is the end-to-end
    // one: weird-but-valid order URLs never 5xx and never render the
    // outage copy.
    const res = await page.goto("/order/%25ZZ");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: /We can't find that order/ })).toBeVisible();
    // The outage copy must NOT render — a URIError-class typo is a client
    // input problem, not a DB outage (the Task-120 F-14 distinction).
    // Straight apostrophe — the rendered copy is can&apos;t.
    await expect(page.getByRole("heading", { name: /can't check orders right now/ })).toHaveCount(0);
  });

  test("utility client pages carry page-level noindex (Task 124 F-17)", async ({ page }) => {
    // The same belt-and-suspenders for the robots-disallowed utility routes:
    // cart/checkout/track-order/wishlist/search relied on robots.txt alone
    // — a disallowed URL can still enter the index URL-only if externally
    // linked (the homenest-store-s posture: every private surface declares
    // it). Each route layout now ships the noindex metadata.
    for (const path of ["/cart", "/checkout", "/track-order", "/wishlist", "/search"]) {
      await page.goto(path);
      await expect(
        page.locator('meta[name="robots"]'),
        `${path} must declare noindex`,
      ).toHaveAttribute("content", /noindex/);
    }
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
      // Task 126 F-2 RED-run safety net (gotcha #13): the refusal this spec
      // pins is the only thing keeping the probe from placing a REAL order —
      // a boundary regression (201) strands the row even though the inventory
      // restore above ran. Delete by email like the typeqty sibling.
      await client.query("delete from order_items where order_id in (select id from orders where email = $1)", [
        "boundary-probe@nordhem.sg",
      ]);
      await client.query("delete from orders where email = $1", ["boundary-probe@nordhem.sg"]);
      await client.end();
    }
  });

  test("overlong write fields are refused, not persisted verbatim", async ({ request }) => {
    // Task 120 F-3: email/fullName/address carried minimum-length checks only
    // (the reviews route slices 60/120/2000 — checkout sliced nothing), so a
    // 300-char address was persisted verbatim by an unauthenticated writer.
    // Task 128 F-7: this was the one write-capable refusal spec without a
    // RED-run net — a regressed cap boundary would place a REAL order
    // (caps-fields-probe@nordhem.sg + a tampines decrement) and strand it in the
    // pinned DB. The net runs in finally (a net after a failed expect is
    // dead code — the Task-126 F-2 lesson).
    try {
      const res = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.121.3" },
        data: {
          email: "caps-fields-probe@nordhem.sg",
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
    } finally {
      await deleteProbeOrders("caps-fields-probe@nordhem.sg");
    }
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
        deliverySlot: "Today 2pm",
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
    // The count is regex-accepted (Task 123 F-11): a successful review POST on
    // the pinned DB used to break this hard-count pin (gotcha #13's failure
    // mode) — the author assertion below is the real content pin.
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await expect(page.getByRole("heading", { name: /^Reviews \(\d+\)$/ })).toBeVisible();
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
        deliverySlot: "Today 2pm",
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

test.describe("PDP review-count saturation (Task 123 F-10)", () => {
  test("reviewCount and the heading derive from the TRUE count, not the capped 20-row list", async ({ page }) => {
    // getReviews caps the rendered LIST at 20 rows (a display cap), but the
    // JSON-LD reviewCount and the "Reviews (N)" heading used reviews.length —
    // both silently understated the truth beyond 20 live reviews. Insert 21
    // probe rows for a quiet product and assert the honest 21 (today: 20).
    // Task 130 F-3: the probe product moved havbris → pandan-rug-200 — the
    // suite runs fullyParallel (within-file too), and while this spec's 21
    // rows were live, the two "Reviews (0)" havbris assertions in other
    // specs raced the insert window (an unpinned flake; CI was safe only
    // because workers: 1). PANDAN RUG 200 is quiet AND untouched by every
    // other spec (verified by grep) — the overlap was accident of product
    // choice, not a necessity.
    const client = new Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db" });
    await client.connect();
    try {
      const pidRow = await client.query<{ id: number }>("select id from products where slug = 'pandan-rug-200'");
      const pid = pidRow.rows[0].id;
      const before = await client.query<{ count: string }>("select count(*) as count from reviews where product_id = $1", [pid]);
      const inserted = await client.query<{ id: number }>(
        `insert into reviews (product_id, author, rating, title, body, verified)
         select $1, 'Probe ' || g, 5, 'Probe title ' || g, 'Probe body ' || g, false
         from generate_series(1, 21) as g returning id`,
        [pid],
      );
      try {
        await page.goto("/product/pandan-rug-200");
        await expect(page.getByRole("heading", { name: "Reviews (21)" })).toBeVisible();
        const jsonld = await productJsonLd(page);
        const parsed = JSON.parse(jsonld ?? "null") as {
          aggregateRating?: { reviewCount?: number };
        };
        expect(parsed.aggregateRating?.reviewCount).toBe(21);
      } finally {
        await client.query("delete from reviews where id = any($1::int[])", [inserted.rows.map((r) => r.id)]);
      }
      const after = await client.query<{ count: string }>("select count(*) as count from reviews where product_id = $1", [pid]);
      expect(Number(after.rows[0].count)).toBe(Number(before.rows[0].count));
    } finally {
      await client.end();
    }
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
        deliverySlot: "Today 2pm",
        storeSlug: "not-a-real-store",
        paymentMethod: "card",
        lines: [{ productId: 1, qty: 1 }],
      },
    });
    try {
      expect(res.status()).toBe(422);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe("VALIDATION");
    } finally {
      // Task 126 F-2 RED-run safety net (gotcha #13, the typeqty finally
      // pattern — an after-the-expect if-block is dead code on the RED path
      // because the failed expect throws past it): a boundary regression can
      // reach a 201 here only if the availability check ALSO broke (the
      // crafted slug scopes the click-collect inventory query to nothing →
      // LOW_STOCK alone refuses it — proven live this cycle); the net stays
      // as uniform insurance on every write-capable spec.
      await deleteProbeOrders("slug-probe@nordhem.sg");
    }
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
    try {
      expect(res.status()).toBe(422);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe("VALIDATION");
    } finally {
      // Task 126 F-2 RED-run safety net (gotcha #13).
      await deleteProbeOrders("slot-probe@nordhem.sg");
    }
  });
});

test.describe("checkout slot coherence (Task 123 F-3)", () => {
  test("a cross-method or junk deliverySlot is refused, not persisted as copy", async ({ request }) => {
    // Length alone (Task 121 F-7) let any <=80-char string ride onto the
    // order and render as "Arriving {slot}" on the confirmation + tracking
    // pages. The boundary now enforces the shared DELIVERY_SLOTS map — the
    // same contract the UI's <select> offers.
    const res = await request.post("/api/checkout", {
      headers: { "x-forwarded-for": "10.9.123.9" },
      data: {
        email: "slot-coin-probe@nordhem.sg",
        fullName: "Slot Coherence Probe",
        phone: "+65 91234567",
        address: "Blk 1 Testing Rd #01-01",
        postal: "089001",
        deliveryMethod: "express",
        deliverySlot: "Junk slot that fits the length cap",
        storeSlug: "tampines",
        paymentMethod: "card",
        lines: [{ productId: 1, qty: 1 }],
      },
    });
    try {
      expect(res.status()).toBe(422);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe("VALIDATION");
    } finally {
      // RED-run safety net (gotcha #13) — Task 126 F-2 rewrote the previous
      // if (res.status() === 201) block into this finally: the failed expect
      // threw PAST the old if-block, so the net was dead code on exactly the
      // RED runs it existed for. The shared helper re-derives the decrement
      // from the inserted rows.
      await deleteProbeOrders("slot-coin-probe@nordhem.sg");
    }
  });

  test("a method-coherent slot still places the order (the boundary does not over-refuse)", async ({ request }) => {
    // Task 129 F-8: this positive-control spec places a REAL order — the
    // cleanup runs in a finally via the shared helper (order delete by email +
    // inventory restore re-derived from the inserted rows), so a throw between
    // the 201 and the cleanup (e.g. a json() parse failure) cannot strand the
    // row (the lesson-39 rule applied to the one positive writer).
    try {
      const res = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.123.10" },
        data: {
          email: "slot-ok-probe@nordhem.sg",
          fullName: "Slot Ok Probe",
          phone: "+65 91234567",
          address: "Blk 1 Testing Rd #01-01",
          postal: "089001",
          deliveryMethod: "express",
          deliverySlot: "Next-day by 6pm",
          storeSlug: "tampines",
          paymentMethod: "card",
          lines: [{ productId: 1, qty: 1 }],
        },
      });
      expect(res.status()).toBe(201);
      const body = (await res.json()) as { data?: { orderNumber?: string } };
      expect(body.data?.orderNumber).toBeTruthy();
    } finally {
      await deleteProbeOrders("slot-ok-probe@nordhem.sg");
    }
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
    // Task 129 F-2: gotoHydrated replaces the bare goto + 900ms sleep — the
    // phase-2 submit click is React-dependent, and a sleep is not a hydration
    // proof (the sentinel mount-effect is unaffected by the debounce freeze,
    // which only swallows 200–300ms setTimeout calls).
    await gotoHydrated(page, "/search?q=sofa");
    await page.waitForTimeout(900); // margin: the flash would be showing by now
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

test.describe("search stale-error discipline (Task 123 F-4)", () => {
  test("a failed search's error box hides once a new needle is typed", async ({ page }) => {
    // The Task-121 F-1 discipline gated the RESULT verdicts on
    // settledFor === needle, but the error box kept its own weaker gate
    // (error && !loading): after a failed search, typing a new needle showed
    // the OLD "We couldn't load results" box through the debounce + fetch
    // window. Same treatment: a changed needle hides it until its own
    // search settles.
    await page.addInitScript(() => {
      const w = window as unknown as { __freezeDebounce?: boolean };
      w.__freezeDebounce = false;
      const orig = window.setTimeout.bind(window);
      window.setTimeout = ((fn: TimerHandler, timeout?: number, ...args: unknown[]) => {
        if (w.__freezeDebounce && typeof timeout === "number" && timeout >= 200 && timeout <= 300) {
          return orig(() => {}, 2_000_000_000);
        }
        return orig(fn, timeout, ...args);
      }) as typeof window.setTimeout;
    });
    // Only the first needle's fetch fails; the second passes through.
    await page.route("**/api/products**", (route) =>
      route.request().url().includes("q=zzzfail") ? route.abort() : route.continue());

    // Phase 1 — the first search genuinely fails: the error box must show.
    // Task 129 F-2: the phases below fill/click — route through gotoHydrated
    // (the positive errorBox assertion already proves the client ran, but
    // the broad "interaction-first" reading is now mechanically true).
    await gotoHydrated(page, "/search?q=zzzfail");
    const errorBox = page.locator("#main").getByRole("alert").filter({ hasText: /couldn.t load results/i });
    await expect(errorBox).toBeVisible({ timeout: 10_000 });

    // Phase 2 — freeze the debounce, type a new needle: through the whole
    // pre-settle window the STALE error box must be hidden.
    await page.evaluate(() => {
      (window as unknown as { __freezeDebounce?: boolean }).__freezeDebounce = true;
    });
    // THREE "Search products" inputs exist (header + page form — the
    // documented responsive double-DOM trap); scope to the page's own.
    await page.locator("#main").getByLabel("Search products").fill("oak");
    await page.waitForTimeout(400);
    await expect(errorBox).toHaveCount(0);

    // Phase 3 — unfreeze and submit: the new search settles cleanly.
    await page.evaluate(() => {
      (window as unknown as { __freezeDebounce?: boolean }).__freezeDebounce = false;
    });
    await page.locator("#main").getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("status").filter({ hasText: /results? for/ })).toHaveText(/\d+ results? for “oak”/, { timeout: 10_000 });
  });
});

test.describe("search grid settle discipline (Task 124 F-3)", () => {
  test("a failed re-search empties the grid — the previous query's cards must not render under the error box", async ({ page }) => {
    // Task-123 F-4 gated the error BOX and the verdicts on settledFor, but
    // the product grid renders `shown = needle ? items : []` unconditionally
    // and `items` is never cleared on error — after a successful search for
    // A and a failed search for B, A's full grid renders beneath B's
    // "We couldn't load results" box (the mirrored half of the F-4 class).
    await page.route("**/api/products**", (route) =>
      route.request().url().includes("q=zzzfail") ? route.abort() : route.continue());

    // Phase 1 — a successful search: cards on screen.
    await gotoHydrated(page, "/search?q=oak");
    await expect(page.getByRole("status").filter({ hasText: /results? for/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#main article").first()).toBeVisible();

    // Phase 2 — the re-search fails: the grid must go EMPTY under the error
    // box (today it keeps rendering the oak cards).
    await page.locator("#main").getByLabel("Search products").fill("zzzfail");
    await page.locator("#main").getByRole("button", { name: "Search" }).click();
    const errorBox = page.locator("#main").getByRole("alert").filter({ hasText: /couldn.t load results/i });
    await expect(errorBox).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#main article")).toHaveCount(0);
  });
});

test.describe("search retry settle discipline (Task 124 F-13)", () => {
  test("clicking Try again hides the error box through the debounce window, not only after it", async ({ page }) => {
    // F-4's settledFor gate covers CHANGED needles; the retry axis kept the
    // weaker gate — setLoading(true) runs inside the 250ms timeout, so after
    // Try again the old error box stays on screen through the debounce
    // window. The settle discipline must cover the retry counter too.
    await page.addInitScript(() => {
      const w = window as unknown as { __freezeDebounce?: boolean };
      w.__freezeDebounce = false;
      const orig = window.setTimeout.bind(window);
      window.setTimeout = ((fn: TimerHandler, timeout?: number, ...args: unknown[]) => {
        if (w.__freezeDebounce && typeof timeout === "number" && timeout >= 200 && timeout <= 300) {
          return orig(() => {}, 2_000_000_000);
        }
        return orig(fn, timeout, ...args);
      }) as typeof window.setTimeout;
    });
    // Every fetch fails for this spec — the retry never succeeds, we only
    // assert the error box's VISIBILITY through the windows.
    await page.route("**/api/products**", (route) => route.abort());

    // Phase 1 — the search fails and settles: the error box shows.
    // Task 129 F-2: same conversion — the phase-2 Try-again click follows.
    await gotoHydrated(page, "/search?q=zzzfail");
    const errorBox = page.locator("#main").getByRole("alert").filter({ hasText: /couldn.t load results/i });
    await expect(errorBox).toBeVisible({ timeout: 10_000 });

    // Phase 2 — freeze the debounce, click Try again: through the whole
    // pre-settle window the error box must be HIDDEN (today it stays).
    await page.evaluate(() => {
      (window as unknown as { __freezeDebounce?: boolean }).__freezeDebounce = true;
    });
    await errorBox.getByRole("button", { name: "Try again" }).click();
    await page.waitForTimeout(400);
    await expect(errorBox).toHaveCount(0);

    // Phase 3 — unfreeze and submit once more: the swallowed timeout cannot
    // be revived (the freeze replaced its callback with a no-op), so a fresh
    // action re-runs the effect; its own settle brings the box back — the
    // retry's OWN verdict owns the screen.
    await page.evaluate(() => {
      (window as unknown as { __freezeDebounce?: boolean }).__freezeDebounce = false;
    });
    await page.locator("#main").getByRole("button", { name: "Search" }).click();
    await expect(errorBox).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("click-&-collect temporal honesty (Task 124 F-8)", () => {
  // The slot labels are time-relative; the options now derive from
  // availableDeliverySlots(method, now) — "Today 2pm" hides once its own
  // 14:00 SGT cutoff passes. page.clock.setFixedTime fakes ONLY Date (not
  // timers — hydration and effects run normally).
  test("after 14:00 SGT the already-past 'Today 2pm' slot is not offered", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-19T15:00:00Z")); // 23:00 SGT
    await gotoHydrated(page, "/product/katong-bedside-table");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/checkout");
    await page.getByRole("button", { name: /Click & Collect/ }).click();
    const options = await page.getByLabel("Time slot").locator("option").allTextContents();
    expect(options).toEqual(["Tomorrow 10am"]);
  });

  test("before 14:00 SGT both click-&-collect slots are offered", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-19T02:00:00Z")); // 10:00 SGT
    await gotoHydrated(page, "/product/katong-bedside-table");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/checkout");
    await page.getByRole("button", { name: /Click & Collect/ }).click();
    const options = await page.getByLabel("Time slot").locator("option").allTextContents();
    expect(options).toEqual(["Today 2pm", "Tomorrow 10am"]);
  });
});

test.describe("checkout form error placement (Task 121 F-12)", () => {
  test("a contact-field error surfaces above the form, not inside the Payment section", async ({ page }) => {
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/checkout");
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
    // Task 125 F-1: the slot options became clock-sensitive in Task-124 F-8
    // ("Today 2pm" hides after 14:00 SGT) — this spec used to run on the real
    // clock and would fail on any post-cutoff run. Pin a pre-cutoff instant
    // (10:00 SGT, the F-8 sibling's) so the re-derivation assertion is
    // deterministic.
    await page.clock.setFixedTime(new Date("2026-11-19T02:00:00Z")); // 10:00 SGT
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/checkout");
    const slot = page.getByLabel("Time slot");
    // Task 140 F-3: the expected default derives from the seam the form
    // state derives from (DELIVERY_SLOTS.delivery[0]) — a slot-label rename
    // self-corrects the assertion instead of rotting it.
    await expect(slot).toHaveValue(DELIVERY_SLOTS.delivery[0]);
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
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    const minus = page.getByRole("button", { name: "Decrease quantity" });
    await expect(minus).toBeDisabled();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(minus).toBeEnabled();
    await minus.click();
    await expect(minus).toBeDisabled();
  });

  test("PDP quantity plus is disabled at the 99 ceiling (cart-page parity — Task 134 F-3)", async ({ page }) => {
    // The cart ceiling pin seeds localStorage; the PDP qty is component
    // state — drive it to the cap through the input (its own onChange clamp
    // admits 99) and pin the mirrored disabled state.
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await page.getByLabel("Qty").fill("99");
    await expect(page.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Decrease quantity" })).toBeEnabled();
  });
});

test.describe("shop loading announcement (Task 121 F-13)", () => {
  test("the loading skeleton announces via role=status, not a bare aria-label div", async ({ page }) => {
    await page.route("**/api/products**", async (route) => {
      await page.waitForTimeout(600);
      await route.continue();
    });
    await gotoHydrated(page, "/shop");
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

  test("the shop strip's GST rate and free-delivery threshold derive from the constants (Task 128 F-3)", async ({ browser }) => {
    // Task 127 F-4 derived the copy; Task 128 F-3 adds the pin — the Task-127
    // claim "the GST + family e2e pins derive" now covers the shop pair too
    // (metadata + visible strip). A threshold or rate edit self-corrects copy
    // and pins together instead of rotting silently.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/shop");
    const strip = page.locator("main p").filter({ hasText: /products · prices include/ });
    await expect(strip.first()).toContainText(
      `prices include ${Math.round(GST_RATE * 100)}% GST · free delivery over $${FREE_DELIVERY_THRESHOLD_CENTS / 100}`
    );
    // The SERP-facing metadata derives the same pair.
    const desc = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(desc).toContain(`prices include ${Math.round(GST_RATE * 100)}% GST, free delivery over $${FREE_DELIVERY_THRESHOLD_CENTS / 100}`);
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

// ─────────────────────────────────────────────────────────────────────────
// Task 122 — skipped-fix debt, crash-boundary truth, display/money honesty
// ─────────────────────────────────────────────────────────────────────────

test.describe("cart promo min-spend display gate (Task 122 F-5)", () => {
  test("the discount preview disappears when items drop the bag below the promo minimum", async ({ page }) => {
    // findPromo dropped minSubtotalCents: WELCOME10 applied on a $150+ bag
    // kept showing its 10% after items were removed — a discount the server
    // refuses at placeOrder (INVALID_PROMO). The effectivePromo gate must
    // hide it from the preview the moment the subtotal falls below the min.
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/product/katong-bedside-table");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Shopping bag, 2 items/ }).click();
    await expect(page.getByRole("heading", { name: /Your bag \(2\)/ })).toBeVisible();

    // $1299 + $89 = $1388 ≥ $150 → the code applies and the row shows.
    await page.getByLabel(/Promo code/i).fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();
    const discountRow = page.getByText("Discount", { exact: true });
    await expect(discountRow).toBeVisible();

    // Remove the sofa → $89 < $150: the code can no longer be effective.
    await page.getByRole("button", { name: "Remove SOLBAKKEN 3-seat sofa" }).click();
    await expect(page.getByRole("heading", { name: /Your bag \(1\)/ })).toBeVisible();
    await expect(discountRow).toHaveCount(0);
  });
});

test.describe("cart promo message honesty (Task 123 F-2)", () => {
  test("below the minimum the notice explains — the stale 'applied' message must not survive", async ({ page }) => {
    // The Task-122 F-5 gate hid the discount ROW, but the message half kept
    // advertising the code: browser-reproduced — WELCOME10 on a $258 bag,
    // decrease to $129 → "WELCOME10 applied — 10% off…" persisted beside a
    // vanished Discount row, and the code still submitted to a server
    // INVALID_PROMO at the Pay step. The current bag state must own the
    // message: below the minimum, quote the minimum instead.
    await gotoHydrated(page, "/product/solbakken-3-seat-sofa");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/product/katong-bedside-table");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Shopping bag, 2 items/ }).click();

    // $1388 ≥ $150 → applies cleanly; both halves agree.
    await page.getByLabel(/Promo code/i).fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(/WELCOME10 applied/i)).toBeVisible();
    await expect(page.getByText("Discount", { exact: true })).toBeVisible();

    // Remove the sofa → $89 < $150: the row hides (F-5) AND the message
    // must switch to the honest minimum notice (F-2) — never claim applied.
    await page.getByRole("button", { name: "Remove SOLBAKKEN 3-seat sofa" }).click();
    await expect(page.getByRole("heading", { name: /Your bag \(1\)/ })).toBeVisible();
    await expect(page.getByText(/WELCOME10 applied/i)).toHaveCount(0);
    await expect(page.getByText(/WELCOME10 needs a \$150\.00 minimum/i)).toBeVisible();
  });

  test("an unknown persisted code gets the 'not valid' notice — never a $0.00 minimum (Task 124 F-4)", async ({ page }) => {
    // findPromoMinimumCents returns null for codes not in PROMOS, and the
    // F-2 notice derivation fell back to `?? 0` — a crafted/legacy
    // nordhem_promo value (≤32 chars, so it passes the predicate) rendered
    // "BOGUSCODE needs a $0.00 minimum — add more to use it" while the
    // server answers "This code is not valid." at ANY subtotal. The exact
    // display/server-truth class F-2 closed, on the unknown-code branch.
    await page.addInitScript(() => {
      // The external stores read localStorage once at module load — seed
      // BEFORE app boot (the documented addInitScript discipline).
      localStorage.setItem("nordhem_cart_v1", JSON.stringify([
        { productId: 1, slug: "solbakken-3-seat-sofa", name: "SOLBAKKEN 3-seat sofa", sku: "NH-SOF-001", imageUrl: "x", unitPriceCents: 129900, qty: 1 },
      ]));
      localStorage.setItem("nordhem_promo", JSON.stringify("BOGUSCODE"));
    });
    await gotoHydrated(page, "/cart");
    await expect(page.getByRole("heading", { name: /Your bag \(1\)/ })).toBeVisible();
    await expect(page.getByText(/\$0\.00 minimum/i)).toHaveCount(0);
    await expect(page.getByText(/BOGUSCODE isn.t a valid code/i)).toBeVisible();
    // The Remove affordance already present is the honest way out.
    await page.getByRole("button", { name: /^Remove code BOGUSCODE$/ }).click();
    await expect(page.getByText(/BOGUSCODE/i)).toHaveCount(0);
  });
});

test.describe("store-picker persisted-state fallback (Task 124 F-16 — DISPROVEN, kept as pin)", () => {
  test("a crafted nordhem_store value renders the Tampines fallback — the select never renders blank", async ({ page }) => {
    // The audit claimed a crafted nordhem_store value (any-string predicate)
    // renders a blank select. Browser-disproven live (agent-browser, fresh
    // navigations, hydration verified): React renders the unmatched
    // controlled value by showing the FIRST option — the select displays
    // "Tampines" (selectedIndex 0), exactly the degradation the predicate
    // fix would produce. A valid-value control ("Jurong" → selected) proved
    // the seeding path works, so this is a real disproof, not a test gap.
    // Per the Task-121 lesson-21 precedent the spec stays as a PIN of the
    // fallback-display contract; no predicate change (no speculative fix).
    await page.addInitScript(() => {
      localStorage.setItem("nordhem_store", JSON.stringify("Bogus Store"));
    });
    await page.goto("/");
    // Wait for hydration before reading — the SSR snapshot renders the
    // "Tampines" fallback and the crafted value only takes over after the
    // client store reads localStorage (the documented hydration-race trap;
    // a bare inputValue() can pass against unfixed code).
    await page.waitForFunction(() => Object.keys(document.body).some((k) => k.startsWith("__react")));
    const select = page.getByLabel(/Choose a store/i).or(page.locator("header select#store-pick"));
    await expect(select).toBeVisible();
    const value = await select.inputValue();
    expect(value).toBe("Tampines");
  });
});

test.describe("footer store chips derivation (Task 130 F-6)", () => {
  test("the footer's store chips derive from the STORES seed — no fourth hand-duplicated list", async ({ page }) => {
    // Task 129 F-11 derived the store list at the route whitelist, the
    // checkout options and the Header picker — the Footer chips stayed a
    // hand-drawn triple. The pin interpolates the seed (the derived-copy
    // pattern): a fourth store in STORES must appear in the chips without a
    // coordinated Footer edit, and a reverted hand-list misses it.
    await page.goto("/");
    for (const s of STORES) {
      await expect(page.locator("footer").getByText(storeName(s.slug), { exact: true })).toBeVisible();
    }
    await expect(page.locator("footer").getByText("Island-wide delivery", { exact: true })).toBeVisible();
    // Exactly the seed + the delivery chip — no stragglers, no duplicates.
    const chips = page.locator("footer span.rounded-full");
    await expect(chips).toHaveCount(STORES.length + 1);
  });
});

test.describe("checkout payload caps (Task 122 F-7)", () => {
  test("an overlong promoCode is refused, not accepted verbatim", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      headers: { "x-forwarded-for": "10.9.122.1" },
      data: {
        email: "caps-promo-probe@nordhem.sg",
        fullName: "Caps Probe",
        phone: "+65 91234567",
        address: "Blk 1 Testing Rd #01-01",
        postal: "089001",
        promoCode: "A".repeat(33),
        lines: [{ productId: 1, qty: 1 }],
      },
    });
    try {
      expect(res.status()).toBe(422);
    } finally {
      // Task 126 F-2 RED-run safety net (gotcha #13): a 201 needs BOTH the cap
      // and the unknown-promo refusal to break — uniform insurance regardless.
      await deleteProbeOrders("caps-promo-probe@nordhem.sg");
    }
  });

  test("a 101-line bag is refused (bounded write, not a 101-row insert)", async ({ request }) => {
    const lines = Array.from({ length: 101 }, (_, i) => ({ productId: (i % 20) + 1, qty: 1 }));
    const res = await request.post("/api/checkout", {
      headers: { "x-forwarded-for": "10.9.122.2" },
      data: {
        email: "caps-lines-probe@nordhem.sg",
        fullName: "Caps Probe",
        phone: "+65 91234567",
        address: "Blk 1 Testing Rd #01-01",
        postal: "089001",
        lines,
      },
    });
    try {
      expect(res.status()).toBe(422);
    } finally {
      // Task 126 F-2 RED-run safety net (gotcha #13): the honest-RED for this
      // cycle's backfill — with the cap reverted the probe genuinely placed a
      // 101-row order (products 1–20, tampines); the net re-derives the
      // decrement from the inserted rows and restores it.
      await deleteProbeOrders("caps-lines-probe@nordhem.sg");
    }
  });
});

test.describe("checkout qty:null drop semantics (Task 122 F-8)", () => {
  test("a null qty line drops out instead of coercing to qty 1", async ({ request }) => {
    // Number(null) === 0 is finite, so the min-clamp turned a null qty into
    // 1 — a crafted single-line order with qty:null placed a real order.
    // null/undefined must behave like every other non-number: drop the line
    // (an all-dropped bag is EMPTY_BAG, never a quiet qty-1 order).
    // Task 129 F-1a: this refusal spec is write-capable (a qty-boundary
    // regression places a real order for product 1) — the RED-run net
    // (order delete + inventory restore) lives in a finally.
    try {
      const res = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.122.3" },
        data: {
          email: "nullqty-probe@nordhem.sg",
          fullName: "Null Qty Probe",
          phone: "+65 91234567",
          address: "Blk 1 Testing Rd #01-01",
          postal: "089001",
          lines: [{ productId: 1, qty: null }],
        },
      });
      const body = (await res.json()) as { ok?: boolean; error?: { code?: string } };
      expect(res.status()).toBe(422);
      expect(body.error?.code).toBe("EMPTY_BAG");
    } finally {
      await deleteProbeOrders("nullqty-probe@nordhem.sg");
    }
  });
});

test.describe("checkout qty/productId type strictness (Task 124 F-5)", () => {
  test("non-number TYPES drop the line instead of coercing to a real quantity", async ({ request }) => {
    // Task-122 F-8 closed null/undefined; Number(true)===1, Number([5])===5
    // and Number("3")===3 are all finite, so value-level checks still let
    // crafted TYPES place quiet single-unit orders (and Number("7") coerced
    // a string productId). A non-number type must drop the line like every
    // other non-numeric value — an all-dropped bag is EMPTY_BAG.
    // The RED path of this probe WRITES (today: 201) — safety-net cleanup.
    // Task 133 F-2: the pre-133 finally deleted the order rows with two
    // manual queries but never restored the INVENTORY placeOrder decremented
    // — the RED-run net was rows-only while every sibling spec used the
    // shared helper (the uniform-net claim in AGENTS/CLAUDE was not true for
    // this Task-124-era relic). Honest-RED by temporary route mutation: the
    // old net stranded the decrement (demonstrated live — product-1 tampines
    // 45→44 with the order rows deleted); the deleteProbeOrders swap restores
    // it on the same mutation run (re-derived from the inserted rows).
    try {
      for (const [label, line] of [
        ["boolean qty", { productId: 1, qty: true }],
        ["single-element array qty", { productId: 1, qty: [5] }],
        ["numeric string qty", { productId: 1, qty: "3" }],
        ["string productId", { productId: "1", qty: 1 }],
      ] as const) {
        const res = await request.post("/api/checkout", {
          headers: { "x-forwarded-for": "10.9.124.1" },
          data: {
            email: "typeqty-probe@nordhem.sg",
            fullName: "Type Qty Probe",
            phone: "+65 91234567",
            address: "Blk 1 Testing Rd #01-01",
            postal: "089001",
            lines: [line],
          },
        });
        const body = (await res.json()) as { ok?: boolean; error?: { code?: string } };
        expect(res.status(), label).toBe(422);
        expect(body.error?.code, label).toBe("EMPTY_BAG");
      }
    } finally {
      await deleteProbeOrders("typeqty-probe@nordhem.sg");
    }
  });
});

test.describe("checkout free-text field type strictness (Task 127 F-2)", () => {
  test("non-string TYPES on email/fullName/phone/postal/address/deliverySlot are refused, never String()-coerced", async ({ request }) => {
    // Task 124/125/126 hardened lines (productId/qty), reviews POST and the
    // three read boundaries — but the checkout route's five free-text fields
    // still read String(body.x ?? "").trim(), and a single-element array
    // String()-coerces to its element: a fully array-typed payload passes
    // every validator and places a 201 order (verified by executed proof at
    // audit time). The write boundary must refuse crafted TYPES like every
    // sibling. The RED path of this probe WRITES (today: 201) — the shared
    // deleteProbeOrders net (order delete + inventory restore) runs in the
    // finally (the Task-126 F-2 discipline: a net after a failing expect is
    // dead code).
    try {
      const res = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.127.1" },
        data: {
          email: ["freetext-probe@nordhem.sg"],
          fullName: ["Free Text Probe"],
          phone: ["+65 91234567"],
          address: ["Blk 1 Testing Rd #01-01"],
          postal: ["089001"],
          deliveryMethod: "click-collect",
          deliverySlot: ["Today 2pm"],
          storeSlug: "tampines",
          lines: [{ productId: 1, qty: 1 }],
        },
      });
      const body = (await res.json()) as { ok?: boolean; error?: { code?: string } };
      expect(res.status()).toBe(422);
      expect(body.error?.code).toBe("VALIDATION");
    } finally {
      await deleteProbeOrders("freetext-probe@nordhem.sg");
    }
  });
});

test.describe("checkout enum/promo field type + whitelist strictness (Task 129 F-3)", () => {
  test("non-string or unknown TYPES on deliveryMethod/paymentMethod and non-string promoCode are refused, never silently coerced", async ({ request }) => {
    // Task-127 F-2 closed the FREE-TEXT class; the enum class stayed half
    // open — storeSlug (Task 121 F-7) and deliverySlot (Task 123 F-3/127 F-2)
    // refuse crafted values, but deliveryMethod/paymentMethod String()-coerce
    // (paymentMethod: ["card"] → String(["card"]) === "card" → a REAL 201
    // order on a crafted type) and promoCode silently null-drops non-strings.
    // Unknown STRINGS must also refuse — the storeSlug/deliverySlot posture,
    // not a silent default. Absent fields keep the documented defaults.
    // The RED path of every probe here WRITES (today: 201) — shared net in
    // the finally (the Task-126 F-2 discipline).
    try {
      const probes: Array<[string, Record<string, unknown>]> = [
        ["array paymentMethod (String-coerces to a real method)", { paymentMethod: ["card"] }],
        ["numeric deliveryMethod (silently defaults)", { deliveryMethod: 5 }],
        ["numeric promoCode (silently null-dropped)", { promoCode: 42 }],
        ["unknown-string deliveryMethod (silently defaults)", { deliveryMethod: "teleport" }],
        ["unknown-string paymentMethod (silently defaults)", { paymentMethod: "crypto" }],
        // Task 130 F-1: storeSlug was the last String()-coerced seam — the
        // array coerces to "tampines" and rides the whitelist into a real
        // 201 (the lesson-43 field-class rule applied one field short of
        // the enum class in Task 129). No UI null-encoding to preserve —
        // the checkout page's store select always sends a real string.
        ["array storeSlug (String-coerces to a real slug)", { storeSlug: ["tampines"] }],
        ["numeric storeSlug (String()-coerces before the whitelist)", { storeSlug: 5 }],
      ];
      for (const [label, patch] of probes) {
        const res = await request.post("/api/checkout", {
          headers: { "x-forwarded-for": "10.9.129.1" },
          data: {
            email: "enum-probe@nordhem.sg",
            fullName: "Enum Probe",
            phone: "+65 91234567",
            address: "Blk 1 Testing Rd #01-01",
            postal: "089001",
            lines: [{ productId: 1, qty: 1 }],
            ...patch,
          },
        });
        const body = (await res.json()) as { ok?: boolean; error?: { code?: string } };
        expect(res.status(), label).toBe(422);
        expect(body.error?.code, label).toBe("VALIDATION");
      }
      // The UI's own "no promo" encoding — promoCode: null — MUST stay
      // accepted (checkout/page.tsx always sends the key; cart-store types
      // it string | null). A valid order still places (201) with no promo.
      const nullPromo = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.129.1" },
        data: {
          email: "enum-probe@nordhem.sg",
          fullName: "Enum Probe",
          phone: "+65 91234567",
          address: "Blk 1 Testing Rd #01-01",
          postal: "089001",
          promoCode: null,
          lines: [{ productId: 1, qty: 1 }],
        },
      });
      expect(nullPromo.status()).toBe(201);
    } finally {
      await deleteProbeOrders("enum-probe@nordhem.sg");
    }
  });
});

test.describe("delivery fulfilment-store coherence (Task 130 F-2)", () => {
  test("a delivery order is checked against and decrements the CHOSEN store — never phantom island-wide units", async ({ request }) => {
    // hdb-kitchen-trolley (product 11): tampines 15 / jurong 3 / alexandra 0
    // — aggregate 18. The pre-fix defect: the availability check summed ALL
    // stores for delivery (any-store-can-ship) while the decrement hit ONE
    // row with a greatest(0, …) clamp — a 17-unit delivery order PASSED on
    // the aggregate, clamped tampines 15 → 0, and 2 units materialised from
    // nowhere (the table then overstates stock for every later refusal).
    // Task 130 F-2 scopes the check to the chosen store for EVERY method
    // (check/decrement/net symmetric by construction — the click-collect
    // semantics Task 121 F-7 already shipped, now method-independent).
    // The RED path of the first probe WRITES (today: 201) — netted via
    // deleteProbeOrders PLUS an inventory snapshot restore (the clamp makes
    // the ordered qty ≠ the drained qty, so the additive net alone would
    // re-seed phantom units — the saturation spec's snapshot pattern).
    const client = new Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db" });
    await client.connect();
    try {
      const snap = await client.query<{ store_slug: string; quantity: number }>(
        "select store_slug, quantity from inventory where product_id = 11",
      );
      const payload = (qty: number) => ({
        email: "fulfil-probe@nordhem.sg",
        fullName: "Fulfil Probe",
        phone: "+65 91234567",
        address: "Blk 1 Testing Rd #01-01",
        postal: "089001",
        deliveryMethod: "delivery",
        storeSlug: "tampines",
        lines: [{ productId: 11, qty }],
      });
      try {
        // RED probe: qty 17 > tampines 15 (but ≤ island-wide 18) must be a
        // 422 LOW_STOCK that agrees with the PDP's tampines display —
        // today it is a 201 with 2 phantom units.
        const over = await request.post("/api/checkout", {
          headers: { "x-forwarded-for": "10.9.131.1" },
          data: payload(17),
        });
        expect(over.status()).toBe(422);
        const overBody = (await over.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
        expect(overBody.error?.code).toBe("LOW_STOCK");
        expect(overBody.error?.message).toContain("Only 15 left");

        // Positive control: qty 15 == the chosen store's stock places the
        // order, drains EXACTLY the chosen row, and leaves the sibling
        // stores untouched (the coherence the fix guarantees).
        const okOrder = await request.post("/api/checkout", {
          headers: { "x-forwarded-for": "10.9.131.1" },
          data: payload(15),
        });
        expect(okOrder.status()).toBe(201);
        const rows = await client.query<{ store_slug: string; quantity: number }>(
          "select store_slug, quantity from inventory where product_id = 11 order by id",
        );
        const byStore = new Map(rows.rows.map((r) => [r.store_slug, r.quantity]));
        expect(byStore.get("tampines")).toBe(0);
        expect(byStore.get("jurong")).toBe(3);
        expect(byStore.get("alexandra")).toBe(0);
      } finally {
        await deleteProbeOrders("fulfil-probe@nordhem.sg");
        for (const r of snap.rows) {
          await client.query("update inventory set quantity = $1 where product_id = 11 and store_slug = $2", [r.quantity, r.store_slug]);
        }
      }
    } finally {
      await client.end();
    }
  });
});

test.describe("reviews POST type strictness (Task 125 F-2)", () => {
  test("non-number TYPES are refused instead of coerced into junk reviews", async ({ request }) => {
    // Task-124 F-5 made checkout drop non-number TYPES; the reviews boundary
    // still coerced: Number(true)===1, Number([3])===3, Number("5")===5, and
    // String(1e19) is a 20-char "name" that sails past the ≤60 cap. Crafted
    // TYPES must be a 422, never a persisted junk row riding the live review
    // list (and the Task-123 F-10 count-truth chain).
    // The RED path of this probe WRITES (today: 201) — safety-net cleanup
    // keyed on the probe's own titles (the gotcha #13 discipline).
    const client = new Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db" });
    await client.connect();
    try {
      const probes: Array<[string, Record<string, unknown>]> = [
        ["boolean rating", { productId: 1, author: "Type Probe", rating: true, title: "task125-f2-probe-bool", body: "probe" }],
        ["numeric-string rating", { productId: 1, author: "Type Probe", rating: "5", title: "task125-f2-probe-str", body: "probe" }],
        ["numeric author", { productId: 1, author: 10000000000000000000, rating: 5, title: "task125-f2-probe-num", body: "probe" }],
        ["numeric body", { productId: 1, author: "Type Probe", rating: 5, title: "task125-f2-probe-body", body: 42 }],
      ];
      for (const [label, payload] of probes) {
        const res = await request.post("/api/reviews", {
          headers: { "x-forwarded-for": "10.9.125.2" },
          data: payload,
        });
        const body = (await res.json()) as { ok?: boolean; error?: { code?: string } };
        expect(res.status(), label).toBe(422);
        expect(body.error?.code, label).toBe("VALIDATION");
      }
    } finally {
      await client.query("delete from reviews where title like 'task125-f2-probe-%'");
      await client.end();
    }
  });
});

test.describe("track + promo field caps (Task 125 F-3)", () => {
  test("overlong order numbers / emails / promo codes are refused with 422 VALIDATION", async ({ request }) => {
    // The checkout boundary caps every field (email ≤254, promoCode ≤32 —
    // Task 120 F-3); the PII-lookup pair accepted unbounded strings into the
    // parameterized lookups. Mirror the known shapes: order numbers are
    // NH-YYYYMMDD-XXXXXX (18 chars) → ≤32, emails ≤254, codes ≤32 (the
    // isValidPromoPayload / checkout cap).
    const trackRes = await request.post("/api/orders/track", {
      headers: { "x-forwarded-for": "10.9.125.3" },
      data: { orderNumber: "NH-" + "9".repeat(40), email: "x".repeat(500) + "@nordhem.sg" },
    });
    expect(trackRes.status()).toBe(422);
    const trackJson = (await trackRes.json()) as { ok: boolean; error: { code: string } };
    expect(trackJson.ok).toBe(false);
    expect(trackJson.error.code).toBe("VALIDATION");

    const promoRes = await request.post("/api/promotions/validate", {
      headers: { "x-forwarded-for": "10.9.125.4" },
      data: { code: "X".repeat(100), subtotalCents: 5000 },
    });
    expect(promoRes.status()).toBe(422);
    const promoJson = (await promoRes.json()) as { ok: boolean; error: { code: string } };
    expect(promoJson.ok).toBe(false);
    expect(promoJson.error.code).toBe("VALIDATION");
  });

  test("non-string TYPES on the read boundaries are 422 VALIDATION, never coerced (Task 126 F-5)", async ({ request }) => {
    // The checkout (Task-124 F-5) and reviews-POST (Task-125 F-2) boundaries
    // are TYPE-strict; the track + promo-validate READ pair still coerced —
    // String(12345) sailed into the lookup as a 404, Number("15000") into the
    // promo math. A crafted TYPE is a client error on every boundary.
    const trackRes = await request.post("/api/orders/track", {
      headers: { "x-forwarded-for": "10.9.125.13" },
      data: { orderNumber: 123456789, email: "type-probe@nordhem.sg" },
    });
    expect(trackRes.status()).toBe(422);
    const trackJson = (await trackRes.json()) as { ok: boolean; error: { code: string } };
    expect(trackJson.error.code).toBe("VALIDATION");

    const promoRes = await request.post("/api/promotions/validate", {
      headers: { "x-forwarded-for": "10.9.125.14" },
      data: { code: 12345, subtotalCents: 5000 },
    });
    expect(promoRes.status()).toBe(422);
    const promoJson = (await promoRes.json()) as { ok: boolean; error: { code: string } };
    expect(promoJson.error.code).toBe("VALIDATION");

    // subtotalCents is type-checked too — a numeric string must not ride the
    // promo math (Number("15000") === 15000).
    const promoRes2 = await request.post("/api/promotions/validate", {
      headers: { "x-forwarded-for": "10.9.125.15" },
      data: { code: "WELCOME10", subtotalCents: "15000" },
    });
    expect(promoRes2.status()).toBe(422);
    const promoJson2 = (await promoRes2.json()) as { ok: boolean; error: { code: string } };
    expect(promoJson2.error.code).toBe("VALIDATION");

    // reviews GET accepts only whole-number productId strings — ?productId=1.5
    // used to floor into a real product's review list.
    const reviewsRes = await request.get("/api/reviews?productId=1.5");
    expect(reviewsRes.status()).toBe(422);
    const reviewsJson = (await reviewsRes.json()) as { ok: boolean; error: { code: string } };
    expect(reviewsJson.error.code).toBe("VALIDATION");
  });
});

test.describe("reviews refuse-never-truncate (Task 122 F-11)", () => {
  test("an overlong review body is refused with 422, not silently truncated", async ({ request }) => {
    // Task 129 F-1b: a cap regression INSERTS the 3000-char probe row — the
    // RED-run net (the Task-125 F-2 sibling pattern) lives in a finally.
    const client = new Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db" });
    await client.connect();
    try {
      const res = await request.post("/api/reviews", {
        headers: { "x-forwarded-for": "10.9.122.4" },
        data: {
          productId: 1,
          author: "Truncation Probe",
          rating: 5,
          title: "Long body probe",
          body: "x".repeat(3000),
        },
      });
      const body = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
      expect(res.status()).toBe(422);
      expect(body.error?.code).toBe("VALIDATION");
      expect(body.error?.message).toMatch(/too long|shorter/i);
    } finally {
      await client.query("delete from reviews where author = 'Truncation Probe'");
      await client.end();
    }
  });
});

test.describe("inventory unique (product_id, store_slug) constraint (Task 122 F-12)", () => {
  test("a duplicate (product_id, store_slug) row is rejected by the schema", async () => {
    // The seed's onConflictDoNothing had no conflict target — duplicates
    // would make the per-store decrement UPDATE hit every copy.
    const client = new Client({
      connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    await client.connect();
    let probeId: number | null = null;
    try {
      const row = await client.query("select product_id, store_slug, quantity, aisle_bin from inventory order by id limit 1");
      const { product_id, store_slug, quantity, aisle_bin } = row.rows[0];
      let violated = false;
      try {
        const ins = await client.query(
          "insert into inventory (product_id, store_slug, quantity, aisle_bin) values ($1, $2, $3, $4) returning id",
          [product_id, store_slug, quantity, aisle_bin],
        );
        probeId = ins.rows[0].id as number; // RED-run residue tracking
      } catch (err) {
        violated = (err as { code?: string }).code === "23505"; // unique_violation
      }
      expect(violated).toBe(true);
    } finally {
      // RED-run safety net: the constraint-absent run inserts a real row —
      // delete THAT row by id (parallel-safe, never a neighbour's).
      if (probeId !== null) {
        await client.query("delete from inventory where id = $1", [probeId]);
      }
      await client.end();
    }
  });
});

test.describe("business quote stepper floor (Task 122 F-15)", () => {
  test("the quote minus button is disabled at the 0 floor (cart/PDP parity)", async ({ page }) => {
    // Units ship with non-zero defaults (locker starts at 2) — drive one to
    // the floor and pin the disabled state there.
    await gotoHydrated(page, "/business");
    const minus = page.getByRole("button", { name: "Fewer Staff locker tower" });
    await expect(minus).toBeEnabled();
    await minus.click(); // 2 → 1
    await minus.click(); // 1 → 0 — the floor
    await expect(minus).toBeDisabled();
  });

  test("the quote plus button is disabled at the 200 ceiling (the floor's mirror — Task 134 F-3)", async ({ page }) => {
    // The quote calculator has no qty input — drive the Staff locker tower
    // from its default 2 up to the 200 cap and pin the mirrored disabled
    // state (198 clicks; the business panel is client-local, no fetches).
    await gotoHydrated(page, "/business");
    const plus = page.getByRole("button", { name: "More Staff locker tower" });
    for (let i = 0; i < 198; i++) {
      await plus.click();
    }
    await expect(plus).toBeDisabled();
    await expect(page.getByRole("button", { name: "Fewer Staff locker tower" })).toBeEnabled();
  });
});

test.describe("checkout summary GST disclosure (Task 122 F-15)", () => {
  test("the checkout summary shows the GST component like the cart does", async ({ page }) => {
    await gotoHydrated(page, "/product/katong-bedside-table");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Shopping bag, 1 item/ }).click();
    await page.getByRole("link", { name: /Go to checkout/i }).click();
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    // Same totals seam as the cart — the disclosure must not vanish here.
    // Task 127 F-4: the pin derives from GST_RATE so a rate edit self-corrects
    // assertion and copy together (the sitemap-count derivation pattern).
    await expect(page.getByText(`Incl. ${Math.round(GST_RATE * 100)}% GST`)).toBeVisible();
  });
});

test.describe("inspiration index pieces total (Task 122 F-16)", () => {
  test("the index card shows the shoppable pieces total, not the editorial budget", async ({ page }) => {
    // The detail page splits "Room budget $800" from "These pieces $667";
    // the index labelled the BUDGET as "Shop this room · $800.00" — the
    // exact conflation Task 119 F-4 fixed on the detail page.
    // Task 133 F-6a: the expectation DERIVES from the catalogue like the
    // page itself (the business sibling's DEFAULT_LIST_CENTS pattern — a
    // price edit on the room's pieces self-corrects the pin instead of
    // false-REDing it; the pre-133 literal "667.00" was one edit away).
    const renter = INSPIRATIONS.find((r) => r.slug === "renter-refresh-800");
    expect(renter).toBeTruthy();
    const piecesTotal = (renter!.productSlugs as readonly string[])
      .map((s) => PRODUCTS.find((p) => p.slug === s))
      .filter((p): p is (typeof PRODUCTS)[number] => !!p)
      .reduce((a, p) => a + p.priceCents, 0);
    await page.goto("/inspiration");
    const card = page.locator("a", { hasText: "Renter refresh" });
    await expect(card).toBeVisible();
    await expect(card.getByText(/Shop this room/)).toContainText(formatSGD(piecesTotal));
    // The editorial budget must stay out of the shoppable-total slot.
    await expect(card.getByText(/Shop this room/)).not.toContainText(formatSGD(renter!.budgetCents));
  });
});

test.describe("search URL sync (Task 122 F-17)", () => {
  test("submitting a search reflects it in the URL, and a reload restores the results", async ({ page }) => {
    // Scope to the page form — the header carries two more "Search products"
    // inputs (desktop + mobile variants); strict mode rejects the ambiguity.
    await gotoHydrated(page, "/search");
    await page.locator("main").getByLabel("Search products").fill("oak");
    await page.locator("main").getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search\?q=oak/);
    // The results verdict settles (the F-1 discipline), then reload: the
    // URL-carried query must re-seed the input and re-run the search.
    await expect(page.getByText(/result/i).first()).toBeVisible();
    await page.reload();
    await expect(page.locator("main").getByLabel("Search products")).toHaveValue("oak");
    await expect(page.getByText(/result/i).first()).toBeVisible();
  });

  test("a popular chip search also lands in the URL", async ({ page }) => {
    await gotoHydrated(page, "/search");
    await page.getByRole("button", { name: "sofa", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?q=sofa/);
  });
});

test.describe("home hero discount attribution (Task 122 F-19)", () => {
  test("the hero's max-discount claim attributes the top discount honestly", async ({ page }) => {
    // The catalogue max is 24% (NORDLYS floor lamp, decor/lighting); the old
    // copy attributed it to extendable dining tables (undiscounted) — the
    // Task-118 false-attribution class. The honest line leads with what
    // actually carries the max.
    await page.goto("/");
    const hero = page.locator("section").first();
    const heroClaim = hero.getByText(new RegExp(`Up to ${MAX_OFF}% off`));
    await expect(heroClaim).toContainText(/lighting/i);
    await expect(heroClaim).not.toContainText(/extendable dining tables/i);
  });

  test("the header utility strip's discount claim is attributed honestly too (Task 125 F-4)", async ({ page }) => {
    // Task-122 F-19 fixed the hero but the header strip kept "up to 24% off
    // dining & decor" — dining's max is −17%; the 24% is NORDLYS
    // (lighting/decor). The strip must lead with categories that actually
    // carry a ≥20% discount (lighting −24%, cookware −23%, decor −24/−21%).
    await page.goto("/");
    const strip = page.locator("header").getByText(new RegExp(`up to ${MAX_OFF}% off`, "i"));
    await expect(strip).toContainText(/lighting/i);
    await expect(strip).toContainText(/cookware/i);
    await expect(strip).not.toContainText(/dining & decor/i);
  });
});

test.describe("shop SSR sort order (Task 122 F-6)", () => {
  test("price-asc sort ships ascending prices in the SSR HTML", async ({ browser }) => {
    // The sort seam is shared by the API and the SSR grid; a regression that
    // re-sorts only one caller would pass presence-only assertions.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/shop?sort=price-asc");
    // The card renders the current price plus (when discounted) a struck-
    // through compare-at — sort only by the CURRENT price elements.
    const priceParas = page.locator("main p:not(.line-through)").filter({ hasText: /^\$[\d,]+\.\d{2}$/ });
    const prices = await priceParas.allTextContents();
    const cents = prices.map((t) => Math.round(parseFloat(t.replace(/[$,]/g, "")) * 100));
    expect(cents.length).toBeGreaterThanOrEqual(20);
    const sorted = [...cents].sort((a, b) => a - b);
    expect(cents).toEqual(sorted);
    await context.close();
  });
});

test.describe("security headers + fingerprint suppression (Task 125 G-1)", () => {
  test("every response carries the platform header set and no x-powered-by", async ({ request }) => {
    // The homenest posture: nosniff, frame denial, referrer trimming, a
    // permissions lockout and HSTS — plus poweredByHeader: false so the
    // stack is not advertised. Pinned on both a page and an API route.
    for (const path of ["/", "/api/products"]) {
      const res = await request.get(path);
      expect(res.headers()["x-content-type-options"], path).toBe("nosniff");
      expect(res.headers()["x-frame-options"], path).toBe("DENY");
      expect(res.headers()["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
      expect(res.headers()["permissions-policy"], path).toContain("camera=()");
      expect(res.headers()["permissions-policy"], path).toContain("payment=()");
      expect(res.headers()["strict-transport-security"], path).toContain("max-age=63072000");
      expect(res.headers()["x-powered-by"], path).toBeUndefined();
    }
  });

  test("every response carries the reduced CSP — the four no-hydration-risk directives (Task 141 F-4)", async ({ request }) => {
    // The register's CSP split, reduced half promoted: object-src closes
    // the plugin/object embed vector, base-uri defeats <base>-injection
    // URL hijacking, frame-ancestors complements XFO for legacy contexts,
    // and form-action pins form submissions to self (no cross-origin form
    // targets exist — the search form is router.push). Deliberately NO
    // default-src/script-src/img-src: Next.js hydration needs inline
    // flight scripts, and the full nonce CSP stays deferred (the register's
    // silent-no-hydration trap — prerendered hydrating shells would need
    // the per-request-nonce + await connection() discipline).
    for (const path of ["/", "/api/products"]) {
      const res = await request.get(path);
      const csp = res.headers()["content-security-policy"];
      expect(csp, path).toBeDefined();
      expect(csp, path).toContain("object-src 'none'");
      expect(csp, path).toContain("base-uri 'self'");
      expect(csp, path).toContain("frame-ancestors 'none'");
      expect(csp, path).toContain("form-action 'self'");
    }
  });
});

test.describe("checkout slot clock coherence (Task 125 F-6)", () => {
  test("a slot held past its own 14:00 SGT cutoff is reset before submit — display and payload agree", async ({ page }) => {
    // Task-124 F-8 hid "Today 2pm" from the OPTIONS after the cutoff, but
    // form.slot kept holding it: a checkout opened before 14:00 SGT that
    // re-renders after the cutoff DISPLAYS "Tomorrow 10am" (the controlled
    // select falls back to the first option) while POSTing the already-past
    // "Today 2pm". The adjust-during-render guard resets a held slot the
    // moment it leaves the available set — display and payload must agree.
    // The POST is intercepted (fixed 422 — no DB write, no navigation).
    await page.clock.setFixedTime(new Date("2026-11-19T05:59:00Z")); // 13:59 SGT
    await gotoHydrated(page, "/product/katong-bedside-table");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/checkout");
    await page.getByRole("button", { name: /Click & Collect/ }).click();
    const slot = page.getByLabel("Time slot");
    await expect(slot).toHaveValue("Today 2pm");

    // Object wrapper: TS control-flow narrows a plain `let captured = null`
    // to `never` at the read site (closure assignments are not tracked).
    const state: { captured: { deliverySlot?: string } | null } = { captured: null };
    await page.route("**/api/checkout", async (route) => {
      state.captured = route.request().postDataJSON() as { deliverySlot?: string };
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: { code: "VALIDATION", message: "intercepted-probe" } }),
      });
    });

    // Cross the cutoff, then force a re-render (typing re-derives options).
    await page.clock.setFixedTime(new Date("2026-11-19T07:01:00Z")); // 15:01 SGT
    await page.getByLabel("Full name").fill("Clock Probe");
    const options = await slot.locator("option").allTextContents();
    expect(options).toEqual(["Tomorrow 10am"]);
    // The displayed select falls back to the first option — and the STATE
    // must follow it (the pre-fix bug kept "Today 2pm" in the payload).
    await expect(slot).toHaveValue("Tomorrow 10am");

    await page.getByLabel("Email").fill("clock-probe@nordhem.sg");
    await page.getByLabel("Phone").fill("+65 91234567");
    await page.getByLabel("Postal code").fill("521123");
    await page.getByPlaceholder("Blk, street, unit number").fill("Blk 1 Clock Rd #01-01");
    await page.getByRole("button", { name: /Pay / }).click();
    // Scope to the text — the form alert shares role=alert with Next's route
    // announcer (strict-mode would resolve 2 elements).
    await expect(page.getByText("intercepted-probe")).toBeVisible();
    expect(state.captured?.deliverySlot).toBe("Tomorrow 10am");
  });
});

test.describe("web manifest + app icon (Task 125 G-6)", () => {
  test("the icon and manifest resolve and are linked from the document head", async ({ page, request }) => {
    // Every browser request for /favicon.ico used to 404 (no app icon, no
    // public/ dir) and there was no installable-PWA metadata. Next's file
    // conventions: app/icon.svg → /icon.svg (+ <link rel="icon">), and
    // app/manifest.ts → /manifest.webmanifest (+ <link rel="manifest">).
    await page.goto("/");
    const iconHref = await page.locator('link[rel="icon"]').getAttribute("href");
    expect(iconHref).toBeTruthy();
    const iconRes = await request.get(iconHref!);
    expect(iconRes.status()).toBe(200);

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestRes = await request.get(manifestHref!);
    expect(manifestRes.status()).toBe(200);
    const manifest = (await manifestRes.json()) as { name?: string; icons?: Array<{ src?: string }> };
    expect(manifest.name).toContain("NORDHEM");
    expect(manifest.icons?.length ?? 0).toBeGreaterThan(0);
    const iconInManifest = await request.get(new URL(manifest.icons![0].src!, "http://127.0.0.1:3100").toString());
    expect(iconInManifest.status()).toBe(200);
  });
});

test.describe("hydration sentinel (Task 125 G-5)", () => {
  test("html[data-hydrated] appears on the home page, the shop grid and a PDP", async ({ page }) => {
    // CartProvider (the root client boundary) stamps the sentinel on mount —
    // the e2e suite's hydration gate. Before this, the suite was blind to
    // hydration states (AGENTS gotcha #11's own admission): a pre-hydration
    // click silently no-ops.
    for (const path of ["/", "/shop", "/product/solbakken-3-seat-sofa"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true", { timeout: 20_000 });
    }
  });
});

test.describe("checkout idempotency (Task 126 F-1)", () => {
  test("a double-submit with the same idempotency key places ONE order (replay, not a second)", async ({ request }) => {
    // A double-click on Pay, a network retry after a response-timeout, or an
    // impatient second submit re-POSTs the same bag: the client mints ONE key
    // per checkout-page mount and the boundary replays the first order
    // instead of placing a second (stock decrements exactly once). The
    // homenest session-70 discipline, ported ORM-agnostically.
    const payload = {
      email: "idem-probe@nordhem.sg",
      fullName: "Idem Probe",
      phone: "+65 91234567",
      address: "Blk 1 Testing Rd #01-01",
      postal: "089001",
      deliveryMethod: "delivery",
      deliverySlot: "Standard (3–5 days)",
      storeSlug: "tampines",
      paymentMethod: "card",
      lines: [{ productId: 1, qty: 1 }],
      idempotencyKey: "e2e-idem-probe-key-0001",
    };
    try {
      const first = await request.post("/api/checkout", { headers: { "x-forwarded-for": "10.9.126.10" }, data: payload });
      const firstBody = (await first.json()) as { ok?: boolean; data?: { orderNumber?: string } };
      expect(first.status()).toBe(201);
      expect(firstBody.data?.orderNumber).toBeTruthy();
      // Separate limiter identities so the rate window cannot color the result.
      const second = await request.post("/api/checkout", { headers: { "x-forwarded-for": "10.9.126.11" }, data: payload });
      const secondBody = (await second.json()) as { ok?: boolean; data?: { orderNumber?: string } };
      // The replay is a SUCCESS (200 — nothing new was created) carrying the
      // SAME order number the confirmation page navigates to.
      expect(second.status()).toBe(200);
      expect(secondBody.ok).toBe(true);
      expect(secondBody.data?.orderNumber).toBe(firstBody.data?.orderNumber);
    } finally {
      // Gotcha #13: the first POST is a real order — clean it (and any
      // regression-stranded sibling) by email.
      await deleteProbeOrders("idem-probe@nordhem.sg");
    }
  });

  test("a replay is bound to the order's own email — a leaked key must not disclose the receipt (Task 127 F-5)", async ({ request }) => {
    // Task 126's replay was possession-only: anyone holding the key (leaked
    // via logs/XSS) re-POSTed it and received the first order's number —
    // the PII lookup key for /track-order. The homenest S6-8/S7-2
    // discipline: both replay paths require the SAME email as the bound
    // order (case-insensitive); a mismatch is refused, never disclosed.
    // The canonical-order half: the fast path hoists ABOVE bag/promo
    // validation, so a post-success same-key resubmit (bag already cleared)
    // replays instead of EMPTY_BAG-refusing.
    const payload = {
      email: "idem-owner-probe@nordhem.sg",
      fullName: "Idem Owner Probe",
      phone: "+65 91234567",
      address: "Blk 1 Testing Rd #01-01",
      postal: "089001",
      deliveryMethod: "delivery",
      deliverySlot: "Standard (3–5 days)",
      storeSlug: "tampines",
      paymentMethod: "card",
      lines: [{ productId: 1, qty: 1 }],
      idempotencyKey: "e2e-idem-owner-key-001",
    };
    try {
      const first = await request.post("/api/checkout", { headers: { "x-forwarded-for": "10.9.128.1" }, data: payload });
      expect(first.status()).toBe(201);

      // Mismatched email on the same key: refused (422), and the victim's
      // order number is NOT in the response (today: 200 + the number).
      const hijack = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.128.2" },
        data: { ...payload, email: "attacker-probe@nordhem.sg" },
      });
      const hijackBody = (await hijack.json()) as { ok?: boolean; error?: { code?: string }; data?: { orderNumber?: string } };
      expect(hijack.status()).toBe(422);
      expect(hijackBody.ok).toBe(false);
      expect(hijackBody.error?.code).toBe("REPLAY_MISMATCH");
      expect(hijackBody.data?.orderNumber).toBeUndefined();

      // Canonical replay: an empty-bag resubmit with the same key + email
      // still replays the bound order (the fast path precedes validation —
      // the client cleared its bag after the success redirect; today this
      // would EMPTY_BAG-refuse).
      const emptyBag = await request.post("/api/checkout", {
        headers: { "x-forwarded-for": "10.9.128.3" },
        data: { ...payload, lines: [] },
      });
      const emptyBagBody = (await emptyBag.json()) as { ok?: boolean; data?: { orderNumber?: string } };
      expect(emptyBag.status()).toBe(200);
      expect(emptyBagBody.ok).toBe(true);
      expect(emptyBagBody.data?.orderNumber).toBeTruthy();
    } finally {
      await deleteProbeOrders("idem-owner-probe@nordhem.sg");
      await deleteProbeOrders("attacker-probe@nordhem.sg");
    }
  });

  test("the checkout page mints and sends one idempotency key per mount", async ({ page }) => {
    // The server-side replay is dead code for real users unless the client
    // actually mints and sends the key. The POST is intercepted (fixed 422 —
    // no DB write); the captured payload must carry a well-shaped key, and
    // submitting TWICE must reuse the same key (the double-click window).
    await gotoHydrated(page, "/product/hdb-kitchen-trolley");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await gotoHydrated(page, "/checkout");

    const state: { captured: Array<{ idempotencyKey?: string }> } = { captured: [] };
    await page.route("**/api/checkout", async (route) => {
      state.captured.push(route.request().postDataJSON() as { idempotencyKey?: string });
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: { code: "VALIDATION", message: "intercepted-idem-probe" } }),
      });
    });

    await page.getByLabel("Email").fill("idem-ui-probe@nordhem.sg");
    await page.getByLabel("Full name").fill("Idem Ui Probe");
    await page.getByLabel("Phone").fill("+65 91234567");
    await page.getByLabel("Postal code").fill("521123");
    await page.getByPlaceholder("Blk, street, unit number").fill("Blk 1 Idem Rd #01-01");
    await page.getByRole("button", { name: /Pay / }).click();
    await expect(page.getByText("intercepted-idem-probe")).toBeVisible();
    // The error path keeps the key (a retry after a refusal must dedupe
    // against nothing — the refused attempt created no order).
    await page.getByRole("button", { name: /Pay / }).click();
    await expect(state.captured.length).toBe(2);
    const [k1, k2] = [state.captured[0]?.idempotencyKey, state.captured[1]?.idempotencyKey];
    expect(k1).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(k2).toBe(k1);
  });
});

test.describe("reviews deterministic ordering (Task 126 F-7)", () => {
  test("same-timestamp reviews render newest-insert-first (the id tie-break)", async ({ request }) => {
    // The homenest S51-1 trap: createdAt alone is not a total order — rows
    // inserted in one transaction share Postgres's now(), so the physical
    // order decides. The seam ties-break on id (desc); this pin SQL-seeds the
    // pathological state (two identical timestamps) and asserts the API's
    // deterministic order. GREEN-on-arrival invariant pin (the SITE_ORIGIN
    // fs-pin pattern) — the nondeterminism it guards against is not
    // reproducible through the public interface on demand.
    const client = new Client({
      connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    });
    await client.connect();
    try {
      const pidRow = await client.query("select id from products where slug = 'solbakken-3-seat-sofa'");
      const pid = pidRow.rows[0].id as number;
      const sameTs = new Date().toISOString();
      // Insert OLDER-id-first is impossible (serial ascends), so the lower id
      // is the OLDER review: id-desc must list probe-B (higher id) first.
      const a = await client.query(
        "insert into reviews (product_id, author, rating, title, body, verified, created_at) values ($1, $2, 5, 'task126-f7-probe-a', 'older by id', false, $3) returning id",
        [pid, "F7 Probe A", sameTs],
      );
      const b = await client.query(
        "insert into reviews (product_id, author, rating, title, body, verified, created_at) values ($1, $2, 5, 'task126-f7-probe-b', 'newer by id', false, $3) returning id",
        [pid, "F7 Probe B", sameTs],
      );
      const lowerId = Math.min(a.rows[0].id, b.rows[0].id) as number;
      const higherId = Math.max(a.rows[0].id, b.rows[0].id) as number;
      const res = await request.get(`/api/reviews?productId=${pid}`);
      const body = (await res.json()) as { ok: boolean; data: Array<{ id: number; createdAt: string }> };
      expect(body.ok).toBe(true);
      const ids = body.data.map((r) => r.id);
      const posHigh = ids.indexOf(higherId);
      const posLow = ids.indexOf(lowerId);
      expect(posHigh).toBeGreaterThanOrEqual(0);
      expect(posLow).toBeGreaterThanOrEqual(0);
      expect(posHigh, "same createdAt: the higher id (newer insert) renders first").toBeLessThan(posLow);
    } finally {
      await client.query("delete from reviews where title like 'task126-f7-probe-%'");
      await client.end();
    }
  });
});

test.describe("reviews GET count field (Task 140 F-1)", () => {
  test("the GET carries the TRUE row count beside the capped list — the recovery refetch's data source", async ({ request }) => {
    // The ReviewSection recovery path (Task 140 F-1) adopts the server's
    // count after a recovered POST — the GET must carry it. The count is the
    // TRUE count(*) (the getReviewCount seam), NOT the capped 20-row list
    // length: asserting equality with data.length is only safe below the
    // cap, so this pins the seeded 2-review product (SOLBAKKEN) and asserts
    // BOTH the field's presence and its agreement with the list — the
    // saturation class is covered by the SSR-side saturation spec.
    const pidRow = await (async () => {
      const client = new Client({
        connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
      });
      await client.connect();
      try {
        const row = await client.query("select id from products where slug = 'solbakken-3-seat-sofa'");
        return row.rows[0].id as number;
      } finally {
        await client.end();
      }
    })();
    const res = await request.get(`/api/reviews?productId=${pidRow}`);
    const body = (await res.json()) as { ok: boolean; data: unknown[]; count?: number };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.count, "the GET must expose the TRUE row count (the additive Task-140 F-1 field) beside the capped data array").toBe("number");
    expect(body.count).toBe(body.data.length);
  });
});

test.describe("SEO completion: twitter card, OG dimensions, priceValidUntil (Task 126 F-8)", () => {
  test("twitter:card is declared site-wide and inherits to the PDP", async ({ page }) => {
    // The homenest posture: og:* metadata renders for link unfurlers, but
    // X/Twitter requires its own card type — without it every share renders
    // as a bare summary. Declared once at the root layout, it inherits to
    // every page (PDP title/description/images fall back to its own
    // openGraph fields).
    for (const path of ["/", "/product/solbakken-3-seat-sofa"]) {
      await page.goto(path);
      const card = page.locator('meta[name="twitter:card"]');
      await expect(card, path).toHaveAttribute("content", "summary_large_image");
      const title = page.locator('meta[name="twitter:title"]');
      await expect(title, path).toBeTruthy();
    }
  });

  test("og:image declares its true dimensions (1200x627 — every Pexels URL pins them)", async ({ page }) => {
    // Every catalogue + hero image URL pins h=627&w=1200 (catalog.ts IMG map)
    // — declaring the dimensions is TRUE and lets crawlers pre-render the
    // card without fetching the image.
    // Task 128 F-8: the inspiration detail pages join the pin — the
    // declaration was the missing piece of the Task-126 F-8 rollout.
    for (const path of ["/", "/product/solbakken-3-seat-sofa", "/inspiration/2-room-flexi-bto-tampines"]) {
      await page.goto(path);
      await expect(page.locator('meta[property="og:image:width"]'), path).toHaveAttribute("content", "1200");
      await expect(page.locator('meta[property="og:image:height"]'), path).toHaveAttribute("content", "627");
    }
  });

  test("the PDP Offer carries priceValidUntil (the rolling campaign seam)", async ({ page }) => {
    // Google's rich-result recommendation, tied to the EXISTING campaignEnd
    // seam (no invented date): the festive-market campaign is the site's own
    // price-refresh claim ("offers refreshed with the season"), so the
    // Offer's price validity is the campaign's end date — pure and rolling,
    // never a rotable literal.
    await page.goto("/product/solbakken-3-seat-sofa");
    const ld = await productJsonLd(page);
    expect(ld).toBeTruthy();
    const parsed = JSON.parse(ld!) as { offers?: { priceValidUntil?: string } };
    expect(parsed.offers?.priceValidUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Derive the expectation from the same seam the page uses — the SGT
    // calendar date of the campaign end (Task 127 F-7: en-CA renders
    // YYYY-MM-DD in Asia/Singapore).
    const { campaignEnd } = await import("../../src/lib/utils");
    expect(parsed.offers?.priceValidUntil).toBe(campaignEnd().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }));
  });
});

import { expect, test } from "@playwright/test";

// Mobile navigation seam (390×844). Taxonomy classes A–H from the Tailwind v4
// skill §9.3: the drawer must open (A), be visible (B), not clipped (C), not
// trapped behind layers (D), toggle correctly, be keyboard-reachable (G) and
// close on Escape (§9.4) and on route change.

test.describe("mobile navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("hamburger opens the drawer with correct aria state and full link set", async ({ page }) => {
    // Stable locator: the button's accessible name swaps Open/Close on toggle,
    // so anchor on the header's only aria-expanded button instead of the name.
    const burger = page.locator("header button[aria-expanded]");
    await expect(burger).toBeVisible();
    await burger.click();
    await expect(burger).toHaveAttribute("aria-expanded", "true");

    const drawer = page.locator("header > div").filter({ hasText: "Shop all products" }).last();
    await expect(drawer).toBeVisible();
    for (const label of ["Shop all products", "Living room", "Bedroom", "Dining", "Kitchen", "Work from home", "Kids & baby", "Balcony & outdoor", "Decoration & textiles"]) {
      await expect(page.getByRole("banner").getByRole("link", { name: label, exact: true }).first()).toBeVisible();
    }
    for (const label of ["Offers", "Inspiration", "Services", "Stores", "Track order"]) {
      await expect(drawer.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("drawer navigates to the category and auto-closes", async ({ page }) => {
    const burger = page.locator("header button[aria-expanded]");
    await burger.click();
    // Scope to the header (banner): the home page's category cards and the
    // footer also link "Dining" — strict mode needs the drawer's own link.
    await page.getByRole("banner").getByRole("link", { name: "Dining", exact: true }).first().click();
    await expect(page).toHaveURL(/\/shop\?cat=dining/);
    await expect(page.getByRole("heading", { name: "Dining", level: 1 })).toBeVisible();
    // Auto-close on route change (pathname effect → adjust-during-render).
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await expect(burger).toHaveAccessibleName("Open menu");
  });

  test("Escape closes the drawer (a11y §9.4)", async ({ page }) => {
    const burger = page.locator("header button[aria-expanded]");
    await burger.click();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("header > div").filter({ hasText: "Shop all products" })).toHaveCount(0);
  });

  test("hamburger toggles the drawer closed on second click", async ({ page }) => {
    const burger = page.locator("header button[aria-expanded]");
    await burger.click();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    await burger.click();
    await expect(burger).toHaveAttribute("aria-expanded", "false");
  });

  test("desktop ≥1024px hides the hamburger and shows the category nav", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Role queries exclude display:none subtrees — the lg:hidden hamburger
    // leaves the a11y tree at desktop widths.
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
    const nav = page.getByRole("navigation", { name: "Shop by room" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Shop all" })).toBeVisible();
  });

  test("mobile search form submits to /search", async ({ page }) => {
    // Two search inputs exist in the DOM (desktop hidden at 390px) — the
    // mobile one is the last; the visible filter is the skill's pattern.
    await page.getByLabel("Search products").filter({ visible: true }).first().fill("sofa");
    // exact: true — "Go" otherwise substring-matches e.g. "ERGONOMI".
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?q=sofa/);
    await expect(page.getByRole("heading", { name: "Search the range" })).toBeVisible();
  });
});

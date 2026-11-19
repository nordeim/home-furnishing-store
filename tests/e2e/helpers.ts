import type { Page } from "@playwright/test";

/**
 * Task 125 G-5: the hydration gate. Playwright's actionability checks do NOT
 * cover React hydration — a click that lands before the client bundle wires
 * events silently no-ops (or falls back to a native form GET). CartProvider
 * stamps html[data-hydrated="true"] on mount; every interaction-first spec
 * navigates through this helper so the race is closed by construction.
 */
export async function gotoHydrated(page: Page, url: string, timeout = 20_000): Promise<void> {
  await page.goto(url);
  await page.waitForSelector('html[data-hydrated="true"]', { timeout });
}

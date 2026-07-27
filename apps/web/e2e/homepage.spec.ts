import { expect, test } from "@playwright/test";

/**
 * Covers the signed-out shell only — the one path that needs no Supabase/
 * GitHub OAuth secrets to render for real. Signed-in widget-data flows
 * need actual credentials this CI environment doesn't have (see
 * playwright.config.ts's DUMMY_ENV comment) and aren't covered here.
 */

test("loads without console errors or a failed page load", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  expect(errors).toEqual([]);
});

test("shows the Pulse logo and a sign-in prompt when signed out", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("img", { name: "Pulse" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
  await expect(page.getByText("Sign in to see your dashboard.")).toBeVisible();
});

/**
 * The Hardening pass's Stage 5 fix was found by measuring real widths,
 * not assuming a layout holds — this is that same check, automated, so a
 * future change can't silently reintroduce horizontal overflow.
 */
for (const { name, width, height } of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1194 },
  { name: "mobile", width: 375, height: 812 },
]) {
  test(`no horizontal overflow at ${name} width`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

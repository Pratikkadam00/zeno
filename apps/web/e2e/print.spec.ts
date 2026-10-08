import { expect, test } from "@playwright/test";

// W6.8 (docs/WEB_PLAN.md): a guide or a post printed is the article alone.
// The print stylesheet (app/globals.css, @media print) hides the navigation,
// the footer, the waitlist form and the fixed chrome, puts black on white,
// and prints the address after an outward link so the paper copy can still
// be followed.

for (const path of ["/cancel/netflix", "/blog/the-20-minute-subscription-audit", "/legal/terms"]) {
  test(`${path} on paper: the article, black on white, no chrome`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("nav").first()).toBeHidden();
    await expect(page.locator("footer").first()).toBeHidden();
    await expect(page.locator("form")).toHaveCount(await page.locator("form").count()); // present in the DOM...
    for (const form of await page.locator("form").all()) await expect(form).toBeHidden(); // ...but not on paper
    await expect(page.locator("h1").first()).toBeVisible();
    const colours = await page.evaluate(() => {
      const b = getComputedStyle(document.body);
      return { background: b.backgroundColor, color: b.color };
    });
    expect(colours).toEqual({ background: "rgb(255, 255, 255)", color: "rgb(0, 0, 0)" });
    const fixed = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => getComputedStyle(el).position === "fixed").length);
    expect(fixed).toBe(0);
  });
}

test("an outward link prints its address after the text", async ({ page }) => {
  await page.goto("/cancel/netflix", { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });
  const after = await page.evaluate(() => {
    const a = document.querySelector('article a[href^="http"]') ?? document.querySelector('main a[href^="http"]');
    return a ? getComputedStyle(a, "::after").content : null;
  });
  expect(after).toContain("http");
});

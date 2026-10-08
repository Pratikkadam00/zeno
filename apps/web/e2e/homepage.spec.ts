import { expect, test, type Page } from "@playwright/test";

// The homepage's behaviours in a real browser: the page-turning book on a wide
// screen with a mouse, the scrolling document everywhere else, no JavaScript,
// reduced motion, and the theme.

const pagerLabel = (page: Page) => page.locator("nav[aria-label='Ledger pages'] span").last();

test.describe("book mode (wide screen, fine pointer, motion allowed)", () => {
  test.skip(({ isMobile }) => isMobile, "book mode is desktop-only by design");

  test("turns on after load: one labelled region, the pager, the cover first", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Ledger pages" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Zeno — the audit, as a leafable ledger" })).toBeVisible();
    await expect(pagerLabel(page)).toHaveText("COVER");
    await expect(page.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  test("the pager and the keys turn pages, and the address follows", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(pagerLabel(page)).toHaveText("THE CATALOGUE");
    await expect(page).toHaveURL(/#case$/);
    await page.keyboard.press("End");
    await expect(pagerLabel(page)).toHaveText("WAITLIST");
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
    await page.keyboard.press("Home");
    await expect(pagerLabel(page)).toHaveText("COVER");
    await page.keyboard.press("ArrowRight");
    await expect(pagerLabel(page)).toHaveText("THE CATALOGUE");
    await page.keyboard.press("ArrowLeft");
    await expect(pagerLabel(page)).toHaveText("COVER");
  });

  test("a page's own address opens the book at that page", async ({ page }) => {
    await page.goto("/#pricing");
    await expect(pagerLabel(page)).toHaveText("PRICING");
  });

  test("dragging the right edge of the page turns it", async ({ page }) => {
    await page.goto("/");
    await expect(pagerLabel(page)).toHaveText("COVER");
    const sheet = page.locator("#sheet-cover");
    const box = (await sheet.boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width - 20, y);
    await page.mouse.down();
    for (let x = box.x + box.width - 20; x > box.x + box.width * 0.3; x -= 40) await page.mouse.move(x, y);
    await page.mouse.up();
    await expect(pagerLabel(page)).toHaveText("THE CATALOGUE");
  });

  test("the nav's section links turn the book to that section", async ({ page }) => {
    await page.goto("/");
    await expect(pagerLabel(page)).toHaveText("COVER");
    await page.getByRole("navigation").first().getByRole("link", { name: "Pricing" }).click();
    await expect(pagerLabel(page)).toHaveText("PRICING");
    await page.getByRole("navigation").first().getByRole("link", { name: "FAQ" }).click();
    await expect(pagerLabel(page)).toHaveText("QUESTIONS");
  });
});

test.describe("document mode", () => {
  test("on a phone: one scrolling page, no pager; the menu's Pricing link brings the pricing into view", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone layout");
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Ledger pages" })).toHaveCount(0);
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.locator("#mobile-nav").getByRole("link", { name: "Pricing" }).click();
    await expect(page.locator("#pricing")).toBeInViewport();
    await expect(page.locator("#mobile-nav")).toBeHidden();
  });

  test("reduced motion on a wide screen: the document, not the book, and no running tally", async ({ page, isMobile }) => {
    test.skip(isMobile, "the wide-screen case");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("#main")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Ledger pages" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Running sample bill/ })).toHaveCount(0);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("F169: every section is there and fully visible, nothing stuck at its animation start", async ({ page }) => {
    await page.goto("/");
    for (const id of ["ledger", "case", "how", "refusal", "pricing", "faq", "waitlist"]) await expect(page.locator(`#${id}`)).toBeVisible();
    // Sections below the fold are laid out only near the viewport
    // (content-visibility: auto, P4.2c), and skipped again once scrolled past,
    // so the no-JS rule arrives as a short fade as each section comes into
    // view. Check each section's settled state while it is on screen.
    const hidden: string[] = [];
    for (const id of ["ledger", "case", "how", "refusal", "pricing", "faq", "waitlist"]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      hidden.push(
        ...(await page.evaluate(
          (sel) =>
            [...document.querySelectorAll(`${sel} .zn-reveal`)]
              .filter((el) => getComputedStyle(el).opacity !== "1" || getComputedStyle(el).transform !== "none")
              .map((el) => `${sel}: ${el.outerHTML.slice(0, 60)}`),
          `#${id}`
        ))
      );
    }
    expect(hidden).toEqual([]);
    await expect(page.getByText("Four plans, stated plainly.")).toBeVisible();
    await expect(page.locator("#waitlist").getByRole("button", { name: /Join the waitlist/ })).toBeVisible();
  });
});

test.describe("the theme", () => {
  test("paper by default; the toggle switches to dark, and it is still dark after a reload, from the first paint", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    await page.reload({ waitUntil: "commit" });
    // Read as soon as the document exists: the inline script runs before paint.
    await page.waitForFunction(() => document.body !== null);
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  });
});

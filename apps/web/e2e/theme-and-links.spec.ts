import { expect, test } from "@playwright/test";

// W7.9 (docs/WEB_PLAN.md): the theme toggle, and every link that opens a new
// tab.
//
// The toggle is checked for what it actually has to do: flip the theme, say
// which way it will go next (its label is the ACTION, not the state), survive a
// reload, and leave exactly one thing in storage — the cookie policy promises a
// single `zeno-theme` item and nothing else.
//
// The new-tab rule is a security one, not a style one. A page opened with
// target="_blank" gets a handle on the opener through window.opener and can
// navigate the tab it came from somewhere else (reverse tabnabbing). rel
// "noopener" severs that. Modern browsers imply it, but the site also renders
// as static HTML read by older ones, and the rule costs nothing, so it is
// checked on the rendered pages rather than trusted to the source: links come
// from the service catalogue and the blog data too, not only from JSX.

const PAGES = [
  "/",
  "/subscription-tracker",
  "/compare/ynab-alternative",
  "/cancel",
  "/cancel/netflix",
  "/blog",
  "/blog/the-20-minute-subscription-audit",
  "/features/family-vault",
  "/about",
  "/press",
  "/roadmap",
  "/legal/terms",
  "/legal/privacy",
  "/legal/cookies"
];

test.describe("W7.9 · every link that opens a new tab", () => {
  for (const path of PAGES) {
    test(`${path}: a new tab is always opened with rel="noopener"`, async ({ page }) => {
      test.setTimeout(60_000); // four browser projects share the machine
      await page.goto(path, { waitUntil: "load" });
      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')]
          .filter((a) => !a.rel.split(/\s+/).includes("noopener"))
          .map((a) => `${a.getAttribute("href") ?? "(no href)"} rel="${a.rel}"`)
      );
      expect(offenders, `${path}: new-tab links without rel="noopener"`).toEqual([]);
    });
  }

  test("a link to another site that stays in this tab needs no rel (the rule is about new tabs)", async ({ page }) => {
    await page.goto("/cancel/netflix", { waitUntil: "load" });
    const counts = await page.evaluate(() => {
      const links = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")];
      const external = links.filter((a) => a.hostname && a.hostname !== location.hostname);
      return { external: external.length, newTab: external.filter((a) => a.target === "_blank").length };
    });
    // The guide's "Cancel on <service>" button is the external new-tab link
    // this page exists for; if it ever stops being one, the test above would
    // pass vacuously, so say out loud that there is something to check.
    expect(counts.newTab, "the cancel guide should still open the service in a new tab").toBeGreaterThan(0);
  });
});

test.describe("W7.9 · the theme toggle", () => {
  // The theme is a class on <html> (lib/theme.ts applies it inline before the
  // first paint, so neither theme flashes); paper is the default and carries
  // no class at all.
  const themeOf = (page: import("@playwright/test").Page) =>
    page.evaluate(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));

  test("flips the page, and its label says where the next press goes", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const toggle = page.getByRole("button", { name: /Switch to (light|dark) theme/ });
    await expect(toggle).toBeVisible();

    const before = await themeOf(page);
    const labelBefore = await toggle.getAttribute("aria-label");
    // The label is the action, so it names the theme we are NOT in.
    expect(labelBefore).toBe(before === "dark" ? "Switch to light theme" : "Switch to dark theme");

    await toggle.click();
    const after = await themeOf(page);
    expect(after, "the theme did not change").not.toBe(before);
    expect(await toggle.getAttribute("aria-label")).toBe(after === "dark" ? "Switch to light theme" : "Switch to dark theme");
  });

  test("the choice survives a reload, and is the only thing kept", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const toggle = page.getByRole("button", { name: /Switch to (light|dark) theme/ });
    await toggle.click();
    const chosen = await themeOf(page);

    await page.reload({ waitUntil: "load" });
    expect(await themeOf(page), "the theme was forgotten on reload").toBe(chosen);

    // The cookie policy says: no cookies, one localStorage item.
    const stored = await page.evaluate(() => ({
      keys: Object.keys(localStorage),
      theme: localStorage.getItem("zeno-theme"),
      cookies: document.cookie
    }));
    expect(stored.keys, "something other than the theme was stored").toEqual(["zeno-theme"]);
    expect(stored.theme).toBe(chosen);
    expect(stored.cookies, "the site set a cookie").toBe("");
  });

  test("it carries the theme to another page, not just this one", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: /Switch to (light|dark) theme/ }).click();
    const chosen = await themeOf(page);
    await page.goto("/legal/privacy", { waitUntil: "load" });
    expect(await themeOf(page)).toBe(chosen);
  });
});

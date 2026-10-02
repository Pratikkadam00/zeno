import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomInt } from "node:crypto";

// The waitlist end to end (the form, and the API behind it on the real
// server), the cancel hub's search, and a guide.

// Each test names its own client address: the server trusts one proxy hop
// (playwright.config.ts), so the last X-Forwarded-For entry is the client and
// tests don't share one rate-limit bucket.
// Random, not a counter: parallel workers each load this file, so a counter
// would hand two tests the same address (and the same bucket).
const ip = (_testId: string) => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
const signUp = (request: APIRequestContext, email: unknown, client: string, raw?: string) =>
  request.post("/api/waitlist", {
    headers: { "content-type": "application/json", "x-forwarded-for": client },
    // Raw bytes: given a string, Playwright would JSON-encode a malformed body
    // into a valid JSON string, and the server would never see broken JSON.
    data: Buffer.from(raw ?? JSON.stringify({ email }))
  });

test.describe("the waitlist", () => {
  test("the form: an address in, the receipt line out", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("#ledger form");
    await form.getByRole("textbox", { name: "Email address" }).fill(`e2e-${Date.now()}@example.com`);
    await form.getByRole("button", { name: /Join the waitlist/ }).click();
    await expect(page.locator("#ledger").getByRole("status").filter({ hasText: "ON THE LIST" })).toBeVisible();
  });

  test("the form refuses a non-address without sending anything", async ({ page }) => {
    const posts: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith("/api/waitlist")) posts.push(r.method());
    });
    await page.goto("/");
    const form = page.locator("#ledger form");
    await form.getByRole("textbox", { name: "Email address" }).fill("not-an-address");
    await form.getByRole("button", { name: /Join the waitlist/ }).click();
    await expect(form.getByRole("alert")).toHaveText("Please enter a valid email.");
    expect(posts).toEqual([]);
  });

  test("the API: 200 for an address, 422 for a bad one, 400 for a body that isn't JSON, 413 for an oversized one", async ({ request }, info) => {
    const client = ip(info.testId);
    expect((await signUp(request, `ok-${Date.now()}@example.com`, client)).status()).toBe(200);
    expect((await signUp(request, "nope", ip(info.testId))).status()).toBe(422);
    expect((await signUp(request, ["a@b.co"], ip(info.testId))).status()).toBe(422);
    expect((await signUp(request, undefined, ip(info.testId), "{not json")).status()).toBe(400);
    expect((await signUp(request, "x".repeat(3000) + "@example.com", ip(info.testId))).status()).toBe(413);
  });

  test("a repeat sign-up gets exactly the same answer, so the form can't be used to test whether an address is on the list", async ({ request }, info) => {
    const email = `repeat-${Date.now()}@example.com`;
    const first = await signUp(request, email, ip(info.testId));
    const again = await signUp(request, email, ip(info.testId));
    expect([first.status(), again.status()]).toEqual([200, 200]);
    expect(await again.json()).toEqual(await first.json());
  });

  test("one client: five sign-ups a minute, the sixth is told to wait (429)", async ({ request }, info) => {
    const client = ip(info.testId);
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await signUp(request, `burst-${i}-${Date.now()}@example.com`, client)).status());
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    // Another client is unaffected.
    expect((await signUp(request, `other-${Date.now()}@example.com`, ip(info.testId))).status()).toBe(200);
  });
});

test.describe("the cancel hub and a guide", () => {
  test("search narrows the list; nothing matching says so", async ({ page }) => {
    await page.goto("/cancel");
    const all = await page.locator("main ul a").count();
    expect(all).toBe(509);
    const box = page.getByRole("searchbox", { name: "Search cancellation guides" });
    await box.fill("netfl");
    await expect(page.locator("main ul a")).toHaveText(["Netflix"]);
    await box.fill("zzzzqx");
    await expect(page.getByText(/No services match "zzzzqx"/)).toBeVisible();
  });

  test("from the hub to a guide: its steps, its cancellation link opening safely, and back", async ({ page }) => {
    await page.goto("/cancel");
    await page.getByRole("searchbox").fill("netflix");
    await page.locator("main ul").getByRole("link", { name: "Netflix" }).click();
    await expect(page).toHaveURL(/\/cancel\/netflix$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("How to cancel Netflix");
    await expect(page.locator("main ol li").first()).toHaveText("Go to netflix.com and sign in");
    const out = page.getByRole("link", { name: "Open Netflix cancellation page →" });
    await expect(out).toHaveAttribute("target", "_blank");
    await expect(out).toHaveAttribute("rel", "noopener noreferrer");
    await page.getByRole("link", { name: "← All cancellation guides" }).click();
    await expect(page).toHaveURL(/\/cancel$/);
  });

  test("F168 in a browser: the footer's Pricing link on a guide reaches the homepage's pricing", async ({ page, isMobile }) => {
    await page.goto("/cancel/netflix");
    await page.getByRole("contentinfo").getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL(/\/#pricing$/);
    if (isMobile) await expect(page.locator("#pricing")).toBeInViewport();
    else await expect(page.locator("nav[aria-label='Ledger pages'] span").last()).toHaveText("THE BILL");
  });
});

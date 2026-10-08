// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FAQS } from "@/components/site/faq-data";
import { listPages, parse, renderPage } from "@/test-support/pages";

// W2.7 and W2.8 (docs/WEB_PLAN.md): the legal pages agree with the price
// list, the code and the data-safety draft, and no longer call themselves
// drafts. Each check names the source it pins the page to, so a change on
// either side fails here first.

vi.mock("../fonts", () => ({ fontClassNames: "fonts" }));

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const source = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

const text: Record<string, string> = {};

beforeAll(async () => {
  for (const p of listPages().filter((p) => p.route.startsWith("/legal/"))) {
    const doc = parse((await renderPage(p)).html);
    for (const s of doc.querySelectorAll("script, style")) s.remove();
    text[p.route] = (doc.body.textContent ?? "").replace(/\s+/g, " ");
  }
}, 60_000);

describe("the legal pages are not drafts", () => {
  it.each(["/legal/terms", "/legal/privacy", "/legal/cookies"])("%s: no 'draft', 'to be confirmed', 'finalised at launch', 'pre-launch notice'", (url) => {
    expect(text[url]).not.toMatch(/\b(draft|to be confirmed|finali[sz]ed? (at|before) launch|supersede this draft|pre-launch notice)\b/i);
  });

  it("each carries a 'Last updated' date in 2026 or later", () => {
    for (const url of Object.keys(text)) expect(text[url], url).toMatch(/Last updated: [A-Z][a-z]+ \d{1,2}, 20(2[6-9]|[3-9]\d)/);
  });
});

describe("the terms agree with the price list", () => {
  const sections = source("apps/web/components/site/sections.tsx");

  it("names the four plans the pricing section sells, and no other", () => {
    const sold = [...sections.matchAll(/^\s+name: "([A-Za-z]+)",$/gm)].map((m) => m[1]);
    expect(sold).toEqual(["Free", "Pro", "Lifetime", "Family"]);
    for (const plan of sold) expect(text["/legal/terms"]).toContain(`${plan}:`);
    expect(text["/legal/terms"]).not.toMatch(/\bBusiness\b.*:/);
  });

  it("quotes the prices the pricing section and the FAQ quote", () => {
    const faq = FAQS.find((f) => f.q === "What will it cost?")!.a;
    for (const price of ["$3.99", "$29.99", "$79.99", "$6.99"]) {
      expect(faq, price).toContain(price);
      expect(text["/legal/terms"], price).toContain(price);
    }
    expect(sections).toContain('billed: "Billed $29.99/yr · or $3.99 monthly"');
    expect(sections).toContain("price: { to: 79.99");
    expect(sections).toContain("price: { to: 6.99");
  });

  it("says what Pro adds, exactly as the pricing section does", () => {
    expect(sections).toContain('features: ["Unlimited subscriptions", "Category budgets", "Envelope budgeting", "Everything in Free, included"]');
    expect(text["/legal/terms"]).toContain("unlimited subscriptions, category budgets and envelope budgeting");
  });

  it("the household size is the server's limit", () => {
    expect(source("apps/api/src/family.ts")).toContain("const MAX_MEMBERS_PER_HOUSEHOLD = 5;");
    expect(text["/legal/terms"]).toContain("up to five people");
    expect(text["/legal/privacy"]).not.toMatch(/up to (four|six|ten) people/);
  });
});

describe("the privacy policy agrees with the code", () => {
  it("token lifetimes are the API's constants", () => {
    const auth = source("apps/api/src/routes/auth.ts");
    expect(auth).toContain("const accessTokenTtlSeconds = 15 * 60;");
    expect(auth).toContain("const refreshTokenTtlSeconds = 30 * 24 * 60 * 60;");
    expect(auth).toContain("const magicLinkTtlSeconds = 10 * 60;");
    const privacy = text["/legal/privacy"];
    expect(privacy).toContain("access token lasts 15 minutes");
    expect(privacy).toContain("refresh token 30 days");
    expect(privacy).toContain("expire after 10 minutes");
  });

  it("names every provider the code is configured to send to, and no other", () => {
    const privacy = text["/legal/privacy"];
    const expected: [string, string, RegExp][] = [
      ["Render", "render.yaml", /services:/],
      // Netlify has no file in the repository (the site is deployed from Netlify's UI); the measured record is the data document.
      ["Netlify", "docs/DATA_AND_LOGGING.md", /Netlify/],
      ["Resend", "apps/api/src/routes/auth.ts", /api\.resend\.com|new Resend/],
      ["RevenueCat", "apps/mobile/src/billing/revenueCat.ts", /react-native-purchases/],
      ["Groq", "apps/api/src/coach.ts", /COACH_PROVIDER=groq/],
      ["Anthropic", "apps/api/src/coach.ts", /COACH_PROVIDER=anthropic/],
      ["Sentry", "apps/mobile/src/monitoring/report.ts", /sentry/i],
      ["Google Apps Script", "apps/web/app/api/waitlist/route.ts", /WAITLIST_WEBHOOK_URL/]
    ];
    for (const [name, file, marker] of expected) {
      expect(source(file), `${name} is configured in ${file}`).toMatch(marker);
      expect(privacy, name).toContain(name);
    }
    // Providers the policy must not claim: none configured for these.
    for (const absent of ["Mixpanel", "Amplitude", "Firebase", "Segment", "Plausible", "Google Analytics", "Stripe"]) expect(privacy).not.toContain(absent);
  });

  it("the coach stores nothing: the API has no persistence in the coach module", () => {
    const coach = source("apps/api/src/coach.ts");
    expect(coach).not.toMatch(/insert|writeFile|saveConversation|persist/i);
    expect(text["/legal/privacy"]).toContain("We do not store the request or the answer");
  });

  it("'Export my data' and account deletion exist in the app's settings, as the rights section says", () => {
    const settings = source("apps/mobile/app/settings.tsx");
    expect(settings).toContain('label: "Export my data"');
    expect(settings).toContain("deleteAccountOnServer");
    expect(text["/legal/privacy"]).toContain("Export my data");
    expect(text["/legal/privacy"]).toContain("delete your account in the app");
  });

  it("the data it lists is the data-safety draft's list, written from the release build", () => {
    const draft = source("docs/STORE_DATA_SAFETY.md");
    for (const item of ["Email address", "Apple or Google identity token", "Account id", "display name", "Purchases", "Four product events", "Crash and error reports"]) {
      expect(draft, item).toContain(item);
    }
    const privacy = text["/legal/privacy"];
    for (const words of ["email address", "identity token Apple or Google gives us", "account id", "display name", "which plan you bought", "Four product events", "Crash reports"]) {
      expect(privacy, words).toContain(words);
    }
  });
});

describe("the cookie policy agrees with the site", () => {
  it("still says no cookies and names the theme key, with no analytics", () => {
    const cookies = text["/legal/cookies"];
    expect(cookies).toContain("no cookies");
    expect(cookies).toContain("zeno-theme");
    expect(cookies).toMatch(/not run analytics/);
  });
});

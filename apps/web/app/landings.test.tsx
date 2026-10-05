// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FAQS } from "@/components/site/faq-data";
import { LandingPage } from "@/components/site/LandingPage";
import { LANDINGS, findLanding, landingText, type Landing } from "@/lib/landings";
import { APP_OFFERS } from "@/lib/structured-data";
import { jsonLd, parse } from "@/test-support/pages";
import { POSTS, postText } from "./blog/posts";
import sitemap from "./sitemap";

// The four landing pages (SEO.md §6.1) and the owner's copy rules: real length,
// nothing copied from another page, no banned claim, no machine-sounding filler,
// prices that match the bill, and FAQ schema that is the visible FAQ word for word.

vi.mock("@/components/site/WaitlistForm", () => ({ WaitlistForm: () => null }));

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const render = (l: Landing) => parse(renderToStaticMarkup(<LandingPage landing={l} />));
const paragraphs = (l: Landing) => [l.lead, ...l.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.list ?? []), ...(s.after ?? [])]), ...l.faqs.map((f) => f.a)];

describe("the landing pages", () => {
  it("are the four the playbook names, each in the sitemap at 0.9", () => {
    expect(LANDINGS.map((l) => l.path)).toEqual(["/subscription-tracker", "/cancel-subscriptions", "/free-trial-reminders", "/budgeting"]);
    const entries = sitemap();
    for (const l of LANDINGS) expect(entries.find((e) => e.url.endsWith(l.path))?.priority, l.path).toBe(0.9);
  });

  it.each(LANDINGS.map((l) => [l.path, l] as const))("%s: 700 to 1,000 words a visitor reads", (_path, l) => {
    const count = words(landingText(l));
    expect(count).toBeGreaterThanOrEqual(700);
    expect(count).toBeLessThanOrEqual(1000);
  });

  it("no paragraph is shared with another landing page, the homepage FAQ or a blog post", () => {
    const elsewhere = (l: Landing) => [
      ...LANDINGS.filter((other) => other !== l).flatMap(paragraphs),
      ...FAQS.map((f) => f.a),
      ...POSTS.map(postText)
    ].join("\n");
    for (const l of LANDINGS) {
      const others = elsewhere(l);
      for (const p of paragraphs(l)) expect(others.includes(p), `${l.path}: "${p.slice(0, 60)}"`).toBe(false);
    }
  });

  it("follows the copy rules: no exclamation marks, no em dashes, no stock phrases, no banned claims", () => {
    for (const l of LANDINGS) {
      const text = [landingText(l), l.description, l.metaTitle].join(" ");
      expect(text, l.path).not.toMatch(/!|—/);
      expect(text, l.path).not.toMatch(/whether you'?re|seamless|game.?changing|effortless|revolutioni[sz]e|unlock|supercharge|elevate|in today's|look no further|best-in-class/i);
      // Truthfulness rails (the owner's list): never these claims.
      expect(text, l.path).not.toMatch(/100% on-device|never see your data|automatic(ally)? (find|discover|detect)|no plaid|most popular|#1|best subscription/i);
    }
  });

  it("every price in a sentence about a plan is a real one from the homepage bill (YNAB's $109 as the site states it)", () => {
    // The budgeting example uses illustrative amounts; plan prices must be exact.
    const real = new Set<string>([...APP_OFFERS.map((o) => o.price), "109"]);
    let checked = 0;
    for (const l of LANDINGS) {
      for (const sentence of landingText(l).split(/(?<=\.) /).filter((x) => /Pro|Lifetime|Family|YNAB|plan is|a month or/.test(x))) {
        for (const m of sentence.matchAll(/\$([0-9]+(?:\.[0-9]{2})?)/g)) {
          checked += 1;
          expect(real.has(m[1]!), `${l.path}: $${m[1]} in "${sentence}"`).toBe(true);
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it.each(LANDINGS.map((l) => [l.path, l] as const))("%s: FAQ schema is the visible FAQ, word for word; one h1; links only to real pages", (_path, l) => {
    const doc = render(l);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    const visible = [...doc.querySelectorAll("section h3")].map((h) => [h.textContent, h.nextElementSibling?.textContent]);
    const faq = jsonLd(doc).find((b) => b["@type"] === "FAQPage") as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(visible);
    expect(visible).toHaveLength(l.faqs.length);
    const listed = new Set(sitemap().map((e) => new URL(e.url).pathname));
    for (const a of doc.querySelectorAll("a[href^='/']")) {
      const href = a.getAttribute("href")!.split("#")[0]!;
      expect(listed.has(href) || href === "/", `${l.path} links ${href}`).toBe(true);
    }
    expect(l.related).toHaveLength(3);
  });

  it("finds a page by its path, and refuses one that doesn't exist", () => {
    expect(findLanding("/budgeting").eyebrow).toBe("Budgeting");
    expect(() => findLanding("/nope")).toThrow("No landing page for /nope");
  });
});

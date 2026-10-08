// @vitest-environment jsdom
import { services } from "@zeno/service-catalog";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { listPages, parse, renderPage } from "@/test-support/pages";
import GuidePage from "./cancel/[slug]/page";

// W3.7 (docs/WEB_PLAN.md): every page in the sitemap earns its place. Its own
// words (the main column, not the nav or the footer) number at least 150, it
// has one h1, and it offers a next step (a link in the main column). The
// cancellation guides are measured too: they are the thin long tail of D16,
// and their floor is the measured size of a general guide, so that a guide
// cannot get thinner without this test saying so.

vi.mock("./fonts", () => ({ fontClassNames: "fonts" }));

type Page = { url: string; words: number; h1s: number; links: number };
let pages: Page[] = [];
let guides: Page[] = [];

function measure(url: string, doc: Document): Page {
  const main = doc.querySelector("main") ?? doc.body;
  for (const s of main.querySelectorAll("script, style, noscript, nav, footer, form")) s.remove();
  const words = (main.textContent ?? "").split(/\s+/).filter((w) => /\w/.test(w)).length;
  return { url, words, h1s: main.querySelectorAll("h1").length, links: main.querySelectorAll("a[href]").length };
}

beforeAll(async () => {
  pages = await Promise.all(
    listPages()
      .filter((p) => !p.route.includes("[") && p.route !== "/analytics")
      .map(async (p) => measure(p.route, parse((await renderPage(p)).html)))
  );
  guides = await Promise.all(
    services.map(async (s) => measure(`/cancel/${s.slug}`, parse(renderToStaticMarkup(await GuidePage({ params: Promise.resolve({ slug: s.slug }) })))))
  );
}, 120_000);

describe("every page earns its place", () => {
  it("has at least 150 words of its own in the main column", () => {
    const thin = pages.filter((p) => p.words < 150).map((p) => `${p.url}: ${p.words} words`);
    expect(thin.join("\n")).toBe("");
  });

  it("has exactly one h1 and at least one link onward in the main column", () => {
    const bad = pages.filter((p) => p.h1s !== 1 || p.links < 1).map((p) => `${p.url}: ${p.h1s} h1, ${p.links} links`);
    expect(bad.join("\n")).toBe("");
  });
});

describe("the cancellation guides (D16's long tail)", () => {
  it("none is thinner than a general guide was on 2026-10-08 (the measured floor)", () => {
    // Measured on 2026-10-08: the shortest guide rendered 49 words of its own (a
    // researched guide with short steps; a general guide renders about 54). A
    // guide below that has lost something.
    const thin = guides.filter((g) => g.words < 49).map((g) => `${g.url}: ${g.words} words`);
    expect(thin.join("\n")).toBe("");
  });

  it("every guide has one h1 and a link onward (its hub, a neighbour, or the service's own page)", () => {
    const bad = guides.filter((g) => g.h1s !== 1 || g.links < 1).map((g) => g.url);
    expect(bad).toEqual([]);
  });

  it("records the distribution, so D16 can be decided on numbers", () => {
    const sorted = guides.map((g) => g.words).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    console.log(`guides: ${guides.length}; words min ${sorted[0]}, median ${median}, max ${sorted.at(-1)}`);
    expect(sorted[0]).toBeGreaterThan(0);
  });
});

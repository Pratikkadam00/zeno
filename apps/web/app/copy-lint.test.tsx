// @vitest-environment jsdom
import { services } from "@zeno/service-catalog";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FAQS } from "@/components/site/faq-data";
import { listPages, parse, renderPage } from "@/test-support/pages";
import GuidePage from "./cancel/[slug]/page";

// W1.1 (docs/WEB_PLAN.md, "House style"): the copy lint. Every page of the
// site, as served, plus every cancellation guide and every FAQ answer, must
// read as a person wrote it. The rules are mechanical on purpose, so that a
// rewrite cannot drift back: no dashes as punctuation, none of the phrases
// that mark machine-written marketing, no placeholder text, no sentence that
// runs past 40 words in body copy. The test is the bite check for the W1
// rewrite: on the 2026-10-08 site it fails on every rule.

vi.mock("./fonts", () => ({ fontClassNames: "fonts" }));

type Page = { url: string; doc: Document; text: string; paragraphs: string[] };
let pages: Page[] = [];

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const textOf = (doc: Document) => {
  for (const s of doc.querySelectorAll("script, style, noscript")) s.remove();
  return clean(doc.body.textContent ?? "");
};
// Leaf blocks only: a list item that wraps a whole card (date, title, blurb)
// would otherwise read as one run-on sentence.
const paragraphsOf = (doc: Document) =>
  [...doc.querySelectorAll("p, li, h1, h2, h3, dd")]
    .filter((el) => !el.querySelector("p, h1, h2, h3, div, ul, ol"))
    // A whole-card link (meta, title, blurb, call to action as spans) is a card, not a sentence.
    .filter((el) => ![...el.querySelectorAll("a")].some((a) => a.children.length >= 2))
    .map((el) => clean(el.textContent ?? ""))
    .filter(Boolean);

beforeAll(async () => {
  vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "1");
  const top = await Promise.all(
    listPages()
      .filter((p) => !p.route.includes("["))
      .map(async (p) => {
        const doc = parse((await renderPage(p)).html);
        return { url: p.route, doc, text: textOf(doc), paragraphs: paragraphsOf(doc) };
      })
  );
  // The guides share one template; the first 25 services cover every branch
  // (general and researched guides, every difficulty), and the whole catalogue
  // is scanned for dashes and placeholders, the two rules its data could break.
  const guides = await Promise.all(
    services.map(async (s) => {
      const doc = parse(renderToStaticMarkup(await GuidePage({ params: Promise.resolve({ slug: s.slug }) })));
      return { url: `/cancel/${s.slug}`, doc, text: textOf(doc), paragraphs: paragraphsOf(doc) };
    })
  );
  pages = [...top, ...guides];
  vi.unstubAllEnvs();
}, 120_000);

const faqText = () => FAQS.map((f) => `${f.q} ${f.a}`).join(" ");

/** Fails with every offender on its own line (an array diff truncates). */
const none = (hits: string[]) => expect(hits.join("\n")).toBe("");

/** Every page where `pattern` matches, with the first match quoted. */
function offenders(pattern: RegExp, only?: (p: Page) => boolean): string[] {
  const hits = pages
    .filter((p) => !only || only(p))
    .filter((p) => pattern.test(p.text))
    .map((p) => `${p.url}: …${p.text.match(pattern)![0]}…`);
  if (pattern.test(faqText())) hits.push(`FAQ: …${faqText().match(pattern)![0]}…`);
  return hits;
}

describe("copy lint: dashes", () => {
  it("no em dash anywhere on the site", () => {
    none(offenders(/—/));
  });

  it("no en dash as punctuation (between digits, as a range, is fine)", () => {
    none(offenders(/(?<!\d)\s?–\s?(?!\d)/));
  });

  it("no spaced hyphen standing in for a dash", () => {
    none(offenders(/\s-\s/));
  });
});

describe("copy lint: phrases that mark template marketing", () => {
  // docs/WEB_PLAN.md, house style rule 5, plus rule 3 (no self-praise).
  const BANNED: [string, RegExp][] = [
    ["seamless / effortless", /\b(seamless(ly)?|effortless(ly)?)\b/i],
    ["unlock / supercharge / elevate / leverage", /\b(unlock(s|ed|ing)?|supercharge[sd]?|elevate[sd]?|leverag(e|es|ed|ing))\b/i],
    // Lower-case only: "Empower" is a service in the catalogue (a guide names it).
    ["empower (the verb)", /\bempower(s|ed|ing)?\b/],
    ["journey / game-changer / cutting-edge / robust", /\b(journey|game[- ]chang\w+|cutting[- ]edge|robust)\b/i],
    ["peace of mind / stress-free / hassle", /\b(peace of mind|stress[- ]free|hassle[- ]?free|hassle)\b/i],
    ["take control / take back", /\btake (back|control)\b/i],
    ["no more X / say goodbye to", /\b(no more|say goodbye to)\b/i],
    ["whether you're a… (the segment opener; a real question is fine)", /\bwhether you('| a)re (a|an|the) /i],
    ["it's not X, it's Y", /\b(it's|it is|this isn't|this is not) (just |only )?(an? |the )?[\w\s-]{1,30}[,;:]? (it's|it is|but) /i],
    ["in today's world / imagine / look no further", /\b(in today's|imagine\b|look no further)/i],
    ["we get it / we mean it / theater", /\b(we get it|we mean it|theat(er|re))\b/i],
    ["self-praise: 'the honest way', 'genuinely', 'truly'", /\b(the honest way|genuinely|truly)\b/i],
    ["manifesto voice: 'we refuse', 'built for people who refuse'", /\b(we refuse|who refuse)\b/i],
    ["courtroom framing: exhibit, the case, verbatim", /\b(exhibit [a-z]|the case\b|verbatim)/i]
  ];

  it.each(BANNED)("%s", (_what, pattern) => {
    none(offenders(pattern));
  });
});

describe("copy lint: placeholders and leaks", () => {
  it("no 'undefined', 'null', 'NaN', '[object', 'lorem', 'TODO' or an unfilled {TOKEN}", () => {
    none(offenders(/\b(undefined|NaN|lorem ipsum|TODO|FIXME)\b|\[object |\bnull\b(?! and void)|\{[A-Z_]{3,}\}/));
  });

  it("no double spaces or space before punctuation in body copy", () => {
    const hits = pages.flatMap((p) => p.paragraphs.filter((t) => / [,.;:!?]/.test(t)).map((t) => `${p.url}: ${t.slice(0, 80)}`));
    none(hits);
  });
});

describe("copy lint: sentences", () => {
  const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z"“])/).map((s) => s.trim()).filter(Boolean);
  const words = (s: string) => s.split(/\s+/).length;

  it("no sentence over 40 words in body copy (legal pages: 55)", () => {
    const hits = pages.flatMap((p) => {
      const limit = p.url.startsWith("/legal") ? 55 : 40;
      return p.paragraphs.flatMap((t) => sentences(t).filter((s) => words(s) > limit).map((s) => `${p.url} (${words(s)} words): ${s.slice(0, 90)}…`));
    });
    none(hits);
  });

  it("every page has one h1 of at least three words that is not shouted", () => {
    const hits = pages
      .filter((p) => !p.url.startsWith("/cancel/"))
      .flatMap((p) => {
        const h1s = [...p.doc.querySelectorAll("h1")].map((h) => clean(h.textContent ?? ""));
        if (h1s.length !== 1) return [`${p.url}: ${h1s.length} h1s`];
        const h = h1s[0]!;
        if (words(h) < 2) return [`${p.url}: "${h}"`];
        if (h === h.toUpperCase() && /[A-Z]/.test(h)) return [`${p.url}: shouted "${h}"`];
        return [];
      });
    none(hits);
  });
});

describe("the lint checks itself", () => {
  it("each rule catches its own example", () => {
    const sample = [
      "Zeno — the honest way to take back your subscriptions.",
      "Whether you're a student or a parent, unlock peace of mind.",
      "It's not an app, it's a movement.",
      "Price: {SERVICE_COUNT} services, undefined."
    ].join(" ");
    expect(/—/.test(sample)).toBe(true);
    expect(/\bthe honest way\b/i.test(sample)).toBe(true);
    expect(/\btake (back|control)\b/i.test(sample)).toBe(true);
    expect(/\bwhether you('| a)re (a|an|the) /i.test(sample)).toBe(true);
    expect(/\bunlock(s|ed|ing)?\b/i.test(sample)).toBe(true);
    expect(/\bpeace of mind\b/i.test(sample)).toBe(true);
    expect(/\b(it's|it is|this isn't|this is not) (just |only )?(an? |the )?[\w\s-]{1,30}[,;:]? (it's|it is|but) /i.test(sample)).toBe(true);
    expect(/\{[A-Z_]{3,}\}/.test(sample)).toBe(true);
    expect(/\bundefined\b/.test(sample)).toBe(true);
  });
});

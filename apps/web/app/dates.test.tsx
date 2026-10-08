// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { listPages, parse, renderPage } from "@/test-support/pages";
import { POSTS } from "./blog/posts";

// W3.8 (docs/WEB_PLAN.md): no date on the site older than 90 days, unless it
// is a publication date (a post's date, a policy's "Last updated"). F224: the
// home page showed July renewals in October and cited a July catalogue. A
// date that is typed in rather than computed has to be re-read within 90
// days, and this test is what makes that happen: it starts failing on day 91.

vi.mock("./fonts", () => ({ fontClassNames: "fonts" }));

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH = MONTHS.join("|");
// "October 4, 2026" · "4 October 2026" · "2026-10-04" · "October 2026"
const DATE = new RegExp(`\\b(?:(${MONTH}) (\\d{1,2}), (\\d{4})|(\\d{1,2}) (${MONTH}) (\\d{4})|(\\d{4})-(\\d{2})-(\\d{2})|(${MONTH}) (\\d{4}))\\b`, "g");
const DAY = 86_400_000;

type Found = { url: string; text: string; when: Date; context: string };
let found: Found[] = [];

function datesIn(url: string, text: string): Found[] {
  const out: Found[] = [];
  for (const m of text.matchAll(DATE)) {
    let when: Date;
    if (m[1]) when = new Date(Date.UTC(+m[3]!, MONTHS.indexOf(m[1]), +m[2]!));
    else if (m[5]) when = new Date(Date.UTC(+m[6]!, MONTHS.indexOf(m[5]), +m[4]!));
    else if (m[7]) when = new Date(Date.UTC(+m[7]!, +m[8]! - 1, +m[9]!));
    else when = new Date(Date.UTC(+m[11]!, MONTHS.indexOf(m[10]!), 1));
    out.push({ url, text: m[0], when, context: text.slice(Math.max(0, m.index! - 40), m.index! + m[0].length + 20) });
  }
  return out;
}

beforeAll(async () => {
  vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "1");
  const pages = await Promise.all(
    listPages()
      .filter((p) => !p.route.includes("["))
      .map(async (p) => {
        const doc = parse((await renderPage(p)).html);
        for (const s of doc.querySelectorAll("script, style, noscript")) s.remove();
        return { url: p.route, text: (doc.body.textContent ?? "").replace(/\s+/g, " ") };
      })
  );
  found = pages.flatMap((p) => datesIn(p.url, p.text));
  vi.unstubAllEnvs();
}, 60_000);

const isPublication = (d: Found) =>
  POSTS.some((post) => post.date === d.when.toISOString().slice(0, 10)) || /Last updated:\s*$/.test(d.context.slice(0, d.context.indexOf(d.text)));

describe("dates on the site", () => {
  it("finds the dates it is meant to find (the pattern checks itself)", () => {
    const sample = datesIn("/x", "Read on October 4, 2026, then 8 October 2026, then 2026-10-08, then July 2026.");
    expect(sample.map((d) => d.when.toISOString().slice(0, 10))).toEqual(["2026-10-04", "2026-10-08", "2026-10-08", "2026-07-01"]);
  });

  it("every typed date is within 90 days, unless it is a publication date", () => {
    const now = Date.now();
    const stale = found
      .filter((d) => !isPublication(d))
      .filter((d) => now - d.when.getTime() > 90 * DAY)
      .map((d) => `${d.url}: "${d.text}" in "…${d.context}…" (${Math.round((now - d.when.getTime()) / DAY)} days old)`);
    expect(stale.join("\n")).toBe("");
  });

  it("no typed date is in the future (a date is a record, not a promise)", () => {
    const future = found.filter((d) => d.when.getTime() > Date.now() + DAY).map((d) => `${d.url}: ${d.text}`);
    expect(future.join("\n")).toBe("");
  });

  it("the site carries only a handful of typed dates (the rest are computed)", () => {
    // Each one is a maintenance duty; the count is kept small on purpose.
    const typed = found.filter((d) => !isPublication(d));
    expect(typed.length, typed.map((d) => `${d.url}: ${d.text}`).join("\n")).toBeLessThanOrEqual(6);
  });
});

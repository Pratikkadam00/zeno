// @vitest-environment jsdom
import { serviceRecords } from "@zeno/service-catalog";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SITE_URL, siteUrl } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import { FAQS } from "@/components/site/faq-data";
import { setRect } from "@/test-support/browser";
import { jsonLd, parse } from "@/test-support/pages";
import RootLayout, { metadata as rootMetadata } from "./layout";
import HomePage from "./page";
import AnalyticsPage from "./analytics/page";
import Dashboard from "./analytics/Dashboard";
import { getRangeData } from "./analytics/analytics-data";

vi.mock("./fonts", () => ({ fontClassNames: "font-a font-b" }));

describe("the root layout", () => {
  const html = renderToStaticMarkup(
    <RootLayout>
      <p>child</p>
    </RootLayout>
  );
  const doc = new DOMParser().parseFromString(html, "text/html");

  it("English document with the font classes; the theme script runs first, before anything paints", () => {
    expect(doc.documentElement.getAttribute("lang")).toBe("en");
    expect(doc.documentElement.className).toBe("font-a font-b");
    const first = doc.body.firstElementChild!;
    expect(first.tagName).toBe("SCRIPT");
    expect(first.textContent).toBe(THEME_SCRIPT);
  });

  it("'Skip to content' is the first link and targets #main", () => {
    const skip = doc.body.querySelector("a")!;
    expect(skip.textContent).toBe("Skip to content");
    expect(skip.getAttribute("href")).toBe("#main");
  });

  it("Organization and WebSite structured data, on the site's own origin", () => {
    // One graph with stable ids (SEO.md §4.1); the logo is the square app icon.
    const [graph] = jsonLd(doc) as Array<{ "@graph": Array<Record<string, unknown>> }>;
    expect(graph!["@graph"].map((b) => b["@type"])).toEqual(["Organization", "WebSite"]);
    expect(graph!["@graph"][0]).toMatchObject({ "@id": `${SITE_URL}/#org`, name: "Zeno", url: SITE_URL, logo: siteUrl("/apple-icon.png") });
    expect(graph!["@graph"][1]).toMatchObject({ "@id": `${SITE_URL}/#website`, name: "Zeno", url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` } });
    expect(doc.body.textContent).toContain("child");
  });

  it("metadata: the site origin as base, the homepage canonical, a 1200×630 social image", () => {
    expect(String(rootMetadata.metadataBase)).toBe(`${SITE_URL}/`);
    expect(rootMetadata.alternates?.canonical).toBe("/");
    expect(rootMetadata.title).toEqual({ absolute: "Subscription tracker: know what you pay | Zeno" });
    expect(rootMetadata.openGraph).toMatchObject({ url: siteUrl("/"), siteName: "Zeno", images: [{ url: "/og/home.png", width: 1200, height: 630, alt: "Subscription tracker: know what you pay | Zeno" }] });
    expect(rootMetadata.twitter).toMatchObject({ card: "summary_large_image", title: "Subscription tracker: know what you pay | Zeno" });
  });
});

describe("the homepage", () => {
  const home = () => parse(renderToStaticMarkup(<HomePage />));

  it("FAQPage structured data: every visible question and answer, with HTML entities decoded to plain text", () => {
    const faq = jsonLd(home()).find((b) => b["@type"] === "FAQPage")!;
    const items = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(items.map((i) => i.name)).toEqual(FAQS.map((f) => f.q.replace(/&rsquo;/g, "’")));
    for (const item of items) expect(item.acceptedAnswer.text).not.toMatch(/&[a-z]+;/);
    expect(items[1]!.acceptedAnswer.text).toContain("It never asks for bank credentials");
  });

  it("The Case's figures come from the catalog itself", () => {
    const doc = home();
    const hard = serviceRecords.filter((s) => s.cancellationDifficulty === "hard" || s.cancellationDifficulty === "dark_pattern").length;
    const vals = [...doc.querySelectorAll("#case .money")].map((e) => e.textContent);
    expect(vals).toEqual(expect.arrayContaining([String(serviceRecords.length), String(hard)]));
    const example = serviceRecords.find((s) => s.cancellationDifficulty === "dark_pattern" && s.cancellationGuideSteps.length > 0)!;
    expect(doc.querySelector("#case blockquote")!.textContent).toBe(`“${example.cancellationGuideSteps[0]}”`);
  });

  it("the sections in reading order; the back-office teaser only with the analytics flag", () => {
    const ids = (doc: Document) => [...doc.querySelectorAll("main > div > section, main > div > header")].map((s) => s.id);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "");
    expect(ids(home())).toEqual(["ledger", "case", "how", "refusal", "pricing", "faq", "waitlist"]);
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "1");
    const withFlag = home();
    expect(withFlag.querySelector("a[href='/analytics']")).not.toBeNull();
    expect(ids(withFlag)).toHaveLength(8);
  });
});

describe("the analytics page", () => {
  it("is a 404 in production unless SHOW_PUBLIC_ANALYTICS=1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "");
    expect(() => AnalyticsPage()).toThrow(expect.objectContaining({ digest: expect.stringContaining("404") }));
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "1");
    expect(AnalyticsPage()).toBeTruthy();
  });

  it("the range tabs switch the figures; one is selected at a time", () => {
    render(<Dashboard />);
    const tabs = within(screen.getByRole("tablist", { name: "Time range" })).getAllByRole("tab");
    expect(tabs.filter((t) => t.getAttribute("aria-selected") === "true").map((t) => t.textContent)).toEqual(["30D"]);
    const before = screen.getByRole("main").textContent;
    const other = tabs.find((t) => t.textContent !== "30D")!;
    fireEvent.click(other);
    expect(other.getAttribute("aria-selected")).toBe("true");
    expect(tabs.filter((t) => t.getAttribute("aria-selected") === "true")).toHaveLength(1);
    expect(screen.getByRole("main").textContent).not.toBe(before);
    // Labelled sample data at the top (where "Live" used to be) and at the foot.
    expect(screen.getAllByText(/^Sample data/)).toHaveLength(2);
  });

  it("hovering a chart shows the point under the pointer, leaving hides it (the pointer is clamped to the chart)", () => {
    const { container } = render(<Dashboard />);
    const wrap = container.querySelector(".chartWrap") as HTMLElement;
    setRect(wrap, { left: 0, width: 1000 });
    // The first chart is revenue over the default 30-day range.
    const points = getRangeData("30D").revenue;
    fireEvent.mouseMove(wrap, { clientX: 5000 });
    const tip = wrap.querySelector(".tooltip") as HTMLElement;
    expect(tip.style.left).toBe("100%");
    expect(tip.querySelector(".tooltipLabel")!.textContent).toBe(points.at(-1)!.label);
    fireEvent.mouseMove(wrap, { clientX: -50 });
    expect((wrap.querySelector(".tooltip") as HTMLElement).style.left).toBe("0%");
    expect(wrap.querySelector(".tooltipLabel")!.textContent).toBe(points[0]!.label);
    fireEvent.mouseLeave(wrap);
    expect(wrap.querySelector(".tooltip")).toBeNull();
  });
});

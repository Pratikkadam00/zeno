// @vitest-environment jsdom
import { findServiceBySlug, services } from "@zeno/service-catalog";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site";
import { jsonLd, parse } from "@/test-support/pages";
import CancelHubPage from "./page";
import GuidePage, { generateMetadata, generateStaticParams } from "./[slug]/page";
import { CancelHubBrowser } from "./CancelHubBrowser";

const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

type Guide = { slug: string; doc: Document; meta: Awaited<ReturnType<typeof generateMetadata>> };
let guides: Guide[] = [];
beforeAll(async () => {
  guides = await Promise.all(
    services.map(async (s) => ({ slug: s.slug, doc: parse(renderToStaticMarkup(await GuidePage(props(s.slug)))), meta: await generateMetadata(props(s.slug)) }))
  );
}, 60_000);

describe("the cancel guides: one per catalog service", () => {
  it("are built for every service, each slug once", () => {
    const slugs = generateStaticParams().map((p) => p.slug);
    expect(slugs).toEqual(services.map((s) => s.slug));
    expect(new Set(slugs).size).toBe(services.length);
    expect(guides).toHaveLength(services.length);
  });

  it("each: its own title, description and canonical, as an article with a social card", () => {
    for (const { slug, meta } of guides) {
      const name = findServiceBySlug(slug)!.name;
      expect(meta.title).toBe(`How to cancel ${name} — Zeno`);
      expect(meta.alternates?.canonical).toBe(`/cancel/${slug}`);
      expect(meta.openGraph).toMatchObject({ title: meta.title, url: `/cancel/${slug}`, type: "article" });
      expect(String(meta.description)).toContain(name);
    }
  });

  it("each prints the catalog's steps, in order, and states their difficulty", () => {
    for (const { slug, doc } of guides) {
      const service = findServiceBySlug(slug)!;
      const steps = [...doc.querySelectorAll("main ol li")].map((li) => li.textContent);
      expect([slug, steps]).toEqual([slug, service.cancellationGuideSteps]);
      expect(doc.querySelector("main")!.textContent).toContain(`Difficulty: ${service.cancellationDifficulty.replace("_", " ")}`);
    }
  });

  it("no guide repeats a step (steps are list keys; a repeat would also be a catalog error)", () => {
    for (const { slug } of services) {
      const steps = findServiceBySlug(slug)!.cancellationGuideSteps;
      expect([slug, new Set(steps).size]).toEqual([slug, steps.length]);
    }
  });

  it("each carries HowTo structured data matching its steps, and a Home > guides > service breadcrumb", () => {
    for (const { slug, doc } of guides) {
      const service = findServiceBySlug(slug)!;
      const blocks = jsonLd(doc);
      const howTo = blocks.find((b) => b["@type"] === "HowTo")!;
      expect(howTo.name).toBe(`How to cancel ${service.name}`);
      expect(howTo.step).toEqual(service.cancellationGuideSteps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })));
      const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList")!.itemListElement as { name: string; item: string }[];
      expect(crumbs.map((c) => [c.name, c.item])).toEqual([
        ["Home", siteUrl("/")],
        ["Cancellation guides", siteUrl("/cancel")],
        [service.name, siteUrl(`/cancel/${slug}`)]
      ]);
    }
  });

  it("a cancellation link, when the catalog has one, is https and opens safely in a new tab", () => {
    let withLink = 0;
    for (const { slug, doc } of guides) {
      const service = findServiceBySlug(slug)!;
      const link = [...doc.querySelectorAll("a")].find((a) => a.textContent === `Open ${service.name} cancellation page →`);
      if (!service.cancellationUrl) {
        expect([slug, link]).toEqual([slug, undefined]);
        continue;
      }
      withLink += 1;
      expect([slug, link?.getAttribute("href")]).toEqual([slug, service.cancellationUrl]);
      expect(link!.getAttribute("href")).toMatch(/^https:\/\//);
      expect(link!.getAttribute("rel")).toBe("noopener noreferrer");
    }
    expect(withLink).toBeGreaterThan(0);
  });

  it("related guides: up to six others from the same catalog category, never itself", () => {
    for (const { slug, doc } of guides) {
      const own = services.find((s) => s.slug === slug)!;
      const heading = [...doc.querySelectorAll("h2")].find((h) => h.textContent === "Related cancellation guides");
      const related = heading ? [...heading.nextElementSibling!.querySelectorAll("a")].map((a) => a.getAttribute("href")!.replace("/cancel/", "")) : [];
      const expected = services.filter((s) => s.category === own.category && s.slug !== slug).slice(0, 6).map((s) => s.slug);
      expect([slug, related]).toEqual([slug, expected]);
    }
  });

  it("an unknown slug is a 404, with a 'not found' title rather than a made-up guide", async () => {
    await expect(GuidePage(props("no-such-service"))).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    const meta = await generateMetadata(props("no-such-service"));
    expect(meta.title).toBe("Cancellation guide not found — Zeno");
    expect(meta.alternates).toBeUndefined();
  });
});

describe("the cancel hub", () => {
  it("server HTML lists every guide, grouped by category, largest group first, with counts (search narrows, never gates)", () => {
    const doc = parse(renderToStaticMarkup(<CancelHubPage />));
    const links = [...doc.querySelectorAll("main ul a")].map((a) => a.getAttribute("href"));
    expect([...links].sort()).toEqual(services.map((s) => `/cancel/${s.slug}`).sort());
    const counts = [...doc.querySelectorAll("main h2")].map((h) => Number(/\((\d+)\)$/.exec(h.textContent!)![1]));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(services.length);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(doc.querySelector("h1")!.textContent).toBe(`How to cancel ${services.length}+ subscriptions`);
  });

  const hub = [
    { name: "Netflix", slug: "netflix", category: "streaming" },
    { name: "Hulu", slug: "hulu", category: "streaming" },
    { name: "Notion", slug: "notion", category: "productivity" },
    { name: "Odd", slug: "odd", category: "uncharted" }
  ];

  it("search narrows by name (any case, trimmed); categories show their label, an unmapped one its code", () => {
    render(<CancelHubBrowser services={hub} />);
    const box = screen.getByRole("searchbox", { name: "Search cancellation guides" });
    expect(box.getAttribute("placeholder")).toBe("Search 4+ services…");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Streaming & Entertainment (2)", "Productivity (1)", "uncharted (1)"]);
    fireEvent.change(box, { target: { value: "  NOT " } });
    const only = screen.getByRole("heading", { level: 2 });
    expect(only.textContent).toBe("Productivity (1)");
    expect(within(only.parentElement!).getByRole("link", { name: "Notion" }).getAttribute("href")).toBe("/cancel/notion");
  });

  it("nothing matches: says so, quoting the search", () => {
    render(<CancelHubBrowser services={hub} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText(/No services match "zzz"/)).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });
});

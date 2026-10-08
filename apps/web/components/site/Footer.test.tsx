// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Footer } from "./Footer";

const column = (heading: string) =>
  within(screen.getByRole("heading", { name: heading }).parentElement!)
    .getAllByRole("link")
    .map((a) => [a.textContent, a.getAttribute("href")]);

describe("Footer", () => {
  it("lists every route the site owns, by column", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "");
    render(<Footer />);
    expect(column("Product")).toEqual([
      ["How it works", "/#how"],
      ["Subscription tracker", "/subscription-tracker"],
      ["Cancel subscriptions", "/cancel-subscriptions"],
      ["Free trial reminders", "/free-trial-reminders"],
      ["Budgeting", "/budgeting"],
      ["Pricing", "/#pricing"],
      ["Cancellation guides", "/cancel"],
      ["FAQ", "/#faq"],
      ["Join the waitlist", "/#waitlist"]
    ]);
    expect(column("Compare")).toEqual([
      ["Rocket Money alternative", "/compare/rocket-money-alternative"],
      ["YNAB alternative", "/compare/ynab-alternative"],
      ["Monarch alternative", "/compare/monarch-alternative"],
      ["No bank login", "/compare/no-bank-login"],
      ["Budgeting without bank sync", "/compare/budget-app-no-bank-sync"]
    ]);
    expect(column("Features")).toEqual([
      ["Family Vault", "/features/family-vault"],
      ["Spend Twin", "/features/spend-twin"],
      ["Roadmap", "/roadmap"]
    ]);
    expect(column("Company")).toEqual([
      ["About", "/about"],
      ["Blog", "/blog"],
      ["Press kit", "/press"],
      ["Privacy policy", "/legal/privacy"],
      ["Terms of service", "/legal/terms"],
      ["Cookie policy", "/legal/cookies"]
    ]);
    vi.unstubAllEnvs();
  });

  it("F168: homepage sections are linked as /#section, so they work from every page, not only the homepage", () => {
    render(<Footer />);
    const hashLinks = [...document.querySelectorAll("footer a")].map((a) => a.getAttribute("href")!).filter((h) => h.includes("#"));
    expect(hashLinks.length).toBeGreaterThan(0);
    for (const href of hashLinks) expect(href).toMatch(/^\/#[a-z-]+$/);
  });

  it.each([
    ["on the dev server", { NODE_ENV: "development", SHOW_PUBLIC_ANALYTICS: "" }],
    ["when SHOW_PUBLIC_ANALYTICS=1", { NODE_ENV: "production", SHOW_PUBLIC_ANALYTICS: "1" }]
  ])("adds the sample analytics page %s, labelled as sample data", (_when, env) => {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    render(<Footer />);
    expect(column("Product")).toContainEqual(["Analytics (sample data)", "/analytics"]);
    vi.unstubAllEnvs();
  });

  it("states the no-bank-login line and this year's copyright (UTC)", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo").textContent).toContain("No bank login required.");
    expect(screen.getByText(`© ${new Date().getUTCFullYear()} Zeno. All rights reserved.`)).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setMedia } from "@/test-support/browser";
import { MotionProvider } from "./MotionProvider";
import { AnalyticsTeaser, FAQ, FinalCTA, Method, Pricing, Refusal, TheCase } from "./sections";

const withMotion = (node: React.ReactNode) => render(<MotionProvider>{node}</MotionProvider>);

describe("TheCase", () => {
  it("prints the catalog's own figures and quotes step 1 of a documented dark-pattern guide, citing the service", () => {
    withMotion(<TheCase stats={{ total: 509, hardCount: 61, quote: { service: "Adobe CC", step: "Open Plans" } }} />);
    const section = document.getElementById("case")!;
    expect(within(section).getByText("509")).toBeTruthy();
    expect(within(section).getByText("61")).toBeTruthy();
    expect(section.querySelector("blockquote")!.textContent).toBe("“Open Plans”");
    expect(within(section).getByText("STEP 1 OF CANCELLING ADOBE CC — VERBATIM FROM OUR GUIDE")).toBeTruthy();
  });

  it("no documented example: a description of the patterns, cited to the catalog, never an invented quote", () => {
    withMotion(<TheCase stats={{ total: 1, hardCount: 0, quote: null }} />);
    expect(document.querySelector("blockquote")!.textContent).toBe("Retention offers, hidden links, chat-only cancellation.");
    expect(screen.getByText("PATTERNS DOCUMENTED ACROSS THE CATALOG")).toBeTruthy();
  });
});

describe("Method", () => {
  it("three numbered steps: discover, warn, cancel and verify", () => {
    withMotion(<Method />);
    const section = document.getElementById("how")!;
    expect(within(section).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Discover — on your command",
      "Warn — before it charges",
      "Cancel — and verify"
    ]);
    expect([...section.querySelectorAll("span")].map((s) => s.textContent).filter((t) => /^\d\d$/.test(t!))).toEqual(["01", "02", "03"]);
  });
});

describe("Refusal", () => {
  it("the privacy lines, and a link to the no-bank-login comparison", () => {
    withMotion(<Refusal />);
    const section = document.getElementById("refusal")!;
    expect(within(section).getByRole("link", { name: /See the no-bank-login comparison/ }).getAttribute("href")).toBe("/compare/no-bank-login");
    for (const label of ["Bank login", "Your credentials", "Background scanning", "Data brokers", "Your data"]) {
      expect(within(section).getByText(label)).toBeTruthy();
    }
  });
});

describe("AnalyticsTeaser", () => {
  it("says sample data on the panel and links the sample dashboard", () => {
    withMotion(<AnalyticsTeaser />);
    expect(screen.getByText("Sample data")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open the sample dashboard/ }).getAttribute("href")).toBe("/analytics");
  });
});

describe("Pricing", () => {
  it("four plans, each with what it gives and what it costs; Pro states both of its prices", () => {
    withMotion(<Pricing />);
    const section = document.getElementById("pricing")!;
    const rows = [...section.querySelectorAll(".planRow")] as HTMLElement[];
    const summary = rows.map((row) => ({
      name: row.querySelector(".planName")!.textContent,
      price: row.querySelector(".planPrice")!.textContent,
      billed: row.querySelector(".planBilled")!.textContent
    }));
    expect(summary).toEqual([
      { name: "Free", price: "$0", billed: "Free forever" },
      { name: "Pro", price: "$2.50 /mo", billed: "Billed $29.99/yr · or $3.99 monthly" },
      { name: "Lifetime", price: "$79.99 once", billed: "One payment · yours forever" },
      { name: "Family", price: "$6.99 /mo", billed: "Billed monthly" }
    ]);
    // Only Pro is set apart, and only by a drawn edge: no badge text.
    expect(rows.map((r) => r.className.includes("planRowFeatured"))).toEqual([false, true, false, false]);
    expect(within(rows[0]!).getAllByRole("listitem").map((li) => li.textContent)).toContain("Track up to 10 subscriptions");
    expect(within(section).getByText(/Prices in USD, billed via the App Store \/ Google Play\./)).toBeTruthy();
  });
});

describe("FAQ", () => {
  const faqs = [
    { q: "First?", a: "Answer one" },
    { q: "Isn&rsquo;t it?", a: "It&rsquo;s <b>two</b>" }
  ];
  const question = (name: RegExp) => screen.getByRole("button", { name });

  it("the first answer starts open; each question controls its own labelled region", () => {
    withMotion(<FAQ faqs={faqs} />);
    expect(question(/First\?/).getAttribute("aria-expanded")).toBe("true");
    expect(question(/Isn’t it\?/).getAttribute("aria-expanded")).toBe("false");
    const region = screen.getByRole("region", { name: "First?" });
    expect(region.id).toBe("faq-a-0");
    expect(question(/First\?/).getAttribute("aria-controls")).toBe("faq-a-0");
    expect(region.textContent).toBe("Answer one");
  });

  it("opening another closes the first; pressing the open one closes it", () => {
    withMotion(<FAQ faqs={faqs} />);
    fireEvent.click(question(/Isn’t it\?/));
    expect(question(/Isn’t it\?/).getAttribute("aria-expanded")).toBe("true");
    expect(question(/First\?/).getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("faq-a-1")!.innerHTML).toContain("It’s <b>two</b>");
    fireEvent.click(question(/Isn’t it\?/));
    expect(question(/Isn’t it\?/).getAttribute("aria-expanded")).toBe("false");
  });
});

describe("FinalCTA", () => {
  it("the closing headline and the full waitlist form; the giant watermark is hidden from screen readers", () => {
    withMotion(<FinalCTA />);
    const section = document.getElementById("waitlist")!;
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe("Stop paying for thingsyou forgot about.");
    expect(within(section).getByRole("button").textContent).toBe("Join the waitlist→");
    expect(within(section).getByText("zeno").getAttribute("aria-hidden")).toBe("true");
  });

  it("reduced motion: the watermark starts at its final faintness", () => {
    setMedia("(prefers-reduced-motion: reduce)", true);
    withMotion(<FinalCTA />);
    expect(screen.getByText("zeno").style.opacity).toBe("0.05");
  });
});

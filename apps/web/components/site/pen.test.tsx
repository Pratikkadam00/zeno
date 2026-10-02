// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revealWhere, setMedia, setRect, setScrollBox } from "@/test-support/browser";
import { MarginIndex, PenRule, RunningTally } from "./pen";
import { LEDGER_EVENT, SAMPLE_SUBS } from "./sample-ledger";

const fakeClock = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] });
const step = (ms: number) => {
  for (let left = ms; left > 0; left -= 10) act(() => void vi.advanceTimersByTime(Math.min(10, left)));
};
const SECTIONS = ["case", "how", "refusal", "pricing", "faq"];

function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  window.dispatchEvent(new Event("scroll"));
}

beforeEach(() => {
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1500 });
  setScrollBox(document.documentElement, { scrollHeight: 5000 });
});
afterEach(() => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  document.body.innerHTML = "";
});

describe("PenRule", () => {
  it("rules across the top as the page scrolls: 0 at the top, half way at half, full at the end", () => {
    fakeClock();
    const { container } = render(<PenRule />);
    const rule = container.firstElementChild as HTMLElement;
    expect(rule.getAttribute("aria-hidden")).toBe("true");
    step(20);
    expect(rule.style.transform).toBe("scaleX(0)");
    act(() => scrollTo(2000));
    step(20);
    expect(rule.style.transform).toBe("scaleX(0.5)");
    act(() => scrollTo(9999));
    step(20);
    expect(rule.style.transform).toBe("scaleX(1)");
  });

  it("a page shorter than the window: stays at 0; several scrolls in one frame are one update", () => {
    fakeClock();
    setScrollBox(document.documentElement, { scrollHeight: 800 });
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const { container } = render(<PenRule />);
    step(20);
    raf.mockClear();
    act(() => {
      scrollTo(10);
      scrollTo(20);
      scrollTo(30);
    });
    expect(raf).toHaveBeenCalledTimes(1);
    step(20);
    expect((container.firstElementChild as HTMLElement).style.transform).toBe("scaleX(0)");
  });
});

describe("MarginIndex", () => {
  function sections() {
    for (const id of SECTIONS) {
      const el = document.createElement("section");
      el.id = id;
      document.body.appendChild(el);
    }
  }

  it("a duplicate index: hidden from screen readers and out of the tab order; marks the section in view", () => {
    sections();
    const { container } = render(<MarginIndex />);
    const index = container.firstElementChild as HTMLElement;
    expect(index.getAttribute("aria-hidden")).toBe("true");
    const links = [...index.querySelectorAll("a")];
    expect(links.map((a) => [a.getAttribute("href"), a.tabIndex])).toEqual(SECTIONS.map((id) => [`#${id}`, -1]));
    const marker = index.firstElementChild as HTMLElement;
    expect(marker.style.opacity).toBe("0");
    act(() => revealWhere((el) => el.id === "pricing"));
    expect(links.map((a) => a.className.includes("marginOn"))).toEqual([false, false, false, true, false]);
    expect(marker.style.opacity).toBe("1");
    expect(marker.style.transform).toBe("translateY(118px)");
  });

  it("an element it doesn't index is ignored; missing sections are simply not watched", () => {
    const stray = document.createElement("section");
    stray.id = "case";
    document.body.appendChild(stray);
    const { container, unmount } = render(<MarginIndex />);
    act(() => revealWhere(() => true));
    expect(container.querySelectorAll(".marginOn")).toHaveLength(1);
    unmount();
  });
});

describe("RunningTally", () => {
  // The component finds the hero and the sections once, at mount, so a new
  // layout moves those same elements rather than replacing them.
  function page({ heroBottom, sectionTops }: { heroBottom: number; sectionTops: number[] }) {
    const el = (id: string, tag: string) => {
      let found = document.getElementById(id);
      if (!found) {
        found = document.createElement(tag);
        found.id = id;
        document.body.appendChild(found);
      }
      return found;
    };
    setRect(el("ledger", "header"), { bottom: heroBottom });
    SECTIONS.forEach((id, i) => setRect(el(id, "section"), { top: sectionTops[i] ?? 9999 }));
  }
  const chip = () => screen.getByRole("link", { name: /Running sample bill/ });
  const amount = () => chip().querySelector(".ptAmt")!.textContent;
  const float = () => chip().querySelector(".ptFloat") as HTMLElement;

  it("appears once the hero has scrolled away and tallies one sample row per section read", () => {
    fakeClock();
    page({ heroBottom: 500, sectionTops: [] });
    render(<RunningTally />);
    expect(chip().getAttribute("href")).toBe("#ledger");
    step(200);
    expect(chip().className).not.toContain("penTallyShow");
    page({ heroBottom: 10, sectionTops: [100, 500, 2000] });
    act(() => scrollTo(1000));
    step(700);
    expect(chip().className).toContain("penTallyShow");
    // Two sections are above 60 % of the window: the first two sample rows.
    expect(amount()).toBe(`$${(SAMPLE_SUBS[0]!.amt + SAMPLE_SUBS[1]!.amt).toFixed(2)}`);
    expect(float().textContent).toBe(`+ $${SAMPLE_SUBS[1]!.amt.toFixed(2)}`);
    expect(chip().style.transform).toMatch(/^translateX\(/);
  });

  it("carries the visitor's cancellations: a cancelled row adds $0 and says CANCELLED", () => {
    fakeClock();
    page({ heroBottom: 10, sectionTops: [100] });
    render(<RunningTally />);
    step(200);
    act(() => window.dispatchEvent(new CustomEvent(LEDGER_EVENT, { detail: { off: SAMPLE_SUBS.map((_, i) => i === 1) } })));
    page({ heroBottom: 10, sectionTops: [100, 200] });
    act(() => scrollTo(1500));
    step(700);
    expect(amount()).toBe(`$${SAMPLE_SUBS[0]!.amt.toFixed(2)}`);
    expect(float().textContent).toBe("CANCELLED · $0.00");
    expect(float().className).toContain("ptFloatOk");
    // Restoring it re-tallies the carried total without a new float.
    act(() => window.dispatchEvent(new CustomEvent(LEDGER_EVENT, { detail: { off: SAMPLE_SUBS.map(() => false) } })));
    step(700);
    expect(amount()).toBe(`$${(SAMPLE_SUBS[0]!.amt + SAMPLE_SUBS[1]!.amt).toFixed(2)}`);
    // Scrolling back up shrinks the tally; a malformed event is ignored.
    page({ heroBottom: 10, sectionTops: [100] });
    act(() => scrollTo(900));
    step(700);
    expect(amount()).toBe(`$${SAMPLE_SUBS[0]!.amt.toFixed(2)}`);
    act(() => window.dispatchEvent(new CustomEvent(LEDGER_EVENT, { detail: {} })));
    act(() => window.dispatchEvent(new CustomEvent(LEDGER_EVENT)));
    step(700);
    expect(amount()).toBe(`$${SAMPLE_SUBS[0]!.amt.toFixed(2)}`);
  });

  it("on a page without the hero or the sections it does nothing (no listeners)", () => {
    const add = vi.spyOn(window, "addEventListener");
    render(<RunningTally />);
    expect(add.mock.calls.some(([type]) => type === "scroll")).toBe(false);
    add.mockRestore();
  });

  it("reduced motion: not rendered at all", () => {
    setMedia("(prefers-reduced-motion: reduce)", true);
    page({ heroBottom: 10, sectionTops: [100] });
    const { container } = render(<RunningTally />);
    expect(container.innerHTML).toBe("");
  });

  it("re-measures on resize and stops listening when it goes", () => {
    fakeClock();
    page({ heroBottom: 10, sectionTops: [100] });
    const { unmount } = render(<RunningTally />);
    step(200);
    Object.defineProperty(chip(), "offsetWidth", { configurable: true, value: 300 });
    act(() => window.dispatchEvent(new Event("resize")));
    expect(chip().style.transform).toBe("translateX(10px)");
    const remove = vi.spyOn(window, "removeEventListener");
    unmount();
    expect(remove.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(["scroll", "resize", LEDGER_EVENT]));
    remove.mockRestore();
  });
});

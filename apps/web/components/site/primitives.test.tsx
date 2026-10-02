// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { m } from "motion/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { revealAll, setMedia } from "@/test-support/browser";
import { MotionProvider } from "./MotionProvider";
import { DrawBar, MaskLines, Odometer, PenHead, PenLedgerLine, PrintIn, REVEAL_CLASS, StaggerGroup, Tally, WordsIn, staggerChild } from "./primitives";

const reduceMotion = () => setMedia("(prefers-reduced-motion: reduce)", true);
const inView = () => act(() => revealAll());
const fakeClock = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] });

// F169: an element server-rendered at an animation's start state must carry
// the no-JS class, or a visitor without JavaScript never sees it.
const START_STATE = /opacity:0(?![.\d])|scale[XY]?\(0\)|translateY\((?!0)/;
function unrevealedStartStates(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.body.querySelectorAll("[style]")]
    .filter((el) => START_STATE.test(el.getAttribute("style")!) && !el.classList.contains(REVEAL_CLASS))
    .map((el) => el.outerHTML.slice(0, 120));
}

describe("F169: every primitive's start state is marked for the no-JS fallback", () => {
  it("server HTML: no element sits at a start state without zn-reveal", () => {
    const html = renderToStaticMarkup(
      <MotionProvider>
        <PrintIn>print</PrintIn>
        <PenHead>HEAD</PenHead>
        <WordsIn text={"two words\nnext line"} />
        <MaskLines lines={["one", "two"]} />
        <DrawBar />
        <PenLedgerLine label="Bank login" sub="SUB" value="NEVER" />
        <StaggerGroup>
          <m.div className={REVEAL_CLASS} variants={staggerChild}>
            row
          </m.div>
        </StaggerGroup>
        <Odometer value={509} />
        <Tally to={2.5} prefix="$" decimals={2} />
      </MotionProvider>
    );
    expect(html).toMatch(START_STATE); // the fixture really has start states
    expect(unrevealedStartStates(html)).toEqual([]);
  });

  it("the guard itself catches an unmarked start state", () => {
    expect(unrevealedStartStates('<div style="opacity:0">x</div>')).toHaveLength(1);
    expect(unrevealedStartStates('<div style="opacity:0.05">x</div>')).toHaveLength(0);
  });

  it("server HTML prints the real numbers, never a zero waiting for JS", () => {
    const html = renderToStaticMarkup(
      <>
        <Odometer value={509} />
        <Tally to={79.99} prefix="$" decimals={2} />
      </>
    );
    expect(html).toContain(">509<");
    expect(html).toContain(">$79.99<");
  });
});

describe("PenHead", () => {
  it("prints the kicker and rules the line in once in view", () => {
    render(<PenHead>THE CASE</PenHead>);
    const kicker = screen.getByText("THE CASE");
    const rule = kicker.nextElementSibling as HTMLElement;
    expect(kicker.style.opacity).toBe("0");
    expect(rule.style.transform).toBe("scaleX(0)");
    inView();
    expect(kicker.style.opacity).toBe("1");
    expect(rule.style.transform).toBe("scaleX(1)");
  });

  it("centred: no trailing rule; reduced motion: shown at once", () => {
    reduceMotion();
    render(<PenHead center>COMING SOON</PenHead>);
    const kicker = screen.getByText("COMING SOON");
    expect(kicker.style.opacity).toBe("1");
    expect(kicker.nextElementSibling).toBeNull();
    expect((kicker.parentElement as HTMLElement).style.justifyContent).toBe("center");
  });
});

describe("WordsIn", () => {
  it("the heading reads as one sentence; each word fades in, staggered, once in view; \\n is a line break", () => {
    render(<WordsIn text={"The subscription industry\ncounts on you not counting."} className="h2" />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("The subscription industrycounts on you not counting.");
    expect(heading.querySelectorAll("br")).toHaveLength(1);
    const words = [...heading.querySelectorAll("span")];
    expect(words.map((w) => w.textContent)).toEqual(["The", "subscription", "industry", "counts", "on", "you", "not", "counting."]);
    expect(words.every((w) => w.style.opacity === "0")).toBe(true);
    expect(words[1]!.style.transition).toContain("0.05s");
    inView();
    expect(words.every((w) => w.style.opacity === "1" && w.style.transform === "none")).toBe(true);
  });

  it("reduced motion: plain text in the chosen tag, line breaks kept, no per-word spans", () => {
    reduceMotion();
    render(<WordsIn as="p" text={"a b\nc"} />);
    const p = screen.getByText((_, el) => el?.tagName === "P");
    expect(p.querySelectorAll("span")).toHaveLength(0);
    expect(p.innerHTML).toBe("a b<br>c");
  });
});

describe("MaskLines", () => {
  it("each line rises out of its mask once in view; reduced motion shows them in place with no transition", () => {
    const { unmount } = render(<MaskLines lines={["Stop paying for things", "you forgot about."]} delay={0.1} />);
    const inner = () => [...screen.getByRole("heading").querySelectorAll("span > span")] as HTMLElement[];
    expect(inner().map((s) => s.style.transform)).toEqual(["translateY(114%)", "translateY(114%)"]);
    expect(inner()[1]!.style.transition).toContain("0.19s");
    inView();
    expect(inner().map((s) => s.style.transform)).toEqual(["none", "none"]);
    unmount();
    reduceMotion();
    render(<MaskLines lines={["x"]} />);
    expect(inner()[0]!.style.transform).toBe("none");
    expect(inner()[0]!.style.transition).toBe("");
  });
});

describe("PenLedgerLine", () => {
  it("label and verdict print once in view; the dotted leader is decorative", () => {
    render(<PenLedgerLine label="Bank login" sub="ASKED" value="NEVER" valueColor="green" strong delay={0.2} />);
    const value = screen.getByText("NEVER");
    const label = screen.getByText("Bank login");
    expect(value.style.opacity).toBe("0");
    expect(label.style.fontWeight).toBe("700");
    expect(value.style.transition).toContain("0.7s");
    inView();
    expect(value.style.opacity).toBe("1");
    expect(label.style.opacity).toBe("1");
    expect((value.previousElementSibling as HTMLElement).getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("ASKED")).toBeTruthy();
  });

  it("reduced motion: shown at once, no transitions; defaults: no sub, regular weight", () => {
    reduceMotion();
    render(<PenLedgerLine label="Data brokers" value="ZERO" />);
    const value = screen.getByText("ZERO");
    expect(value.style.opacity).toBe("1");
    expect(value.style.transition).toBe("");
    expect(screen.getByText("Data brokers").style.fontWeight).toBe("500");
    expect(screen.getByText("Data brokers").children).toHaveLength(0);
  });
});

describe("Odometer", () => {
  it("rolls its digits once in view (the number stays readable as a label), then settles back to plain text", () => {
    fakeClock();
    render(<Odometer value="1,509" />);
    const odo = screen.getByText("1,509");
    inView();
    expect(odo.getAttribute("aria-label")).toBe("1,509");
    // One wheel per digit (ten faces each), the comma as a plain glyph.
    expect(odo.children).toHaveLength(5);
    expect(odo.querySelectorAll(":scope > span > span > span")).toHaveLength(40);
    act(() => void vi.advanceTimersByTime(50));
    expect((odo.children[4]!.firstElementChild as HTMLElement).style.transform).toBe("translateY(-9em)");
    act(() => void vi.advanceTimersByTime(1900));
    expect(odo.textContent).toBe("1,509");
    expect(odo.children).toHaveLength(0);
    expect(odo.hasAttribute("aria-label")).toBe(false);
  });

  it("reduced motion: never rolls", () => {
    reduceMotion();
    render(<Odometer value={509} className="x" style={{ color: "red" }} />);
    inView();
    const odo = screen.getByText("509");
    expect(odo.children).toHaveLength(0);
    expect(odo.className).toBe("money x");
  });
});

describe("Tally", () => {
  it("counts up from zero once in view and always lands exactly on the value", () => {
    fakeClock();
    render(<Tally to={29.99} prefix="$" suffix="/yr" decimals={2} duration={800} />);
    const tally = screen.getByText("$29.99/yr");
    inView();
    act(() => void vi.advanceTimersByTime(16));
    const mid = Number(tally.textContent!.replace(/[^\d.]/g, ""));
    expect(mid).toBeLessThan(29.99);
    act(() => void vi.advanceTimersByTime(1200));
    expect(tally.textContent).toBe("$29.99/yr");
  });

  it("lands on the value even when animation frames never come (the failsafe)", () => {
    fakeClock();
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 0);
    render(<Tally to={7} duration={100} />);
    inView();
    act(() => void vi.advanceTimersByTime(400));
    expect(screen.getByText("7")).toBeTruthy();
    raf.mockRestore();
  });

  it("reduced motion: the value, no count", () => {
    reduceMotion();
    render(<Tally to={3.99} prefix="$" decimals={2} className="c" />);
    inView();
    expect(screen.getByText("$3.99").className).toBe("money c");
  });
});

describe("motion wrappers", () => {
  it("PrintIn, DrawBar and StaggerGroup render their content with the no-JS class and any style given", () => {
    render(
      <MotionProvider>
        <PrintIn className="row" style={{ marginTop: 4 }} delay={0.1}>
          printed
        </PrintIn>
        <PrintIn>plain</PrintIn>
        <div style={{ position: "relative" }}>
          <DrawBar color="green" top={8} bottom={8} style={{ left: 2 }} />
        </div>
        <StaggerGroup className="grid" style={{ gap: 2 }}>
          <span>staggered</span>
        </StaggerGroup>
        <StaggerGroup>
          <span>bare</span>
        </StaggerGroup>
      </MotionProvider>
    );
    const printed = screen.getByText("printed");
    expect(printed.className).toBe(`row ${REVEAL_CLASS}`);
    expect(printed.style.marginTop).toBe("4px");
    expect(screen.getByText("plain").className).toBe(REVEAL_CLASS);
    const bar = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(bar.className).toBe(REVEAL_CLASS);
    expect(bar.style.left).toBe("2px");
    expect(screen.getByText("staggered").parentElement!.className).toBe("grid");
    expect(screen.getByText("bare")).toBeTruthy();
  });

  it("reduced motion: PrintIn starts without its rise and DrawBar fully drawn", () => {
    reduceMotion();
    render(
      <MotionProvider>
        <PrintIn>still</PrintIn>
        <DrawBar />
      </MotionProvider>
    );
    expect(screen.getByText("still").style.transform).not.toContain("translateY(12px)");
    expect((document.querySelector("[aria-hidden='true']") as HTMLElement).style.transform).not.toContain("scaleY(0)");
  });
});

// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { setAnimateSupport, setMedia, setRect, setScrollBox } from "@/test-support/browser";
import { LedgerBook, type Sheet } from "./LedgerBook";
import { LEDGER_EVENT, SAMPLE_SUBS } from "./sample-ledger";

const SHEETS: Sheet[] = [
  { id: "cover", label: "COVER", node: <p>Cover sheet</p> },
  { id: "case", label: "THE CASE", node: <p>Case sheet</p> },
  { id: "how", label: "THE METHOD", node: <p>Method sheet</p> },
  { id: "pricing", label: "THE BILL", node: <p>Pricing sheet</p> }
];
const TURN = 720 + 60;
const WIDE = "(min-width: 900px) and (pointer: fine)";

const fakeClock = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] });
const step = (ms: number) => {
  for (let left = ms; left > 0; left -= 10) act(() => void vi.advanceTimersByTime(Math.min(10, left)));
};
const book = (sheets = SHEETS) => render(<LedgerBook sheets={sheets} footer={<footer>Footer</footer>} />);
const openBook = (sheets = SHEETS) => {
  setMedia(WIDE, true);
  return book(sheets);
};
const sheet = (i: number) => document.getElementById(`sheet-${SHEETS[i]!.id}`)!;
const current = () => screen.getByRole("navigation", { name: "Ledger pages" }).querySelector(".pl")!.textContent;
const key = (k: string, extra: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(window, { key: k, ...extra });

describe("LedgerBook, document mode (the base every visitor gets first)", () => {
  it.each([
    ["a narrow or touch screen", () => {}],
    ["reduced motion", () => {
      setMedia(WIDE, true);
      setMedia("(prefers-reduced-motion: reduce)", true);
    }],
    ["a browser without Web Animations", () => {
      setMedia(WIDE, true);
      setAnimateSupport(false);
    }]
  ])("%s: one scrolling document in main#main, every section in order, then the footer; no pager", (_why, arrange) => {
    arrange();
    book();
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.textContent).toBe("Cover sheetCase sheetMethod sheetPricing sheet");
    expect(screen.getByText("Footer")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Ledger pages" })).toBeNull();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("no matchMedia at all: stays a document", () => {
    const original = window.matchMedia;
    // @ts-expect-error simulating an old browser
    delete window.matchMedia;
    book();
    expect(screen.getByRole("main")).toBeTruthy();
    window.matchMedia = original;
  });
});

describe("LedgerBook, book mode", () => {
  it("one region of labelled pages; only the current one is exposed; the page doesn't scroll; the cover shows the hint", () => {
    document.documentElement.style.overflow = "auto";
    const { unmount } = openBook();
    const region = screen.getByRole("region", { name: "Zeno — the audit, as a leafable ledger" });
    expect(region.id).toBe("main");
    expect(region.getAttribute("aria-roledescription")).toBe("ledger book");
    expect(SHEETS.map((_, i) => sheet(i).getAttribute("aria-label"))).toEqual(SHEETS.map((s, i) => `Page ${i + 1} of 4: ${s.label}`));
    expect(SHEETS.map((_, i) => sheet(i).getAttribute("aria-hidden"))).toEqual([null, "true", "true", "true"]);
    expect(current()).toBe("COVER");
    expect(screen.getByText("SCROLL OR PRESS → TO TURN")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    // The footer is on the last page.
    expect(within(sheet(3)).getByText("Footer")).toBeTruthy();
    unmount();
    expect(document.documentElement.style.overflow).toBe("auto");
  });

  it("opens on the page named in the address (#pricing)", () => {
    window.history.replaceState(null, "", "/#pricing");
    openBook();
    expect(current()).toBe("THE BILL");
    expect((screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Next turns the page: the address, the live region, focus and the pager follow; Previous turns back", () => {
    fakeClock();
    openBook();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getAllByRole("status")[0]!.textContent).toBe("Page 2 of 4 — THE CASE");
    // Mid-turn both pages are drawn; the turning one folds.
    expect(sheet(0).className).toContain("sheetTurning");
    step(TURN);
    expect(current()).toBe("THE CASE");
    expect(window.location.hash).toBe("#case");
    expect(document.activeElement).toBe(sheet(1));
    expect(sheet(0).getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByText("SCROLL OR PRESS → TO TURN")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    step(TURN);
    expect(current()).toBe("COVER");
    expect(window.location.hash).toBe("#cover");
  });

  it("a second turn while one is in progress is ignored (End mid-turn doesn't jump)", () => {
    fakeClock();
    openBook();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    step(100);
    key("End");
    step(TURN * 2);
    expect(current()).toBe("THE CASE");
  });

  it("keys: → and ← turn, Home and End jump; typing in a field turns nothing", () => {
    fakeClock();
    openBook();
    key("ArrowRight");
    step(TURN);
    expect(current()).toBe("THE CASE");
    key("End");
    step(TURN);
    expect(current()).toBe("THE BILL");
    key("ArrowLeft");
    step(TURN);
    expect(current()).toBe("THE METHOD");
    key("Home");
    step(TURN);
    expect(current()).toBe("COVER");
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "ArrowRight" });
    step(TURN);
    expect(current()).toBe("COVER");
    input.remove();
  });

  it("Space, PageDown and ↓ scroll a long page first and turn only at its end; Shift+Space, PageUp and ↑ the reverse", () => {
    fakeClock();
    openBook();
    const scroller = sheet(0).firstElementChild as HTMLElement;
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy as never;
    setScrollBox(scroller, { scrollTop: 0, scrollHeight: 3000, clientHeight: 1000 });
    for (const k of ["PageDown", "ArrowDown", " "]) key(k);
    expect(scrollBy).toHaveBeenCalledTimes(3);
    expect(scrollBy).toHaveBeenLastCalledWith({ top: 900, behavior: "auto" });
    step(TURN);
    expect(current()).toBe("COVER");
    setScrollBox(scroller, { scrollTop: 2000 });
    key("PageDown");
    step(TURN);
    expect(current()).toBe("THE CASE");
    const scroller1 = sheet(1).firstElementChild as HTMLElement;
    const scrollBy1 = vi.fn();
    scroller1.scrollBy = scrollBy1 as never;
    setScrollBox(scroller1, { scrollTop: 500, scrollHeight: 3000, clientHeight: 1000 });
    for (const k of ["PageUp", "ArrowUp"]) key(k);
    key(" ", { shiftKey: true });
    expect(scrollBy1).toHaveBeenCalledTimes(3);
    expect(scrollBy1).toHaveBeenLastCalledWith({ top: -900, behavior: "auto" });
    setScrollBox(scroller1, { scrollTop: 0 });
    key("PageUp");
    step(TURN);
    expect(current()).toBe("COVER");
    key("x");
    step(TURN);
    expect(current()).toBe("COVER");
  });

  it("the wheel scrolls the page and turns only past its end, once per gesture; sideways wheels are ignored", () => {
    fakeClock();
    openBook();
    const scroller = sheet(0).firstElementChild as HTMLElement;
    setScrollBox(scroller, { scrollTop: 0, scrollHeight: 3000, clientHeight: 1000 });
    fireEvent.wheel(window, { deltaY: 200 });
    step(TURN);
    expect(current()).toBe("COVER");
    step(300);
    setScrollBox(scroller, { scrollTop: 2000 });
    fireEvent.wheel(window, { deltaY: 50 });
    fireEvent.wheel(window, { deltaY: 50 });
    fireEvent.wheel(window, { deltaY: 50 });
    step(TURN);
    expect(current()).toBe("THE CASE");
    step(300);
    fireEvent.wheel(window, { deltaX: 300, deltaY: 10 });
    step(TURN);
    expect(current()).toBe("THE CASE");
    const scroller1 = sheet(1).firstElementChild as HTMLElement;
    setScrollBox(scroller1, { scrollTop: 0, scrollHeight: 3000, clientHeight: 1000 });
    fireEvent.wheel(window, { deltaY: -100 });
    step(TURN);
    expect(current()).toBe("COVER");
  });

  it("touch: a sideways swipe turns (left = forward); a vertical swipe turns only if it started at the page's end", () => {
    fakeClock();
    openBook();
    const swipe = (from: [number, number], to: [number, number]) => {
      fireEvent.touchStart(window, { touches: [{ clientX: from[0], clientY: from[1] }] });
      fireEvent.touchMove(window, { touches: [{ clientX: to[0], clientY: to[1] }] });
      fireEvent.touchEnd(window, { touches: [] });
    };
    swipe([600, 300], [400, 310]);
    step(TURN);
    expect(current()).toBe("THE CASE");
    swipe([400, 300], [600, 290]);
    step(TURN);
    expect(current()).toBe("COVER");
    const scroller = sheet(0).firstElementChild as HTMLElement;
    setScrollBox(scroller, { scrollTop: 0, scrollHeight: 3000, clientHeight: 1000 });
    swipe([500, 600], [505, 300]);
    step(TURN);
    expect(current()).toBe("COVER");
    setScrollBox(scroller, { scrollTop: 2000 });
    swipe([500, 600], [505, 300]);
    step(TURN);
    expect(current()).toBe("THE CASE");
    // Too short, two fingers: nothing.
    swipe([500, 300], [480, 300]);
    fireEvent.touchStart(window, { touches: [{ clientX: 1, clientY: 1 }, { clientX: 2, clientY: 2 }] });
    step(TURN);
    expect(current()).toBe("THE CASE");
  });

  it("F179: a link to a section on this page turns the book there (the nav's, the footer's); other links are left alone", () => {
    fakeClock();
    openBook();
    const link = (href: string, attrs: Record<string, string> = {}) => {
      const a = document.createElement("a");
      a.href = href;
      for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
      a.textContent = href;
      document.body.appendChild(a);
      return a;
    };
    const click = (a: HTMLElement, init: MouseEventInit = {}) => {
      const e = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
      act(() => void a.dispatchEvent(e));
      return e;
    };
    // Left alone: a modified click, a section the book doesn't have, another page, a new tab.
    for (const [a, init] of [
      [link("/#pricing"), { ctrlKey: true }],
      [link("/#nowhere"), {}],
      [link("/cancel#pricing"), {}],
      [link("/#pricing", { target: "_blank" }), {}]
    ] as const) {
      expect(click(a, init).defaultPrevented).toBe(false);
    }
    step(TURN);
    expect(current()).toBe("COVER");
    const e = click(link("/#pricing"));
    expect(e.defaultPrevented).toBe(true);
    step(TURN);
    expect(current()).toBe("THE BILL");
    click(link("#how"));
    step(TURN);
    expect(current()).toBe("THE METHOD");
    for (const a of document.querySelectorAll("body > a")) a.remove();
  });

  it("the running total chip appears from page 2 and carries the hero's cancellations", () => {
    fakeClock();
    openBook();
    expect(screen.queryByRole("link", { name: /Running total/ })).toBeNull();
    key("End");
    step(TURN);
    const sum = (off: boolean[]) => SAMPLE_SUBS.slice(0, 3).reduce((a, s, i) => a + (off[i] ? 0 : s.amt), 0);
    expect(screen.getByRole("link", { name: `Running total: ${sum([]).toFixed(2)} dollars a month` }).getAttribute("href")).toBe("#case");
    const off = SAMPLE_SUBS.map((_, i) => i === 0);
    act(() => window.dispatchEvent(new CustomEvent(LEDGER_EVENT, { detail: { off } })));
    expect(screen.getByRole("link", { name: `Running total: ${sum(off).toFixed(2)} dollars a month` })).toBeTruthy();
    act(() => window.dispatchEvent(new CustomEvent(LEDGER_EVENT, { detail: {} })));
    expect(screen.getByRole("link", { name: `Running total: ${sum(off).toFixed(2)} dollars a month` })).toBeTruthy();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
    act(() => window.dispatchEvent(new Event("resize")));
    expect(screen.getByRole("link", { name: /Running total/ }).style.transform).toBe("translateX(640px)");
  });

  it("leaving mid-turn cancels the pending turn", () => {
    fakeClock();
    const { unmount } = openBook();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    unmount();
    step(TURN);
    expect(window.location.hash).toBe("");
  });
});

describe("LedgerBook, dragging a page edge with the mouse", () => {
  function layoutSheet(i: number) {
    setRect(sheet(i), { left: 100, right: 1100, top: 50, bottom: 850, width: 1000, height: 800 });
  }
  // jsdom has no PointerEvent: a MouseEvent carrying pointerId and pointerType.
  const pointer = (type: string, x: number, init: Partial<PointerEventInit> = {}, target: EventTarget = sheet(0)) => {
    const { pointerType = "mouse", ...mouse } = init;
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 400, button: 0, buttons: 1, ...mouse });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } });
    act(() => void target.dispatchEvent(event));
    return event;
  };

  it("past halfway, release commits the turn; the sheet follows the hand meanwhile", () => {
    fakeClock();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    openBook();
    layoutSheet(0);
    pointer("pointerdown", 1080);
    expect(document.documentElement.classList.contains("znGrab")).toBe(false);
    pointer("pointermove", 1060);
    expect(document.documentElement.classList.contains("znGrab")).toBe(true);
    pointer("pointermove", 500);
    step(20);
    expect(sheet(0).style.transform).toMatch(/^rotateY\(-\d+/);
    step(200);
    pointer("pointerup", 500, { buttons: 0 });
    step(600);
    expect(current()).toBe("THE CASE");
    expect(window.location.hash).toBe("#case");
    expect(sheet(0).style.transform).toBe("");
  });

  it("a short drag snaps back; a quick flick commits on direction alone", () => {
    fakeClock();
    openBook();
    layoutSheet(0);
    // Slow and short: 40px at 10px per 200ms, well under the flick speed.
    pointer("pointerdown", 1080);
    for (const x of [1070, 1060, 1050, 1040]) {
      step(200);
      pointer("pointermove", x);
    }
    step(200);
    pointer("pointermove", 1040);
    pointer("pointerup", 1040, { buttons: 0 });
    step(600);
    expect(current()).toBe("COVER");
    // Flick: a fast leftward move over a short distance.
    pointer("pointerdown", 1080);
    pointer("pointermove", 1060);
    step(50);
    pointer("pointermove", 1000);
    act(() => void vi.advanceTimersByTime(1));
    pointer("pointermove", 900);
    pointer("pointerup", 900, { buttons: 0 });
    step(700);
    expect(current()).toBe("THE CASE");
  });

  it("ignored: touch pointers, the right button, links and buttons, the dead middle of the page, vertical intent, the wrong direction", () => {
    fakeClock();
    openBook();
    layoutSheet(0);
    const tryDrag = (down: Partial<PointerEventInit>, moveTo: number, target?: EventTarget, moveY?: number) => {
      pointer("pointerdown", (down.clientX as number) ?? 1080, down, target);
      pointer("pointermove", moveTo, moveY !== undefined ? { clientY: moveY } : {});
      pointer("pointermove", 400);
      pointer("pointerup", 400, { buttons: 0 });
      step(700);
    };
    tryDrag({ pointerType: "touch" }, 1060);
    tryDrag({ button: 2 }, 1060);
    const link = document.createElement("a");
    sheet(0).appendChild(link);
    tryDrag({}, 1060, link);
    tryDrag({ clientX: 600 }, 580);
    tryDrag({}, 1078, undefined, 500);
    tryDrag({}, 1095);
    expect(current()).toBe("COVER");
    // The left edge of the first page has nowhere to go.
    tryDrag({ clientX: 120 }, 140);
    expect(current()).toBe("COVER");
  });

  it("a lost pointerup (buttons released elsewhere) and window blur both end the drag", () => {
    fakeClock();
    openBook();
    layoutSheet(0);
    pointer("pointerdown", 1080);
    pointer("pointermove", 1060);
    pointer("pointermove", 300);
    pointer("pointermove", 300, { buttons: 0 });
    step(700);
    expect(current()).toBe("THE CASE");
    layoutSheet(1);
    pointer("pointerdown", 120, {}, sheet(1));
    pointer("pointermove", 140, {}, sheet(1));
    pointer("pointermove", 900, {}, sheet(1));
    act(() => void window.dispatchEvent(new Event("blur")));
    step(700);
    expect(current()).toBe("COVER");
    expect(document.documentElement.classList.contains("znGrab")).toBe(false);
  });

  it("the grab cursor shows only over a draggable edge", () => {
    fakeClock();
    openBook();
    layoutSheet(0);
    pointer("pointermove", 1080, { buttons: 0 });
    step(20);
    expect(document.documentElement.classList.contains("znCanGrab")).toBe(true);
    pointer("pointermove", 600, { buttons: 0 });
    step(20);
    expect(document.documentElement.classList.contains("znCanGrab")).toBe(false);
  });
});

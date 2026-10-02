// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { setMedia } from "@/test-support/browser";
import { Hero } from "./Hero";
import { CANCEL_FLOWS, LEDGER_EVENT, SAMPLE_BASE, SAMPLE_SUBS } from "./sample-ledger";

const fakeClock = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] });
// Small steps, each in its own act(): React commits (and runs the new lines'
// effects) between steps, as a browser would between frames.
const advance = (ms: number) => {
  for (let left = ms; left > 0; left -= 10) act(() => void vi.advanceTimersByTime(Math.min(10, left)));
};
const ledger = () => screen.getByRole("group", { name: /Sample ledger/ });
const sw = (name: string) => within(ledger()).getByRole("switch", { name: new RegExp(`^(Cancel|Restore) ${name.replace("+", "\\+")},`) });
const total = () => ledger().querySelector(".auditTotalVal")!.textContent;
const yearly = () => ledger().querySelector(".auditYearly")!.textContent;
const announced = () => screen.getAllByRole("status")[0]!.textContent;
const money = (n: number) => n.toFixed(2);

describe("Hero, as served", () => {
  it("server HTML: the five sample rows, every switch on, and the real total (no zero before JS)", () => {
    const html = renderToStaticMarkup(<Hero />);
    expect(html).toContain(`$${money(SAMPLE_BASE)}`);
    expect(html.match(/role="switch"/g)).toHaveLength(SAMPLE_SUBS.length);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(SAMPLE_SUBS.length);
    expect(html).toContain("No bank login required");
  });

  it("one h1, the waitlist form, a labelled switch per sample row with its monthly price", () => {
    render(<Hero />);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Know what you pay.Cancel before it charges."]);
    expect(screen.getByRole("textbox", { name: "Email address" })).toBeTruthy();
    expect(within(ledger()).getAllByRole("switch").map((s) => s.getAttribute("aria-label"))).toEqual(
      SAMPLE_SUBS.map((s) => `Cancel ${s.n}, ${money(s.amt)} dollars a month`)
    );
    expect(within(ledger()).getByText(`${SAMPLE_SUBS.length} BILLING`)).toBeTruthy();
    // The live region starts silent: nothing is announced on load.
    expect(announced()).toBe("");
  });
});

describe("Hero, cancelling a sample row (reduced motion: no flow, totals jump)", () => {
  it("marks it cancelled, re-tallies, tells the page and a screen reader, and only later marks it verified", () => {
    fakeClock();
    setMedia("(prefers-reduced-motion: reduce)", true);
    const events: boolean[][] = [];
    const onLedger = (e: Event) => events.push((e as CustomEvent<{ off: boolean[] }>).detail.off);
    window.addEventListener(LEDGER_EVENT, onLedger);
    render(<Hero />);
    const netflix = SAMPLE_SUBS[0]!;
    fireEvent.click(sw(netflix.n));
    expect(sw(netflix.n).getAttribute("aria-checked")).toBe("false");
    expect(sw(netflix.n).getAttribute("aria-label")).toBe(`Restore ${netflix.n}, ${money(netflix.amt)} dollars a month`);
    expect(total()).toBe(`$${money(SAMPLE_BASE - netflix.amt)}`);
    expect(yearly()).toBe(`+$${money(netflix.amt * 12)}`);
    expect(within(ledger()).getByText(`${SAMPLE_SUBS.length - 1} BILLING`)).toBeTruthy();
    expect(within(ledger()).getByText("CANCELLED — VERIFYING NEXT STATEMENT")).toBeTruthy();
    expect(announced()).toBe(
      `${netflix.n} cancelled — verifying next statement. Monthly total ${money(SAMPLE_BASE - netflix.amt)} dollars, ${money(netflix.amt * 12)} dollars a year back.`
    );
    expect(events.at(-1)).toEqual(SAMPLE_SUBS.map((_, i) => i === 0));
    advance(4199);
    expect(within(ledger()).queryByText(/^VERIFIED CANCELLED/)).toBeNull();
    advance(1);
    expect(within(ledger()).getByText("VERIFIED CANCELLED — STATEMENT SHOWED NO CHARGE")).toBeTruthy();
    expect(announced()).toBe(`${netflix.n} verified cancelled — the charge stopped.`);
    window.removeEventListener(LEDGER_EVENT, onLedger);
  });

  it("restoring it puts the row and the total back, says so, and the pending 'verified' never arrives", () => {
    fakeClock();
    setMedia("(prefers-reduced-motion: reduce)", true);
    render(<Hero />);
    const spotify = SAMPLE_SUBS[2]!;
    fireEvent.click(sw(spotify.n));
    fireEvent.click(sw(spotify.n));
    expect(sw(spotify.n).getAttribute("aria-checked")).toBe("true");
    expect(total()).toBe(`$${money(SAMPLE_BASE)}`);
    expect(announced()).toBe(`${spotify.n} kept. Monthly total ${money(SAMPLE_BASE)} dollars.`);
    advance(5000);
    expect(within(ledger()).queryByText(/^VERIFIED CANCELLED/)).toBeNull();
    expect(within(ledger()).getByText(spotify.meta)).toBeTruthy();
  });

  it("two rows cancelled: both come off the total", () => {
    setMedia("(prefers-reduced-motion: reduce)", true);
    render(<Hero />);
    fireEvent.click(sw(SAMPLE_SUBS[1]!.n));
    fireEvent.click(sw(SAMPLE_SUBS[3]!.n));
    expect(total()).toBe(`$${money(SAMPLE_BASE - SAMPLE_SUBS[1]!.amt - SAMPLE_SUBS[3]!.amt)}`);
  });
});

describe("Hero, cancelling with motion: the inline cancel flow", () => {
  it("prints the service's flow line by line, strikes each retention offer as DECLINED, then cancels, verifies and folds the log away", () => {
    fakeClock();
    render(<Hero />);
    const adobe = SAMPLE_SUBS[1]!;
    const flow = CANCEL_FLOWS[adobe.n]!;
    fireEvent.click(sw(adobe.n));
    expect(announced()).toBe(`Cancelling ${adobe.n}…`);
    expect(within(ledger()).getByText("RUNNING THE CANCEL FLOW…")).toBeTruthy();
    // The switch can't be flipped back mid-flow.
    expect((sw(adobe.n) as HTMLButtonElement).disabled).toBe(true);
    const lines = () => [...ledger().querySelectorAll(".fl")] as HTMLElement[];
    expect(lines()).toHaveLength(0);
    advance(200);
    expect(lines()).toHaveLength(1);
    expect(lines()[0]!.textContent).toContain(flow[0]!.c === "trap" ? "" : (flow[0] as { t: string }).t);
    // Run the whole flow: 280ms per line, 430ms per trap.
    const flowMs = 200 + flow.reduce((ms, l) => ms + (l.c === "trap" ? 430 : 280), 0);
    advance(flowMs - 200 - 1);
    expect(lines()).toHaveLength(flow.length);
    const traps = lines().filter((l) => l.className.includes("flTrap"));
    expect(traps).toHaveLength(flow.filter((l) => l.c === "trap").length);
    for (const trap of traps) {
      expect(trap.textContent).toContain("— DECLINED");
      expect(trap.className).toContain("flDx");
    }
    advance(1);
    expect(within(ledger()).getByText("CANCELLED — VERIFYING NEXT STATEMENT")).toBeTruthy();
    expect(total()).not.toBe(`$${money(SAMPLE_BASE)}`);
    advance(1400);
    expect(ledger().querySelector(".aLog")!.className).not.toContain("aLogOpen");
    advance(260);
    expect(ledger().querySelector(".aLog")).toBeNull();
    expect((sw(adobe.n) as HTMLButtonElement).disabled).toBe(false);
    advance(4200);
    expect(within(ledger()).getByText("VERIFIED CANCELLED — STATEMENT SHOWED NO CHARGE")).toBeTruthy();
    // The tweened total has landed exactly.
    expect(total()).toBe(`$${money(SAMPLE_BASE - adobe.amt)}`);
    expect(yearly()).toBe(`+$${money(adobe.amt * 12)}`);
  });

  it("the totals tween, and land exactly even when animation frames never come", () => {
    fakeClock();
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 0);
    setMedia("(prefers-reduced-motion: reduce)", false);
    render(<Hero />);
    const icloud = SAMPLE_SUBS[4]!;
    fireEvent.click(sw(icloud.n));
    advance(10_000);
    expect(total()).toBe(`$${money(SAMPLE_BASE - icloud.amt)}`);
    raf.mockRestore();
  });

  it("leaving the page mid-flow cancels every pending step", () => {
    fakeClock();
    const { unmount } = render(<Hero />);
    fireEvent.click(sw(SAMPLE_SUBS[0]!.n));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

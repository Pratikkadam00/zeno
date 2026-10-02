// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { Nav } from "./Nav";

const desktopLinks = () =>
  within(document.querySelector(".navLinks") as HTMLElement)
    .getAllByRole("link")
    .map((a) => [a.textContent, a.getAttribute("href")]);

describe("Nav links", () => {
  it("the site's sections and the cancel hub; no Analytics link unless the server says the page exists", () => {
    render(<Nav />);
    expect(desktopLinks()).toEqual([
      ["How it works", "/#how"],
      ["Cancel guides", "/cancel"],
      ["Pricing", "/#pricing"],
      ["FAQ", "/#faq"]
    ]);
    // The closed mobile menu is `hidden`, so only the bar's waitlist link is exposed.
    expect(screen.getAllByRole("link", { name: "Join waitlist" }).map((a) => a.getAttribute("href"))).toEqual(["/#waitlist"]);
    expect(screen.getAllByRole("link", { name: "zeno" })[0]!.getAttribute("href")).toBe("/");
  });

  it("with the analytics page enabled, Analytics sits before FAQ", () => {
    render(<Nav showAnalytics />);
    expect(desktopLinks().map(([label]) => label)).toEqual(["How it works", "Cancel guides", "Pricing", "Analytics", "FAQ"]);
  });
});

describe("Nav theme toggle", () => {
  it("paper by default: offers dark; pressing it applies .dark and remembers it; pressing again goes back", () => {
    render(<Nav />);
    const toggle = screen.getByRole("button", { name: "Switch to dark theme" });
    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("reads the theme the inline script already applied, so a dark page offers light", () => {
    document.documentElement.classList.add("dark");
    render(<Nav />);
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeTruthy();
  });

  it("storage refused (private mode): the theme still switches, nothing throws", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    render(<Nav />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    setItem.mockRestore();
  });
});

describe("Nav mobile menu", () => {
  const menu = () => document.getElementById("mobile-nav")!;
  const toggle = () => screen.getByRole("button", { name: /navigation menu$/ });

  it("closed: hidden, the toggle says Open and is collapsed; open: shown, body scroll locked", () => {
    document.body.style.overflow = "auto";
    render(<Nav />);
    expect(menu().hidden).toBe(true);
    expect(toggle().getAttribute("aria-label")).toBe("Open navigation menu");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(toggle().getAttribute("aria-controls")).toBe("mobile-nav");
    fireEvent.click(toggle());
    expect(menu().hidden).toBe(false);
    expect(menu().className).toContain("navMenuOpen");
    expect(toggle().getAttribute("aria-label")).toBe("Close navigation menu");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(within(menu()).getAllByRole("link").map((a) => a.textContent)).toEqual(["How it works", "Cancel guides", "Pricing", "FAQ", "Join waitlist"]);
  });

  it.each([
    ["Escape", () => fireEvent.keyDown(window, { key: "Escape" })],
    ["the toggle again", () => fireEvent.click(toggle())],
    ["the backdrop", () => fireEvent.click(document.querySelector(".navBackdrop")!)],
    ["a menu link", () => fireEvent.click(within(menu()).getByRole("link", { name: "Pricing" }))],
    ["the menu's waitlist button", () => fireEvent.click(within(menu()).getByRole("link", { name: "Join waitlist" }))],
    ["the logo", () => fireEvent.click(screen.getAllByRole("link", { name: "zeno" })[0]!)]
  ])("closes on %s and gives the page its scroll back", (_how, close) => {
    document.body.style.overflow = "auto";
    render(<Nav />);
    fireEvent.click(toggle());
    close();
    expect(menu().hidden).toBe(true);
    expect(document.body.style.overflow).toBe("auto");
  });

  it("other keys leave it open", () => {
    render(<Nav />);
    fireEvent.click(toggle());
    fireEvent.keyDown(window, { key: "Enter" });
    expect(menu().hidden).toBe(false);
  });
});

describe("Nav on scroll", () => {
  it("gains its shadow past 24px and loses it back at the top; stops listening when it goes", () => {
    const { unmount } = render(<Nav />);
    const nav = screen.getByRole("navigation");
    expect(nav.className).not.toContain("navScrolled");
    act(() => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 25 });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(nav.className).toContain("navScrolled");
    act(() => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 24 });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(nav.className).not.toContain("navScrolled");
    const remove = vi.spyOn(window, "removeEventListener");
    unmount();
    expect(remove.mock.calls.some(([type]) => type === "scroll")).toBe(true);
    remove.mockRestore();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });
});

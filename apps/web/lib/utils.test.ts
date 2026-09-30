import { describe, expect, it } from "vitest";
import { cn } from "./utils";

/**
 * cn(): the shadcn class-name helper. clsx resolves conditional inputs, then
 * tailwind-merge drops earlier Tailwind utilities that a later one overrides,
 * so a component's `className` prop reliably wins over its defaults.
 */
describe("cn", () => {
  it("joins plain class names", () => {
    expect(cn("flex", "items-center", "gap-2")).toBe("flex items-center gap-2");
  });

  it("drops falsy and disabled inputs (conditional classes)", () => {
    const active = false;
    expect(cn("btn", active && "btn-active", null, undefined, 0, "", { hidden: false, block: true })).toBe("btn block");
  });

  it("flattens arrays and objects", () => {
    expect(cn(["px-2", ["py-1"]], { "font-bold": true })).toBe("px-2 py-1 font-bold");
  });

  it("a later Tailwind utility overrides a conflicting earlier one (caller className wins)", () => {
    expect(cn("px-2 py-1 bg-red-500", "px-4", "bg-[#00C26E]")).toBe("py-1 px-4 bg-[#00C26E]");
    expect(cn("text-sm", { "text-lg": true })).toBe("text-lg");
  });

  it("keeps non-conflicting utilities and variants side by side", () => {
    expect(cn("p-2 hover:p-4", "md:p-6")).toBe("p-2 hover:p-4 md:p-6");
  });

  it("returns an empty string for no classes", () => {
    expect(cn()).toBe("");
    expect(cn(false, null)).toBe("");
  });
});

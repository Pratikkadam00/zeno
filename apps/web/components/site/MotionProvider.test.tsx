// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MotionConfigContext, m, useReducedMotionConfig } from "motion/react";
import { useContext } from "react";
import { describe, expect, it } from "vitest";
import { setMedia } from "@/test-support/browser";
import { MotionProvider } from "./MotionProvider";

function Probe() {
  const { reducedMotion } = useContext(MotionConfigContext);
  const reduced = useReducedMotionConfig();
  return <output>{`${reducedMotion}:${String(reduced)}`}</output>;
}

describe("MotionProvider", () => {
  it("renders its children, and lazy `m` components work inside it", () => {
    render(
      <MotionProvider>
        <m.p animate={{ opacity: 1 }}>inside</m.p>
      </MotionProvider>
    );
    expect(screen.getByText("inside").tagName).toBe("P");
  });

  it.each([
    [false, "user:false"],
    [true, "user:true"]
  ])("every animation inside follows the OS reduce-motion setting (set: %s)", (reduce, expected) => {
    setMedia("(prefers-reduced-motion: reduce)", reduce);
    render(
      <MotionProvider>
        <Probe />
      </MotionProvider>
    );
    expect(screen.getByRole("status").textContent).toBe(expected);
  });
});

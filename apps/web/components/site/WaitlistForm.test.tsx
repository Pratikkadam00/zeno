// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "./WaitlistForm";

const field = () => screen.getByRole("textbox", { name: "Email address" });
const type = (value: string) => fireEvent.change(field(), { target: { value } });
async function submit() {
  await act(async () => {
    fireEvent.submit(field().closest("form")!);
  });
}

describe("WaitlistForm", () => {
  it("posts the address as JSON to /api/waitlist, then prints the receipt line in place of the form", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<WaitlistForm />);
    type("ada@example.com");
    await submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com" })
    });
    const receipt = screen.getByRole("status");
    expect(receipt.textContent).toContain("ADA@EXAMPLE.COM");
    expect(receipt.textContent).toContain("ON THE LIST");
    expect(receipt.textContent).toContain("No other mail, no sharing your address.");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("an address that isn't one: says so, marks the field invalid and describes it by the message, sends nothing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<WaitlistForm />);
    for (const bad of ["", "ada", "ada@", "ada@example", "ada @example.com", "@example.com"]) {
      type(bad);
      await submit();
      expect(screen.getByRole("alert").textContent).toBe("Please enter a valid email.");
      expect(field().getAttribute("aria-invalid")).toBe("true");
      expect(field().getAttribute("aria-describedby")).toBe("waitlist-error");
      expect(screen.getByRole("alert").id).toBe("waitlist-error");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("F167: editing after an error clears the message and the invalid mark together", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WaitlistForm />);
    type("ada");
    await submit();
    expect(screen.getByRole("alert")).toBeTruthy();
    type("ada@");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(field().getAttribute("aria-invalid")).toBe("false");
    expect(field().hasAttribute("aria-describedby")).toBe(false);
  });

  it.each([
    ["the server refuses", () => Promise.resolve({ ok: false })],
    ["the network fails", () => Promise.reject(new TypeError("Failed to fetch"))]
  ])("%s: 'Something went wrong. Try again.', and the form stays to try again", async (_label, respond) => {
    vi.stubGlobal("fetch", vi.fn(respond));
    render(<WaitlistForm />);
    type("ada@example.com");
    await submit();
    expect(screen.getByRole("alert").textContent).toBe("Something went wrong. Try again.");
    expect(field()).toBeTruthy();
    expect((field() as HTMLInputElement).value).toBe("ada@example.com");
  });

  it("while the request is out the button says 'Joining…' and can't be pressed again", async () => {
    let finish: (value: { ok: boolean }) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<{ ok: boolean }>((resolve) => (finish = resolve)));
    vi.stubGlobal("fetch", fetchMock);
    render(<WaitlistForm />);
    type("ada@example.com");
    await submit();
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.textContent).toBe("Joining…");
    expect(button.disabled).toBe(true);
    await act(async () => finish({ ok: true }));
    expect(screen.getByRole("status")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("the input is an email field with autofill, and the button names the action (shorter when compact)", () => {
    const { unmount } = render(<WaitlistForm />);
    expect(field().getAttribute("type")).toBe("email");
    expect(field().getAttribute("autocomplete")).toBe("email");
    expect(field().getAttribute("inputmode")).toBe("email");
    expect(screen.getByRole("button").textContent).toBe("Join the waitlist→");
    unmount();
    render(<WaitlistForm compact />);
    expect(screen.getByRole("button").textContent).toBe("Join waitlist→");
  });
});

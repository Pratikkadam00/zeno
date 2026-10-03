// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ComparePageCta } from "./ComparePageCta";
import { ComparisonTable } from "./ComparisonTable";
import { ContentShell } from "./ContentShell";
import { ColumnHeads, LedgerLine, TickTag } from "./ledger";

describe("ComparisonTable", () => {
  it("a real table: column headers Feature / Zeno / the competitor, one row header per feature", () => {
    render(
      <ComparisonTable
        competitorName="Rocket Money"
        rows={[
          { feature: "Bank login", zeno: "Not required", competitor: "Required" },
          { feature: "Price", zeno: "$3.99", competitor: "$6–$12" }
        ]}
      />
    );
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Feature", "Zeno", "Rocket Money"]);
    expect(within(table).getAllByRole("rowheader").map((th) => th.textContent)).toEqual(["Bank login", "Price"]);
    const firstRow = within(table).getAllByRole("row")[1]!;
    expect(within(firstRow).getAllByRole("cell").map((td) => td.textContent)).toEqual(["Not required", "Required"]);
    for (const th of within(table).getAllByRole("columnheader")) expect(th.getAttribute("scope")).toBe("col");
    for (const th of within(table).getAllByRole("rowheader")) expect(th.getAttribute("scope")).toBe("row");
  });
});

describe("ComparePageCta", () => {
  it("the page's own title, the pre-launch line, and the compact waitlist form (no store links: there are none yet)", () => {
    render(<ComparePageCta title="Try Zeno instead" />);
    expect(screen.getByText("Try Zeno instead")).toBeTruthy();
    expect(screen.getByText(/Zeno is pre-launch/).textContent).toContain("join the waitlist");
    expect(screen.getByRole("button").textContent).toBe("Join waitlist→");
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("ContentShell", () => {
  it("nav, one h1, the eyebrow and lead, the content inside main#main (the skip link's target), then the footer", () => {
    render(
      <ContentShell eyebrow="CANCEL GUIDE" title="How to cancel Netflix" lead="Two taps, no traps.">
        <p>Body copy</p>
      </ContentShell>
    );
    expect(screen.getByRole("navigation")).toBeTruthy();
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(within(main).getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["How to cancel Netflix"]);
    expect(within(main).getByText("CANCEL GUIDE")).toBeTruthy();
    expect(within(main).getByText("Two taps, no traps.")).toBeTruthy();
    expect(within(main).getByText("Body copy")).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("no lead given: no empty paragraph", () => {
    render(
      <ContentShell eyebrow="E" title="T">
        <span />
      </ContentShell>
    );
    expect(screen.getByRole("main").querySelector(".lead")).toBeNull();
  });

  it("the nav shows Analytics only when the server flag allows it", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "");
    const { unmount } = render(<ContentShell eyebrow="E" title="T">x</ContentShell>);
    expect(within(screen.getByRole("navigation")).queryByRole("link", { name: "Analytics" })).toBeNull();
    unmount();
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "1");
    render(<ContentShell eyebrow="E" title="T">x</ContentShell>);
    expect(within(screen.getByRole("navigation")).getByRole("link", { name: "Analytics" })).toBeTruthy();
  });
});

describe("ledger marks", () => {
  it("LedgerLine: label, optional sub, value; the dotted leader is hidden from screen readers", () => {
    const { container } = render(<LedgerLine label="Bank login" sub="NONE ASKED" value="NEVER" valueColor="red" strong size={20} style={{ marginTop: 3 }} />);
    expect(container.textContent).toBe("Bank loginNONE ASKEDNEVER");
    const row = container.firstElementChild as HTMLElement;
    expect(row.style.marginTop).toBe("3px");
    const [label, leader, value] = [...row.children] as HTMLElement[];
    expect(label!.style.fontWeight).toBe("700");
    expect(leader!.getAttribute("aria-hidden")).toBe("true");
    expect(value!.style.color).toBe("red");
    expect(value!.style.fontSize).toBe("21px");
  });

  it("LedgerLine defaults: no sub, regular weight, ink colour", () => {
    const { container } = render(<LedgerLine label="Plan" value="$0" />);
    const [label] = [...(container.firstElementChild as HTMLElement).children] as HTMLElement[];
    expect(label!.children).toHaveLength(0);
    expect(label!.style.fontWeight).toBe("500");
    // jsdom drops var() colours, so the colour is read from the server HTML.
    expect(renderToStaticMarkup(<LedgerLine label="Plan" value="$0" />)).toContain("color:var(--ink)\">$0</span>");
  });

  it("ColumnHeads: both heads, in order", () => {
    const { container } = render(<ColumnHeads left="SERVICE" right="MONTHLY" style={{ gap: 4 }} />);
    expect([...(container.firstElementChild as HTMLElement).children].map((c) => c.textContent)).toEqual(["SERVICE", "MONTHLY"]);
  });

  it("TickTag: a named tone maps to its colour, an unknown one is used as given; hollow draws an outline tick", () => {
    const { container, rerender } = render(<TickTag tone="green">No bank login required</TickTag>);
    const tag = () => container.firstElementChild as HTMLElement;
    expect(tag().textContent).toBe("No bank login required");
    expect(renderToStaticMarkup(<TickTag tone="green">x</TickTag>)).toContain("color:var(--green-text)");
    expect((tag().firstElementChild as HTMLElement).getAttribute("aria-hidden")).toBe("true");
    rerender(<TickTag tone="#123456" hollow>Sample</TickTag>);
    expect(tag().style.color).toBe("rgb(18, 52, 86)");
    expect((tag().firstElementChild as HTMLElement).style.background).toBe("transparent");
    rerender(<TickTag>Plain</TickTag>);
    expect(renderToStaticMarkup(<TickTag>x</TickTag>)).toContain("color:var(--ink-3)");
  });
});

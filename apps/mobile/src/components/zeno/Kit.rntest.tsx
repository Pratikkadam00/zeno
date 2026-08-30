import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { AmountDisplay } from "./AmountDisplay";
import { Card } from "./Card";
import { Masthead, ScreenHeader } from "./Chrome";
import { ColumnHeads, ScanLine, SkeletonRow, TearEdge } from "./Ledger";
import { ZenoThemeProvider } from "../../theme/theme-provider";

/* Component tests for the Honest Ledger kit pieces that carry real logic or are
   used on 3+ screens. Complements Ledger.rntest.tsx (rows/stamps/buttons). */

const wrap = (ui: React.ReactElement) => render(<ZenoThemeProvider>{ui}</ZenoThemeProvider>);

describe("AmountDisplay", () => {
  it("renders a money figure split into whole and cents", () => {
    wrap(<AmountDisplay amount={61.97} currency="$" />);
    expect(screen.getByText("$")).toBeTruthy();
    expect(screen.getByText("61")).toBeTruthy();
    expect(screen.getByText(".97")).toBeTruthy();
  });

  it("pads cents so a round number never renders as '.9'", () => {
    wrap(<AmountDisplay amount={12.9} currency="$" />);
    expect(screen.getByText(".90")).toBeTruthy();
  });

  it("renders zero honestly rather than blank", () => {
    wrap(<AmountDisplay amount={0} currency="$" />);
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText(".00")).toBeTruthy();
  });

  it("shows the cadence suffix when given", () => {
    wrap(<AmountDisplay amount={9.99} currency="$" cadence="mo" />);
    expect(screen.getByText("/mo")).toBeTruthy();
  });

  it("without `animate`, renders the FINAL value immediately (no count-up from 0)", () => {
    wrap(<AmountDisplay amount={84.31} currency="$" />);
    expect(screen.getByText("84")).toBeTruthy();
  });

  it("with `animate`, still settles on the exact final value", () => {
    jest.useFakeTimers();
    wrap(<AmountDisplay amount={84.31} currency="$" animate animateMs={600} />);
    // drive past the animation window AND the rAF failsafe
    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(screen.getByText("84")).toBeTruthy();
    expect(screen.getByText(".31")).toBeTruthy();
    jest.useRealTimers();
  });
});

describe("Chrome", () => {
  it("Masthead renders kicker and title", () => {
    wrap(<Masthead kicker="THE LEDGER · THU JUL 10" title="Your ledger" />);
    expect(screen.getByText("THE LEDGER · THU JUL 10")).toBeTruthy();
    expect(screen.getByText("Your ledger")).toBeTruthy();
  });

  it("Masthead renders without a kicker", () => {
    wrap(<Masthead title="Subscriptions" />);
    expect(screen.getByText("Subscriptions")).toBeTruthy();
  });

  it("ScreenHeader renders its title", () => {
    wrap(<ScreenHeader title="Entertainment" />);
    expect(screen.getByText("Entertainment")).toBeTruthy();
  });
});

describe("ColumnHeads", () => {
  it("renders both table heads", () => {
    wrap(<ColumnHeads left="SERVICE" right="AMOUNT / NEXT" />);
    expect(screen.getByText("SERVICE")).toBeTruthy();
    expect(screen.getByText("AMOUNT / NEXT")).toBeTruthy();
  });
});

describe("Card", () => {
  it("renders its children", () => {
    wrap(
      <Card>
        <ColumnHeads left="A" right="B" />
      </Card>
    );
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("fires onPress and exposes a button role when interactive", () => {
    const onPress = jest.fn();
    wrap(
      <Card onPress={onPress} accessibilityLabel="Open statement">
        <ColumnHeads left="A" right="B" />
      </Card>
    );
    fireEvent.press(screen.getByRole("button", { name: "Open statement" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("decorative ledger elements render without crashing", () => {
  it("TearEdge, SkeletonRow and ScanLine mount", () => {
    const view = wrap(
      <>
        <TearEdge />
        <TearEdge flip />
        <SkeletonRow />
        <ScanLine height={60} />
      </>
    );
    expect(view.toJSON()).toBeTruthy();
  });

  it("ScanLine is hidden from screen readers (it is pure decoration)", () => {
    wrap(<ScanLine height={40} />);
    // no accessible text should be exposed by the scan animation
    expect(screen.queryByText(/scan/i)).toBeNull();
  });
});

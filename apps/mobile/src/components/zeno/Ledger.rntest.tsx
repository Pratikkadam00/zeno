import { render, screen, fireEvent } from "@testing-library/react-native";
import { CodeBoxes, LedgerLine, SectionHead, Stamp } from "./Ledger";
import { Button } from "./Button";
import { ZenoThemeProvider } from "../../theme/theme-provider";

/* RN component tests (jest project — see jest.config.js). These render the real
   Honest Ledger components through the real theme provider, so they catch the
   things a type-check can't: missing text, a mis-wired press handler, or a
   signature element quietly not rendering. */

const wrap = (ui: React.ReactElement) => render(<ZenoThemeProvider>{ui}</ZenoThemeProvider>);

describe("LedgerLine", () => {
  it("renders the label and the mono value (the signature row)", () => {
    wrap(<LedgerLine label="Netflix" value="$15.99" />);
    expect(screen.getByText("Netflix")).toBeTruthy();
    expect(screen.getByText("$15.99")).toBeTruthy();
  });

  it("renders the optional sub-label without dropping the value", () => {
    wrap(<LedgerLine label="Spotify" sub="MONTHLY" value="$10.99" />);
    expect(screen.getByText("MONTHLY")).toBeTruthy();
    expect(screen.getByText("$10.99")).toBeTruthy();
  });
});

describe("SectionHead", () => {
  it("renders its caps-mono heading text", () => {
    wrap(<SectionHead>Upcoming</SectionHead>);
    expect(screen.getByText("Upcoming")).toBeTruthy();
  });
});

describe("Stamp", () => {
  it("renders the stamp text and its sub-line", () => {
    wrap(
      <Stamp tone="verified" sub="12 JUL 2026">
        Cancelled
      </Stamp>
    );
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.getByText("12 JUL 2026")).toBeTruthy();
  });
});

describe("CodeBoxes", () => {
  it("renders one box per character and pads the remainder", () => {
    wrap(<CodeBoxes code="AB12" length={8} />);
    // the four supplied characters render...
    for (const ch of ["A", "B", "1", "2"]) {
      expect(screen.getByText(ch)).toBeTruthy();
    }
    // ...and the four empty slots show the placeholder dot.
    expect(screen.getAllByText("·")).toHaveLength(4);
  });
});

describe("Button", () => {
  it("fires onPress when tapped", () => {
    const onPress = jest.fn();
    wrap(
      <Button variant="primary" onPress={onPress}>
        Save changes
      </Button>
    );
    fireEvent.press(screen.getByText("Save changes"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not fire onPress when disabled", () => {
    const onPress = jest.fn();
    wrap(
      <Button variant="primary" disabled onPress={onPress}>
        Save changes
      </Button>
    );
    fireEvent.press(screen.getByText("Save changes"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("exposes an accessible button role and label", () => {
    wrap(
      <Button variant="money" accessibilityLabel="Claim savings" onPress={() => {}}>
        Claim
      </Button>
    );
    expect(screen.getByRole("button", { name: "Claim savings" })).toBeTruthy();
  });
});

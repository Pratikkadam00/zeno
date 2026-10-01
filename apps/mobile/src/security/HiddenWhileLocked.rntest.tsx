import { render, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import { Text } from "react-native";
import { HiddenWhileLocked } from "./HiddenWhileLocked";

/**
 * F105: while the lock overlay covers the app, the app underneath is removed
 * from the accessibility tree (Android and iOS), and it is the SAME element
 * either way, so locking never remounts (and resets) the app.
 */
function shown(covered: boolean) {
  return render(
    <HiddenWhileLocked covered={covered}>
      <Text testID="ledger-line">Netflix $15.49</Text>
    </HiddenWhileLocked>
  );
}

describe("HiddenWhileLocked", () => {
  it("covered: the content is hidden from accessibility services on Android and iOS", () => {
    shown(true);
    const shield = screen.root;
    expect(shield.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(shield.props.accessibilityElementsHidden).toBe(true);
  });

  it("not covered: the content is reachable as normal", () => {
    shown(false);
    const shield = screen.root;
    expect(shield.props.importantForAccessibility).toBe("auto");
    expect(shield.props.accessibilityElementsHidden).toBe(false);
  });

  it("locking and unlocking never remount the app (its state survives)", () => {
    const mounts = jest.fn();
    function App() {
      useEffect(() => { mounts(); }, []);
      return <Text>ledger</Text>;
    }
    const r = render(<HiddenWhileLocked covered={false}><App /></HiddenWhileLocked>);
    r.rerender(<HiddenWhileLocked covered><App /></HiddenWhileLocked>);
    r.rerender(<HiddenWhileLocked covered={false}><App /></HiddenWhileLocked>);
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(screen.getByText("ledger")).toBeTruthy();
  });
});

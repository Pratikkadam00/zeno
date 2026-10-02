import { act, render, screen } from "@testing-library/react-native";
import { Modal, Text } from "react-native";
import { AppModal } from "./AppModal";
import { useLockStore } from "./lock-store";

// The lock store's own suite covers its logic; here only its two flags matter.
jest.mock("./lock-store", () => {
  const { create } = jest.requireActual("zustand");
  return { useLockStore: create(() => ({ ready: true, locked: false })) };
});

/**
 * F159: a modal must never sit over the lock. While the lock covers the app
 * (not loaded yet, or engaged) every AppModal is hidden; after unlocking the
 * one that was open is back.
 */
function menu(visible: boolean) {
  return render(<AppModal visible={visible} transparent><Text>Pause subscription</Text></AppModal>);
}
const shownModal = () => screen.UNSAFE_getByType(Modal).props.visible as boolean;

beforeEach(() => {
  act(() => { useLockStore.setState({ ready: true, locked: false }); });
});

describe("AppModal (F159)", () => {
  it("unlocked: shows when asked, hidden when not", () => {
    menu(true);
    expect(shownModal()).toBe(true);
    screen.rerender(<AppModal visible={false} transparent><Text>Pause subscription</Text></AppModal>);
    expect(shownModal()).toBe(false);
  });

  it("an open menu is hidden the moment the app locks, and back after unlocking", () => {
    menu(true);
    act(() => { useLockStore.setState({ locked: true }); });
    expect(shownModal()).toBe(false);
    act(() => { useLockStore.setState({ locked: false }); });
    expect(shownModal()).toBe(true);
  });

  it("before the lock has loaded (fail-closed): hidden", () => {
    act(() => { useLockStore.setState({ ready: false }); });
    menu(true);
    expect(shownModal()).toBe(false);
  });

  it("passes the rest through (transparent, animation, onRequestClose)", () => {
    const onRequestClose = jest.fn();
    render(<AppModal visible transparent animationType="fade" onRequestClose={onRequestClose}><Text>x</Text></AppModal>);
    const modal = screen.UNSAFE_getByType(Modal);
    expect(modal.props.transparent).toBe(true);
    expect(modal.props.animationType).toBe("fade");
    modal.props.onRequestClose();
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { AccessibilityInfo, Modal, Text } from "react-native";
import { ZenoThemeProvider } from "../theme/theme-provider";
import { haptics } from "../theme/haptics";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { ComingSoon } from "./ComingSoon";
import { SplashSequence } from "./SplashSequence";
import { ConfirmSheet, LedgerSheet } from "./zeno/LedgerSheet";
import { ScanLine, SkeletonRow, Stamp } from "./zeno/Ledger";

/**
 * P3.8b: the shared components with behaviour of their own: the picker and
 * confirm sheets, the "coming soon" placeholder, the root error boundary, the
 * launch splash (its safety timer, with and without reduced motion), and the
 * ledger kit's animated pieces under reduced motion.
 */
// The library's own mock exports `default` without __esModule, so a default import
// would receive the whole object; mark it as an ES module.
jest.mock("@gorhom/bottom-sheet", () => ({ __esModule: true, ...jest.requireActual("@gorhom/bottom-sheet/mock") }));
// The sheet opens in an AppModal (F162), which reads the lock store: loaded and unlocked here.
jest.mock("../security/lock-store", () => jest.requireActual("../test-support/screen-fakes").fakeLockStoreModule);
const mockCapture = jest.fn();
jest.mock("../monitoring/report", () => ({ captureError: (...args: unknown[]) => mockCapture(...args) }));

const reduceMotion = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");
beforeEach(() => {
  reduceMotion.mockResolvedValue(false);
  mockCapture.mockReset();
});

async function shown(ui: React.ReactElement) {
  const r = render(<ZenoThemeProvider>{ui}</ZenoThemeProvider>);
  await act(async () => {}); // the provider's storage reads, and useReducedMotion's
  return r;
}

describe("LedgerSheet", () => {
  const options = [
    { value: "monthly", label: "Monthly", selected: true },
    { value: "annual", label: "Yearly", meta: "save 20 %" }
  ];

  it("closed: renders nothing", async () => {
    await shown(<LedgerSheet open={false} title="Billing cycle" options={options} onPick={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByText("Billing cycle")).toBeNull();
  });

  it("open: the title and every option as a labelled button, the current one marked selected", async () => {
    await shown(<LedgerSheet open title="Billing cycle" options={options} onPick={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText("Billing cycle")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Monthly" }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole("button", { name: "Yearly, save 20 %" }).props.accessibilityState).toMatchObject({ selected: false });
  });

  it("picking an option reports its value with a haptic; Close closes", async () => {
    const onPick = jest.fn();
    const onClose = jest.fn();
    const tick = jest.spyOn(haptics, "rowPress");
    await shown(<LedgerSheet open title="Billing cycle" options={options} onPick={onPick} onClose={onClose} />);
    fireEvent.press(screen.getByRole("button", { name: "Yearly, save 20 %" }));
    expect(onPick).toHaveBeenCalledWith("annual");
    expect(tick).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
    tick.mockRestore();
  });

  it("F162: the sheet is its own window (a Modal), so nothing behind it reaches a screen reader; Android Back closes it", async () => {
    const onClose = jest.fn();
    await shown(<LedgerSheet open title="Home currency" options={options} onPick={jest.fn()} onClose={onClose} />);
    const modal = screen.UNSAFE_getByType(Modal);
    expect(modal.props.visible).toBe(true);
    expect(modal.props.transparent).toBe(true);
    expect(within(modal).getByText("Home currency")).toBeTruthy();
    expect(within(modal).getByRole("button", { name: "Monthly" })).toBeTruthy();
    modal.props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the backdrop closes the sheet when tapped", async () => {
    await shown(<LedgerSheet open title="T" options={options} onPick={jest.fn()} onClose={jest.fn()} />);
    const sheet = screen.UNSAFE_root.findAll((n) => typeof n.props.backdropComponent === "function")[0]!;
    const backdrop = sheet.props.backdropComponent({ animatedIndex: { value: 0 }, animatedPosition: { value: 0 }, style: {} });
    expect(backdrop.props).toMatchObject({ pressBehavior: "close", appearsOnIndex: 0, disappearsOnIndex: -1 });
  });
});

describe("ConfirmSheet", () => {
  it("one danger option with the note, and Cancel instead of Close", async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    await shown(<ConfirmSheet open title="Delete Netflix?" confirmLabel="Delete" note="This can't be undone." onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByText("This can't be undone.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledWith("confirm");
    fireEvent.press(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("without a note, no note is shown", async () => {
    await shown(<ConfirmSheet open title="Sign out?" confirmLabel="Sign out" onConfirm={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getAllByText(/./).map((n) => n.props.children)).not.toContain(undefined);
    expect(screen.queryByText("This can't be undone.")).toBeNull();
  });
});

describe("ComingSoon", () => {
  it("says it is not built yet and lists what is coming, with no waitlist it can't keep (F153)", async () => {
    await shown(<ComingSoon title="Widgets" tagline="Glanceable renewals." points={["Home screen", "Lock screen"]} />);
    expect(screen.getByText("COMING SOON")).toBeTruthy();
    expect(screen.getByText("Glanceable renewals.")).toBeTruthy();
    expect(screen.getByText("Home screen")).toBeTruthy();
    expect(screen.getByText("Lock screen")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/on the list|let you know/)).toBeNull();
  });
});

describe("AppErrorBoundary", () => {
  function Boom({ fail }: { fail: boolean }): React.JSX.Element {
    if (fail) throw new Error("render failed");
    return <Text>the app</Text>;
  }

  it("a crash anywhere below shows a recoverable screen and is reported, with the component stack", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    render(<AppErrorBoundary><Boom fail /></AppErrorBoundary>);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(mockCapture).toHaveBeenCalledWith(expect.objectContaining({ message: "render failed" }), expect.objectContaining({ componentStack: expect.any(String) }));
    consoleError.mockRestore();
  });

  it("Try again re-renders the app (once the cause is gone)", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    let fail = true;
    function Flaky() {
      return <Boom fail={fail} />;
    }
    render(<AppErrorBoundary><Flaky /></AppErrorBoundary>);
    fail = false;
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("the app")).toBeTruthy();
    consoleError.mockRestore();
  });

  it("without an error it is invisible", () => {
    render(<AppErrorBoundary><Text>fine</Text></AppErrorBoundary>);
    expect(screen.getByText("fine")).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });
});

describe("SplashSequence: onDone always fires on a timer, so the splash can never stick", () => {
  afterEach(() => jest.useRealTimers());

  it("full motion: hands over after 2250 ms, and draws the lockup", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    await shown(<SplashSequence onDone={onDone} />);
    expect(screen.getByText("zeno")).toBeTruthy();
    expect(screen.getByText("THE HONEST LEDGER")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(2249); });
    expect(onDone).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("reduced motion: no tear animation, hands over after 700 ms", async () => {
    reduceMotion.mockResolvedValue(true);
    jest.useFakeTimers();
    const onDone = jest.fn();
    await shown(<SplashSequence onDone={onDone} />);
    act(() => { jest.advanceTimersByTime(700); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("unmounted early: the timer is cleared, onDone never fires", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    const r = await shown(<SplashSequence onDone={onDone} />);
    r.unmount();
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("the ledger kit's animated pieces", () => {
  it("an animated Stamp lands with the success haptic; under reduced motion (once known) it fades in with no haptic (F107)", async () => {
    const landed = jest.spyOn(haptics, "stampLanded");
    const r = await shown(<Stamp animate>VERIFIED</Stamp>);
    expect(screen.getByText("VERIFIED")).toBeTruthy();
    expect(landed).toHaveBeenCalledTimes(1);
    r.unmount();
    landed.mockClear();
    // The app reads the setting at launch (the splash); a Stamp mounts later.
    reduceMotion.mockResolvedValue(true);
    (await shown(<SkeletonRow />)).unmount();
    await shown(<Stamp animate tone="alert">STILL CHARGING</Stamp>);
    expect(screen.getByText("STILL CHARGING")).toBeTruthy();
    expect(landed).not.toHaveBeenCalled();
    landed.mockRestore();
  });

  it("SkeletonRow and ScanLine render (static) under reduced motion", async () => {
    reduceMotion.mockResolvedValue(true);
    const r = await shown(<><SkeletonRow width={120} /><ScanLine height={80} /></>);
    expect(r.toJSON()).toBeTruthy();
  });
});

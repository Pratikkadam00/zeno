import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ChevronRight, Circle, Star } from "lucide-react-native";
import { Text, View } from "react-native";
import { ZenoThemeProvider } from "../../theme/theme-provider";
import { palette, zenoTokens } from "../../theme/zeno";
import { Badge } from "./Badge";
import { CategoryTag } from "./CategoryTag";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { Input } from "./Input";
import { ListRow } from "./ListRow";
import { ProgressBar } from "./ProgressBar";
import { SegmentedControl } from "./SegmentedControl";
import { Switch } from "./Switch";

/**
 * P3.8b: the design-system primitives every screen is built from. Each test
 * checks what the component DOES (the value shown, the colour chosen, the
 * callback fired, the accessibility role, name and state), not only that it
 * renders. The theme provider is real; it defaults to the light scheme.
 */
const c = zenoTokens("light").color;

async function shown(ui: React.ReactElement) {
  const r = render(<ZenoThemeProvider>{ui}</ZenoThemeProvider>);
  await act(async () => {}); // the provider's storage reads
  return r;
}
// A Pressable's style prop is a function of its pressed state; RNTL hands the
// host element the already-computed style, so walk up to the function.
type Node = { props: Record<string, unknown>; parent: Node | null };
function pressedStyle(host: Node, pressed: boolean): Record<string, unknown> {
  let node: Node | null = host;
  while (node && typeof node.props.style !== "function") node = node.parent;
  if (!node) throw new Error("no Pressable style function above this element");
  return flat((node.props.style as (s: { pressed: boolean }) => unknown)({ pressed }));
}
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

describe("Icon", () => {
  it("resolves a kebab-case or PascalCase name, prefers an explicit component, and falls back to a circle", async () => {
    await shown(
      <>
        <Icon name="chevron-right" />
        <Icon name="Star" size={12} />
        <Icon icon={Star} name="chevron-right" />
        <Icon name="no-such-icon" />
        <Icon />
      </>
    );
    expect(screen.UNSAFE_getAllByType(ChevronRight)).toHaveLength(1);
    expect(screen.UNSAFE_getAllByType(Star)).toHaveLength(2);
    expect(screen.UNSAFE_getAllByType(Circle)).toHaveLength(2);
    expect(screen.UNSAFE_getAllByType(Star)[0]!.props).toMatchObject({ size: 12, strokeWidth: 2 });
  });
});

describe("ProgressBar", () => {
  it.each([
    [0, 100, "0%", c.accent],
    [74, 100, "74%", c.accent],
    [75, 100, "75%", c.warning],
    [99, 100, "99%", c.warning],
    [100, 100, "100%", c.danger],
    [250, 100, "100%", c.danger],
    [-5, 100, "0%", c.accent],
    [3, 4, "75%", c.warning]
  ])("value %s of %s fills %s in the right colour (green, amber from 75 %, red at 100 %)", async (value, max, width, colour) => {
    await shown(<ProgressBar value={value} max={max} />);
    const fills = screen.UNSAFE_getAllByType(View).map((v) => flat(v.props.style)).filter((s) => s.height === "100%");
    expect(fills).toHaveLength(1);
    expect(fills[0]).toMatchObject({ width, backgroundColor: colour });
  });

  it("an explicit colour wins; the label shows the rounded percentage", async () => {
    await shown(<ProgressBar value={33.4} color="#123456" showLabel label="Streaming" />);
    const fills = screen.UNSAFE_getAllByType(View).map((v) => flat(v.props.style)).filter((s) => s.height === "100%");
    expect(fills[0]!.backgroundColor).toBe("#123456");
    expect(screen.getByText("Streaming")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
  });

  it("without showLabel there is no label row", async () => {
    await shown(<ProgressBar value={50} label="Hidden" />);
    expect(screen.queryByText("Hidden")).toBeNull();
  });
});

describe("CategoryTag", () => {
  it("a category name uses the palette's colour; a hex passes through; the text is shown", async () => {
    await shown(
      <>
        <CategoryTag color="violet">Streaming</CategoryTag>
        <CategoryTag color="#ABCDEF">Custom</CategoryTag>
        <CategoryTag>Default</CategoryTag>
      </>
    );
    const dots = screen.UNSAFE_getAllByType(View).map((v) => flat(v.props.style)).filter((s) => s.width === 8 && s.height === 8);
    expect(dots.map((d) => d.backgroundColor)).toEqual([palette.category.violet, "#ABCDEF", palette.category.slate]);
    expect(screen.getByText("Streaming")).toBeTruthy();
  });
});

describe("Badge", () => {
  const textColour = (label: string) => flat(screen.getByText(label).props.style).color;
  // F233: a soft chip carries the tone's TEXT grade (the fill grade was
  // 2.79-3.18:1 on its own chip), and every solid chip but the neutral one
  // carries ink (white was 3.10:1 on the green, 3.67 on the red, 3.68 on the
  // blue). The neutral chip is the one dark fill, so it keeps white.
  it("soft tones use their tone's text colour; solid uses ink, except the dark neutral chip", async () => {
    await shown(
      <>
        <Badge tone="danger">soft-danger</Badge>
        <Badge tone="warning">soft-warning</Badge>
        <Badge>soft-neutral</Badge>
        <Badge tone="info" solid>solid-info</Badge>
        <Badge tone="warning" solid>solid-warning</Badge>
        <Badge tone="accent" solid>solid-accent</Badge>
        <Badge tone="success" solid dot>solid-success</Badge>
        <Badge solid>solid-neutral</Badge>
      </>
    );
    expect(textColour("soft-danger")).toBe(c.dangerText);
    expect(textColour("soft-warning")).toBe(c.warningText);
    expect(textColour("soft-neutral")).toBe(c.textSecondary);
    expect(textColour("solid-info")).toBe(palette.ink[900]);
    expect(textColour("solid-warning")).toBe(palette.ink[900]);
    expect(textColour("solid-accent")).toBe(palette.ink[900]);
    expect(textColour("solid-success")).toBe(palette.ink[900]);
    expect(textColour("solid-neutral")).toBe("#FFFFFF");
  });

  it("a dot is drawn only when asked, in the tone's colour (or the text colour when solid)", async () => {
    await shown(
      <>
        <Badge tone="warning" dot>with-dot</Badge>
        <Badge tone="warning" solid dot>solid-dot</Badge>
        <Badge tone="accent">no-dot</Badge>
      </>
    );
    const dots = screen.UNSAFE_getAllByType(View).map((v) => flat(v.props.style)).filter((s) => s.width === 6);
    expect(dots.map((d) => d.backgroundColor)).toEqual([c.warning, palette.ink[900]]);
  });
});

describe("IconButton", () => {
  it("is a labelled button that fires onPress", async () => {
    const onPress = jest.fn();
    await shown(<IconButton label="Close" onPress={onPress}><Text>x</Text></IconButton>);
    const button = screen.getByRole("button", { name: "Close" });
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("disabled: announced as disabled and does not fire", async () => {
    const onPress = jest.fn();
    await shown(<IconButton label="Close" disabled onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Close" });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("a small button still gets a 44-pt touch target through hitSlop; a large one needs none", async () => {
    await shown(
      <>
        <IconButton label="small" size={26} />
        <IconButton label="large" size={48} />
      </>
    );
    expect(screen.getByLabelText("small").props.hitSlop).toBe(9);
    expect(screen.getByLabelText("large").props.hitSlop).toBe(0);
  });

  it("the primary square variant: accent fill and square radius; pressing shrinks it and darkens the fill", async () => {
    await shown(<IconButton label="p" variant="primary" shape="square" />);
    const styleAt = (pressed: boolean) => pressedStyle(screen.getByLabelText("p") as unknown as Node, pressed);
    expect(styleAt(false)).toMatchObject({ backgroundColor: c.accent, borderRadius: zenoTokens("light").radius.md, transform: [{ scale: 1 }] });
    expect(styleAt(true)).toMatchObject({ backgroundColor: c.accentPressed, transform: [{ scale: 0.92 }] });
  });
});

describe("Switch", () => {
  // The knob springs on later animation frames; run them inside act() so no
  // state update lands after a test has finished.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });
  it("is a labelled switch announcing its state; pressing asks for the opposite value", async () => {
    const onChange = jest.fn();
    const r = await shown(<Switch checked={false} onChange={onChange} accessibilityLabel="Reminders" />);
    const sw = screen.getByRole("switch", { name: "Reminders" });
    expect(sw.props.accessibilityState).toMatchObject({ checked: false, disabled: false });
    fireEvent.press(sw);
    expect(onChange).toHaveBeenLastCalledWith(true);
    r.rerender(<ZenoThemeProvider><Switch checked onChange={onChange} accessibilityLabel="Reminders" size="sm" /></ZenoThemeProvider>);
    fireEvent.press(screen.getByRole("switch", { name: "Reminders" }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("disabled: does not fire, and is announced as disabled", async () => {
    const onChange = jest.fn();
    await shown(<Switch disabled onChange={onChange} accessibilityLabel="Locked" />);
    const sw = screen.getByRole("switch", { name: "Locked" });
    fireEvent.press(sw);
    expect(onChange).not.toHaveBeenCalled();
    expect(sw.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("without a handler, pressing is harmless", async () => {
    await shown(<Switch accessibilityLabel="Plain" />);
    expect(() => fireEvent.press(screen.getByRole("switch", { name: "Plain" }))).not.toThrow();
  });
});

describe("SegmentedControl", () => {
  it("renders string and labelled options as tabs, marks the selected one, and reports the value pressed", async () => {
    const onChange = jest.fn();
    await shown(<SegmentedControl options={["Monthly", { value: "annual", label: "Yearly" }]} value="annual" onChange={onChange} size="sm" fullWidth={false} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.props.accessibilityState)).toEqual([{ selected: false }, { selected: true }]);
    fireEvent.press(screen.getByText("Monthly"));
    expect(onChange).toHaveBeenCalledWith("Monthly");
  });

  it("with no options renders no tabs, and without a handler a press is harmless", async () => {
    const r = await shown(<SegmentedControl />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    r.rerender(<ZenoThemeProvider><SegmentedControl options={["One"]} /></ZenoThemeProvider>);
    expect(() => fireEvent.press(screen.getByText("One"))).not.toThrow();
  });
});

describe("Input", () => {
  it("the visible label names the field; typing reports the text; prefix, suffix and hint are shown", async () => {
    const onChangeText = jest.fn();
    await shown(<Input label="Price" prefix="$" suffix="/mo" hint="Before tax" value="" onChangeText={onChangeText} mono keyboardType="decimal-pad" />);
    const field = screen.getByLabelText("Price");
    fireEvent.changeText(field, "9.99");
    expect(onChangeText).toHaveBeenCalledWith("9.99");
    expect(field.props.accessibilityHint).toBe("Before tax");
    for (const text of ["$", "/mo", "Before tax"]) expect(screen.getByText(text)).toBeTruthy();
  });

  it("an explicit accessibilityLabel names a field with no visible label", async () => {
    await shown(<Input accessibilityLabel="Search services" placeholder="Search" leftIcon={<Text>icon</Text>} />);
    expect(screen.getByLabelText("Search services")).toBeTruthy();
    expect(screen.getByText("icon")).toBeTruthy();
  });

  it("the border shows focus, then error over everything; the error replaces the hint", async () => {
    const r = await shown(<Input label="Name" hint="As on the bill" />);
    const box = () => flat(screen.getByLabelText("Name").parent!.parent!.props.style);
    expect(box().borderColor).toBe(c.borderDefault);
    fireEvent(screen.getByLabelText("Name"), "focus");
    expect(box().borderColor).toBe(c.accent);
    fireEvent(screen.getByLabelText("Name"), "blur");
    expect(box().borderColor).toBe(c.borderDefault);
    r.rerender(<ZenoThemeProvider><Input label="Name" hint="As on the bill" error="Required" /></ZenoThemeProvider>);
    expect(box().borderColor).toBe(c.danger);
    expect(screen.getByText("Required")).toBeTruthy();
    expect(screen.queryByText("As on the bill")).toBeNull();
  });

  it("disabled: not editable", async () => {
    await shown(<Input label="Locked" disabled multiline />);
    expect(screen.getByLabelText("Locked").props.editable).toBe(false);
  });
});

describe("ListRow", () => {
  it("pressable: a button named from title, subtitle and amount per cadence, that fires onPress", async () => {
    const onPress = jest.fn();
    await shown(<ListRow title="Netflix" subtitle="Renews Oct 2" amount="$15.49" cadence="mo" chevron divider leading={<Text>N</Text>} onPress={onPress} />);
    const row = screen.getByRole("button", { name: "Netflix, Renews Oct 2, $15.49 per mo" });
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText("/mo")).toBeTruthy();
    expect(screen.UNSAFE_getAllByType(ChevronRight)).toHaveLength(1);
    const styleAt = (pressed: boolean) => pressedStyle(row as unknown as Node, pressed);
    expect(styleAt(false).backgroundColor).toBe("transparent");
    expect(styleAt(true).backgroundColor).toBe(c.surfaceSunken);
  });

  it("an explicit label wins; an amount without cadence is read as the amount", async () => {
    await shown(
      <>
        <ListRow title="A" accessibilityLabel="Custom name" onPress={() => {}} />
        <ListRow title="Gym" amount="$40" onPress={() => {}} />
      </>
    );
    expect(screen.getByRole("button", { name: "Custom name" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gym, $40" })).toBeTruthy();
  });

  it("not pressable: no button role; a custom title node and a trailing node replace the amount", async () => {
    await shown(<ListRow title={<Text>Custom title</Text>} amount="$1" trailing={<Text>trail</Text>} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("Custom title")).toBeTruthy();
    expect(screen.getByText("trail")).toBeTruthy();
    expect(screen.queryByText("$1")).toBeNull();
  });

  it("a pressable row with nothing to read gets no empty label", async () => {
    await shown(<ListRow title={<Text>node</Text>} onPress={() => {}} />);
    expect(screen.getByRole("button").props.accessibilityLabel).toBeUndefined();
  });
});

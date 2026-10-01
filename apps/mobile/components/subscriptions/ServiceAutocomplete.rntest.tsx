import { fireEvent, render, screen } from "@testing-library/react-native";
import { services, type Service } from "@zeno/service-catalog";
import { zenoLight } from "../../src/theme/tokens";
import { ServiceAutocomplete, servicePriceLabel } from "./ServiceAutocomplete";

/**
 * F1 / P3.8b: the type-ahead under "Add subscription"'s name field, against the
 * REAL bundled catalog. Data read from the catalog before writing this:
 * "netf" matches only Netflix (streaming, $15.49/mo); "zzqqxx" matches nothing;
 * Speechify has only an annual price ($139); Substack has no price at all.
 */
const byName = (name: string) => services.find((s) => s.name === name)!;

function shown(props: Partial<React.ComponentProps<typeof ServiceAutocomplete>> & { query: string }) {
  const onSelect = jest.fn();
  const onUseCustom = jest.fn();
  render(<ServiceAutocomplete onSelect={onSelect} onUseCustom={onUseCustom} theme={zenoLight} {...props} />);
  return { onSelect, onUseCustom };
}

describe("servicePriceLabel", () => {
  it("monthly first, else annual, else nothing (never an invented price)", () => {
    expect(servicePriceLabel(byName("Netflix"))).toBe("$15.49/mo");
    expect(servicePriceLabel(byName("Speechify"))).toBe("$139.00/yr");
    expect(servicePriceLabel(byName("Substack"))).toBeNull();
  });
});

describe("ServiceAutocomplete", () => {
  it("renders nothing for an empty or blank query", () => {
    shown({ query: "   " });
    expect(screen.queryByLabelText("Service suggestions")).toBeNull();
  });

  it("renders nothing once a catalog service has been picked", () => {
    shown({ query: "netf", selectedSlug: "netflix" });
    expect(screen.queryByLabelText("Service suggestions")).toBeNull();
  });

  it("a partial query lists the catalog match as a labelled button with its price, plus a custom-entry row", () => {
    const { onSelect, onUseCustom } = shown({ query: " netf " });
    const match = screen.getByRole("button", { name: "Netflix, $15.49/mo" });
    expect(screen.getByText("streaming")).toBeTruthy();
    fireEvent.press(match);
    expect(onSelect).toHaveBeenCalledWith(byName("Netflix"));
    fireEvent.press(screen.getByRole("button", { name: "Use netf as a custom service" }));
    expect(onUseCustom).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Use “netf”")).toBeTruthy();
  });

  it("an exact name match (any case) offers no custom row", () => {
    shown({ query: "NETFLIX" });
    expect(screen.getByRole("button", { name: "Netflix, $15.49/mo" })).toBeTruthy();
    expect(screen.queryByText(/Custom service/)).toBeNull();
  });

  it("no match: only the custom row", () => {
    const { onUseCustom } = shown({ query: "zzqqxx" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.press(screen.getByRole("button", { name: "Use zzqqxx as a custom service" }));
    expect(onUseCustom).toHaveBeenCalledTimes(1);
  });

  it("a match with no known price is read by its name alone", () => {
    shown({ query: "Substack" });
    expect(screen.getByRole("button", { name: "Substack" })).toBeTruthy();
  });

  it("an underscore category is shown with a space", () => {
    const tool = services.find((s: Service) => s.category.includes("_"))!;
    shown({ query: tool.name });
    expect(screen.getAllByText(tool.category.replace("_", " ")).length).toBeGreaterThan(0);
  });
});

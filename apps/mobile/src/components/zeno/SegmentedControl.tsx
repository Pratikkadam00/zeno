import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type SegmentOption = string | { value: string; label: string };

export type SegmentedControlProps = {
  options?: SegmentOption[];
  value?: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Zeno SegmentedControl — iOS-style segmented tabs. Controlled. */
export function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  fullWidth = true,
  style
}: SegmentedControlProps) {
  const t = useZenoTokens();
  const c = t.color;
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const h = size === "sm" ? 32 : 40;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignSelf: fullWidth ? "stretch" : "flex-start",
          padding: 3,
          columnGap: 2,
          backgroundColor: c.surfaceSunken,
          borderRadius: t.radius.md
        },
        style
      ]}
    >
      {opts.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange?.(o.value)}
            style={[
              {
                flex: fullWidth ? 1 : undefined,
                height: h,
                paddingHorizontal: 16,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: t.radius.sm,
                backgroundColor: selected ? c.surfaceCard : "transparent"
              },
              selected ? t.shadow.xs : null
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: t.fonts.sans.semibold,
                fontSize: t.fontSize.bodySm,
                letterSpacing: t.letterSpacing.snug,
                color: selected ? c.textPrimary : c.textSecondary
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

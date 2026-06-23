import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";
import type { CategoryColor } from "../../theme/zeno";

export type CategoryTagProps = {
  /** A category color name (violet, blue, …) or a hex string. */
  color?: CategoryColor | string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Zeno CategoryTag — colored dot chip for a subscription category. */
export function CategoryTag({ color = "slate", children, style }: CategoryTagProps) {
  const t = useZenoTokens();
  const c = t.color;
  const dot = (t.palette.category as Record<string, string>)[color] ?? color;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          columnGap: 6,
          height: 24,
          paddingLeft: 8,
          paddingRight: 10,
          borderRadius: t.radius.pill,
          backgroundColor: c.surfaceSunken,
          borderWidth: 1,
          borderColor: c.borderSubtle
        },
        style
      ]}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text style={{ fontFamily: t.fonts.sans.medium, fontSize: t.fontSize.caption, color: c.textSecondary }}>
        {children}
      </Text>
    </View>
  );
}

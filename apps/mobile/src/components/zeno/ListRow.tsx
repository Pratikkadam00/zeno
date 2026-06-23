import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type ListRowProps = {
  leading?: ReactNode;
  title?: ReactNode;
  subtitle?: string;
  amount?: string;
  cadence?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Zeno ListRow — a single subscription line: brand tile, name + meta, trailing
 * amount/cadence and an optional chevron. The core list building block.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  amount,
  cadence,
  trailing,
  chevron = false,
  onPress,
  divider = false,
  style
}: ListRowProps) {
  const t = useZenoTokens();
  const c = t.color;

  const content = (pressed: boolean) => [
    {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      columnGap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: onPress && pressed ? c.surfaceSunken : "transparent",
      borderBottomWidth: divider ? 1 : 0,
      borderBottomColor: c.borderSubtle,
      borderRadius: t.radius.md
    },
    style
  ];

  const inner = (
    <>
      {leading ? <View>{leading}</View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === "string" ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: t.fonts.sans.semibold,
              fontSize: t.fontSize.body,
              letterSpacing: t.letterSpacing.snug,
              color: c.textPrimary
            }}
          >
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.bodySm, color: c.textTertiary, marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing != null ? (
        <View>{trailing}</View>
      ) : amount != null ? (
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: t.fontSize.body, letterSpacing: t.letterSpacing.snug, color: c.textPrimary }}>
            {amount}
          </Text>
          {cadence ? <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.caption, color: c.textTertiary }}>/{cadence}</Text> : null}
        </View>
      ) : null}
      {chevron ? <ChevronRight size={18} color={c.textTertiary} strokeWidth={2} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => content(pressed)}>
        {inner}
      </Pressable>
    );
  }
  return <View style={content(false)}>{inner}</View>;
}

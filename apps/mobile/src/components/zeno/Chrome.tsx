import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

/* Shared screen chrome — the ledger document header language.
   Ported from Zeno Design System/ui_kits/app/Chrome.jsx. */

/**
 * Masthead — a ledger document header: caps-mono kicker, display title, and a
 * closing hairline rule. Used at the top of the tab screens.
 */
export function Masthead({
  kicker,
  title,
  left,
  right,
  rule = true,
  style
}: {
  kicker?: string;
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  rule?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useZenoTokens();
  const c = t.color;
  return (
    <View style={[{ paddingTop: 4, paddingHorizontal: 20 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", columnGap: 12, minHeight: 44 }}>
        {left}
        <View style={{ flex: 1, minWidth: 0 }}>
          {kicker ? (
            <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: c.textTertiary }}>
              {kicker}
            </Text>
          ) : null}
          {title ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: t.fonts.display.bold,
                fontSize: 24,
                letterSpacing: -0.5,
                color: c.textPrimary,
                marginTop: kicker ? 2 : 0
              }}
            >
              {title}
            </Text>
          ) : null}
        </View>
        {right ? <View style={{ flexDirection: "row", alignItems: "center", columnGap: 4 }}>{right}</View> : null}
      </View>
      {rule ? <View style={{ height: 1, backgroundColor: c.rule, marginTop: 10 }} /> : null}
    </View>
  );
}

/**
 * ScreenHeader — the compact back/close header for stack screens. The title is
 * caps-mono and centered, flanked by fixed 44pt touch slots so it stays put
 * whether or not there are actions.
 */
export function ScreenHeader({
  title,
  left,
  right,
  style
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useZenoTokens();
  const c = t.color;
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, paddingVertical: 4, paddingHorizontal: 12 },
        style
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", minWidth: 44 }}>{left}</View>
      <Text
        numberOfLines={1}
        style={{ fontFamily: t.fonts.mono.bold, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase", color: c.textPrimary }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", columnGap: 4, minWidth: 44 }}>{right}</View>
    </View>
  );
}

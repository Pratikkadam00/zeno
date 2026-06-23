import { Image, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";
import { categoryOrder, palette } from "../../theme/zeno";

export type ServiceAvatarProps = {
  name?: string;
  src?: string;
  color?: string;
  size?: number;
  shape?: "rounded" | "circle";
  style?: StyleProp<ViewStyle>;
};

const ORDER = categoryOrder;

/** Deterministic brand color from the service name (stable across renders). */
function pick(name = ""): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % ORDER.length;
  }
  return palette.category[ORDER[h]];
}

/** Zeno ServiceAvatar — brand tile for a subscription; logo image or initial. */
export function ServiceAvatar({ name = "", src, color, size = 44, shape = "rounded", style }: ServiceAvatarProps) {
  const t = useZenoTokens();
  const bg = color || pick(name);
  const radius = shape === "circle" ? t.radius.pill : t.radius.md;
  const initial = (name.trim()[0] || "?").toUpperCase();

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: src ? t.color.surfaceSunken : bg,
          overflow: "hidden"
        },
        style
      ]}
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityLabel={name} />
      ) : (
        <Text style={{ fontFamily: t.fonts.display.bold, fontSize: size * 0.42, color: "#FFFFFF" }}>{initial}</Text>
      )}
    </View>
  );
}

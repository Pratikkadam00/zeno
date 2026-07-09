import { useEffect, useState } from "react";
import { Animated, Pressable, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type SwitchProps = {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Zeno Switch — iOS-style toggle; green when on, gentle spring on the knob. */
export function Switch({ checked = false, onChange, disabled = false, size = "md", style, accessibilityLabel }: SwitchProps) {
  const t = useZenoTokens();
  const dims = size === "sm" ? { w: 40, h: 24, k: 18 } : { w: 50, h: 30, k: 24 };
  const pad = (dims.h - dims.k) / 2;
  // useState (not useRef) for the same stable-across-renders Animated.Value:
  // reading a ref's .current during render is unsafe under the React
  // Compiler, and Animated.Value mutates via its own setValue()/interpolate()
  // outside React's render cycle either way, so this is a drop-in swap.
  const [anim] = useState(() => new Animated.Value(checked ? 1 : 0));

  useEffect(() => {
    Animated.spring(anim, {
      toValue: checked ? 1 : 0,
      useNativeDriver: false,
      friction: 9,
      tension: 70
    }).start();
  }, [anim, checked]);

  const left = anim.interpolate({ inputRange: [0, 1], outputRange: [pad, dims.w - dims.k - pad] });
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [t.palette.ink[200], t.color.accent] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange?.(!checked)}
      style={style}
    >
      <Animated.View
        style={{
          width: dims.w,
          height: dims.h,
          borderRadius: t.radius.pill,
          backgroundColor: bg,
          opacity: disabled ? 0.5 : 1,
          justifyContent: "center"
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            left,
            width: dims.k,
            height: dims.k,
            borderRadius: dims.k / 2,
            backgroundColor: "#FFFFFF",
            shadowColor: "#10141E",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 2
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

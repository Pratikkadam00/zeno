import { useState, type ReactNode } from "react";
import {
  TextInput,
  View,
  Text,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type InputProps = {
  label?: string;
  /** Screen-reader name when there's no visible `label` (e.g. an icon + placeholder search field). Defaults to `label`. */
  accessibilityLabel?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  leftIcon?: ReactNode;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  mono?: boolean;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoFocus?: boolean;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Zeno Input — text field with label, prefix/suffix, icons. Use prefix="$" for money. */
export function Input({
  label,
  accessibilityLabel,
  hint,
  error,
  prefix,
  suffix,
  leftIcon,
  value,
  onChangeText,
  placeholder,
  disabled = false,
  mono = false,
  keyboardType,
  secureTextEntry,
  autoFocus,
  multiline,
  style
}: InputProps) {
  const t = useZenoTokens();
  const c = t.color;
  const [focus, setFocus] = useState(false);
  const borderColor = error ? c.danger : focus ? c.accent : c.borderDefault;

  return (
    <View style={[{ rowGap: 6 }, style]}>
      {label ? (
        <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.bodySm, color: c.textSecondary }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          columnGap: 8,
          minHeight: 48,
          paddingHorizontal: 14,
          backgroundColor: disabled ? c.surfaceSunken : c.surfaceCard,
          borderWidth: 1.5,
          borderColor,
          borderRadius: t.radius.md
        }}
      >
        {leftIcon ? <View>{leftIcon}</View> : null}
        {prefix ? (
          <Text style={{ color: c.textTertiary, fontFamily: t.fonts.mono.medium }}>{prefix}</Text>
        ) : null}
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={hint}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textTertiary}
          editable={!disabled}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoFocus={autoFocus}
          multiline={multiline}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            minWidth: 0,
            paddingVertical: multiline ? 12 : 0,
            fontFamily: mono ? t.fonts.mono.semibold : t.fonts.sans.regular,
            fontSize: t.fontSize.body,
            color: c.textPrimary
          }}
        />
        {suffix ? (
          <Text style={{ color: c.textTertiary, fontSize: t.fontSize.bodySm }}>{suffix}</Text>
        ) : null}
      </View>
      {hint || error ? (
        <Text style={{ fontSize: t.fontSize.caption, color: error ? c.danger : c.textTertiary }}>{error || hint}</Text>
      ) : null}
    </View>
  );
}

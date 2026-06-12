import { View, type ViewStyle } from "react-native";

type RenewalDotProps = {
  color: string;
  size?: number;
};

export function RenewalDot({ color, size = 6 }: RenewalDotProps) {
  const dotStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color
  };

  return <View style={dotStyle} />;
}

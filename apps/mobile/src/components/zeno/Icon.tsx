import * as Lucide from "lucide-react-native";
import { Circle } from "lucide-react-native";
import type { ComponentType } from "react";

export type LucideIconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export type IconProps = {
  /** Kebab-case Lucide name ("chevron-right") or a PascalCase one. */
  name?: string;
  /** Or pass a Lucide component directly (most type-safe). */
  icon?: LucideIconComponent;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function toPascal(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const registry = Lucide as unknown as Record<string, LucideIconComponent | undefined>;

/**
 * Zeno Icon — renders a Lucide icon. 2px stroke, currentColor-style tinting.
 * Prefer passing `icon={ChevronRight}` for type safety; `name` is resolved
 * dynamically for convenience and parity with the design-system API.
 */
export function Icon({ name, icon, size = 20, color = "#000", strokeWidth = 2 }: IconProps) {
  // An unknown name falls back to a circle, imported directly so the fallback
  // can never be missing (the old `return null` guard was unreachable).
  const Resolved: LucideIconComponent = icon ?? (name ? registry[toPascal(name)] : undefined) ?? Circle;
  return <Resolved size={size} color={color} strokeWidth={strokeWidth} />;
}

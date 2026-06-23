import * as React from "react";

export interface BadgeProps {
  /** @default "neutral" */
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  /** Filled instead of tinted. @default false */
  solid?: boolean;
  /** Leading status dot. @default false */
  dot?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Compact status / metadata pill. */
export function Badge(props: BadgeProps): JSX.Element;

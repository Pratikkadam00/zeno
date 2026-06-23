import * as React from "react";

export interface AmountDisplayProps {
  amount?: number;
  /** Currency symbol. @default "$" */
  currency?: string;
  /** Cadence suffix, e.g. "mo" → "/mo". */
  cadence?: string;
  /** @default "lg" */
  size?: "sm" | "md" | "lg" | "xl";
  /** Trend arrow. "up" is red (more spend), "down" is green (less). */
  trend?: "up" | "down";
  trendValue?: string;
  color?: string;
  style?: React.CSSProperties;
}

/** Canonical money figure — mono, tabular, superscript cents. */
export function AmountDisplay(props: AmountDisplayProps): JSX.Element;

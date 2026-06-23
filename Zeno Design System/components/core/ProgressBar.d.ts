import * as React from "react";

export interface ProgressBarProps {
  value?: number;
  /** @default 100 */
  max?: number;
  /** Override the auto green→amber→red color. */
  color?: string;
  /** Bar thickness in px. @default 8 */
  height?: number;
  /** Show label row + percentage above the bar. @default false */
  showLabel?: boolean;
  label?: string;
  style?: React.CSSProperties;
}

/** Budget / usage meter with automatic threshold coloring. */
export function ProgressBar(props: ProgressBarProps): JSX.Element;

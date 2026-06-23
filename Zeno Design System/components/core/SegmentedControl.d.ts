import * as React from "react";

export interface SegmentOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  /** Options as strings or { value, label } objects. */
  options: (string | SegmentOption)[];
  value?: string;
  onChange?: (value: string) => void;
  /** @default "md" */
  size?: "sm" | "md";
  /** Stretch segments to fill width. @default true */
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

/** iOS-style segmented tab control. */
export function SegmentedControl(props: SegmentedControlProps): JSX.Element;

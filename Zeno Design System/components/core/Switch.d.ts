import * as React from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** @default "md" */
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

/** iOS-style on/off toggle. */
export function Switch(props: SwitchProps): JSX.Element;

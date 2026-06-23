import * as React from "react";

export interface IconButtonProps {
  variant?: "ghost" | "secondary" | "primary";
  /** Square px dimension. @default 40 */
  size?: number;
  shape?: "round" | "square";
  disabled?: boolean;
  /** Accessible label (also the tooltip). */
  label?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Icon-only button. Pass an <Icon> as the child. */
export function IconButton(props: IconButtonProps): JSX.Element;

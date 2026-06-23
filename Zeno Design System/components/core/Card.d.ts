import * as React from "react";

export interface CardProps {
  /** @default "md" */
  padding?: "none" | "sm" | "md" | "lg";
  /** Lift on hover; use for tappable cards. @default false */
  interactive?: boolean;
  /** Slightly stronger resting shadow. @default false */
  elevated?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Base surface container.
 */
export function Card(props: CardProps): JSX.Element;

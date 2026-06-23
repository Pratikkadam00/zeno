import * as React from "react";

export interface IconProps {
  /** Kebab-case Lucide icon name, e.g. "wallet", "chevron-right". */
  name: string;
  /** Pixel size (square). @default 20 */
  size?: number;
  /** CSS color (stroke). @default "currentColor" */
  color?: string;
  /** @default 2 */
  strokeWidth?: number;
  style?: React.CSSProperties;
}

/** Lucide icon wrapper. Requires the Lucide CDN script on the page. */
export function Icon(props: IconProps): JSX.Element;

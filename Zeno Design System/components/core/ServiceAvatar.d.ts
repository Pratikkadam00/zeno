import * as React from "react";

export interface ServiceAvatarProps {
  /** Service name — used for the fallback initial and auto color. */
  name?: string;
  /** Logo image URL. Overrides the initial. */
  src?: string;
  /** Override the auto-assigned background color. */
  color?: string;
  /** Square px size. @default 44 */
  size?: number;
  /** @default "rounded" */
  shape?: "rounded" | "circle";
  style?: React.CSSProperties;
}

/** Brand tile for a subscription service. */
export function ServiceAvatar(props: ServiceAvatarProps): JSX.Element;

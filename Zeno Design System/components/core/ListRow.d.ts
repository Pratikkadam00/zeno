import * as React from "react";

export interface ListRowProps {
  /** Leading node — usually a <ServiceAvatar> or <Icon>. */
  leading?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Pre-formatted amount string, e.g. "$15.99". */
  amount?: string;
  /** Cadence suffix shown under the amount, e.g. "mo". */
  cadence?: string;
  /** Custom trailing node; overrides amount/cadence. */
  trailing?: React.ReactNode;
  /** Show a trailing chevron. @default false */
  chevron?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** Bottom hairline divider. @default false */
  divider?: boolean;
  style?: React.CSSProperties;
}

/**
 * Subscription / list line item.
 */
export function ListRow(props: ListRowProps): JSX.Element;

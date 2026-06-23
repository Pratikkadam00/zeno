import * as React from "react";

export interface CategoryTagProps {
  /** Category color: a name (green|blue|violet|amber|coral|teal|pink|slate) or any CSS color. @default "slate" */
  color?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Colored chip labelling a subscription category. */
export function CategoryTag(props: CategoryTagProps): JSX.Element;

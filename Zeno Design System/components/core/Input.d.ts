import * as React from "react";

export interface InputProps {
  label?: string;
  hint?: string;
  /** Error message; turns the field red and replaces the hint. */
  error?: string;
  /** Leading static text, e.g. "$". */
  prefix?: React.ReactNode;
  /** Trailing static text, e.g. "/mo". */
  suffix?: React.ReactNode;
  leftIcon?: React.ReactNode;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Use mono numerals (money entry). @default false */
  mono?: boolean;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

/**
 * Text input with label, prefix/suffix, icon and error states.
 */
export function Input(props: InputProps): JSX.Element;

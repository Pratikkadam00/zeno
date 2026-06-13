"use client";

import { Component, type ReactNode } from "react";

// Contains any rendering error from its children (e.g. a WebGL/three.js
// failure) so it can never crash the whole page — falls back to `fallback`.
export class SafeMount extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Non-fatal: log for diagnostics, keep the rest of the page alive.
    if (typeof console !== "undefined") console.warn("SafeMount caught an error:", error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}

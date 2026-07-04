import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { captureError } from "../monitoring/report";

type Props = { children: ReactNode };
type State = { error: Error | null };

// Root error boundary: catches any render/lifecycle exception anywhere in the
// tree so an uncaught error shows a recoverable screen instead of a blank view
// (dev) or a native crash (production). Intentionally self-contained — it uses
// no theme/store hooks and hardcodes its styles, so it can still render even if
// the crash originated in the theme provider or a store.
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureError(error, { componentStack: info.componentStack ?? undefined });
  }

  private readonly reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          backgroundColor: "#0B0B0F"
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800", textAlign: "center" }}>
          Something went wrong
        </Text>
        <Text
          style={{
            color: "#A0A0A8",
            fontSize: 15,
            textAlign: "center",
            marginTop: 10,
            lineHeight: 21
          }}
        >
          Zeno hit an unexpected error. Your data is safe on this device. Tap Try again — if it keeps
          happening, fully restart the app.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={this.reset}
          style={{
            marginTop: 22,
            backgroundColor: "#2ED37F",
            borderRadius: 14,
            paddingHorizontal: 24,
            paddingVertical: 12
          }}
        >
          <Text style={{ color: "#04120A", fontSize: 16, fontWeight: "800" }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { listConnectedGmailAccounts } from "./emailScanner";

export type InboxState = { status: "loading" } | { status: "ready"; count: number } | { status: "error" };

// Finding F29: Settings' "Connected inboxes" row was the hard-coded string
// "None connected", a false statement whenever Gmail was connected. It now says
// what the device actually holds (the same list Discover uses), and says so
// honestly while it is still reading or when it cannot read.
export function connectedInboxesLabel(state: InboxState): string {
  if (state.status === "loading") return "…";
  if (state.status === "error") return "Unavailable";
  if (state.count === 0) return "None connected";
  return state.count === 1 ? "1 inbox" : `${state.count} inboxes`;
}

/** Re-read every time the screen comes into focus (e.g. back from Discover, where inboxes are connected). */
export function useConnectedInboxesLabel(): string {
  const [state, setState] = useState<InboxState>({ status: "loading" });
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listConnectedGmailAccounts()
        .then((accounts) => {
          if (active) setState({ status: "ready", count: accounts.length });
        })
        .catch(() => {
          if (active) setState({ status: "error" });
        });
      return () => {
        active = false;
      };
    }, [])
  );
  return connectedInboxesLabel(state);
}

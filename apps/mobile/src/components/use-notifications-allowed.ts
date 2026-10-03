import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { notificationsAllowed } from "../notifications/notificationService";

/**
 * Whether the phone will show Zeno's notifications (F192), re-read whenever the
 * app comes back to the foreground (the user may have just changed it in the
 * phone's settings). null until known, or when it can't be known.
 */
export function useNotificationsAllowed(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    const check = () => {
      void notificationsAllowed().then((value) => {
        if (live) setAllowed(value);
      });
    };
    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  return allowed;
}

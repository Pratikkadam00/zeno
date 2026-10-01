import { allowScreenCaptureAsync, preventScreenCaptureAsync } from "expo-screen-capture";
import { useEffect } from "react";

// P3.7: screenshots and screen recording are blocked while a screen that takes
// the app PIN is showing (the lock overlay, Settings → App lock). On Android
// this is the window's FLAG_SECURE, which also blanks the recent-apps preview.
// App-wide blocking is the owner's decision (it stops the user's own
// screenshots too), so it is not done here.
//
// expo-screen-capture's own hook leaves its promises unhandled, and they reject
// where the native module is missing (UnavailabilityError). Blocking is a
// defence in depth, not a gate: a failure is caught so it can never crash the
// lock screen, and the lock itself still works.
export function useBlockScreenCapture(key: string): void {
  useEffect(() => {
    preventScreenCaptureAsync(key).catch(() => {});
    return () => {
      allowScreenCaptureAsync(key).catch(() => {});
    };
  }, [key]);
}

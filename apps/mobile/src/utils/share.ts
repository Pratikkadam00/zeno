import { Share } from "react-native";

// Every shareable card ends with the same brand line — the "watermark" for
// text-based shares (no image-capture library in this app; see
// ZENO_MASTER_PLAN.md Phase 3 for why text, not a rendered image, was chosen).
export const SHARE_SIGNATURE = "— via Zeno · zeno.app";

// Thin wrapper matching the error-swallowing already established by
// wrapped.tsx's original shareSummary: the user dismissing the native share
// sheet is not an error and must never surface one.
export async function shareText(message: string): Promise<void> {
  try {
    await Share.share({ message: `${message}\n\n${SHARE_SIGNATURE}` });
  } catch {
    // user dismissed the share sheet
  }
}

import { Modal, type ModalProps } from "react-native";
import { useLockStore } from "./lock-store";

/**
 * The app's only Modal (F159; eslint forbids importing react-native's Modal
 * anywhere else). A Modal is its own window, above the activity and above the
 * lock cover, and React Native raises open modals again when the app resumes.
 * So a menu or editor left open when the app locked stayed on top of the lock
 * and kept working: Pause ran on a locked app (seen on the emulator). Here a
 * modal is hidden whenever the lock covers the app (not yet loaded, or
 * engaged) and comes back, as it was, after unlocking.
 */
export function AppModal({ visible, ...props }: ModalProps) {
  const covered = useLockStore((s) => !s.ready || s.locked);
  return <Modal {...props} visible={Boolean(visible) && !covered} />;
}

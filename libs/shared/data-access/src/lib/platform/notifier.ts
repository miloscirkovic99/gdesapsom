export type NoticeKind = 'success' | 'error';

/**
 * Shows a short, already translated message to the user.
 *
 * Stores call this instead of a UI library so they can run in any app: the
 * portal shows a Material snackbar, the mobile app uses Ionic's ToastController.
 * There is no default implementation; an app that uses the stores must provide one.
 *
 * (Tailwind scans libs/ for class names, so avoid bare daisyUI component
 * words in comments here: the word for a pop-up message alone pulls in ~2 kB of CSS.)
 */
export abstract class Notifier {
  abstract notify(message: string, kind: NoticeKind, action?: string): void;
}

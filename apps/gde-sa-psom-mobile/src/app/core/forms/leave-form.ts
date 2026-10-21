import { inject, Injectable } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AlertController } from '@ionic/angular/alert-controller';
import { NavController } from '@ionic/angular/nav-controller';
import { TranslocoService } from '@ngneat/transloco';

/** The tab the suggest forms live in; leaving a form returns to its list. */
export const MORE_ROOT = '/tabs/more';

/** A screen holding input the user would lose by navigating away from it. */
export interface GuardedForm {
  /** True while something has been entered and not sent. */
  hasUnsavedInput(): boolean;
  /** The user agreed to leave: forget the input and its saved draft. */
  discard(): void;
  /** The question to ask (a translation key); "Discard this suggestion?" when not set. */
  readonly discardTitle?: string;
}

/** "Discard this suggestion?" (or another question) with Keep editing / Discard. */
@Injectable({ providedIn: 'root' })
export class DiscardDialog {
  private readonly alerts = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  /** Resolves true only when the user picked Discard (not Keep editing, back or a tap outside). */
  async confirm(title = 'mobile_leave_title'): Promise<boolean> {
    const t = (key: string) => this.transloco.translate(key);
    const alert = await this.alerts.create({
      header: t(title),
      message: t('mobile_leave_text'),
      buttons: [
        { text: t('mobile_leave_stay'), role: 'cancel' },
        { text: t('mobile_leave_discard'), role: 'destructive', cssClass: 'alert-button-danger' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }
}

/**
 * Asks before a half-filled form is left: back (toolbar or Android), another
 * tab, or a link opened from outside the app. Leaving the app itself is not a
 * navigation, so a user copying a link elsewhere keeps the input (and the
 * form's draft keeps it even if Android ends the app meanwhile).
 *
 * Ionic keeps a tab's pages alive, so a form left for another tab would still
 * be there, emptied, on the next visit to More. The guard therefore takes the
 * form off the More stack first and then opens the destination.
 */
export const leaveFormGuard: CanDeactivateFn<GuardedForm> = async (form, _route, _state, nextState) => {
  // inject() only works before the first await.
  const dialog = inject(DiscardDialog);
  const nav = inject(NavController);

  if (!form.hasUnsavedInput()) return true;
  if (!(await dialog.confirm(form.discardTitle))) return false;
  form.discard();

  const target = nextState?.url ?? MORE_ROOT;
  if (target.split('?')[0] === MORE_ROOT) return true;

  // After this navigation has been cancelled; the form now lets anything through.
  setTimeout(async () => {
    await nav.navigateBack(MORE_ROOT, { animated: false });
    if (target.startsWith(`${MORE_ROOT}/`)) await nav.navigateForward(target);
    else await nav.navigateRoot(target, { animated: false });
  });
  return false;
};

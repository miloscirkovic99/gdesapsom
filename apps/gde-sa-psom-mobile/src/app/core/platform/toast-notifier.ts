import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/toast-controller';
import { TranslocoService } from '@ngneat/transloco';
import { NoticeKind, Notifier } from '@gde/shared/data-access/core';

/** A toast with the same text shown within this long is not shown again. */
const REPEAT_MS = 4000;

/** Mobile implementation of `Notifier`: an Ionic toast just above the tab bar. */
@Injectable()
export class ToastNotifier extends Notifier {
  private readonly toasts = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  #last = { message: '', at: 0 };

  /**
   * `action` only says whether the toast gets a dismiss button: the stores pass
   * their `close` text ("Nazad", the website's back button), and a toast is closed.
   */
  notify(message: string, kind: NoticeKind, action?: string): void {
    // Several requests failing together (offline at launch) would stack the same toast.
    const now = Date.now();
    if (message === this.#last.message && now - this.#last.at < REPEAT_MS) return;
    this.#last = { message, at: now };

    void this.toasts
      .create({
        message,
        duration: kind === 'error' ? 4000 : 2500,
        color: kind === 'success' ? 'success' : 'danger',
        position: 'bottom',
        positionAnchor: 'app-tab-bar',
        buttons: action ? [{ text: this.transloco.translate('close_sheet'), role: 'cancel' }] : [],
      })
      .then((toast) => toast.present());
  }
}

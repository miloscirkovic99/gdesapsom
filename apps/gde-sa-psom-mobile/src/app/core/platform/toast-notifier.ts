import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/toast-controller';
import { NoticeKind, Notifier } from '@gde/shared/data-access/core';

/** Mobile implementation of `Notifier`: an Ionic toast just above the tab bar. */
@Injectable()
export class ToastNotifier extends Notifier {
  private readonly toasts = inject(ToastController);

  notify(message: string, kind: NoticeKind, action?: string): void {
    void this.toasts
      .create({
        message,
        duration: kind === 'error' ? 4000 : 2500,
        color: kind === 'success' ? 'success' : 'danger',
        position: 'bottom',
        positionAnchor: 'app-tab-bar',
        buttons: action ? [{ text: action, role: 'cancel' }] : [],
      })
      .then((toast) => toast.present());
  }
}

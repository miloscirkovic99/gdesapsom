import { inject, Injectable } from '@angular/core';
import { NoticeKind, Notifier } from '@gde/shared/data-access/core';
import { SnackbarService } from './snackbar.service';

/** Portal implementation of `Notifier`: the Material snackbar with the app's success/error styling. */
@Injectable()
export class SnackbarNotifier extends Notifier {
  private readonly snackbarService = inject(SnackbarService);

  notify(message: string, kind: NoticeKind, action?: string): void {
    this.snackbarService.openSnackbar(
      message,
      action,
      kind === 'success' ? 'success-snackbar' : 'error-snackbar',
    );
  }
}

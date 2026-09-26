import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { Notifier } from '../platform/notifier';

@Injectable({
  providedIn: 'root',
})
export class ContactFormService {
  private http = inject(HttpClient);
  private notifier = inject(Notifier);
  private translocoService = inject(TranslocoService);
  constructor() {}

  sendEmail(data: { from: string; subject: string; message: string,showSnackbar?: boolean }) {
    const translatedActionButton = this.translocoService.translate('close');

    this.http.post<any>('gmail', data).subscribe({
      next: (result) => {
        const translatedMessage =
          this.translocoService.translate('email_success');
        if (data.showSnackbar) {
          this.notifier.notify(translatedMessage, 'success', translatedActionButton);
        }
      },
      error: (err) => {
        const translatedMessage =
          this.translocoService.translate('error_global');

        if (data.showSnackbar) {
          this.notifier.notify(translatedMessage, 'error', translatedActionButton);
        }
      },
    });
  }
}

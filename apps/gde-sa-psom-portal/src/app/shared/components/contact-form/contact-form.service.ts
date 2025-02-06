import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { TranslocoService } from '@ngneat/transloco';

@Injectable({
  providedIn: 'root',
})
export class ContactFormService {
  private http = inject(HttpClient);
  private snackbarService = inject(SnackbarService);
  private translocoService = inject(TranslocoService);
  constructor() {}

  sendEmail(data: any) {
    const translatedActionButton = this.translocoService.translate('close');

    this.http.post<any>('gmail', data).subscribe({
      next: (result) => {
        const translatedMessage =
          this.translocoService.translate('email_success');

        this.snackbarService.openSnackbar(
          translatedMessage,
          translatedActionButton,
          'success-snackbar'
        );
      },
      error: (err) => {
        const translatedMessage =
          this.translocoService.translate('error_global');

        this.snackbarService.openSnackbar(
          translatedMessage,
          translatedActionButton,
          'error-snackbar'
        );
      },
    });
  }
}

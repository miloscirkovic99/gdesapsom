import { inject, Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { TranslocoService } from '@ngneat/transloco';

@Injectable({ providedIn: 'root' })
export class VersionUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          // You can show a dialog or snackbar to the user
          if (confirm(this.transloco.translate('new_version_available'))) {
            window.location.reload();
          }
        }
      });
    }
  }
}

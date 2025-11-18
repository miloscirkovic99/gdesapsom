import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class VersionUpdateService {
  constructor(private swUpdate: SwUpdate) {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          // You can show a dialog or snackbar to the user
          if (confirm('A new version is available. Reload to update?')) {
            window.location.reload();
          }
        }
      });
    }
  }
}

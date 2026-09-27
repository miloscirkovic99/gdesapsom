import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { TranslocoService } from '@ngneat/transloco';
import { Notifier } from '@gde/shared/data-access/core';
import { Coordinates } from '@gde/shared/util';

/** The device position for "near me" searches. */
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly notifier = inject(Notifier);
  private readonly transloco = inject(TranslocoService);

  /** Current position, or null after telling the user why there is none. */
  async current(): Promise<Coordinates | null> {
    try {
      // On the web the browser asks by itself; natively we ask first so a
      // refusal gets a clear message instead of a generic error.
      if (Capacitor.isNativePlatform()) {
        let status = await Geolocation.checkPermissions();
        if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
          status = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
        }
        if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
          this.#tell('mobile_location_denied');
          return null;
        }
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      });
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch {
      this.#tell('unable_to_get_location');
      return null;
    }
  }

  #tell(key: string): void {
    this.notifier.notify(this.transloco.translate(key), 'error', this.transloco.translate('close'));
  }
}

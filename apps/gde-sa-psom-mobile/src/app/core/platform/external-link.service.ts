import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';

/**
 * Opens web pages in an in-app browser tab (Chrome Custom Tabs on Android).
 *
 * Other links (tel:, maps and delivery apps) are plain `<a href target="_blank">`:
 * Capacitor hands URLs outside the app to the system, which opens the matching app.
 */
@Injectable({ providedIn: 'root' })
export class ExternalLinkService {
  /** Venue links are often saved without a scheme ("www.instagram.com/..."). */
  static normalise(url: string): string {
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  async openWeb(url: string): Promise<void> {
    await Browser.open({ url: ExternalLinkService.normalise(url) });
  }
}

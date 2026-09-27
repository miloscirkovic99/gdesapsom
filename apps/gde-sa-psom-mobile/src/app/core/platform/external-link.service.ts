import { inject, Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { AnalyticsService, LinkContext } from '../analytics/analytics.service';

/**
 * Opens web pages in an in-app browser tab (Chrome Custom Tabs on Android).
 *
 * Other links (tel:, maps and delivery apps) are plain `<a href target="_blank">`:
 * Capacitor hands URLs outside the app to the system, which opens the matching app.
 * AnalyticsService reports taps on those by itself.
 */
@Injectable({ providedIn: 'root' })
export class ExternalLinkService {
  private readonly analytics = inject(AnalyticsService);

  /** Venue links are often saved without a scheme ("www.instagram.com/..."). */
  static normalise(url: string): string {
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  /**
   * `link` reports the page as an `outbound_click`. Leave it out when the tap
   * was on an `<a href>` (AnalyticsService has already counted it) or for the
   * website's own pages.
   */
  async openWeb(url: string, link?: LinkContext): Promise<void> {
    const target = ExternalLinkService.normalise(url);
    if (link) this.analytics.trackOutbound(target, link);
    await Browser.open({ url: target });
  }
}

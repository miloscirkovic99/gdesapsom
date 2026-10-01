import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { environment } from '../../../env/env.dev';
import { deleteCookie } from '../consent/cookies';

type DataLayerWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
} & Record<string, unknown>;

/** The cookies gtag.js writes for a GA4 property. */
const isGaCookie = (name: string): boolean => name === '_ga' || name === '_gid' || name.startsWith('_ga_');

/**
 * gtag.js for GA4, kept in step with ConsentService by AppComponent.
 *
 * Opt-out model: `initialize()` runs at startup, so every visit is measured
 * from its first page view; `setEnabled(false)` after "Samo neophodno" stops
 * the tag and deletes its cookies. Ads storage, Google Signals and ad
 * personalisation are off for everyone, so Google gets country-level
 * location only and no demographics.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAnalyticsService {
  readonly #router = inject(Router);
  readonly #document = inject(DOCUMENT);
  readonly #id: string = environment.googleAnalyticsId;
  #loaded = false;

  /** Injects gtag.js once and reports a page_view per navigation. */
  initialize(): void {
    if (this.#loaded) return;
    this.#loaded = true;

    const win = this.#document.defaultView as DataLayerWindow | null;
    if (!win) return;

    const dataLayer = (win.dataLayer = win.dataLayer || []);
    // gtag.js expects the Arguments object itself on the data layer, not an
    // array, so this cannot be an arrow function or spread its parameters.
    // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-unused-vars
    const gtag = function (..._args: unknown[]): void { dataLayer.push(arguments); };
    win.gtag = gtag;

    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
    gtag('js', new Date());
    gtag('config', this.#id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = this.#document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.#id}`;
    this.#document.head.appendChild(script);

    // The first navigation may already be over by the time consent is resolved.
    if (this.#router.navigated) this.#pageView(this.#router.url);
    this.#router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.#pageView(event.urlAfterRedirects);
    });
  }

  /**
   * `false` after "Samo neophodno": the property-level kill switch gtag.js
   * honours, consent set to denied for good measure, and the `_ga` cookies gone.
   */
  setEnabled(enabled: boolean): void {
    const win = this.#document.defaultView as DataLayerWindow | null;
    if (!win) return;

    win[`ga-disable-${this.#id}`] = !enabled;
    win.gtag?.('consent', 'update', { analytics_storage: enabled ? 'granted' : 'denied' });
    if (!enabled) this.#deleteCookies();
  }

  #pageView(path: string): void {
    const win = this.#document.defaultView as DataLayerWindow | null;
    win?.gtag?.('config', this.#id, { page_path: path });
  }

  #deleteCookies(): void {
    this.#document.cookie
      .split(';')
      .map((part) => part.split('=')[0].trim())
      .filter(isGaCookie)
      .forEach((name) => deleteCookie(this.#document, name));
  }
}

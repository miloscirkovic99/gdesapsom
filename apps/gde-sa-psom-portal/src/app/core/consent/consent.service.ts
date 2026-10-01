import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { deleteCookie, readCookie } from './cookies';

export type ConsentStatus = 'pending' | 'granted' | 'denied';

export const CONSENT_STORAGE_KEY = 'gsp_consent';
/** Written by the previous banner (ngx-cookieconsent), where dismissing meant "ok". */
const LEGACY_FLAG = 'analyticsAccepted';
const LEGACY_COOKIE = 'cookieconsent_status';

interface StoredConsent {
  v: 1;
  analytics: boolean;
  at: string;
}

/**
 * The visitor's cookie choice. The site runs an opt-out model:
 *
 * - `pending`: no answer yet. Google Analytics measures visits (page views,
 *   users); custom events with parameters wait for an explicit yes.
 * - `granted`: everything on.
 * - `denied`: only the site's own storage. GA is switched off and its cookies
 *   are deleted (GoogleAnalyticsService reacts to `measurementAllowed`).
 *
 * The choice itself is kept in localStorage, which is strictly necessary and
 * therefore needs no consent. Nothing here talks to Google.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  readonly #document = inject(DOCUMENT);

  readonly status = signal<ConsentStatus>(this.#restore());
  /** Page views and users in GA. Off only after an explicit no. */
  readonly measurementAllowed = computed(() => this.status() !== 'denied');
  /** Search terms, venue slugs, outbound links. Only after an explicit yes. */
  readonly detailedEventsAllowed = computed(() => this.status() === 'granted');
  readonly bannerOpen = signal(this.status() === 'pending');

  acceptAll(): void {
    this.save(true);
  }

  necessaryOnly(): void {
    this.save(false);
  }

  save(analytics: boolean): void {
    this.status.set(analytics ? 'granted' : 'denied');
    this.bannerOpen.set(false);
    this.#persist(analytics);
  }

  /** Footer link and the cookie policy page reopen the banner to change the choice. */
  open(): void {
    this.bannerOpen.set(true);
  }

  #restore(): ConsentStatus {
    const storage = this.#storage();

    try {
      const raw = storage?.getItem(CONSENT_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<StoredConsent>;
        if (typeof stored.analytics === 'boolean') return stored.analytics ? 'granted' : 'denied';
      }
    } catch {
      // Unreadable value: fall through and ask again.
    }

    return this.#migrateLegacy(storage);
  }

  /** Carries over what the old banner recorded, then removes its traces. */
  #migrateLegacy(storage: Storage | null): ConsentStatus {
    const cookie = readCookie(this.#document, LEGACY_COOKIE);
    const flag = storage?.getItem(LEGACY_FLAG) === 'true';

    let analytics: boolean | null = null;
    if (flag || cookie === 'allow' || cookie === 'dismiss') analytics = true;
    else if (cookie === 'deny') analytics = false;

    storage?.removeItem(LEGACY_FLAG);
    if (cookie !== null) deleteCookie(this.#document, LEGACY_COOKIE);

    if (analytics === null) return 'pending';
    this.#persist(analytics);
    return analytics ? 'granted' : 'denied';
  }

  #persist(analytics: boolean): void {
    const stored: StoredConsent = { v: 1, analytics, at: new Date().toISOString() };
    try {
      this.#storage()?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Private mode or blocked storage: the choice lasts for this visit only.
    }
  }

  #storage(): Storage | null {
    try {
      return this.#document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}

import { computed, Injectable, signal } from '@angular/core';
import { ConsentStatus, ConsentType, FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export type AnalyticsConsent = 'granted' | 'denied';

const CONSENT_KEY = 'analyticsConsent';

/**
 * The user's answer to "may the app send usage statistics to Google Analytics?".
 *
 * Firebase Analytics ships switched off (meta-data in AndroidManifest.xml) and
 * is only switched on after an explicit yes; no answer counts as no. The answer
 * is asked once (ConsentPromptService) and can be changed in More > Settings.
 * Withdrawing it also deletes the analytics data still on the phone and
 * the app-instance ID, so a later yes starts as a new, unlinked user.
 *
 * Only `analytics_storage` is ever granted: the ad consent types keep their
 * denied defaults from the manifest.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsConsentService {
  /** null until the user has answered. */
  readonly consent = signal<AnalyticsConsent | null>(null);
  readonly granted = computed(() => this.consent() === 'granted');

  /** Restores the answer and re-applies it to Firebase. Runs before the first render. */
  async load(): Promise<void> {
    const { value } = await Preferences.get({ key: CONSENT_KEY });
    const consent = value === 'granted' || value === 'denied' ? value : null;
    this.consent.set(consent);
    await this.#apply(consent === 'granted');
  }

  async set(consent: AnalyticsConsent): Promise<void> {
    const withdrawn = this.granted() && consent === 'denied';
    this.consent.set(consent);
    await Preferences.set({ key: CONSENT_KEY, value: consent });
    await this.#apply(consent === 'granted', withdrawn);
  }

  async #apply(granted: boolean, withdrawn = false): Promise<void> {
    // In a browser (nx serve) Firebase is never loaded: AnalyticsService only logs to the console.
    if (!Capacitor.isNativePlatform()) return;
    try {
      await FirebaseAnalytics.setConsent({
        type: ConsentType.AnalyticsStorage,
        status: granted ? ConsentStatus.Granted : ConsentStatus.Denied,
      });
      await FirebaseAnalytics.setEnabled({ enabled: granted });
      if (withdrawn) await FirebaseAnalytics.resetAnalyticsData();
    } catch {
      // A build without google-services.json has no Firebase project: nothing is collected anyway.
    }
  }
}

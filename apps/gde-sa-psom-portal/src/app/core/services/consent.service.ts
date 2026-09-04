import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgcCookieConsentService } from 'ngx-cookieconsent';

export type ConsentStatus = 'granted' | 'denied';

/**
 * Consent categories the app knows about. They are independent: granting
 * analytics never grants marketing. Marketing has no UI yet and is therefore
 * always denied; when a marketing toggle is added, only this service changes.
 */
export interface ConsentState {
  analytics: ConsentStatus;
  marketing: ConsentStatus;
}

/** Raw answer stored by the cookieconsent library. */
type CookieConsentChoice = 'allow' | 'deny' | 'dismiss';

/** Cookie the cookieconsent library writes (strictly necessary - it only holds the choice). */
const STATUS_COOKIE = 'cookieconsent_status';
/** Flag written by the old "info" banner. It was set on dismiss, so it is not valid opt-in consent. */
const LEGACY_STORAGE_KEY = 'analyticsAccepted';

/**
 * Single source of truth for user consent.
 *
 * Wraps ngx-cookieconsent (configured as an opt-in banner in `app.config.ts`)
 * and exposes the answer as signals. Only an explicit "allow" counts as
 * analytics consent: the library's own `hasConsented()` also returns true for
 * a dismissed banner, and `getStatus()` returns the status enum rather than
 * the user's choice, so neither is used here.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly ccService = inject(NgcCookieConsentService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly choice = signal<CookieConsentChoice | null>(null);
  private initialized = false;

  readonly state = computed<ConsentState>(() => ({
    analytics: this.choice() === 'allow' ? 'granted' : 'denied',
    marketing: 'denied',
  }));

  readonly analyticsGranted = computed(() => this.state().analytics === 'granted');

  /** True once the user has pressed Allow or Deny (not merely dismissed). */
  readonly hasAnswered = computed(() => this.choice() === 'allow' || this.choice() === 'deny');

  /** Idempotent. Called once from `AppComponent`. */
  init(): void {
    if (this.initialized || !isPlatformBrowser(this.platformId)) return;
    this.initialized = true;

    this.forgetLegacyFlag();
    this.choice.set(this.readChoiceCookie());

    this.ccService.statusChange$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.choice.set(event.status));

    this.ccService.revokeChoice$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.choice.set(null));

    // A "dismiss" can only come from the previous info-style banner. The user
    // was never asked, so ask now instead of silently treating it as an answer.
    if (this.choice() === 'dismiss') {
      this.openPreferences();
    }
  }

  /** Clears the stored choice and shows the banner again so the user can re-decide. */
  openPreferences(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      this.ccService.clearStatus();
      this.choice.set(null);
      this.ccService.open();
    } catch (error) {
      console.warn('Cookie consent banner is not available', error);
    }
  }

  private readChoiceCookie(): CookieConsentChoice | null {
    const pair = this.document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${STATUS_COOKIE}=`));
    const value = pair?.slice(STATUS_COOKIE.length + 1);
    return value === 'allow' || value === 'deny' || value === 'dismiss' ? value : null;
  }

  private forgetLegacyFlag(): void {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Storage can be unavailable (private mode, blocked). Nothing to clean up then.
    }
  }
}

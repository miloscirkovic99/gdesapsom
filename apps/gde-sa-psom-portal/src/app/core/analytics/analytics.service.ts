import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  effect,
  inject,
  Injectable,
  Injector,
  PLATFORM_ID,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../env/env.dev';
import { ConsentService } from '../services/consent.service';
import {
  AnalyticsEventMap,
  AnalyticsEventName,
  AuthParams,
  BlogCtaClickParams,
  BookingParams,
  ClickToCallParams,
  GaParams,
  GetDirectionsParams,
  MapMarkerClickParams,
  MapOpenParams,
  OutboundClickParams,
  PageViewParams,
  ScrollDepthParams,
  SearchParams,
  SelectItemParams,
  ShareParams,
  ViewBlogParams,
  ViewItemParams,
  WishlistParams,
} from './analytics.events';

const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id=';
/** GA4 truncates string parameters at 100 characters; do it here so the debug log matches. */
const MAX_PARAM_LENGTH = 100;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_PATTERN = /\+?\d[\d\s().-]{6,}\d/;
const REDACTED = '[redacted]';

type SanitizedParams = Record<string, string | number | boolean>;

interface GtagWindow extends Window {
  dataLayer?: unknown[];
}

/**
 * The only place in the app that talks to gtag.js.
 *
 * Consent (Google Consent Mode v2, basic implementation):
 * - `consent default` with every signal denied is pushed to the dataLayer at
 *   init, before the tag could ever load.
 * - gtag.js is injected only after `ConsentService` reports analytics
 *   consent. Until then no Google cookie is set and no request leaves the
 *   browser. Events raised before consent are dropped, except the current
 *   page's `page_view`, which is sent once when consent arrives.
 * - Revoking consent pushes `consent update: denied`, disables the tag via
 *   `ga-disable-<id>`, and clears the `_ga*` cookies.
 * - ad_* signals stay denied: marketing consent is separate and not offered.
 *
 * Page views: one per path change from the router (see `onNavigationEnd`).
 * Query-string and fragment changes on the same path are not page views;
 * the `search` event covers filter changes on list pages.
 *
 * Debugging: non-production builds send `debug_mode` (GA4 DebugView) and log
 * every dataLayer push as `[GA4] …` in the console. Production logs nothing.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly consent = inject(ConsentService);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly measurementId = environment.googleAnalyticsId;
  private readonly debug = !environment.production;

  private initialized = false;
  private scriptLoaded = false;
  private enabled = false;
  private currentPage: PageViewParams | null = null;
  private currentPageSent = false;

  /** Idempotent. Called once from `AppComponent`. */
  init(): void {
    if (this.initialized || !isPlatformBrowser(this.platformId)) return;
    this.initialized = true;

    if (!this.measurementId) {
      this.log('no measurement id configured - analytics disabled');
      return;
    }

    this.consent.init();
    this.pushConsentDefault();

    effect(
      () => {
        const granted = this.consent.analyticsGranted();
        untracked(() => (granted ? this.enable() : this.disable()));
      },
      { injector: this.injector }
    );

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => this.onNavigationEnd(event));
  }

  // ── Page / navigation ──────────────────────────────────────────────────────

  /** Manual page view. Route changes are tracked automatically; use this only for virtual pages. */
  trackPageView(params: PageViewParams): void {
    this.send('page_view', params);
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  trackSearch(params: SearchParams): void {
    this.send('search', params);
  }

  // ── Listings ───────────────────────────────────────────────────────────────

  trackViewItem(params: ViewItemParams): void {
    this.send('view_item', params);
  }

  trackSelectItem(params: SelectItemParams): void {
    this.send('select_item', params);
  }

  // ── Wishlist (no UI yet - wired for when favourites ship) ─────────────────

  trackAddToWishlist(params: WishlistParams): void {
    this.send('add_to_wishlist', params);
  }

  trackRemoveFromWishlist(params: WishlistParams): void {
    this.send('remove_from_wishlist', params);
  }

  // ── Map ────────────────────────────────────────────────────────────────────

  trackMapOpen(params: MapOpenParams): void {
    this.send('map_open', params);
  }

  trackMapMarkerClick(params: MapMarkerClickParams): void {
    this.send('map_marker_click', params);
  }

  trackGetDirections(params: GetDirectionsParams): void {
    this.send('get_directions', params);
  }

  // ── Business engagement ────────────────────────────────────────────────────

  trackOutboundClick(params: OutboundClickParams): void {
    this.send('outbound_click', params);
  }

  trackClickToCall(params: ClickToCallParams): void {
    this.send('click_to_call', params);
  }

  // ── Booking (no booking flow yet - wired for when it ships) ───────────────

  trackBookingStart(params: BookingParams): void {
    this.send('booking_start', params);
  }

  trackBookingSuccess(params: BookingParams): void {
    this.send('booking_success', params);
  }

  // ── Content / blog ─────────────────────────────────────────────────────────

  trackBlogView(params: ViewBlogParams): void {
    this.send('view_blog', params);
  }

  trackScrollDepth(params: ScrollDepthParams): void {
    this.send('scroll_depth', params);
  }

  trackBlogCtaClick(params: BlogCtaClickParams): void {
    this.send('blog_cta_click', params);
  }

  trackShare(params: ShareParams): void {
    this.send('share', params);
  }

  // ── Account ────────────────────────────────────────────────────────────────

  trackSignUp(params: AuthParams): void {
    this.send('sign_up', params);
  }

  trackLogin(params: AuthParams): void {
    this.send('login', params);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private send<K extends AnalyticsEventName>(name: K, params: AnalyticsEventMap[K]): void {
    const payload = sanitizeParams(params);
    if (!this.enabled) {
      this.log(`dropped ${name} (analytics consent not granted)`, payload);
      return;
    }
    this.gtag('event', name, payload);
    this.log(`event ${name}`, payload);
  }

  private onNavigationEnd(event: NavigationEnd): void {
    const path = event.urlAfterRedirects.split(/[?#]/)[0] || '/';
    if (this.currentPage?.page_path === path) {
      this.log(`page_view skipped, same path: ${event.urlAfterRedirects}`);
      return;
    }

    this.currentPage = {
      page_path: path,
      page_location: this.window?.location.href ?? path,
      page_title: this.resolvedTitle(),
    };
    this.currentPageSent = false;
    this.flushPageView();
  }

  private flushPageView(): void {
    if (!this.enabled || !this.currentPage || this.currentPageSent) return;
    this.currentPageSent = true;
    this.send('page_view', this.currentPage);
  }

  /**
   * NavigationEnd fires before the router's TitleStrategy writes document.title,
   * so read the resolved route title instead of the (stale) document title.
   */
  private resolvedTitle(): string | null {
    let route: ActivatedRouteSnapshot | undefined = this.router.routerState?.snapshot?.root;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    return route?.title ?? this.document.title ?? null;
  }

  private pushConsentDefault(): void {
    this.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    });
    this.log('consent default: all denied');
  }

  private enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    this.setTagDisabled(false);
    this.gtag('consent', 'update', { analytics_storage: 'granted' });

    if (!this.scriptLoaded) {
      this.loadScript();
      this.gtag('js', new Date());
      this.gtag('config', this.measurementId, {
        send_page_view: false,
        ...(this.debug ? { debug_mode: true } : {}),
      });
    }

    this.log('analytics consent granted - tag enabled');
    this.flushPageView();
  }

  private disable(): void {
    this.enabled = false;
    if (!this.scriptLoaded) {
      this.log('analytics consent denied - tag not loaded');
      return;
    }
    this.gtag('consent', 'update', { analytics_storage: 'denied' });
    this.setTagDisabled(true);
    this.clearAnalyticsCookies();
    this.log('analytics consent revoked - tag disabled, cookies cleared');
  }

  private loadScript(): void {
    if (this.scriptLoaded) return;
    this.scriptLoaded = true;
    const script = this.document.createElement('script');
    script.async = true;
    script.src = `${GTAG_SRC}${encodeURIComponent(this.measurementId)}`;
    this.document.head.appendChild(script);
  }

  /** gtag.js honours `window['ga-disable-<MEASUREMENT_ID>']` for a loaded tag. */
  private setTagDisabled(disabled: boolean): void {
    const win = this.window as unknown as Record<string, unknown> | null;
    if (win) win[`ga-disable-${this.measurementId}`] = disabled;
  }

  private clearAnalyticsCookies(): void {
    const names = this.document.cookie
      .split(';')
      .map((part) => part.trim().split('=')[0])
      .filter((name) => name === '_ga' || name === '_gid' || name.startsWith('_ga_'));
    if (!names.length) return;

    const host = this.window?.location.hostname ?? '';
    const domains = new Set<string | null>([null, host, `.${host}`]);
    const cookieDomain: string | undefined = environment.cookieDomain;
    if (cookieDomain) {
      domains.add(cookieDomain);
      domains.add(`.${cookieDomain}`);
    }

    for (const name of names) {
      for (const domain of domains) {
        this.document.cookie =
          `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` +
          (domain ? `; domain=${domain}` : '');
      }
    }
  }

  // gtag.js reads `arguments` objects off the dataLayer; plain arrays are ignored.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private gtag(..._args: unknown[]): void {
    const win = this.window;
    if (!win) return;
    // eslint-disable-next-line prefer-rest-params
    (win.dataLayer ??= []).push(arguments);
  }

  private get window(): GtagWindow | null {
    return (this.document.defaultView as GtagWindow | null) ?? null;
  }

  private log(message: string, payload?: unknown): void {
    if (!this.debug) return;
    if (payload === undefined) {
      console.debug(`[GA4] ${message}`);
    } else {
      console.debug(`[GA4] ${message}`, payload);
    }
  }
}

/**
 * Drops empty values, trims and truncates strings, and redacts anything that
 * looks like an email address or phone number so a free-text search can never
 * smuggle PII into GA4.
 */
export function sanitizeParams(params: GaParams): SanitizedParams {
  const clean: SanitizedParams = {};
  for (const [key, raw] of Object.entries(params)) {
    if (raw === null || raw === undefined) continue;
    if (typeof raw !== 'string') {
      clean[key] = raw;
      continue;
    }
    const value = raw.trim();
    if (!value) continue;
    clean[key] = looksLikePii(value) ? REDACTED : value.slice(0, MAX_PARAM_LENGTH);
  }
  return clean;
}

function looksLikePii(value: string): boolean {
  return EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value);
}

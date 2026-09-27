import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, isDevMode } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Capacitor } from '@capacitor/core';
import {
  LinkType,
  SEARCH_TRACKING_DEBOUNCE_MS,
  SearchScope,
  SITE_ORIGIN,
  SubmissionType,
} from '@gde/shared/util';
import { filter, pairwise } from 'rxjs';
import { AnalyticsConsentService } from './analytics-consent.service';

/** Firebase drops string parameter values longer than 100 characters. */
export const MAX_PARAM_LENGTH = 100;

/** What a shared link is about (`content_type`). */
export type ContentType = 'spot' | 'dog_food' | 'pet_shop' | 'blog_post';

/** How an outbound link is reported: `link_type` and, for venues, `venue_slug`. */
export interface LinkContext {
  type: LinkType;
  venue?: string | null;
}

export type EventParams = Record<string, string | number | null | undefined>;

/** Links that open a contact app rather than a web page. */
const CONTACT_PROTOCOLS: ReadonlySet<string> = new Set(['tel:', 'mailto:', 'sms:']);

const stripWww = (hostname: string): string => hostname.replace(/^www\./, '');
const SITE_HOST = stripWww(new URL(SITE_ORIGIN).hostname);

/**
 * GA4 events through Firebase Analytics, with the website's event names
 * (see `@gde/shared/util` analytics-events) so both report side by side.
 *
 * Nothing leaves the phone without consent (AnalyticsConsentService): every
 * call is a no-op until the user has said yes. In a browser (`nx serve`) the
 * events are logged to the console instead, in dev mode only.
 *
 * `start()` reports a `screen_view` per navigation and, like the portal,
 * reports taps on links: `contact_click` for tel:/mailto:/sms: and
 * `outbound_click` for web pages. Templates describe a link with
 * `data-link-type` (a LinkType) and, for venues, `data-venue-slug`, on the
 * link itself or on the ion-item / ion-button that renders it.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly consent = inject(AnalyticsConsentService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly #native = Capacitor.isNativePlatform();
  readonly #searchTimers = new Map<SearchScope, ReturnType<typeof setTimeout>>();
  readonly #granted$ = toObservable(this.consent.granted);
  #started = false;

  /** Call once from AppComponent. */
  start(): void {
    if (this.#started) return;
    this.#started = true;

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.#screenView(event.urlAfterRedirects));

    // The screen on show when the user says yes; otherwise it would only be counted on the next navigation.
    this.#granted$
      .pipe(pairwise(), filter(([before, now]) => !before && now), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.#screenView(this.router.url));

    // Capture phase: runs before Ionic or Capacitor hand the URL to another app.
    const onClick = (event: MouseEvent): void => this.#linkClick(event);
    this.document.addEventListener('click', onClick, true);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('click', onClick, true));
  }

  event(name: string, params: EventParams = {}): void {
    const clean = cleanParams(params);
    this.#send(name, clean, () => FirebaseAnalytics.logEvent({ name, params: clean }));
  }

  /**
   * GA4 recommended `search` event, sent once the term has been left alone for
   * SEARCH_TRACKING_DEBOUNCE_MS. Terms shorter than 2 characters are ignored.
   */
  trackSearch(scope: SearchScope, term: string | null | undefined): void {
    clearTimeout(this.#searchTimers.get(scope));
    this.#searchTimers.delete(scope);
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 2) return;
    this.#searchTimers.set(
      scope,
      setTimeout(() => {
        this.#searchTimers.delete(scope);
        this.event('search', { search_term: searchTerm, search_scope: scope });
      }, SEARCH_TRACKING_DEBOUNCE_MS),
    );
  }

  /** `filters` lists the active filter keys, e.g. ["ops_id", "ugo_id"]. */
  trackFilterApplied(scope: SearchScope, filters: readonly string[]): void {
    this.event('filter_applied', { search_scope: scope, filters: filters.join(',') });
  }

  /** Sent once the phone has returned a position, not when the switch is flipped. */
  trackNearMe(scope: SearchScope): void {
    this.event('near_me_used', { search_scope: scope });
  }

  trackSubmission(type: SubmissionType): void {
    this.event('generate_lead', { content_type: type });
  }

  /** GA4 recommended `share` event; `method` is the app picked in the share sheet, or `copy_link`. */
  trackShare(method: string, contentType: ContentType, itemId: string): void {
    this.event('share', { method, content_type: contentType, item_id: itemId });
  }

  trackLanguageSwitch(language: string): void {
    this.event('language_switch', { language });
  }

  /** For links opened from code (ExternalLinkService) rather than by an `href`. */
  trackOutbound(url: string, link: LinkContext, text?: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    this.#reportLink(parsed, link, text ?? '');
  }

  #screenView(url: string): void {
    // '/tabs/places/spots/41?word=x' -> 'places/spots/41'. The route pattern
    // ('places/spots/:id') goes in screen_class, so screens can be grouped.
    const path = url.split(/[?#]/)[0].replace(/^\/(tabs\/)?/, '') || 'home';
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const screenName = path.slice(0, MAX_PARAM_LENGTH);
    const screenClass = (route.routeConfig?.path || path).slice(0, MAX_PARAM_LENGTH);

    this.#send('screen_view', { screen_name: screenName, screen_class: screenClass }, () =>
      FirebaseAnalytics.setCurrentScreen({ screenName, screenClassOverride: screenClass }),
    );
  }

  #linkClick(event: MouseEvent): void {
    if (!this.consent.granted()) return;

    // ion-item / ion-button render their <a> inside a shadow root: the
    // composed path reaches it, and the host carrying data-link-type.
    const path = event.composedPath();
    const anchor = path.find(
      (node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement && !!node.getAttribute('href'),
    );
    if (!anchor) return;

    let url: URL;
    try {
      url = new URL(anchor.href, this.document.location.href);
    } catch {
      return;
    }

    const root = anchor.getRootNode();
    const host = root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : anchor;
    const tagged = path.find((node): node is HTMLElement => node instanceof HTMLElement && !!node.dataset['linkType']);
    const link: LinkContext = {
      type: (tagged?.dataset['linkType'] as LinkType | undefined) ?? 'other',
      venue: tagged?.dataset['venueSlug'],
    };
    // Icon-only buttons have no text; Ionic moves their aria-label onto the inner element.
    const text =
      textOf(this.document, host) || anchor.getAttribute('aria-label') || host.getAttribute('aria-label') || '';
    this.#reportLink(url, link, text);
  }

  #reportLink(url: URL, link: LinkContext, text: string): void {
    const venue = link.venue ? { venue_slug: link.venue } : {};

    if (CONTACT_PROTOCOLS.has(url.protocol)) {
      this.event('contact_click', { link_type: link.type, link_url: url.href, ...venue });
      return;
    }

    // In-app navigation (router links resolve to the WebView's own origin),
    // the website itself, and schemes without a host are not outbound.
    if (!url.hostname || url.origin === this.document.location.origin || stripWww(url.hostname) === SITE_HOST) return;

    this.event('outbound_click', {
      link_url: url.href,
      link_domain: url.hostname,
      link_text: text,
      link_type: link.type,
      ...venue,
    });
  }

  #send(name: string, params: EventParams, call: () => Promise<void>): void {
    if (!this.consent.granted()) return;
    if (this.#native) {
      void call().catch(() => undefined);
    } else if (isDevMode()) {
      console.debug('[analytics]', name, params);
    }
  }
}

/** Drops empty values (the Android bridge cannot put null in a Bundle) and trims long strings. */
function cleanParams(params: EventParams): Record<string, string | number> {
  const clean: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    clean[key] = typeof value === 'string' ? value.slice(0, MAX_PARAM_LENGTH) : value;
  }
  return clean;
}

/**
 * Visible text of a link. Text nodes are joined with a space because Angular
 * strips the whitespace between elements ("Adresa" + street would run together).
 */
function textOf(document: Document, element: Element): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue ?? '');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

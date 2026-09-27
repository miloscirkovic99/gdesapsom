import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { SearchScope, SubmissionType } from '@gde/shared/util';

/** GA4 truncates event parameter values at 100 characters anyway. */
export const MAX_LINK_TEXT_LENGTH = 100;

/** Links that open a contact app rather than a web page. */
const CONTACT_PROTOCOLS: ReadonlySet<string> = new Set(['mailto:', 'tel:', 'sms:']);

type Gtag = (command: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    /**
     * Defined once GoogleAnalyticsService has injected gtag.js, i.e. after
     * cookie consent. Missing while consent is pending or when an ad blocker
     * removed the script.
     */
    gtag?: Gtag;
  }
}

const stripWww = (hostname: string): string => hostname.replace(/^www\./, '');

/**
 * Custom GA4 events on top of gtag.js.
 *
 * `event()` is a no-op until gtag.js is loaded, so callers never have to
 * guard themselves. `initOutboundTracking()` reports clicks that leave the
 * site: `outbound_click` for external pages and `contact_click` for
 * mailto:/tel:/sms: links. Templates describe a link with `data-link-type`
 * (a `LinkType` from `@gde/shared/util`) and, for venue links, `data-venue-slug`.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private trackingOutbound = false;

  event(name: string, params: Record<string, unknown>): void {
    this.document.defaultView?.gtag?.('event', name, params);
  }

  /** GA4 recommended `search` event. Terms shorter than 2 characters are ignored. */
  trackSearch(scope: SearchScope, term: string | null | undefined): void {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 2) return;
    this.event('search', {
      search_term: searchTerm.slice(0, MAX_LINK_TEXT_LENGTH),
      search_scope: scope,
    });
  }

  /** `filters` lists the active filter keys, e.g. "ops_id,ugo_id". */
  trackFilterApplied(scope: SearchScope, filters: readonly string[]): void {
    this.event('filter_applied', { search_scope: scope, filters: filters.join(',') });
  }

  /** Sent once the browser has returned a position, not when the button is pressed. */
  trackNearMe(scope: SearchScope): void {
    this.event('near_me_used', { search_scope: scope });
  }

  trackSubmission(type: SubmissionType): void {
    this.event('generate_lead', { content_type: type });
  }

  /**
   * GA4 recommended `share` event. Share links to social apps are already
   * reported as `outbound_click` with `link_type: social`; this covers the
   * shares that never leave the page, such as copying the link.
   */
  trackShare(method: string, contentType: string, itemId: string | null): void {
    this.event('share', { method, content_type: contentType, item_id: itemId ?? undefined });
  }

  trackLanguageSwitch(language: string): void {
    this.event('language_switch', { language });
  }

  trackPwaInstall(outcome: string): void {
    this.event('pwa_install', { outcome });
  }

  /**
   * One capture-phase click listener on the document. It never calls
   * preventDefault or delays navigation, so middle-click, Ctrl+click and
   * target="_blank" keep working; gtag.js delivers the hit with sendBeacon.
   */
  initOutboundTracking(): void {
    if (this.trackingOutbound) return;
    this.trackingOutbound = true;

    const onClick = (event: MouseEvent): void => this.trackLinkClick(event);
    this.document.addEventListener('click', onClick, true);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('click', onClick, true));
  }

  private trackLinkClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest('a');
    const href = anchor?.getAttribute('href');
    if (!anchor || !href) return;

    let url: URL;
    try {
      url = new URL(href, this.document.location.href);
    } catch {
      return;
    }

    const linkType = anchor.dataset['linkType'] || 'other';
    const venueSlug = anchor.dataset['venueSlug'];
    const venue = venueSlug ? { venue_slug: venueSlug } : {};

    if (CONTACT_PROTOCOLS.has(url.protocol)) {
      this.event('contact_click', { link_type: linkType, link_url: url.href, ...venue });
      return;
    }

    // Internal navigation (router links, in-page anchors) and schemes without
    // a host (javascript:, blob:) are not outbound.
    if (!url.hostname || this.isSameSite(url)) return;

    this.event('outbound_click', {
      link_url: url.href,
      link_domain: url.hostname,
      link_text: this.linkText(anchor),
      link_type: linkType,
      ...venue,
    });
  }

  /** gdesapsom.com and www.gdesapsom.com are the same site. */
  private isSameSite(url: URL): boolean {
    return stripWww(url.hostname) === stripWww(this.document.location.hostname);
  }

  /**
   * Visible text, or the aria-label of an icon-only link. Text nodes are
   * joined with a space because Angular strips the whitespace between
   * elements, which would glue "Google Maps" to its subtitle.
   */
  private linkText(anchor: HTMLAnchorElement): string {
    const walker = this.document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];
    while (walker.nextNode()) parts.push(walker.currentNode.nodeValue ?? '');

    const text =
      parts.join(' ').replace(/\s+/g, ' ').trim() ||
      anchor.getAttribute('aria-label')?.trim() ||
      '';
    return text.slice(0, MAX_LINK_TEXT_LENGTH);
  }
}

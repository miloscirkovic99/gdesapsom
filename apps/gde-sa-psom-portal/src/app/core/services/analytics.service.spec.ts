/**
 * @jest-environment-options {"url": "https://www.gdesapsom.com/spots/41"}
 */
import { TestBed } from '@angular/core/testing';

import { AnalyticsService, MAX_LINK_TEXT_LENGTH } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let gtag: jest.Mock;

  const render = (html: string): HTMLElement => {
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    return host;
  };

  const anchor = (html: string): HTMLAnchorElement =>
    render(html).querySelector('a') as HTMLAnchorElement;

  /**
   * Clicks like a user would: bubbling and cancelable. The target listener
   * runs after the document capture listener, records whether the tracker
   * cancelled navigation, then cancels it itself so jsdom does not try to
   * navigate.
   */
  const click = (element: Element): { preventedByTracker: boolean } => {
    const result = { preventedByTracker: false };
    const onTarget = (event: Event) => {
      result.preventedByTracker = event.defaultPrevented;
      event.preventDefault();
    };
    element.addEventListener('click', onTarget);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    element.removeEventListener('click', onTarget);
    return result;
  };

  const lastParams = (): Record<string, unknown> =>
    gtag.mock.calls[gtag.mock.calls.length - 1][2] as Record<string, unknown>;

  beforeEach(() => {
    gtag = jest.fn();
    window.gtag = gtag;
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsService);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.gtag;
  });

  describe('event', () => {
    it('forwards to window.gtag as a GA4 event', () => {
      service.event('share', { method: 'viber' });

      expect(gtag).toHaveBeenCalledWith('event', 'share', { method: 'viber' });
    });

    it('is a no-op while gtag.js is not loaded (no consent yet, ad blocker)', () => {
      delete window.gtag;

      expect(() => service.event('share', {})).not.toThrow();
    });
  });

  describe('outbound tracking', () => {
    beforeEach(() => service.initOutboundTracking());

    it('reports an external link with its data attributes', () => {
      const link = anchor(`
        <a href="https://kafic-supa.rs/meni?sto=1" data-link-type="venue_website" data-venue-slug="spot-41">
          Sajt
          kafića
        </a>`);

      click(link);

      expect(gtag).toHaveBeenCalledTimes(1);
      expect(gtag).toHaveBeenCalledWith('event', 'outbound_click', {
        link_url: 'https://kafic-supa.rs/meni?sto=1',
        link_domain: 'kafic-supa.rs',
        link_text: 'Sajt kafića',
        link_type: 'venue_website',
        venue_slug: 'spot-41',
      });
    });

    it('falls back to link_type "other" and omits venue_slug when the attributes are missing', () => {
      click(anchor('<a href="https://example.com/">Primer</a>'));

      expect(gtag).toHaveBeenCalledWith('event', 'outbound_click', {
        link_url: 'https://example.com/',
        link_domain: 'example.com',
        link_text: 'Primer',
        link_type: 'other',
      });
      expect(lastParams()).not.toHaveProperty('venue_slug');
    });

    it('resolves a click on an icon inside the link to the link itself', () => {
      const host = render(`
        <a href="https://wolt.com/sr/srb/beograd/venue/pseca-kasika" data-link-type="affiliate_booking">
          <svg><path id="icon" /></svg>
          <span>Wolt</span>
        </a>`);

      click(host.querySelector('#icon') as Element);

      expect(lastParams()).toMatchObject({ link_domain: 'wolt.com', link_text: 'Wolt' });
    });

    it('keeps a space between text nodes that sit in different elements', () => {
      click(anchor('<a href="https://www.google.com/maps/dir/?api=1&destination=44.8,20.46"><p>Google Maps</p><p>Otvori u aplikaciji</p></a>'));

      expect(lastParams()).toMatchObject({ link_text: 'Google Maps Otvori u aplikaciji' });
    });

    it('uses the aria-label of an icon-only link as link_text', () => {
      click(anchor('<a href="https://maps.google.com/?q=x" aria-label="Pronađi rutu"><svg></svg></a>'));

      expect(lastParams()).toMatchObject({ link_text: 'Pronađi rutu' });
    });

    it('caps link_text at 100 characters', () => {
      click(anchor(`<a href="https://example.com/">${'a'.repeat(150)}</a>`));

      expect((lastParams()['link_text'] as string).length).toBe(MAX_LINK_TEXT_LENGTH);
    });

    it.each([
      '/pet-shops/pseca-kasika',
      '#main-content',
      'https://www.gdesapsom.com/blog',
      'https://gdesapsom.com/blog',
      'about-us',
    ])('ignores internal navigation to %s', (href) => {
      click(anchor(`<a href="${href}">Interno</a>`));

      expect(gtag).not.toHaveBeenCalled();
    });

    it.each([
      ['tel:+381111234567', 'venue_phone'],
      ['sms:+381601234567', 'other'],
      ['mailto:info@gdesapsom.com', 'other'],
    ])('reports %s as a contact_click', (href, linkType) => {
      const typeAttr = linkType === 'other' ? '' : `data-link-type="${linkType}"`;
      click(anchor(`<a href="${href}" ${typeAttr} data-venue-slug="pseca-kasika-vracar">Pozovi</a>`));

      expect(gtag).toHaveBeenCalledWith('event', 'contact_click', {
        link_type: linkType,
        link_url: href,
        venue_slug: 'pseca-kasika-vracar',
      });
    });

    it('never cancels the click, so middle-click and Ctrl+click keep working', () => {
      const link = anchor('<a href="https://example.com/" target="_blank" rel="noopener">Primer</a>');

      expect(click(link).preventedByTracker).toBe(false);
      expect(gtag).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a button', '<button type="button">Ne</button>'],
      ['a link without href', '<a data-link-type="social">Ne</a>'],
      ['a link with an unparsable URL', '<a href="https://[bad">Ne</a>'],
      ['a javascript: link', '<a href="javascript:void(0)">Ne</a>'],
    ])('ignores %s', (_label, html) => {
      const host = render(html);

      click(host.firstElementChild as Element);

      expect(gtag).not.toHaveBeenCalled();
    });

    it('installs the listener only once', () => {
      service.initOutboundTracking();
      service.initOutboundTracking();

      click(anchor('<a href="https://example.com/">Primer</a>'));

      expect(gtag).toHaveBeenCalledTimes(1);
    });

    it('removes the listener when the injector is destroyed', () => {
      const link = anchor('<a href="https://example.com/">Primer</a>');

      TestBed.resetTestingModule();
      click(link);

      expect(gtag).not.toHaveBeenCalled();
    });
  });
});

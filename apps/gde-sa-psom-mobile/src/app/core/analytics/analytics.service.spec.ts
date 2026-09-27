import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Capacitor } from '@capacitor/core';
import { AnalyticsConsentService } from './analytics-consent.service';
import { AnalyticsService, MAX_PARAM_LENGTH } from './analytics.service';

jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: jest.fn() } }));
// Reached through AnalyticsConsentService, which the specs replace.
jest.mock('@capacitor/preferences', () => ({ Preferences: {} }));
jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: { logEvent: jest.fn(), setCurrentScreen: jest.fn() },
}));

@Component({ template: '' })
class BlankPage {}

const firebase = FirebaseAnalytics as jest.Mocked<typeof FirebaseAnalytics>;

function setup(granted = true, native = true) {
  (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(native);
  const consent = signal(granted);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'tabs', children: [{ path: 'places/spots/:id', component: BlankPage }] }]),
      { provide: AnalyticsConsentService, useValue: { granted: consent } },
    ],
  });
  return { analytics: TestBed.inject(AnalyticsService), consent };
}

/** An ion-item stand-in: the <a> lives in an open shadow root, the data attributes on the host. */
function shadowLink(href: string, attrs: Record<string, string>, text: string): HTMLAnchorElement {
  const host = document.createElement('div');
  Object.entries(attrs).forEach(([name, value]) => host.setAttribute(name, value));
  host.textContent = text;
  const anchor = document.createElement('a');
  anchor.href = href;
  host.attachShadow({ mode: 'open' }).appendChild(anchor);
  document.body.appendChild(host);
  return anchor;
}

function click(element: Element): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
}

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firebase.logEvent.mockResolvedValue();
    firebase.setCurrentScreen.mockResolvedValue();
    document.body.innerHTML = '';
  });

  it('sends nothing without consent', () => {
    const { analytics } = setup(false);

    analytics.trackSubmission('spot');

    expect(firebase.logEvent).not.toHaveBeenCalled();
  });

  it('sends nothing to Firebase in a browser', () => {
    const { analytics } = setup(true, false);
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => undefined);

    analytics.trackSubmission('park');

    expect(firebase.logEvent).not.toHaveBeenCalled();
    expect(debug).toHaveBeenCalledWith('[analytics]', 'generate_lead', { content_type: 'park' });
    debug.mockRestore();
  });

  it('drops empty parameters and trims long ones', () => {
    const { analytics } = setup();

    analytics.event('custom', { a: null, b: undefined, c: '', d: 0, e: 'x'.repeat(150) });

    expect(firebase.logEvent).toHaveBeenCalledWith({
      name: 'custom',
      params: { d: 0, e: 'x'.repeat(MAX_PARAM_LENGTH) },
    });
  });

  it('reports only the settled search term', () => {
    jest.useFakeTimers();
    const { analytics } = setup();

    analytics.trackSearch('spots', 'ka');
    jest.advanceTimersByTime(500);
    analytics.trackSearch('spots', 'kafić ');
    analytics.trackSearch('vet_clinics', 'x');
    jest.advanceTimersByTime(1500);

    expect(firebase.logEvent).toHaveBeenCalledTimes(1);
    expect(firebase.logEvent).toHaveBeenCalledWith({
      name: 'search',
      params: { search_term: 'kafić', search_scope: 'spots' },
    });
    jest.useRealTimers();
  });

  it('cancels a pending search when the box is cleared', () => {
    jest.useFakeTimers();
    const { analytics } = setup();

    analytics.trackSearch('pet_shops', 'hrana');
    analytics.trackSearch('pet_shops', null);
    jest.advanceTimersByTime(2000);

    expect(firebase.logEvent).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('names screens by path and groups them by route pattern', async () => {
    const { analytics } = setup();
    analytics.start();

    await TestBed.inject(Router).navigateByUrl('/tabs/places/spots/41?word=bar');

    expect(firebase.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'places/spots/41',
      screenClassOverride: 'places/spots/:id',
    });
  });

  it('reports a tap on a phone link inside a shadow root with the host attributes', () => {
    const { analytics } = setup();
    analytics.start();

    click(shadowLink('tel:+381601234567', { 'data-link-type': 'venue_phone', 'data-venue-slug': 'spot-7' }, 'Telefon'));

    expect(firebase.logEvent).toHaveBeenCalledWith({
      name: 'contact_click',
      params: { link_type: 'venue_phone', link_url: 'tel:+381601234567', venue_slug: 'spot-7' },
    });
  });

  it('reports outbound web links with their visible text', () => {
    const { analytics } = setup();
    analytics.start();

    click(shadowLink('https://maps.google.com/?q=Kafic', { 'data-link-type': 'venue_maps' }, 'Google Maps'));

    expect(firebase.logEvent).toHaveBeenCalledWith({
      name: 'outbound_click',
      params: {
        link_url: 'https://maps.google.com/?q=Kafic',
        link_domain: 'maps.google.com',
        link_text: 'Google Maps',
        link_type: 'venue_maps',
      },
    });
  });

  it('ignores in-app links and the website itself', () => {
    const { analytics } = setup();
    analytics.start();

    click(shadowLink('/tabs/places', {}, 'Mesta'));
    click(shadowLink('https://gdesapsom.com/spots/1', {}, 'Sajt'));

    expect(firebase.logEvent).not.toHaveBeenCalled();
  });

  it('ignores taps while consent is off', () => {
    const { analytics } = setup(false);
    analytics.start();

    click(shadowLink('tel:123', { 'data-link-type': 'venue_phone' }, 'Telefon'));

    expect(firebase.logEvent).not.toHaveBeenCalled();
  });
});

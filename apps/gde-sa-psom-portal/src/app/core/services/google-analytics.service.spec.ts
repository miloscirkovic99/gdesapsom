import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../env/env.dev';
import { GoogleAnalyticsService } from './google-analytics.service';

type TestWindow = Window & { dataLayer?: IArguments[]; gtag?: unknown } & Record<string, unknown>;

describe('GoogleAnalyticsService', () => {
  let service: GoogleAnalyticsService;

  const win = window as unknown as TestWindow;
  const scripts = () => document.head.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');
  const entries = () => (win.dataLayer ?? []).map((entry) => Array.from(entry));
  const expire = (name: string) => (document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`);

  beforeEach(() => {
    scripts().forEach((script) => script.remove());
    delete win.dataLayer;
    delete win.gtag;
    delete win[`ga-disable-${environment.googleAnalyticsId}`];
    ['_ga', `_ga_${environment.googleAnalyticsId.replace('G-', '')}`, '_gid', 'sid'].forEach(expire);

    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(GoogleAnalyticsService);
  });

  it('injects gtag.js once, with ads denied, measurement on and Google Signals off', () => {
    service.initialize();
    service.initialize();

    expect(scripts()).toHaveLength(1);
    expect(entries()[0]).toEqual([
      'consent',
      'default',
      { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' },
    ]);
    const config = entries().find(([command, id]) => command === 'config' && id === environment.googleAnalyticsId);
    expect(config?.[2]).toEqual({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  });

  it('pushes Arguments objects, which is what gtag.js reads from the data layer', () => {
    service.initialize();

    expect(Object.prototype.toString.call(win.dataLayer?.[0])).toBe('[object Arguments]');
  });

  it('setEnabled(false) flips the kill switch, denies consent and deletes the _ga cookies but nothing else', () => {
    document.cookie = '_ga=GA1.1.123.456; path=/';
    document.cookie = `_ga_${environment.googleAnalyticsId.replace('G-', '')}=GS1.1.1; path=/`;
    document.cookie = 'sid=abc; path=/';
    service.initialize();

    service.setEnabled(false);

    expect(win[`ga-disable-${environment.googleAnalyticsId}`]).toBe(true);
    expect(entries().at(-1)).toEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    expect(document.cookie).not.toContain('_ga');
    expect(document.cookie).toContain('sid=abc');
  });

  it('setEnabled(true) lifts the kill switch again', () => {
    service.initialize();
    service.setEnabled(false);

    service.setEnabled(true);

    expect(win[`ga-disable-${environment.googleAnalyticsId}`]).toBe(false);
    expect(entries().at(-1)).toEqual(['consent', 'update', { analytics_storage: 'granted' }]);
  });

  it('can be switched off before gtag.js was ever loaded', () => {
    expect(() => service.setEnabled(false)).not.toThrow();
    expect(win[`ga-disable-${environment.googleAnalyticsId}`]).toBe(true);
    expect(scripts()).toHaveLength(0);
  });
});

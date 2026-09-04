import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { environment } from '../../../env/env.dev';
import { ConsentService, ConsentState } from '../services/consent.service';
import { AnalyticsService, sanitizeParams } from './analytics.service';
import { ItemCategory, SearchCategory, SearchType } from './analytics.taxonomy';

type DataLayerWindow = Window & { dataLayer?: IArguments[] };

describe('AnalyticsService', () => {
  const measurementId = environment.googleAnalyticsId;

  let service: AnalyticsService;
  let routerEvents: Subject<unknown>;
  let analyticsGranted: WritableSignal<boolean>;

  const dataLayer = (): unknown[][] =>
    ((window as DataLayerWindow).dataLayer ?? []).map((entry) => Array.from(entry));
  const commands = (command: string) => dataLayer().filter((entry) => entry[0] === command);
  const events = (name: string) =>
    dataLayer().filter((entry) => entry[0] === 'event' && entry[1] === name);
  const gtagScript = () =>
    document.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com/gtag/js"]');

  const navigate = (url: string) => routerEvents.next(new NavigationEnd(1, url, url));
  const setConsent = (granted: boolean) => {
    analyticsGranted.set(granted);
    TestBed.flushEffects();
  };

  beforeEach(() => {
    delete (window as DataLayerWindow).dataLayer;
    gtagScript()?.remove();

    routerEvents = new Subject();
    analyticsGranted = signal(false);
    const state = signal<ConsentState>({ analytics: 'denied', marketing: 'denied' });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            events: routerEvents.asObservable(),
            routerState: { snapshot: { root: { firstChild: null, title: 'Route title' } } },
          },
        },
        {
          provide: ConsentService,
          useValue: { init: jest.fn(), analyticsGranted, state },
        },
      ],
    });

    service = TestBed.inject(AnalyticsService);
    service.init();
    TestBed.flushEffects();
  });

  describe('consent mode', () => {
    it('pushes a fully denied consent default first and does not load the tag', () => {
      expect(dataLayer()[0]).toEqual([
        'consent',
        'default',
        expect.objectContaining({
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        }),
      ]);
      expect(gtagScript()).toBeNull();
    });

    it('initialises only once', () => {
      service.init();
      service.init();

      expect(commands('consent')).toHaveLength(1);
    });

    it('drops events while analytics consent is denied', () => {
      service.trackViewItem({ item_id: '1', item_category: ItemCategory.cafe });

      expect(events('view_item')).toHaveLength(0);
    });

    it('loads gtag.js, grants analytics_storage and configures the tag once consent is given', () => {
      setConsent(true);

      expect(gtagScript()?.src).toContain(measurementId);

      const order = dataLayer().map((entry) => `${entry[0]}:${entry[1]}`);
      expect(order.indexOf('consent:update')).toBeLessThan(order.indexOf(`config:${measurementId}`));
      expect(commands('consent')[1]).toEqual(['consent', 'update', { analytics_storage: 'granted' }]);
      expect(commands('config')[0][2]).toEqual(expect.objectContaining({ send_page_view: false }));
    });

    it('never grants ad signals - marketing consent is independent', () => {
      setConsent(true);

      const grantedSignals = commands('consent')
        .filter((entry) => entry[1] === 'update')
        .flatMap((entry) => Object.keys(entry[2] as object));
      expect(grantedSignals).toEqual(['analytics_storage']);
    });

    it('stops sending, disables the tag and clears _ga cookies when consent is revoked', () => {
      setConsent(true);
      document.cookie = '_ga=GA1.1.1;path=/';
      document.cookie = `_ga_${measurementId.replace('G-', '')}=GS1.1.1;path=/`;

      setConsent(false);

      const consentCommands = commands('consent');
      expect(consentCommands[consentCommands.length - 1]).toEqual([
        'consent',
        'update',
        { analytics_storage: 'denied' },
      ]);
      expect((window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`]).toBe(true);
      expect(document.cookie).not.toContain('_ga');

      service.trackViewItem({ item_id: '1', item_category: ItemCategory.cafe });
      expect(events('view_item')).toHaveLength(0);
    });
  });

  describe('page views', () => {
    it('holds the current page_view until consent arrives, then sends it exactly once', () => {
      navigate('/all-spots');
      expect(events('page_view')).toHaveLength(0);

      setConsent(true);
      expect(events('page_view')).toHaveLength(1);
      expect(events('page_view')[0][2]).toEqual(
        expect.objectContaining({ page_path: '/all-spots', page_title: 'Route title' })
      );

      setConsent(true);
      expect(events('page_view')).toHaveLength(1);
    });

    it('sends one page_view per path and ignores query-string-only changes', () => {
      setConsent(true);

      navigate('/all-spots');
      navigate('/all-spots?spotType=Kafić');
      navigate('/all-spots?spotType=Hotel');
      expect(events('page_view')).toHaveLength(1);

      navigate('/pet-parks');
      expect(events('page_view')).toHaveLength(2);
      expect(events('page_view')[1][2]).toEqual(expect.objectContaining({ page_path: '/pet-parks' }));
    });

    it('does not replay an already-sent page_view after a revoke/grant cycle', () => {
      setConsent(true);
      navigate('/blog');
      setConsent(false);
      setConsent(true);

      expect(events('page_view')).toHaveLength(1);
    });
  });

  describe('events', () => {
    beforeEach(() => setConsent(true));

    it('sends typed events as gtag event commands', () => {
      service.trackSearch({
        search_term: 'šupa',
        search_category: SearchCategory.cafe,
        results_count: 4,
        search_type: SearchType.text,
      });

      expect(events('search')[0]).toEqual([
        'event',
        'search',
        { search_term: 'šupa', search_category: 'cafe', results_count: 4, search_type: 'text' },
      ]);
    });

    it('redacts search terms that look like an email address or phone number', () => {
      service.trackSearch({
        search_term: 'pera@example.com',
        search_category: SearchCategory.all,
        results_count: 0,
        search_type: SearchType.text,
      });
      service.trackSearch({
        search_term: '+381 64 123 4567',
        search_category: SearchCategory.all,
        results_count: 0,
        search_type: SearchType.text,
      });

      const [byEmail, byPhone] = events('search');
      expect((byEmail[2] as Record<string, unknown>)['search_term']).toBe('[redacted]');
      expect((byPhone[2] as Record<string, unknown>)['search_term']).toBe('[redacted]');
    });

    it('drops empty parameters instead of sending null or blank values', () => {
      service.trackViewItem({
        item_id: '7',
        item_category: ItemCategory.cafe,
        city: null,
        item_name: '   ',
        region: undefined,
      });

      expect(events('view_item')[0][2]).toEqual({ item_id: '7', item_category: 'cafe' });
    });
  });
});

describe('sanitizeParams', () => {
  it('truncates strings to the GA4 limit of 100 characters', () => {
    const { search_term } = sanitizeParams({ search_term: 'a'.repeat(150) });

    expect(search_term).toHaveLength(100);
  });

  it('keeps ordinary addresses and short numbers', () => {
    expect(sanitizeParams({ search_term: 'Bulevar kralja Aleksandra 73' })).toEqual({
      search_term: 'Bulevar kralja Aleksandra 73',
    });
  });
});

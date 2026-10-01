import { TestBed } from '@angular/core/testing';
import { CONSENT_STORAGE_KEY, ConsentService } from './consent.service';

describe('ConsentService', () => {
  const stored = () => JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? 'null');

  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'cookieconsent_status=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    TestBed.configureTestingModule({});
  });

  it('starts pending: banner open, measurement on, detailed events off', () => {
    const service = TestBed.inject(ConsentService);

    expect(service.status()).toBe('pending');
    expect(service.bannerOpen()).toBe(true);
    expect(service.measurementAllowed()).toBe(true);
    expect(service.detailedEventsAllowed()).toBe(false);
  });

  it('"Prihvati sve" turns everything on, remembers it and closes the banner', () => {
    const service = TestBed.inject(ConsentService);

    service.acceptAll();

    expect(service.status()).toBe('granted');
    expect(service.detailedEventsAllowed()).toBe(true);
    expect(service.bannerOpen()).toBe(false);
    expect(stored()).toMatchObject({ v: 1, analytics: true });
  });

  it('"Samo neophodno" switches measurement off and remembers it', () => {
    const service = TestBed.inject(ConsentService);

    service.necessaryOnly();

    expect(service.status()).toBe('denied');
    expect(service.measurementAllowed()).toBe(false);
    expect(stored()).toMatchObject({ analytics: false });
  });

  it('restores a saved choice without showing the banner', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, analytics: false, at: '2026-10-01T10:00:00.000Z' }));

    const service = TestBed.inject(ConsentService);

    expect(service.status()).toBe('denied');
    expect(service.bannerOpen()).toBe(false);
  });

  it('carries over the old banner\'s "ok" flag and removes it', () => {
    localStorage.setItem('analyticsAccepted', 'true');

    const service = TestBed.inject(ConsentService);

    expect(service.status()).toBe('granted');
    expect(localStorage.getItem('analyticsAccepted')).toBeNull();
    expect(stored()).toMatchObject({ analytics: true });
  });

  it('carries over an old "deny" cookie and deletes it', () => {
    document.cookie = 'cookieconsent_status=deny; path=/';

    const service = TestBed.inject(ConsentService);

    expect(service.status()).toBe('denied');
    expect(document.cookie).not.toContain('cookieconsent_status');
  });

  it('open() shows the banner again without touching the choice', () => {
    const service = TestBed.inject(ConsentService);
    service.acceptAll();

    service.open();

    expect(service.bannerOpen()).toBe(true);
    expect(service.status()).toBe('granted');
  });
});

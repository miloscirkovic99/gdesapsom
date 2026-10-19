import { RenderMode } from '@angular/ssr';
import { appRoutes } from '../../app.routes';
import { serverRoutes } from '../../app.routes.server';
import { countStays, destinationFaq, formatDate, formatFee, joinNames, liftStatus } from './winter-copy';
import { EMPTY_DESTINATION } from './winter-data';
import { WINTER_DESTINATIONS, WINTER_PAGES } from './winter-pages';

// The real package pulls in its HTML inliner, which only runs in Node; the
// route table needs nothing but the enum.
jest.mock('@angular/ssr', () => ({ RenderMode: { Server: 0, Client: 1, Prerender: 2 } }));

describe('winter pages', () => {
  it('are the five required routes', () => {
    expect(WINTER_PAGES.map((page) => page.path)).toEqual([
      '/zimovanje-sa-psom',
      '/zimovanje-sa-psom/kopaonik',
      '/zimovanje-sa-psom/zlatibor',
      '/zimovanje-sa-psom/tara',
      '/putovanje-sa-psom-u-eu',
    ]);
    const routed = appRoutes.map((route) => route.path);
    for (const page of WINTER_PAGES) expect(routed).toContain(page.path.slice(1));
  });

  it('have their own title and a description that fits a search result', () => {
    const titles = WINTER_PAGES.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const page of WINTER_PAGES) {
      expect(page.title.length).toBeLessThanOrEqual(80);
      expect(page.description.length).toBeGreaterThan(70);
      expect(page.description.length).toBeLessThanOrEqual(160);
    }
    const descriptions = WINTER_PAGES.map((page) => page.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('are prerendered, and every other route stays client-side', () => {
    const prerendered = serverRoutes.filter((route) => route.renderMode === RenderMode.Prerender).map((route) => route.path);
    expect(prerendered).toEqual(WINTER_PAGES.map((page) => page.path.slice(1)));
    expect(serverRoutes[serverRoutes.length - 1]).toEqual({ path: '**', renderMode: RenderMode.Client });
  });
});

describe('winter copy', () => {
  const kopaonik = WINTER_DESTINATIONS[0];

  it('formats dates, fees and counts the Serbian way', () => {
    expect(formatDate('2026-10-05')).toBe('5. 10. 2026.');
    expect(formatDate(null)).toBeNull();
    expect(formatFee({ amount: 1500, currency: 'RSD', per: 'boravak' })).toBe('1.500 RSD po boravku');
    expect(formatFee({ amount: 7.5, currency: 'EUR', per: 'noc' })).toBe('7,50 € po noći');
    expect([1, 2, 5, 21].map(countStays)).toEqual(['1 smeštaj', '2 smeštaja', '5 smeštaja', '21 smeštaj']);
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B i C');
  });

  it('says nothing about a lift whose rule is not in the database', () => {
    expect(liftStatus({ dogsAllowed: null, checkedAt: '2026-10-01' })).toBeNull();
    expect(liftStatus({ dogsAllowed: true, checkedAt: null })).toBe('Psi smeju');
  });

  it('builds the FAQ only from known data, plus the packing question', () => {
    expect(destinationFaq(kopaonik, EMPTY_DESTINATION).map((item) => item.question)).toEqual(['Šta da spakujem psu za zimovanje?']);

    const one = destinationFaq(kopaonik, {
      ...EMPTY_DESTINATION,
      stays: [{ id: 1, name: 'X', address: null, dogFee: null, maxDogs: null, dogMayStayAlone: null, maxDogSize: null, affiliateUrl: null }],
    });
    expect(one[0].answer).toContain('1 smeštaj na Kopaoniku koji prima pse');
  });
});

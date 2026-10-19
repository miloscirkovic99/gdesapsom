import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { EMPTY_DESTINATION, WINTER_DATA, WinterSnapshot } from './winter-data';
import { WinterDestinationPageComponent } from './winter-destination-page.component';
import { WINTER_PAGE_DATA } from './winter-pages';

/** Invented test data; the shipped snapshot is written by tools/fetch-winter-data.mjs. */
const SNAPSHOT: WinterSnapshot = {
  generatedAt: '2026-11-05',
  destinations: {
    kopaonik: {
      stays: [
        {
          id: 501,
          name: 'Planinska kuća Test',
          address: 'Brzeće bb',
          dogFee: { amount: 10, currency: 'EUR', per: 'noc' },
          maxDogs: 2,
          dogMayStayAlone: true,
          maxDogSize: 'srednji',
          affiliateUrl: 'https://partner.example/hotel/501',
        },
        { id: 502, name: 'Apartman Bez Podataka', address: null, dogFee: null, maxDogs: null, dogMayStayAlone: null, maxDogSize: null, affiliateUrl: null },
      ],
      restaurants: [{ id: 601, name: 'Restoran Test', address: 'Centar' }],
      trails: [{ id: 1000701, name: 'Staza Test', lengthKm: 4.5, description: null }],
      gondola: { dogsAllowed: false, checkedAt: '2026-10-20' },
      skiLifts: { dogsAllowed: null, checkedAt: null },
      vet: { id: 2000801, name: 'Veterinar Test', address: 'Raška', phone: '036 000 000', distanceKm: 28.4 },
    },
    tara: EMPTY_DESTINATION,
  },
};

describe('WinterDestinationPageComponent', () => {
  let fixture: ComponentFixture<WinterDestinationPageComponent>;
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const jsonLd = (id: string) => {
    const script = document.head.querySelector(`script[type="application/ld+json"][data-seo-id="${id}"]`);
    return script ? JSON.parse(script.textContent ?? '') : null;
  };
  const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content');

  async function render(path: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        WinterDestinationPageComponent,
        TranslocoTestingModule.forRoot({
          langs: { rs: { home: 'Početna', breadcrumb: 'Navigacija' } },
          translocoConfig: { availableLangs: ['rs'], defaultLang: 'rs' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WINTER_DATA, useValue: SNAPSHOT },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { [WINTER_PAGE_DATA]: path } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WinterDestinationPageComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(path);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    document.head.querySelectorAll('script[type="application/ld+json"], meta[name="robots"]').forEach((node) => node.remove());
  });

  it('renders the H1 and the stays first, each linking to its venue page', async () => {
    await render('/zimovanje-sa-psom/kopaonik');

    expect(element().querySelector('h1')?.textContent).toBe('Zimovanje sa psom na Kopaoniku');
    const firstSection = element().querySelector('section');
    expect(firstSection?.id).toBe('smestaj');
    const links = Array.from(element().querySelectorAll<HTMLAnchorElement>('#smestaj .wp-card__name'));
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Planinska kuća Test', '/spots/501'],
      ['Apartman Bez Podataka', '/spots/502'],
    ]);
  });

  it('shows the dog rules that are in the data and nothing for the ones that are not', async () => {
    await render('/zimovanje-sa-psom/kopaonik');
    const facts = (card: Element) =>
      Array.from(card.querySelectorAll('.wp-facts > div')).map((row) => `${row.querySelector('dt')?.textContent} ${row.querySelector('dd')?.textContent}`);
    const [full, empty] = Array.from(element().querySelectorAll('#smestaj .wp-card'));

    expect(facts(full)).toEqual([
      'Doplata za psa: 10 € po noći',
      'Najviše pasa: 2',
      'Pas sme sam u sobi: da',
      'Veličina: mali i srednji psi',
    ]);
    expect(facts(empty)).toEqual([]);
    expect(empty.textContent).not.toContain('Proveri dostupnost');
    // Ski lifts were never checked: no row for them.
    const lifts = Array.from(element().querySelectorAll('#gondole .wp-place')).map((row) => row.textContent?.replace(/\s+/g, ' ').trim());
    expect(lifts).toEqual(['GondolaPsi ne smeju (provereno 20. 10. 2026.)']);
  });

  it('marks affiliate links rel="sponsored nofollow"', async () => {
    await render('/zimovanje-sa-psom/kopaonik');
    const affiliate = element().querySelector<HTMLAnchorElement>('a[data-link-type="affiliate_booking"]');
    expect(affiliate?.getAttribute('href')).toBe('https://partner.example/hotel/501');
    expect(affiliate?.getAttribute('rel')).toBe('sponsored nofollow');
  });

  it('keeps the section order: stays, restaurants, walks, lifts, vet, packing, FAQ', async () => {
    await render('/zimovanje-sa-psom/kopaonik');
    const headings = Array.from(element().querySelectorAll('h2')).map((h) => h.textContent?.trim());
    expect(headings.slice(0, 7)).toEqual([
      'Smeštaj na Kopaoniku koji prima pse',
      'Restorani na Kopaoniku gde psi smeju unutra',
      'Šetne staze zimi',
      'Gondole i žičare: da li primaju pse',
      'Najbliži veterinar',
      'Šta spakovati psu za zimovanje',
      'Česta pitanja',
    ]);
  });

  it('publishes Article, FAQPage and BreadcrumbList, and is indexable with stays', async () => {
    await render('/zimovanje-sa-psom/kopaonik');

    expect(jsonLd('winter-article')).toMatchObject({
      '@type': 'Article',
      headline: 'Zimovanje sa psom na Kopaoniku',
      url: 'https://www.gdesapsom.com/zimovanje-sa-psom/kopaonik',
      dateModified: '2026-11-05',
    });
    const questions = jsonLd('winter-faq').mainEntity.map((q: { name: string }) => q.name);
    expect(questions).toContain('Da li psi smeju na gondolu na Kopaoniku?');
    expect(questions).not.toContain('Da li psi smeju na žičare na Kopaoniku?');
    expect(jsonLd('breadcrumb').itemListElement).toHaveLength(3);
    expect(robots()).not.toBe('noindex, follow');
  });

  it('without stays shows that none are checked yet and asks not to be indexed', async () => {
    await render('/zimovanje-sa-psom/tara');

    expect(text()).toContain('Još nemamo proveren smeštaj na Tari koji prima pse.');
    expect(element().querySelector('#restorani')).toBeNull();
    expect(element().querySelector('#veterinar')).toBeNull();
    expect(robots()).toBe('noindex, follow');
  });
  it('refreshes from the live API after rendering: a place removed from the database disappears', async () => {
    await render('/zimovanje-sa-psom/kopaonik');
    const http = TestBed.inject(HttpTestingController);
    const live: WinterSnapshot = JSON.parse(JSON.stringify(SNAPSHOT));
    live.destinations['kopaonik'].stays = live.destinations['kopaonik'].stays.filter((stay) => stay.id !== 502);
    http.expectOne('winter/destinations').flush(live);
    fixture.detectChanges();

    const names = Array.from(element().querySelectorAll('#smestaj .wp-card__name')).map((link) => link.textContent?.trim());
    expect(names).toEqual(['Planinska kuća Test']);
    http.verify();
  });

  it('keeps the prerendered list when the live API fails', async () => {
    await render('/zimovanje-sa-psom/kopaonik');
    TestBed.inject(HttpTestingController).expectOne('winter/destinations').flush('down', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(element().querySelectorAll('#smestaj .wp-card__name')).toHaveLength(2);
  });
});

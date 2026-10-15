import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import type { Spot } from '@gde/shared/data-access';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { Observable, of, throwError } from 'rxjs';
import { PetFriendlyListingsService, SpotPage, SpotQuery } from './pet-friendly-listings.service';
import { PetFriendlyPageComponent } from './pet-friendly-page.component';
import { PET_FRIENDLY_PAGE_DATA } from './pet-friendly-pages';

const spot = (iuo_id: number, iuo_ime: string): Spot =>
  ({ iuo_id, iuo_ime, ugo_ime: 'Kafić', grd_ime: 'Novi Sad', ops_ime: 'Liman', sta_ime: 'Svi psi' }) as Spot;

/** Venues per type id: Kafić (1) and Kafeterija (7) in Novi Sad. */
let catalog: Record<number, Spot[]>;
let failSearch: boolean;

const listings: Partial<PetFriendlyListingsService> = {
  cityArea: () => of({ cityIds: [2], townshipIds: [10, 11] }),
  typeIds: () => of([1, 7]),
  parksIn: () => of([]),
  vetsIn: () => of({ clinics: [], total: 0 }),
  searchSpots: (query: SpotQuery): Observable<SpotPage> => {
    if (failSearch) return throwError(() => new Error('offline'));
    const all = catalog[query.typeId ?? 0] ?? [];
    return of({ spots: all.slice(query.offset, query.offset + query.limit), total: all.length });
  },
};

describe('PetFriendlyPageComponent', () => {
  let fixture: ComponentFixture<PetFriendlyPageComponent>;

  const element = () => fixture.nativeElement as HTMLElement;
  const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content');
  const jsonLd = (id: string) => {
    const script = document.head.querySelector(`script[type="application/ld+json"][data-seo-id="${id}"]`);
    return script ? JSON.parse(script.textContent ?? '') : null;
  };

  async function render(path: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        PetFriendlyPageComponent,
        TranslocoTestingModule.forRoot({
          langs: { rs: { home: 'Početna', breadcrumb: 'Navigacija' } },
          translocoConfig: { availableLangs: ['rs'], defaultLang: 'rs' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: PetFriendlyListingsService, useValue: listings },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { [PET_FRIENDLY_PAGE_DATA]: path } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PetFriendlyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    failSearch = false;
    catalog = {
      1: [spot(1, 'Kafić Liman'), spot(2, 'Kafić Kej'), spot(3, 'Kafić Tvrđava'), spot(4, 'Kafić Dunav')],
      7: [spot(5, 'Kafeterija Centar')],
    };
    document.head.querySelectorAll('script[type="application/ld+json"], meta[name="robots"]').forEach((node) => node.remove());
  });

  it('renders the heading, the count and the listings of a city × category page', async () => {
    await render('/novi-sad/kafici');

    expect(element().querySelector('h1')?.textContent?.trim()).toBe('Pet friendly kafići u Novom Sadu');
    expect(element().querySelector('.pf-count')?.textContent).toContain(
      'Na Gde sa psom je trenutno 5 pet friendly kafića u Novom Sadu.',
    );
    expect(element().querySelectorAll('app-card .card-title')).toHaveLength(5);
  });

  it('publishes the listings as an ItemList and the questions as an FAQPage', async () => {
    await render('/novi-sad/kafici');

    const collection = jsonLd('pet-friendly-list');
    expect(collection['@type']).toBe('CollectionPage');
    expect(collection.url).toBe('https://www.gdesapsom.com/novi-sad/kafici');
    expect(collection.mainEntity.numberOfItems).toBe(5);
    expect(collection.mainEntity.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Kafić Liman',
      url: 'https://www.gdesapsom.com/spots/1',
    });

    const faq = jsonLd('pet-friendly-faq');
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toContain('Koliko pet friendly kafića ima u Novom Sadu?');
  });

  it('marks a thin city × category page noindex', async () => {
    catalog = { 1: [spot(1, 'Kafić Liman')], 7: [] };
    await render('/novi-sad/kafici');

    expect(robots()).toBe('noindex, follow');
  });

  it('keeps a hub indexable when the API fails, and offers a retry', async () => {
    failSearch = true;
    await render('/novi-sad/kafici');

    expect(robots()).not.toBe('noindex, follow');
    expect(element().querySelector('.pf-notice button')).not.toBeNull();
  });

  it('shows how to add a place when a page has no listings yet', async () => {
    catalog = { 1: [], 7: [] };
    await render('/novi-sad/kafici');

    expect(element().querySelector('.pf-notice')?.textContent).toContain('Za sada na listi nema nijednog kafića u Novom Sadu.');
    expect(jsonLd('pet-friendly-list')).toBeNull();
  });

  it('loads the next batch on "Prikaži još"', async () => {
    catalog = { 1: Array.from({ length: 9 }, (_, i) => spot(i + 1, `Kafić ${i + 1}`)), 7: [] };
    await render('/novi-sad/kafici');
    expect(element().querySelectorAll('app-card .card-title')).toHaveLength(6);

    const more = element().querySelector<HTMLButtonElement>('.pf-more button');
    more?.click();
    fixture.detectChanges();

    expect(element().querySelectorAll('app-card .card-title')).toHaveLength(9);
    expect(element().querySelector('.pf-more')).toBeNull();
  });

  it('links a city hub to each of its categories', async () => {
    await render('/novi-sad');
    const cityLinks = Array.from(element().querySelectorAll('.pf-subnav a')).map((a) => a.getAttribute('href'));
    expect(cityLinks).toEqual(['/novi-sad/kafici', '/novi-sad/restorani', '/novi-sad/barovi', '/novi-sad/smestaj']);
  });
});

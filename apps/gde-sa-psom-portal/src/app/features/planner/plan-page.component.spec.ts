import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { PlannerAnalytics } from './planner-analytics';
import { PlannerApiService } from './planner-api.service';
import { PlannerStorage } from './planner-storage';
import { PlanPageComponent } from './plan-page.component';
import type { PlannerResult } from './planner.models';

const place = (id: number, naziv: string, kategorija: PlannerResult['places'][string]['kategorija'], extra = {}) => ({
  id,
  naziv,
  kategorija,
  adresa: null,
  kvart: null,
  lat: 44.8 + id / 1000,
  lng: 20.4,
  url: kategorija === 'park' ? null : `/spots/${id}`,
  affiliate_url: null,
  ...extra,
});

/** Invented test plans. */
const DAY: PlannerResult = {
  plan_id: 'p1',
  mode: 'dan',
  source: 'rules',
  weather_attribution: { text: 'Prognoza: MET Norway', url: 'https://api.met.no/', license: 'CC BY 4.0', license_url: 'https://creativecommons.org/licenses/by/4.0/' },
  plan: {
    naslov: 'Subota za {{ime}}',
    stanice: [
      { vreme: '09:00', lokacija_id: 1000001, zasto: 'Jutarnja šetnja.', savet_za_psa: '{{ime}} voli travu.' },
      { vreme: '10:30', lokacija_id: 11, zasto: 'Kafa.', savet_za_psa: 'Ima vode.' },
    ],
    napomene: [],
  },
  places: { '1000001': place(1000001, 'Park Test', 'park'), '11': place(11, 'Kafić Test', 'kafic') },
};

const WINTER: PlannerResult = {
  plan_id: 'w1',
  mode: 'zimovanje',
  source: 'ai',
  weather_attribution: null,
  plan: {
    naslov: 'Kopaonik',
    smestaj: [{ lokacija_id: 101, zasto: 'Blizu staza.' }],
    dani: [{ dan: 1, stanice: [{ vreme: '10:00', lokacija_id: 201, zasto: 'Ručak.', savet_za_psa: 'Topla prostirka.' }] }],
    veterinar_id: null,
    napomene: [],
  },
  places: {
    '101': place(101, 'Hotel Test', 'smestaj', { affiliate_url: 'https://partner.example/101', doplata_za_psa: { amount: 10, currency: 'EUR', per: 'noc' }, max_pasa: null }),
    '201': place(201, 'Restoran Test', 'restoran'),
  },
};

describe('PlanPageComponent', () => {
  let fixture: ComponentFixture<PlanPageComponent>;
  const params = new BehaviorSubject(convertToParamMap({ id: 'p1' }));
  const api = { get: jest.fn(), swap: jest.fn(), feedback: jest.fn(() => of({})) };
  const analytics = { swap: jest.fn(), share: jest.fn(), venueClick: jest.fn(), bookingClick: jest.fn() };
  let dogName = '';
  const element = () => fixture.nativeElement as HTMLElement;

  async function render(result: PlannerResult): Promise<void> {
    params.next(convertToParamMap({ id: result.plan_id }));
    api.get.mockReturnValue(of(result));
    await TestBed.configureTestingModule({
      imports: [PlanPageComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: PlannerApiService, useValue: api },
        { provide: PlannerAnalytics, useValue: analytics },
        { provide: PlannerStorage, useValue: { dogName: () => dogName } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PlanPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    jest.clearAllMocks();
    dogName = '';
  });

  it('loads a shared plan and fills in "tvoj pas" without a name', async () => {
    await render(DAY);
    expect(api.get).toHaveBeenCalledWith('p1');
    expect(element().querySelector('h1')?.textContent).toBe('Subota za tvoj pas');
    expect(element().textContent).toContain('Tvoj pas voli travu.');
  });

  it('uses the name kept in this browser', async () => {
    dogName = 'Žućko';
    await render(DAY);
    expect(element().querySelector('h1')?.textContent).toBe('Subota za Žućko');
  });

  it('shows the no-AI badge, the forecast credit, links to venue pages and the walking route', async () => {
    await render(DAY);
    expect(element().querySelector('.pl-badge')?.textContent).toBe('Plan sastavljen bez AI asistenta');
    expect(element().querySelector('.pl-credit')?.textContent).toContain('Prognoza: MET Norway');
    const venue = element().querySelector<HTMLAnchorElement>('a.pl-stop__name');
    expect(venue?.getAttribute('href')).toBe('/spots/11');
    expect(element().querySelector<HTMLAnchorElement>('a[data-link-type="venue_maps"]')?.href).toContain('travelmode=walking');
  });

  it('shows stays with their booking link marked sponsored and only the known dog rules', async () => {
    await render(WINTER);
    const booking = element().querySelector<HTMLAnchorElement>('a[data-link-type="affiliate_booking"]');
    expect(booking?.getAttribute('rel')).toBe('sponsored nofollow');
    const facts = Array.from(element().querySelectorAll('.pl-facts dt')).map((dt) => dt.textContent);
    expect(facts).toEqual(['Doplata za psa:']);
    expect(element().querySelector('.pl-badge')).toBeNull();
  });

  it('"Zameni" asks for a swap and opens the new plan', async () => {
    api.swap.mockReturnValue(of({ ...DAY, plan_id: 'p2' }));
    await render(DAY);
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const button = Array.from(element().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Zameni');
    button?.click();

    expect(api.swap).toHaveBeenCalledWith('p1', { section: 'stanice', index: 0, exclude: [] });
    expect(analytics.swap).toHaveBeenCalledWith('dan', 'park');
    expect(navigate).toHaveBeenCalledWith(['/plan', 'p2'], expect.objectContaining({ replaceUrl: true }));
  });

  it('sends thumbs and error reports as feedback', async () => {
    await render(DAY);
    fixture.componentInstance.rate(1);
    expect(api.feedback).toHaveBeenCalledWith({ plan_id: 'p1', rating: 1 });

    fixture.componentInstance.reportText.set('Zatvoren je.');
    fixture.componentInstance.sendReport(11);
    expect(api.feedback).toHaveBeenCalledWith({ plan_id: 'p1', venue_id: 11, comment: 'Zatvoren je.' });
  });
});

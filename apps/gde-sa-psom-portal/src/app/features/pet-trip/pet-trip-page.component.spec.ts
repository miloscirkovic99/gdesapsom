import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoService, TranslocoTestingModule } from '@ngneat/transloco';
import { of } from 'rxjs';
import { PET_TRIP_AI_ENABLED, PetTripInsightsApi } from './ai/insights.api';
import type { InsightsRequest, InsightsResult } from './ai/insights.models';
import { addDays, todayIso } from './domain/dates';
import { PetTripPageComponent } from './pet-trip-page.component';
import { PetTripPlanner } from './pet-trip.planner';

describe('PetTripPageComponent', () => {
  let fixture: ComponentFixture<PetTripPageComponent>;
  let planner: PetTripPlanner;
  let explain: jest.Mock;

  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    Array.from(element().querySelectorAll('button')).find((entry) => entry.textContent?.trim().startsWith(label)) as HTMLButtonElement;

  async function render(options: { ai?: boolean; result?: InsightsResult; lang?: 'rs' | 'en' } = {}): Promise<void> {
    const result: InsightsResult = options.result ?? { status: 'unavailable', insights: null, remaining: null, limit: null, reason: null };
    explain = jest.fn().mockReturnValue(of(result));
    await TestBed.configureTestingModule({
      imports: [
        PetTripPageComponent,
        TranslocoTestingModule.forRoot({
          langs: { rs: { home: 'Početna', breadcrumb: 'Navigacija' }, en: { home: 'Home', breadcrumb: 'Breadcrumb' } },
          translocoConfig: { availableLangs: ['rs', 'en'], defaultLang: options.lang ?? 'rs' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: PetTripInsightsApi, useValue: { explain } },
        { provide: PET_TRIP_AI_ENABLED, useValue: options.ai ?? false },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PetTripPageComponent);
    planner = fixture.debugElement.injector.get(PetTripPlanner);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function update(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** A ready dog, a week in Croatia by car, then the results. */
  async function fillAndCheck(labels = { next: 'Dalje', check: 'Proveri putovanje' }): Promise<void> {
    const departure = addDays(todayIso(), 60);
    planner.tripForm.patchValue({ destination: 'HR', transport: 'car', departureDate: departure, returnDate: addDays(departure, 7), travelers: 2 });
    planner.dogsForm.at(0).patchValue({
      microchip: 'iso',
      rabiesVaccinated: 'yes',
      rabiesVaccinationDate: addDays(todayIso(), -100),
      rabiesValidUntil: addDays(todayIso(), 900),
      rabiesPrimary: 'no',
      chipBeforeVaccination: 'yes',
      passport: 'yes',
      restrictedBreed: 'no',
    });
    button(labels.next).click();
    await update();
    button(labels.check).click();
    await update();
  }

  beforeEach(() => localStorage.clear());

  it('opens on the trip step and does not move on without a departure date', async () => {
    await render();
    expect(element().querySelector('h1')?.textContent).toContain('Putovanje sa psom u inostranstvo');
    button('Dalje').click();
    await update();
    expect(planner.view()).toBe('trip');
    expect(text()).toContain('Unesi datum polaska.');
  });

  it('shows the readiness report with sources once the trip is entered', async () => {
    await render();
    await fillAndCheck();
    expect(planner.view()).toBe('results');
    expect(text()).toContain('Spremnost za put: Hrvatska');
    expect(text()).toContain('EU veterinarski sertifikat');
    expect(text()).toContain('Bajakovo');
    const links = Array.from(element().querySelectorAll<HTMLAnchorElement>('.pt-sources a')).map((link) => link.href);
    expect(links.some((href) => href.startsWith('http://data.europa.eu/eli/'))).toBe(true);
  });

  it('shows the whole planner in English on the English site', async () => {
    await render({ lang: 'en' });
    expect(element().querySelector('h1')?.textContent).toContain('Travelling abroad with a dog');
    await fillAndCheck({ next: 'Next', check: 'Check the trip' });
    planner.addScenario();
    await update();
    expect(planner.view()).toBe('results');
    expect(text()).toContain('Ready to travel: Croatia');
    expect(text()).toContain('EU animal health certificate');
    expect(text()).toContain('Option B');
    // Every tab is in the DOM (the inactive ones hidden): none of it may be left in Serbian.
    expect(text().match(/\S*[čćšžđČĆŠŽĐ]\S*/g)).toBeNull();
    expect(planner.insightsRequest().lang).toBe('en');
  });

  it('switches language without losing what was entered', async () => {
    await render();
    await fillAndCheck();
    expect(text()).toContain('Spremnost za put: Hrvatska');
    TestBed.inject(TranslocoService).setActiveLang('en');
    await update();
    expect(element().querySelector('h1')?.textContent).toContain('Travelling abroad with a dog');
    expect(text()).toContain('Ready to travel: Croatia');
    expect(planner.trip().dogs[0].microchip).toBe('iso');
    expect(planner.scenarios()[0].label).toBe('Your plan');
  });

  it('keeps costs apart from readiness and compares a second scenario', async () => {
    await render();
    await fillAndCheck();
    planner.tab.set('costs');
    planner.addScenario();
    await update();
    expect(text()).toContain('Poređenje varijanti');
    expect(text()).toContain('Varijante još nisu uporedive');
    expect(text()).toContain('Cena ne govori ništa o tome da li put sme');
  });

  it('converts typed amounts when the currency changes', async () => {
    await render();
    await fillAndCheck();
    planner.patchScenario('A', { accommodationPerNight: 60 });
    planner.setCurrency('RSD');
    expect(planner.shared().currency).toBe('RSD');
    expect(planner.scenarios()[0].accommodationPerNight).toBe(Math.round(60 * planner.shared().rsdPerEur));
  });

  it('keeps a draft in the browser and brings it back', async () => {
    await render();
    await fillAndCheck();
    await update();
    const saved = JSON.parse(localStorage.getItem('gsp_pet_trip_v1') ?? 'null');
    expect(saved?.trip?.destination).toBe('HR');
    expect(saved?.view).toBe('results');

    TestBed.resetTestingModule();
    await render();
    expect(planner.view()).toBe('results');
    expect(planner.trip().dogs[0].microchip).toBe('iso');
  });

  it('has no AI section while the switch is off', async () => {
    await render();
    await fillAndCheck();
    expect(element().querySelector('.pt-ai')).toBeNull();
  });

  it('shows a checked AI explanation, labelled as AI, on request only', async () => {
    const result: InsightsResult = {
      status: 'ok',
      insights: { summary: 'Put je izvodljiv uz nekoliko koraka.', steps: [], savings: [], comparison: '', aiGenerated: true },
      remaining: 4,
      limit: 5,
      reason: null,
    };
    await render({ ai: true, result });
    await fillAndCheck();
    planner.tab.set('summary');
    await update();
    expect(explain).not.toHaveBeenCalled();
    button('Objasni uz AI').click();
    await update();
    expect(explain).toHaveBeenCalledTimes(1);
    const article = element().querySelector('[data-ai-generated="true"]');
    expect(article?.textContent).toContain('Napisao AI');
    expect(article?.textContent).toContain('Put je izvodljiv');
    const sent = explain.mock.calls[0][0] as InsightsRequest;
    expect(JSON.stringify(sent)).not.toContain('Novi Sad');
    expect(text()).toContain('Preostalo AI objašnjenja na ovom uređaju: 4 od 5.');
  });

  it('says so when the site-wide limit is reached, and keeps the results', async () => {
    await render({ ai: true, result: { status: 'quota', insights: null, remaining: 3, limit: 5, reason: 'global' } });
    await fillAndCheck();
    planner.tab.set('summary');
    await update();
    button('Objasni uz AI').click();
    await update();
    expect(text()).toContain('Dnevni broj AI objašnjenja na sajtu je potrošen');
    expect(text()).toContain('Preostalo AI objašnjenja na ovom uređaju: 3 od 5.');
    expect(element().querySelector('[data-ai-generated]')).toBeNull();
    expect(text()).toContain('Spremnost (pravila)');
  });

  it('locks the button once this device has used its explanations', async () => {
    await render({ ai: true, result: { status: 'quota', insights: null, remaining: 0, limit: 5, reason: 'device' } });
    await fillAndCheck();
    planner.tab.set('summary');
    await update();
    button('Objasni uz AI').click();
    await update();
    expect(text()).toContain('Iskoristio si dozvoljen broj AI objašnjenja na ovom uređaju (5)');
    expect(button('Objasni uz AI').disabled).toBe(true);
    planner.explain();
    expect(explain).toHaveBeenCalledTimes(1);
  });

  it('keeps the device allowance when the draft is reset', async () => {
    await render({ ai: true, result: { status: 'quota', insights: null, remaining: 0, limit: 5, reason: 'device' } });
    await fillAndCheck();
    planner.explain();
    planner.reset();
    expect(planner.insightsUsedUp()).toBe(true);
  });
});

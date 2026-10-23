import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { SpotsStore } from '@gde/shared/data-access';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { AnalyticsService } from '../../core/services/analytics.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { SpotDetailPageComponent, spotPopupHtml } from './spot-detail-page.component';

// No map in these tests: Leaflet never finishes loading.
jest.mock('../../shared/utils/leaflet', () => ({ loadLeaflet: () => new Promise(() => undefined) }));

type Answer = (onSuccess: (spot: unknown) => void, onError: () => void) => void;

describe('SpotDetailPageComponent indexing', () => {
  let fixture: ComponentFixture<SpotDetailPageComponent>;
  let answer: Answer;
  const getSpotById = jest.fn((_id: string, onSuccess: (spot: unknown) => void, onError: () => void) =>
    answer(onSuccess, onError),
  );

  const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null;
  const element = () => fixture.nativeElement as HTMLElement;

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        SpotDetailPageComponent,
        TranslocoTestingModule.forRoot({
          langs: { rs: { try_again: 'Pokušaj ponovo' } },
          translocoConfig: { availableLangs: ['rs'], defaultLang: 'rs' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '16' }) } } },
        { provide: SpotsStore, useValue: { getSpotById } },
        { provide: SnackbarService, useValue: { openSnackbar: jest.fn() } },
        { provide: AnalyticsService, useValue: { trackShare: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpotDetailPageComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    getSpotById.mockClear();
    document.head.querySelectorAll('meta[name="robots"]').forEach((node) => node.remove());
  });

  it('marks a spot the API does not have as noindex', async () => {
    answer = (onSuccess) => onSuccess(null);
    await render();

    expect(robots()).toBe('noindex, follow');
  });

  it('keeps the page indexable when the request fails, and offers a retry', async () => {
    answer = (_onSuccess, onError) => onError();
    await render();

    expect(robots()).not.toBe('noindex, follow');
    const retry = element().querySelector<HTMLButtonElement>('[role="status"] button');
    expect(retry?.textContent?.trim()).toBe('Pokušaj ponovo');

    retry?.click();
    expect(getSpotById).toHaveBeenCalledTimes(2);
  });

  it('fetches the photos a prerendered page left out, past the copy in the page', async () => {
    answer = (onSuccess) => onSuccess({ iuo_id: 16, iuo_ime: 'Witch Bar', iuo_slika_base64: null, photosOmitted: true });
    await render();

    expect(getSpotById).toHaveBeenCalledTimes(2);
    expect(getSpotById).toHaveBeenLastCalledWith('16', expect.any(Function), expect.any(Function), { fresh: true });
  });

  it('asks once when the spot came with its photos', async () => {
    answer = (onSuccess) => onSuccess({ iuo_id: 16, iuo_ime: 'Witch Bar', iuo_slika_base64: 'data:image/jpeg;base64,AA==' });
    await render();

    expect(getSpotById).toHaveBeenCalledTimes(1);
  });
});

describe('spotPopupHtml', () => {
  const sr: Record<string, string> = {
    address: 'Adresa',
    pet_size: 'Veličina psa',
    garden: 'Bašta',
    small_dog: 'Mali psi',
    with_garden: 'Sa baštom',
  };
  const t = (key: string) => sr[key] ?? key;

  it('labels the popup in the active language', () => {
    expect(spotPopupHtml('Zmaj Jovina 1,Novi Sad', { sta_ime: 'Mali pas', bas_naziv: 'sa baštom' }, t)).toBe(
      '<b>Adresa:</b> Zmaj Jovina 1,Novi Sad <br> <b>Veličina psa:</b> Mali psi <br> <b>Bašta:</b> Sa baštom',
    );
  });

  it('escapes the API text, which Leaflet inserts as HTML', () => {
    const popup = spotPopupHtml('<img src=x onerror=alert(1)>,Novi Sad', { sta_ime: 'Svi "psi"', bas_naziv: null }, t);

    expect(popup).not.toContain('<img');
    expect(popup).toContain('&#60;img src=x onerror=alert(1)&#62;,Novi Sad');
    expect(popup).toContain('<b>Veličina psa:</b> Svi &#34;psi&#34;');
    expect(popup).toMatch(/<b>Bašta:<\/b> $/);
  });
});

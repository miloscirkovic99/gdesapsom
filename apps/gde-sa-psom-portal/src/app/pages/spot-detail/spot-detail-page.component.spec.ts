import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { SpotsStore } from '@gde/shared/data-access';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { AnalyticsService } from '../../core/services/analytics.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { SpotDetailPageComponent } from './spot-detail-page.component';

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
});

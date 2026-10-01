import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { ConsentService } from '../../../core/consent/consent.service';
import { CookieBannerComponent } from './cookie-banner.component';

describe('CookieBannerComponent', () => {
  let fixture: ComponentFixture<CookieBannerComponent>;
  let consent: ConsentService;

  const button = (text: string): HTMLButtonElement => {
    const match = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === text,
    );
    if (!match) throw new Error(`No button "${text}"`);
    return match as HTMLButtonElement;
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [
        CookieBannerComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            rs: {
              consent_title: 'Kolačići i statistika posećenosti',
              consent_text: 'Tekst',
              consent_accept_all: 'Prihvati sve',
              consent_necessary_only: 'Samo neophodno',
              consent_settings: 'Podešavanja',
              consent_save: 'Sačuvaj izbor',
              consent_cat_necessary: 'Neophodno',
              consent_cat_necessary_text: 'Opis',
              consent_cat_analytics: 'Statistika posećenosti (Google Analytics)',
              consent_cat_analytics_text: 'Opis',
              consent_always_on: 'Uvek uključeno',
              cookie_header: 'Politika kolačića',
              privacy_title: 'Politika privatnosti',
            },
          },
          translocoConfig: { availableLangs: ['rs'], defaultLang: 'rs' },
          preloadLangs: true,
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    consent = TestBed.inject(ConsentService);
    fixture = TestBed.createComponent(CookieBannerComponent);
    fixture.detectChanges();
  });

  it('shows while the choice is pending, with the three choices', () => {
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(button('Prihvati sve')).toBeTruthy();
    expect(button('Samo neophodno')).toBeTruthy();
    expect(button('Podešavanja')).toBeTruthy();
  });

  it('"Prihvati sve" grants and hides the banner', () => {
    button('Prihvati sve').click();
    fixture.detectChanges();

    expect(consent.status()).toBe('granted');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('"Samo neophodno" denies', () => {
    button('Samo neophodno').click();

    expect(consent.status()).toBe('denied');
  });

  it('settings view: switching analytics off and saving denies', () => {
    button('Podešavanja').click();
    fixture.detectChanges();

    // The necessary category has no toggle, only an "always on" badge.
    const toggles = fixture.nativeElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    expect(toggles).toHaveLength(1);
    expect(toggles[0].checked).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Uvek uključeno');

    toggles[0].click();
    fixture.detectChanges();
    button('Sačuvaj izbor').click();

    expect(consent.status()).toBe('denied');
  });

  it('reopens from the footer link with the saved choice preselected', () => {
    button('Samo neophodno').click();
    fixture.detectChanges();

    consent.open();
    fixture.detectChanges();
    button('Podešavanja').click();
    fixture.detectChanges();

    const toggles = fixture.nativeElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    expect(toggles[0].checked).toBe(false);
  });
});

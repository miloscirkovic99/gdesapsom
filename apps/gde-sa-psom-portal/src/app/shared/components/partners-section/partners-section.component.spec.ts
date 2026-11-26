import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@ngneat/transloco';
import { PartnersSectionComponent } from './partners-section.component';

describe('PartnersSectionComponent', () => {
  let fixture: ComponentFixture<PartnersSectionComponent>;
  let element: HTMLElement;

  const partnerLinks = (): HTMLAnchorElement[] => Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PartnersSectionComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            rs: {
              partners_title: 'Partneri',
              partners_heading: 'Kad pas ne može sa tobom, neka ostane u dobrim rukama.',
              partners_pawko_cta: 'Prijavi se za rani pristup',
              partners_pawko_more: 'Saznaj više na pawko.me',
            },
            en: {
              partners_title: 'Partners',
              partners_heading: "When your dog can't come along, leave them in good hands.",
              partners_pawko_cta: 'Sign up for early access',
              partners_pawko_more: 'Learn more at pawko.me',
            },
          },
          // As in provideAppTransloco: texts follow a language switch.
          translocoConfig: { availableLangs: ['rs', 'en'], defaultLang: 'rs', reRenderOnLangChange: true },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnersSectionComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('leaves the h1 to the homepage and titles the section with an h2', () => {
    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('h2')?.textContent?.trim()).toBe(
      'Kad pas ne može sa tobom, neka ostane u dobrim rukama.',
    );
  });

  it('makes "Partneri" the h1 on the /partneri page', () => {
    fixture.componentRef.setInput('asPage', true);
    fixture.detectChanges();

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Partneri');
  });

  it('opens Pawko in a new tab and tags the links for outbound-click reports', () => {
    expect(partnerLinks().map((link) => link.textContent?.trim())).toEqual([
      'Prijavi se za rani pristup',
      'Saznaj više na pawko.me',
    ]);
    for (const link of partnerLinks()) {
      expect(link.getAttribute('href')).toBe('https://pawko.me/');
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener');
      expect(link.dataset['linkType']).toBe('partner');
    }
  });

  it("links to Pawko's English site when the visitor reads in English", () => {
    TestBed.inject(TranslocoService).setActiveLang('en');
    fixture.detectChanges();

    expect(partnerLinks().map((link) => link.getAttribute('href'))).toEqual([
      'https://pawko.me/en',
      'https://pawko.me/en',
    ]);
    expect(partnerLinks()[0].textContent?.trim()).toBe('Sign up for early access');
  });
});

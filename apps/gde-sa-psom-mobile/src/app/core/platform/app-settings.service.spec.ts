import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@ngneat/transloco';
import { LanguageService } from '@gde/shared/util';
import { of } from 'rxjs';
import { AppSettingsService } from './app-settings.service';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

const prefs = Preferences as jest.Mocked<typeof Preferences>;

function setup(saved: { language?: string; currentTheme?: string }, systemDark = false) {
  prefs.get.mockImplementation(async ({ key }) => ({ value: saved[key as keyof typeof saved] ?? null }));
  const switchLanguage = jest.fn();
  const load = jest.fn(() => of({}));
  TestBed.configureTestingModule({
    providers: [
      { provide: LanguageService, useValue: { switchLanguage } },
      { provide: TranslocoService, useValue: { load } },
    ],
  });
  const doc = TestBed.inject(DOCUMENT);
  doc.documentElement.classList.remove('ion-palette-dark');
  Object.defineProperty(doc.defaultView, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: systemDark }),
  });
  return { settings: TestBed.inject(AppSettingsService), doc, switchLanguage, load };
}

describe('AppSettingsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('restores the saved language and theme and preloads that translation', async () => {
    const { settings, doc, switchLanguage, load } = setup({ language: 'en', currentTheme: 'dark' });

    await settings.load();

    expect(settings.language()).toBe('en');
    expect(switchLanguage).toHaveBeenCalledWith('en');
    expect(load).toHaveBeenCalledWith('en');
    expect(settings.theme()).toBe('dark');
    expect(doc.documentElement.classList.contains('ion-palette-dark')).toBe(true);
  });

  it('defaults to Serbian and follows the system theme on first launch', async () => {
    const { settings, doc } = setup({}, true);

    await settings.load();

    expect(settings.language()).toBe('rs');
    expect(settings.theme()).toBe('dark');
    expect(doc.documentElement.classList.contains('ion-palette-dark')).toBe(true);
  });

  it('persists changes under the portal keys', () => {
    const { settings, doc } = setup({});

    settings.setTheme('light');
    settings.setLanguage('en');

    expect(doc.documentElement.classList.contains('ion-palette-dark')).toBe(false);
    expect(prefs.set).toHaveBeenCalledWith({ key: 'currentTheme', value: 'light' });
    expect(prefs.set).toHaveBeenCalledWith({ key: 'language', value: 'en' });
  });
});

import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@ngneat/transloco';
import { LanguageService } from '@gde/shared/util';
import { firstValueFrom } from 'rxjs';

export type AppLanguage = 'rs' | 'en';
export type AppTheme = 'light' | 'dark';

// Same keys the portal keeps in localStorage.
const LANGUAGE_KEY = 'language';
const THEME_KEY = 'currentTheme';

/**
 * Language and theme, persisted with Capacitor Preferences.
 *
 * `load()` runs before the first render (app initializer): it applies the
 * saved choices, falls back to the system colour scheme, and waits for the
 * translation file so the first screen never shows raw keys.
 */
@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly document = inject(DOCUMENT);
  private readonly languageService = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);

  readonly language = signal<AppLanguage>('rs');
  readonly theme = signal<AppTheme>('light');

  async load(): Promise<void> {
    const [language, theme] = await Promise.all([
      Preferences.get({ key: LANGUAGE_KEY }),
      Preferences.get({ key: THEME_KEY }),
    ]);

    this.#applyTheme(theme.value === 'dark' || theme.value === 'light' ? theme.value : this.#systemTheme());

    const lang: AppLanguage = language.value === 'en' ? 'en' : 'rs';
    this.#applyLanguage(lang);
    await firstValueFrom(this.transloco.load(lang)).catch(() => undefined);
  }

  setLanguage(lang: AppLanguage): void {
    this.#applyLanguage(lang);
    void Preferences.set({ key: LANGUAGE_KEY, value: lang });
  }

  setTheme(theme: AppTheme): void {
    this.#applyTheme(theme);
    void Preferences.set({ key: THEME_KEY, value: theme });
  }

  #applyLanguage(lang: AppLanguage): void {
    this.language.set(lang);
    this.languageService.switchLanguage(lang);
  }

  #applyTheme(theme: AppTheme): void {
    this.theme.set(theme);
    // Ionic's dark palette is scoped to this class (palettes/dark.class.css).
    this.document.documentElement.classList.toggle('ion-palette-dark', theme === 'dark');
  }

  #systemTheme(): AppTheme {
    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}

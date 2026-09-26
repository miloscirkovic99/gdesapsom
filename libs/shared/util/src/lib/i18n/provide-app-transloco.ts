import { HttpClient } from '@angular/common/http';
import { EnvironmentProviders, inject, Injectable, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { provideTransloco, Translation, TranslocoLoader } from '@ngneat/transloco';

/**
 * Origin the translation JSON is fetched from, without a trailing slash.
 * `''` means the app's own origin (a relative `/assets/i18n/...` URL).
 */
export const I18N_ASSETS_BASE_URL = new InjectionToken<string>('I18N_ASSETS_BASE_URL');

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient);
  private baseUrl = inject(I18N_ASSETS_BASE_URL);

  getTranslation(lang: string) {
    // The URL contains "assets", so ApiPrefixInterceptor leaves it alone.
    return this.http.get<Translation>(`${this.baseUrl}/assets/i18n/${lang}.json`);
  }
}

/** Transloco with the app's languages (`rs` default, `en`) and the JSON loader above. */
export function provideAppTransloco(options: { prodMode: boolean; assetsBaseUrl: string }): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: I18N_ASSETS_BASE_URL, useValue: options.assetsBaseUrl },
    provideTransloco({
      config: {
        availableLangs: ['en', 'rs'],
        defaultLang: 'rs',
        reRenderOnLangChange: true,
        prodMode: options.prodMode,
      },
      loader: TranslocoHttpLoader,
    }),
  ]);
}

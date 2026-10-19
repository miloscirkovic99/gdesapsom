import { HttpClient } from '@angular/common/http';
import {
  EnvironmentProviders,
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
  makeStateKey,
  StateKey,
  TransferState,
} from '@angular/core';
import { provideTransloco, Translation, TranslocoLoader } from '@ngneat/transloco';
import { Observable, of } from 'rxjs';

/**
 * Origin the translation JSON is fetched from, without a trailing slash.
 * `''` means the app's own origin (a relative `/assets/i18n/...` URL).
 */
export const I18N_ASSETS_BASE_URL = new InjectionToken<string>('I18N_ASSETS_BASE_URL');

/**
 * Where a prerendered page carries the translation it was rendered with, so
 * the browser has the text at once instead of blanking it until the JSON
 * arrives. Written by `StaticTranslocoLoader` (`@gde/shared/util/i18n-static`).
 */
export const translationStateKey = (lang: string): StateKey<Translation> => makeStateKey<Translation>(`i18n-${lang}`);

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient);
  private baseUrl = inject(I18N_ASSETS_BASE_URL);
  private state = inject(TransferState);

  getTranslation(lang: string): Observable<Translation> {
    const key = translationStateKey(lang);
    const prerendered = this.state.get(key, null);
    if (prerendered) {
      this.state.remove(key);
      return of(prerendered);
    }
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

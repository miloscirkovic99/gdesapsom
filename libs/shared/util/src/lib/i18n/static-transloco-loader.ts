import { inject, Injectable, TransferState } from '@angular/core';
import { Translation, TRANSLOCO_LOADER, TranslocoLoader } from '@ngneat/transloco';
import { Observable, of, throwError } from 'rxjs';
import en from '../../i18n/en.json';
import rs from '../../i18n/rs.json';
import { translationStateKey } from './provide-app-transloco';

const TRANSLATIONS: Readonly<Record<string, Translation>> = { rs, en };

/**
 * Serves the translation files from the bundle and hands the one it served to
 * the page (`TransferState`), where `TranslocoHttpLoader` picks it up in the
 * browser. See `@gde/shared/util/i18n-static`.
 */
@Injectable()
export class StaticTranslocoLoader implements TranslocoLoader {
  readonly #state = inject(TransferState);

  getTranslation(lang: string): Observable<Translation> {
    const translation = TRANSLATIONS[lang];
    if (!translation) return throwError(() => new Error(`No translation file for "${lang}"`));
    this.#state.set(translationStateKey(lang), translation);
    return of(translation);
  }
}

/** Replaces the HTTP loader that `provideAppTransloco` registers. */
export const provideStaticTranslocoLoader = () => ({ provide: TRANSLOCO_LOADER, useClass: StaticTranslocoLoader });

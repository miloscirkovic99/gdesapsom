import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@ngneat/transloco';

/**
 * The active Transloco language as a signal ('rs' | 'en').
 *
 * Catalog lookups carry their own `nameSr` / `nameEn` from the database, so
 * templates pass this to the `localName`, `rsdPrice` and `packageWeight` pipes
 * instead of going through translation keys.
 */
export function injectActiveLang(): Signal<string> {
  const transloco = inject(TranslocoService);
  return toSignal(transloco.langChanges$, { initialValue: transloco.getActiveLang() });
}

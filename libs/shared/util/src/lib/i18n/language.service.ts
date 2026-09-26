import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { TranslocoService, } from '@ngneat/transloco';

/** Transloco uses `rs`; the BCP 47 tag for Serbian is `sr`. */
const HTML_LANG: Record<string, string> = { rs: 'sr', en: 'en' };

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private document = inject(DOCUMENT);

  constructor(private translocoService: TranslocoService) { }

  switchLanguage(language: string) {
    this.translocoService.setActiveLang(language);
    // Screen readers and the browser's translate prompt read <html lang>.
    this.document.documentElement.lang = HTML_LANG[language] ?? language;
  }
}

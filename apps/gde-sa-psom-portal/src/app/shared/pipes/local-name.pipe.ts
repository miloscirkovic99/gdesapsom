import { Pipe, PipeTransform } from '@angular/core';
import { LocalizedName } from '../data-access/catalog/catalog.models';

/**
 * Picks `nameSr` or `nameEn` from a catalog lookup for the given language.
 *
 * Usage: `{{ item.foodType | localName: lang() }}` where `lang` comes from
 * `injectActiveLang()`, so the value re-renders when the language changes.
 */
@Pipe({ name: 'localName' })
export class LocalNamePipe implements PipeTransform {
  transform(value: LocalizedName | null | undefined, lang: string): string {
    if (!value) return '';
    return lang.startsWith('en') ? value.nameEn || value.nameSr : value.nameSr || value.nameEn;
  }
}

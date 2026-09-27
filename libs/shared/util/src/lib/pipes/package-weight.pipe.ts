import { Pipe, PipeTransform } from '@angular/core';

const locale = (lang: string) => (lang.startsWith('en') ? 'en-US' : 'sr-Latn-RS');

/** Grams -> "300 g", 15000 -> "15 kg", 11400 -> "11,4 kg" (sr) / "11.4 kg" (en). */
@Pipe({ name: 'packageWeight' })
export class PackageWeightPipe implements PipeTransform {
  transform(grams: number | null | undefined, lang = 'rs'): string {
    if (!grams || grams <= 0) return '';
    if (grams < 1000) return `${grams} g`;

    const kg = new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 2 }).format(grams / 1000);
    return `${kg} kg`;
  }
}

import { Pipe, PipeTransform } from '@angular/core';

const locale = (lang: string) => (lang.startsWith('en') ? 'en-US' : 'sr-Latn-RS');

/**
 * Formats a dinar amount: 7999 -> "7.999 RSD" (sr) / "7,999 RSD" (en).
 * Whole amounts drop the decimals; anything else keeps two.
 */
@Pipe({ name: 'rsdPrice' })
export class RsdPricePipe implements PipeTransform {
  transform(value: number | null | undefined, lang = 'rs'): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '';

    const hasFraction = Math.round(value * 100) % 100 !== 0;
    const digits = hasFraction ? 2 : 0;
    const formatted = new Intl.NumberFormat(locale(lang), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

    return `${formatted} RSD`;
  }
}

import { type Lang, LOCALE } from './lang';

/**
 * Amounts in the planner's currency. Every cost is a range: a price the
 * visitor typed is a range of one value, an estimate has a spread. Each line
 * is rounded to the currency's precision before lines are added, so the
 * shown lines always add up to the shown total.
 */
export type Currency = 'EUR' | 'RSD';

export const CURRENCIES: readonly Currency[] = ['EUR', 'RSD'];

const DECIMALS: Readonly<Record<Currency, number>> = { EUR: 2, RSD: 0 };

export interface MoneyRange {
  min: number;
  max: number;
}

/**
 * Half-up rounding to the currency's precision. Goes through the decimal
 * exponent instead of `x * 100`, which turns 1.005 into 100.49999…
 */
export function roundMoney(value: number, currency: Currency): number {
  if (!Number.isFinite(value) || Math.abs(value) < 1e-9) return 0;
  const digits = DECIMALS[currency];
  const rounded = Math.round(Number(`${value}e${digits}`));
  return Number(`${rounded}e-${digits}`);
}

export const exact = (value: number): MoneyRange => ({ min: value, max: value });

export const ZERO: MoneyRange = exact(0);

export function roundRange(range: MoneyRange, currency: Currency): MoneyRange {
  return { min: roundMoney(range.min, currency), max: roundMoney(range.max, currency) };
}

export function sumRanges(ranges: readonly MoneyRange[], currency: Currency): MoneyRange {
  return roundRange(
    ranges.reduce((sum, range) => ({ min: sum.min + range.min, max: sum.max + range.max }), { min: 0, max: 0 }),
    currency,
  );
}

export function scaleRange(range: MoneyRange, factor: number): MoneyRange {
  return { min: range.min * factor, max: range.max * factor };
}

export const isExact = (range: MoneyRange): boolean => range.min === range.max;

/** Reference exchange rates, each with the date and source it was read from. */
export interface ExchangeRates {
  /** Dinars for one euro. */
  rsdPerEur: number;
  /** Units of other currencies for one euro (HUF, RON, ...), for prices published in them. */
  perEur: Readonly<Record<string, number>>;
}

/** `amount` in `from` expressed in `to`; null when there is no rate for `from`. */
export function convert(amount: number, from: string, to: Currency, rates: ExchangeRates): number | null {
  if (from === to) return amount;
  let euros: number | null;
  if (from === 'EUR') euros = amount;
  else if (from === 'RSD') euros = rates.rsdPerEur > 0 ? amount / rates.rsdPerEur : null;
  else {
    const perEur = rates.perEur[from];
    euros = perEur && perEur > 0 ? amount / perEur : null;
  }
  if (euros === null) return null;
  return to === 'EUR' ? euros : euros * rates.rsdPerEur;
}

const FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatter(currency: Currency, lang: Lang): Intl.NumberFormat {
  const key = `${lang}|${currency}`;
  let format = FORMATTERS.get(key);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE[lang], {
      style: 'currency',
      currency,
      minimumFractionDigits: DECIMALS[currency],
      maximumFractionDigits: DECIMALS[currency],
    });
    FORMATTERS.set(key, format);
  }
  return format;
}

/** "120,00 €" in Serbian, "€120.00" in English. */
export function formatMoney(value: number, currency: Currency, lang: Lang): string {
  return formatter(currency, lang).format(roundMoney(value, currency));
}

/** "120,00 €" or "120,00 € – 150,00 €". */
export function formatRange(range: MoneyRange, currency: Currency, lang: Lang): string {
  return isExact(range)
    ? formatMoney(range.min, currency, lang)
    : `${formatMoney(range.min, currency, lang)} – ${formatMoney(range.max, currency, lang)}`;
}

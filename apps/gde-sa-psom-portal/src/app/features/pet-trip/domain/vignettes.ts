import type { CountryCode } from './countries';
import { addDays, addMonths, daysBetween, type IsoDate } from './dates';
import type { Localized } from './lang';

/**
 * Time-based motorway vignettes for cars, with the official price and the page
 * it was read from. The products themselves live in rules/prices.ts; this file
 * only knows how they are valid and which combination is cheapest.
 */
export type VignetteValidity =
  /** `days` consecutive calendar days, the first one included. */
  | { kind: 'days'; days: number }
  /**
   * From the first day to the same day `months` later, that day included
   * (Hungary, Slovenia, Austria), or up to the day before it (`endsDayBefore`:
   * Bulgaria, where 15 October to 14 November is one month).
   */
  | { kind: 'months'; months: number; endsDayBefore?: boolean };

/** Romania prices its vignette by the car's Euro emission class. */
export type EmissionClass = 'euro6' | 'euro4-5' | 'euro0-3' | 'electric';

export const EMISSION_CLASSES: readonly EmissionClass[] = ['euro6', 'euro4-5', 'euro0-3', 'electric'];

export interface VignetteProduct {
  id: string;
  country: CountryCode;
  /** The operator's product name, with the duration in the reader's language: "e-matrica D1, 10 dana". */
  name: Localized;
  validity: VignetteValidity;
  /** The price, or one price per emission class where the operator differentiates. */
  price: number | Readonly<Record<EmissionClass, number>>;
  /** ISO 4217 code of the published price (EUR, HUF, RON, ...). */
  currency: string;
  sourceId: string;
  /** Last day the published price applies to, when the operator states it. */
  priceValidUntil?: IsoDate;
}

/** Lowest and highest price of a product: equal unless it depends on an unknown emission class. */
export function priceBounds(product: VignetteProduct, emission: EmissionClass | null): { min: number; max: number } {
  if (typeof product.price === 'number') return { min: product.price, max: product.price };
  if (emission) return { min: product.price[emission], max: product.price[emission] };
  const values = Object.values(product.price);
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Calendar days a product covers when its first day is `start`. Without a date
 * a month counts as 28 days, the shortest one, so the suggestion never
 * assumes more cover than a real month gives.
 */
export function coveredDays(validity: VignetteValidity, start: IsoDate | null): number {
  if (validity.kind === 'days') return validity.days;
  const lastDay = validity.endsDayBefore ? 0 : 1;
  if (!start) return 28 * validity.months - 1 + lastDay;
  return daysBetween(start, addMonths(start, validity.months)) + lastDay;
}

export interface VignettePurchase {
  product: VignetteProduct;
  /** Day index (0 = departure) on which the vignette starts. */
  startDay: number;
}

/**
 * The cheapest set of products that covers every day in `usageDays` (day
 * indexes from the departure day, e.g. [0, 7] for the way out and back a week
 * later). Prices must already be in one currency (`priceOf`). Dynamic
 * programming over the sorted days: a product bought on day d covers d up to
 * d + length − 1, so the best plan for the first i days extends to the first
 * day it does not cover.
 */
export function cheapestCover(
  products: readonly VignetteProduct[],
  usageDays: readonly number[],
  departureDate: IsoDate | null,
  priceOf: (product: VignetteProduct) => number | null,
): { purchases: VignettePurchase[]; total: number } | null {
  const days = [...new Set(usageDays)].sort((a, b) => a - b);
  if (!days.length) return { purchases: [], total: 0 };

  const priced = products
    .map((product) => ({ product, price: priceOf(product) }))
    .filter((entry): entry is { product: VignetteProduct; price: number } => entry.price !== null);
  if (!priced.length) return null;

  const best: ({ total: number; purchases: VignettePurchase[] } | null)[] = new Array(days.length + 1).fill(null);
  best[0] = { total: 0, purchases: [] };

  for (let i = 0; i < days.length; i++) {
    const current = best[i];
    if (!current) continue;
    const startDay = days[i];
    const startDate = departureDate ? addDays(departureDate, startDay) : null;
    for (const { product, price } of priced) {
      const lastCovered = startDay + coveredDays(product.validity, startDate) - 1;
      let next = i;
      while (next < days.length && days[next] <= lastCovered) next++;
      const total = current.total + price;
      const known = best[next];
      const cheaper = !known || total < known.total - 1e-9;
      // Same price: fewer vignettes to buy wins.
      const simpler = !!known && Math.abs(total - known.total) <= 1e-9 && current.purchases.length + 1 < known.purchases.length;
      if (cheaper || simpler) {
        best[next] = { total, purchases: [...current.purchases, { product, startDay }] };
      }
    }
  }
  return best[days.length];
}

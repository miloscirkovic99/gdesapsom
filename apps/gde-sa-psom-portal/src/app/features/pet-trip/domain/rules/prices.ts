import type { CountryCode } from '../countries';
import type { PrepItemId, PriceBook } from '../costs';
import type { IsoDate } from '../dates';
import type { Localized } from '../lang';
import type { ExchangeRates } from '../money';
import type { VignetteProduct } from '../vignettes';

/**
 * Prices published by an operator or authority, each read on 2026-10-23 from
 * the page in rules/sources.ts. Nothing here is a live quote: the planner
 * shows the date and source next to every amount, and treats a price as an
 * estimate once `PRICES_REVIEW_BY` has passed or the trip falls after the
 * date the operator gives for the price.
 *
 * Car vignettes only, for a passenger car up to 3.5 t in the standard class
 * (Hungary D1, Slovenia 2A, Romania category A). Weekend and annual products
 * tied to a calendar year are left out: they never fit a trip better than
 * these.
 */
export const PRICES_CHECKED_AT: IsoDate = '2026-10-23';
export const PRICES_REVIEW_BY: IsoDate = '2027-01-31';

export const VIGNETTES: readonly VignetteProduct[] = [
  // Hungary: e-matrica D1, prices from 1 January 2026, VAT included.
  { id: 'HU-D1-1D', country: 'HU', name: { sr: 'e-matrica D1, dnevna', en: 'e-matrica D1, daily' }, validity: { kind: 'days', days: 1 }, price: 5550, currency: 'HUF', sourceId: 'hu-evignette-rates' },
  { id: 'HU-D1-10D', country: 'HU', name: { sr: 'e-matrica D1, 10 dana', en: 'e-matrica D1, 10 days' }, validity: { kind: 'days', days: 10 }, price: 6900, currency: 'HUF', sourceId: 'hu-evignette-rates' },
  { id: 'HU-D1-1M', country: 'HU', name: { sr: 'e-matrica D1, mesečna', en: 'e-matrica D1, monthly' }, validity: { kind: 'months', months: 1 }, price: 11170, currency: 'HUF', sourceId: 'hu-evignette-rates' },
  // Slovenia: e-vinjeta 2A (up to 1.30 m above the front axle). The site gives no year.
  { id: 'SI-2A-7D', country: 'SI', name: { sr: 'e-vinjeta 2A, nedeljna (7 dana)', en: 'e-vinjeta 2A, weekly (7 days)' }, validity: { kind: 'days', days: 7 }, price: 16, currency: 'EUR', sourceId: 'si-evinjeta' },
  { id: 'SI-2A-1M', country: 'SI', name: { sr: 'e-vinjeta 2A, mesečna', en: 'e-vinjeta 2A, monthly' }, validity: { kind: 'months', months: 1 }, price: 32, currency: 'EUR', sourceId: 'si-evinjeta' },
  { id: 'SI-2A-1Y', country: 'SI', name: { sr: 'e-vinjeta 2A, godišnja (12 meseci)', en: 'e-vinjeta 2A, annual (12 months)' }, validity: { kind: 'months', months: 12 }, price: 117.5, currency: 'EUR', sourceId: 'si-evinjeta' },
  // Austria: "Vignette rates 2026", valid until the new vignette year starts on 1 December.
  // The 2-month vignette bought online is valid from the 18th day after purchase.
  { id: 'AT-1D', country: 'AT', name: { sr: 'digitalna vinjeta, 1 dan', en: 'digital vignette, 1 day' }, validity: { kind: 'days', days: 1 }, price: 9.6, currency: 'EUR', sourceId: 'at-vignette', priceValidUntil: '2026-11-30' },
  { id: 'AT-10D', country: 'AT', name: { sr: 'digitalna vinjeta, 10 dana', en: 'digital vignette, 10 days' }, validity: { kind: 'days', days: 10 }, price: 12.8, currency: 'EUR', sourceId: 'at-vignette', priceValidUntil: '2026-11-30' },
  { id: 'AT-2M', country: 'AT', name: { sr: 'vinjeta, 2 meseca', en: 'vignette, 2 months' }, validity: { kind: 'months', months: 2 }, price: 32, currency: 'EUR', sourceId: 'at-vignette', priceValidUntil: '2026-11-30' },
  // Bulgaria: e-vignette prices from 1 August 2026, in euro. A month ends the day before the same date.
  { id: 'BG-1D', country: 'BG', name: { sr: 'e-vinjeta, dnevna', en: 'e-vignette, daily' }, validity: { kind: 'days', days: 1 }, price: 5.3, currency: 'EUR', sourceId: 'bg-evignette' },
  { id: 'BG-7D', country: 'BG', name: { sr: 'e-vinjeta, nedeljna (7 dana)', en: 'e-vignette, weekly (7 days)' }, validity: { kind: 'days', days: 7 }, price: 10, currency: 'EUR', sourceId: 'bg-evignette' },
  { id: 'BG-1M', country: 'BG', name: { sr: 'e-vinjeta, mesečna', en: 'e-vignette, monthly' }, validity: { kind: 'months', months: 1, endsDayBefore: true }, price: 19.9, currency: 'EUR', sourceId: 'bg-evignette' },
  { id: 'BG-3M', country: 'BG', name: { sr: 'e-vinjeta, tromesečna', en: 'e-vignette, quarterly' }, validity: { kind: 'months', months: 3, endsDayBefore: true }, price: 35.9, currency: 'EUR', sourceId: 'bg-evignette' },
  // Romania: rovinieta for category A, by Euro emission class (price list OMTI 959/2026 of 8 October 2026).
  { id: 'RO-A-1D', country: 'RO', name: { sr: 'rovinjeta A, 1 dan', en: 'rovinieta A, 1 day' }, validity: { kind: 'days', days: 1 }, price: { euro6: 22, 'euro4-5': 26, 'euro0-3': 29, electric: 20 }, currency: 'RON', sourceId: 'ro-rovinieta' },
  { id: 'RO-A-10D', country: 'RO', name: { sr: 'rovinjeta A, 10 dana', en: 'rovinieta A, 10 days' }, validity: { kind: 'days', days: 10 }, price: { euro6: 30, 'euro4-5': 35, 'euro0-3': 39, electric: 27 }, currency: 'RON', sourceId: 'ro-rovinieta' },
  { id: 'RO-A-30D', country: 'RO', name: { sr: 'rovinjeta A, 30 dana', en: 'rovinieta A, 30 days' }, validity: { kind: 'days', days: 30 }, price: { euro6: 48, 'euro4-5': 55, 'euro0-3': 62, electric: 43 }, currency: 'RON', sourceId: 'ro-rovinieta' },
  { id: 'RO-A-60D', country: 'RO', name: { sr: 'rovinjeta A, 60 dana', en: 'rovinieta A, 60 days' }, validity: { kind: 'days', days: 60 }, price: { euro6: 76, 'euro4-5': 87, 'euro0-3': 99, electric: 68 }, currency: 'RON', sourceId: 'ro-rovinieta' },
];

/** Countries on the list that charge distance-based tolls, with the operator's price list or calculator. */
export const TOLL_LINKS: readonly { country: CountryCode; sourceId: string }[] = [
  { country: 'RS', sourceId: 'rs-tolls' },
  { country: 'HR', sourceId: 'hr-tolls' },
  { country: 'IT', sourceId: 'it-tolls' },
];

/**
 * Reference rates: ECB for forint and leu (22 October 2026), the National Bank
 * of Serbia's official middle rate for the dinar (23 October 2026). The
 * visitor can change the dinar rate in the planner.
 */
export const REFERENCE_RATES: ExchangeRates & { rsdSourceId: string; otherSourceId: string; rsdDate: IsoDate; otherDate: IsoDate } = {
  rsdPerEur: 117.4822,
  perEur: { HUF: 366.43, RON: 5.345 },
  rsdSourceId: 'nbs-rate',
  otherSourceId: 'ecb-rates',
  rsdDate: '2026-10-23',
  otherDate: '2026-10-22',
};

/**
 * Air Serbia's fee for a dog or cat in the cabin, per flight: 40 € between
 * Serbia and Montenegro, Bosnia and Herzegovina, North Macedonia, Croatia or
 * Slovenia (and within Serbia), 70 € to the rest of Europe. Cabin only, the
 * pet with its carrier up to 8 kg; no hold option is published.
 */
export const AIR_SERBIA_PET_FEE = {
  regional: 40,
  europe: 70,
  currency: 'EUR',
  regionalCountries: ['RS', 'ME', 'BA', 'MK', 'HR', 'SI'] as readonly CountryCode[],
  cabinMaxKg: 8,
  sourceId: 'airserbia-pets',
} as const;

/**
 * Official fees for preparation steps. Only the state fees for the EU
 * certificate are published: 420 dinara for the request plus 9,160 for the
 * certificate, on the Veterinary Directorate's request form of August 2025.
 * They may have been indexed since, so the planner shows them as an estimate.
 */
export const PREP_FEES: Partial<Record<PrepItemId, { amount: number; currency: 'RSD' | 'EUR'; sourceId: string; note: Localized }>> = {
  'health-certificate': {
    amount: 9580,
    currency: 'RSD',
    sourceId: 'rs-vet-export-request',
    note: {
      sr: 'republičke takse 420 + 9.160 dinara po zahtevu, prema obrascu Uprave za veterinu iz avgusta 2025; iznos je možda usklađen od tada',
      en: 'state fees of 420 + 9,160 dinars per application, from the Veterinary Directorate’s form of August 2025; the amount may have been indexed since',
    },
  },
};

/** Everything above, in the shape the cost engine takes. */
export const PRICE_BOOK: PriceBook = {
  vignettes: VIGNETTES,
  prepFees: PREP_FEES,
  airSerbiaPetFee: AIR_SERBIA_PET_FEE,
  reviewBy: PRICES_REVIEW_BY,
  rates: REFERENCE_RATES,
};

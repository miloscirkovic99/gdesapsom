import { COST_MESSAGES, type CostMessages } from './costs.messages';
import { countryName, type CountryCode } from './countries';
import { addDays, formatDate, type IsoDate } from './dates';
import { type Lang, LOCALE, type Localized } from './lang';
import {
  convert,
  type Currency,
  exact,
  type ExchangeRates,
  formatMoney,
  type MoneyRange,
  roundRange,
  scaleRange,
  sumRanges,
} from './money';
import type { TransportMode } from './trip.models';
import { cheapestCover, type EmissionClass, priceBounds, type VignetteProduct } from './vignettes';

/**
 * Trip cost estimate: plain functions over plain data, no prices invented.
 * Labels and explanations come in the language the context asks for.
 *
 * Where a number comes from is part of every line:
 * - `user`: the visitor typed it;
 * - `verified`: a price an operator publishes (vignettes, Air Serbia's pet
 *   fee), read on a known date from a cited page;
 * - `estimate`: computed from an assumption the line states (a distance read
 *   off the map), or an official price that may no longer be current;
 * - `unknown`: needed but missing, so the total is a lower bound;
 * - `not-included`: optional and left empty (food, activities, other).
 */
export type CostCategory =
  | 'fuel'
  | 'tolls'
  | 'vignettes'
  | 'tickets'
  | 'pet-transport'
  | 'accommodation'
  | 'accommodation-pet-fee'
  | 'food'
  | 'activities'
  | 'vet-prep'
  | 'other';

export const COST_CATEGORIES: readonly CostCategory[] = [
  'fuel',
  'tolls',
  'vignettes',
  'tickets',
  'pet-transport',
  'accommodation',
  'accommodation-pet-fee',
  'food',
  'activities',
  'vet-prep',
  'other',
];

export type CostBasis = 'user' | 'verified' | 'estimate' | 'unknown' | 'not-included';

export function costCategoryLabel(category: CostCategory, lang: Lang): string {
  return COST_MESSAGES[lang].categories[category];
}

/** Preparation the readiness check can ask for; each may carry a cost. */
export type PrepItemId = 'microchip' | 'rabies-vaccination' | 'vet-exam' | 'health-certificate' | 'titre-test';

export function prepItemLabel(item: PrepItemId, lang: Lang): string {
  return COST_MESSAGES[lang].prepItems[item];
}

export type PetTransportFeeUnit = 'per-dog-per-direction' | 'per-dog' | 'total';
export type StayPetFeeUnit = 'per-dog-per-night' | 'per-dog-per-stay' | 'per-stay';
/** Whose pet fee a flight uses: one the visitor typed, or Air Serbia's published one. */
export type PetTransportCarrier = 'custom' | 'air-serbia';

/** Settings every scenario shares: one car, one currency, the same dogs. */
export interface SharedCostSettings {
  currency: Currency;
  /** Dinars per euro the visitor accepted or typed. */
  rsdPerEur: number;
  /** Extra margin on the known costs, 0-50 %. */
  contingencyPercent: number;
  /** Litres per 100 km. */
  fuelConsumption: number | null;
  /** Per litre, in `currency`. */
  fuelPrice: number | null;
  /** Romania prices its vignette by it; null = not known. */
  emissionClass: EmissionClass | null;
  /** Total for all dogs, in `currency`; null = not known yet. */
  vetPrep: Partial<Record<PrepItemId, number | null>>;
}

/** One way of doing the trip. Scenario B and C start as copies of A. */
export interface CostScenario {
  id: string;
  label: string;
  destination: CountryCode;
  /** For the distance estimate only. */
  destinationCity: string;
  transport: TransportMode;
  /** In driving order; used for vignettes. */
  transitCountries: CountryCode[];
  nights: number;
  /** One way, typed by the visitor. Wins over the estimate. */
  distanceKm: number | null;
  /** One way, from the map estimate (straight line × road factor). */
  distanceEstimateKm: MoneyRange | null;
  /** Local driving at the destination. */
  extraKm: number | null;
  /** All tolls of the trip, in `currency`. */
  tolls: number | null;
  /** Per country: 'auto' = cheapest cover, 'none' = no vignette, or a product id. */
  vignetteChoice: Partial<Record<CountryCode, string>>;
  ticketPricePerPerson: number | null;
  /** True when the ticket price already covers the way back. */
  ticketIsReturn: boolean;
  petTransportCarrier: PetTransportCarrier;
  /** Flights in one direction (2 with a connection); Air Serbia charges per flight. */
  flightsPerDirection: number;
  petTransportFee: number | null;
  petTransportFeeUnit: PetTransportFeeUnit;
  accommodationPerNight: number | null;
  stayPetFee: number | null;
  stayPetFeeUnit: StayPetFeeUnit;
  foodPerPersonPerDay: number | null;
  dogFoodPerDogPerDay: number | null;
  activities: number | null;
  other: number | null;
}

/** Published prices the planner may use, with the date after which they count as estimates. */
export interface PriceBook {
  vignettes: readonly VignetteProduct[];
  prepFees: Partial<Record<PrepItemId, { amount: number; currency: Currency; sourceId: string; note: Localized }>>;
  airSerbiaPetFee: {
    regional: number;
    europe: number;
    currency: Currency;
    regionalCountries: readonly CountryCode[];
    cabinMaxKg: number;
    sourceId: string;
  };
  /** After this date every published price is shown as an estimate until someone checks it again. */
  reviewBy: IsoDate;
  rates: ExchangeRates;
}

/** What the scenario inherits from the trip and the readiness check. */
export interface CostContext {
  travelers: number;
  dogs: number;
  /** Per dog, when known (air travel only). */
  dogWeightsKg: readonly (number | null)[];
  departureDate: IsoDate | null;
  roundTrip: boolean;
  today: IsoDate;
  /** Preparation the readiness check asks for on this scenario's route. */
  prepItems: readonly PrepItemId[];
  prices: PriceBook;
  /** Language of the labels and explanations. */
  lang: Lang;
}

export interface CostLine {
  category: CostCategory;
  label: string;
  /** Null when unknown or not included. */
  amount: MoneyRange | null;
  basis: CostBasis;
  /** Needed for a complete estimate; optional lines only show what was entered. */
  essential: boolean;
  /** How the amount was computed, or what is missing. */
  detail: string;
  sourceIds: string[];
  /** Some parts of the line are known, others are not: the amount is a lower bound. */
  partial?: boolean;
}

export interface CostBreakdown {
  scenarioId: string;
  currency: Currency;
  nights: number;
  /** Calendar days of the trip: nights + 1. */
  days: number;
  lines: CostLine[];
  /** Sum of the known lines. */
  subtotal: MoneyRange;
  contingencyPercent: number;
  contingency: MoneyRange;
  total: MoneyRange;
  /** Essential lines without (a complete) amount: the total is then a lower bound. */
  unknown: CostCategory[];
  complete: boolean;
  perPerson: MoneyRange | null;
  perDay: MoneyRange | null;
  assumptions: string[];
  warnings: string[];
}

const NUMBERS = new Map<Lang, Intl.NumberFormat>();

function formatNumber(value: number, lang: Lang): string {
  let format = NUMBERS.get(lang);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 2 });
    NUMBERS.set(lang, format);
  }
  return format.format(value);
}

/** What the line builders share: currency, rates, language, and the lists they add to. */
interface LineContext {
  currency: Currency;
  rates: ExchangeRates;
  lang: Lang;
  t: CostMessages;
  warnings: string[];
  assumptions: string[];
  /** Published prices are past their review date. */
  pricesStale: boolean;
  money: (value: number) => string;
  num: (value: number) => string;
}

/** A line before its label, which the language decides. */
type DraftLine = Omit<CostLine, 'label'>;

/** A usable non-negative number, or null (and a warning) for anything else. */
function amountOf(value: number | null | undefined, field: string, lc: Pick<LineContext, 't' | 'warnings'>): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    lc.warnings.push(lc.t.invalidField(field));
    return null;
  }
  return value;
}

function line(
  category: CostCategory,
  amount: MoneyRange | null,
  basis: CostBasis,
  detail: string,
  essential: boolean,
  sourceIds: string[] = [],
): DraftLine {
  return { category, amount, basis, essential, detail, sourceIds };
}

export function estimateScenario(
  scenario: CostScenario,
  shared: SharedCostSettings,
  context: CostContext,
): CostBreakdown {
  const currency = shared.currency;
  const t = COST_MESSAGES[context.lang];
  const warnings: string[] = [];
  const assumptions: string[] = [];
  const rsdPerEur = amountOf(shared.rsdPerEur, t.fields.rate, { t, warnings }) || context.prices.rates.rsdPerEur;
  const rates: ExchangeRates = { ...context.prices.rates, rsdPerEur };
  const lc: LineContext = {
    currency,
    rates,
    lang: context.lang,
    t,
    warnings,
    assumptions,
    pricesStale: context.today > context.prices.reviewBy,
    money: (value) => formatMoney(value, currency, context.lang),
    num: (value) => formatNumber(value, context.lang),
  };

  const nights = Math.max(0, Math.floor(amountOf(scenario.nights, t.fields.nights, lc) ?? 0));
  const days = nights + 1;
  const travelers = Math.max(0, Math.floor(context.travelers));
  const dogs = Math.max(0, Math.floor(context.dogs));
  if (travelers < 1) warnings.push(t.travelersMin);
  const legs = context.roundTrip ? 2 : 1;

  const lines: DraftLine[] = [];

  if (scenario.transport === 'car') {
    lines.push(fuelLine(scenario, shared, legs, lc));
    const tolls = amountOf(scenario.tolls, t.fields.tolls, lc);
    lines.push(
      tolls === null
        ? line('tolls', null, 'unknown', t.tollsMissing, true)
        : line('tolls', exact(tolls), 'user', t.tollsTotal, true),
    );
    const vignettes = vignetteLine(scenario, shared, context, lc, nights);
    if (vignettes) lines.push(vignettes);
  } else {
    lines.push(ticketLine(scenario, travelers, legs, lc));
    lines.push(petTransportLine(scenario, context, dogs, travelers, legs, lc));
  }

  if (nights > 0) {
    const perNight = amountOf(scenario.accommodationPerNight, t.fields.accommodation, lc);
    lines.push(
      perNight === null
        ? line('accommodation', null, 'unknown', t.accommodationMissing, true)
        : line('accommodation', exact(perNight * nights), 'user', t.accommodationDetail(nights, lc.money(perNight)), true),
    );
    lines.push(stayPetFeeLine(scenario, dogs, nights, lc));
  }

  lines.push(foodLine(scenario, travelers, dogs, days, lc));
  lines.push(prepLine(shared, context, lc));
  lines.push(optionalLine('activities', amountOf(scenario.activities, t.fields.activities, lc), lc));
  lines.push(optionalLine('other', amountOf(scenario.other, t.fields.other, lc), lc));

  const rounded: CostLine[] = lines.map((entry) => ({
    ...entry,
    label: t.categories[entry.category],
    amount: entry.amount ? roundRange(entry.amount, currency) : entry.amount,
  }));
  const known = rounded.filter((entry) => entry.amount !== null).map((entry) => entry.amount as MoneyRange);
  const subtotal = sumRanges(known, currency);
  const percent = Math.min(50, Math.max(0, amountOf(shared.contingencyPercent, t.fields.contingency, lc) ?? 0));
  const contingency = roundRange(scaleRange(subtotal, percent / 100), currency);
  const total = sumRanges([subtotal, contingency], currency);
  const unknown = rounded
    .filter((entry) => entry.essential && (entry.basis === 'unknown' || entry.partial))
    .map((entry) => entry.category);

  return {
    scenarioId: scenario.id,
    currency,
    nights,
    days,
    lines: rounded,
    subtotal,
    contingencyPercent: percent,
    contingency,
    total,
    unknown,
    complete: unknown.length === 0,
    perPerson: travelers >= 1 ? roundRange(scaleRange(total, 1 / travelers), currency) : null,
    perDay: roundRange(scaleRange(total, 1 / days), currency),
    assumptions,
    warnings,
  };
}

function fuelLine(scenario: CostScenario, shared: SharedCostSettings, legs: number, lc: LineContext): DraftLine {
  const { t } = lc;
  const typed = amountOf(scenario.distanceKm, t.fields.distance, lc);
  const distance: MoneyRange | null = typed !== null ? exact(typed) : scenario.distanceEstimateKm;
  const consumption = amountOf(shared.fuelConsumption, t.fields.consumption, lc);
  const price = amountOf(shared.fuelPrice, t.fields.fuelPrice, lc);
  const extraKm = amountOf(scenario.extraKm, t.fields.extraKm, lc) ?? 0;

  if (!distance || consumption === null || price === null) {
    return line('fuel', null, 'unknown', t.fuelMissing(!distance, consumption === null, price === null), true);
  }

  const km = { min: distance.min * legs + extraKm, max: distance.max * legs + extraKm };
  const amount = scaleRange(km, (consumption / 100) * price);
  const kmText = km.min === km.max ? `${lc.num(km.min)} km` : `${lc.num(km.min)}–${lc.num(km.max)} km`;
  return line(
    'fuel',
    amount,
    typed !== null ? 'user' : 'estimate',
    t.fuelDetail({
      km: kmText,
      roundTrip: legs === 2,
      extraKm: extraKm ? lc.num(extraKm) : null,
      consumption: lc.num(consumption),
      price: lc.money(price),
      estimated: typed === null,
    }),
    true,
  );
}

function vignetteLine(
  scenario: CostScenario,
  shared: SharedCostSettings,
  context: CostContext,
  lc: LineContext,
  nights: number,
): DraftLine | null {
  const { t } = lc;
  const catalogue = context.prices.vignettes;
  const route = [...scenario.transitCountries, scenario.destination];
  const countries = [...new Set(route)].filter((code) => catalogue.some((product) => product.country === code));
  if (!countries.length) return null;

  const usageDays = context.roundTrip ? [0, nights] : [0];
  const emission = shared.emissionClass;
  const bound = (product: VignetteProduct, side: 'min' | 'max') =>
    convert(priceBounds(product, emission)[side], product.currency, lc.currency, lc.rates);
  const parts: string[] = [];
  const sourceIds = new Set<string>();
  const notes = new Set<string>();
  let min = 0;
  let max = 0;
  let bought = false;
  let estimate = lc.pricesStale;

  for (const code of countries) {
    const name = countryName(code, lc.lang);
    const choice = scenario.vignetteChoice[code] ?? 'auto';
    if (choice === 'none') {
      parts.push(t.vignetteSkipped(name));
      continue;
    }
    const products = catalogue.filter((product) => product.country === code && (choice === 'auto' || product.id === choice));
    const low = cheapestCover(products, usageDays, context.departureDate, (product) => bound(product, 'min'));
    const high = cheapestCover(products, usageDays, context.departureDate, (product) => bound(product, 'max'));
    if (!low || !high) {
      return line('vignettes', null, 'unknown', t.vignetteNoRate(name), true);
    }
    for (const purchase of [...low.purchases, ...high.purchases]) {
      const { product } = purchase;
      sourceIds.add(product.sourceId);
      if (product.currency !== lc.currency) notes.add(t.vignetteConverted);
      if (typeof product.price !== 'number' && !emission) notes.add(t.vignetteEmission);
      const start = context.departureDate ? addDays(context.departureDate, purchase.startDay) : null;
      if (product.priceValidUntil && start && start > product.priceValidUntil) {
        estimate = true;
        notes.add(t.vignettePriceUntil(formatDate(product.priceValidUntil, lc.lang)));
      }
    }
    bought = bought || low.purchases.length > 0;
    min += low.total;
    max += high.total;
    const names = low.purchases.map((purchase) => purchase.product.name[lc.lang]).join(' + ');
    const amount = low.total === high.total ? lc.money(low.total) : `${lc.money(low.total)}–${lc.money(high.total)}`;
    parts.push(t.vignettePart(name, names, amount));
  }

  if (lc.pricesStale) notes.add(t.pricesStale);
  lc.assumptions.push(t.vignetteAssumption);
  return line(
    'vignettes',
    { min, max },
    !bought ? 'user' : estimate ? 'estimate' : 'verified',
    [`${parts.join('; ')}.`, ...notes].join(' '),
    true,
    [...sourceIds],
  );
}

function ticketLine(scenario: CostScenario, travelers: number, legs: number, lc: LineContext): DraftLine {
  const price = amountOf(scenario.ticketPricePerPerson, lc.t.fields.ticket, lc);
  if (price === null) return line('tickets', null, 'unknown', lc.t.ticketMissing, true);
  const multiplier = scenario.ticketIsReturn ? 1 : legs;
  const direction = scenario.ticketIsReturn ? 'return' : legs === 2 ? 'both' : 'one';
  return line(
    'tickets',
    exact(price * multiplier * travelers),
    'user',
    lc.t.ticketDetail(travelers, lc.money(price), multiplier === 2, direction),
    true,
  );
}

function petTransportLine(
  scenario: CostScenario,
  context: CostContext,
  dogs: number,
  travelers: number,
  legs: number,
  lc: LineContext,
): DraftLine {
  const { t } = lc;
  if (scenario.transport === 'plane' && scenario.petTransportCarrier === 'air-serbia') {
    const fees = context.prices.airSerbiaPetFee;
    const regional = fees.regionalCountries.includes(scenario.destination);
    const perFlight = regional ? fees.regional : fees.europe;
    const flights = Math.max(1, Math.floor(scenario.flightsPerDirection || 1));
    const converted = convert(perFlight, fees.currency, lc.currency, lc.rates);
    if (converted === null) return line('pet-transport', null, 'unknown', t.airSerbiaNoRate, true);
    if (dogs > travelers) lc.warnings.push(t.oneCarrier);
    if (context.dogWeightsKg.some((kg) => kg !== null && kg > fees.cabinMaxKg)) lc.warnings.push(t.cabinOnly(fees.cabinMaxKg));
    return line(
      'pet-transport',
      exact(converted * dogs * legs * flights),
      lc.pricesStale ? 'estimate' : 'verified',
      t.airSerbiaDetail(formatMoney(perFlight, fees.currency, lc.lang), regional, dogs, legs * flights),
      true,
      [fees.sourceId],
    );
  }

  const fee = amountOf(scenario.petTransportFee, t.fields.petFee, lc);
  if (fee === null) return line('pet-transport', null, 'unknown', t.petFeeMissing, true);
  const money = lc.money(fee);
  switch (scenario.petTransportFeeUnit) {
    case 'per-dog-per-direction':
      return line('pet-transport', exact(fee * dogs * legs), 'user', t.petFeePerDirection(dogs, money, legs), true);
    case 'per-dog':
      return line('pet-transport', exact(fee * dogs), 'user', t.petFeePerDog(dogs, money), true);
    case 'total':
      return line('pet-transport', exact(fee), 'user', t.petFeeTotal(money), true);
  }
}

function stayPetFeeLine(scenario: CostScenario, dogs: number, nights: number, lc: LineContext): DraftLine {
  const { t } = lc;
  const fee = amountOf(scenario.stayPetFee, t.fields.stayPetFee, lc);
  if (fee === null) return line('accommodation-pet-fee', null, 'unknown', t.stayFeeMissing, true);
  const money = lc.money(fee);
  switch (scenario.stayPetFeeUnit) {
    case 'per-dog-per-night':
      return line('accommodation-pet-fee', exact(fee * dogs * nights), 'user', t.stayFeePerNight(dogs, nights, money), true);
    case 'per-dog-per-stay':
      return line('accommodation-pet-fee', exact(fee * dogs), 'user', t.stayFeePerStay(dogs, money), true);
    case 'per-stay':
      return line('accommodation-pet-fee', exact(fee), 'user', t.stayFeeOnce(money), true);
  }
}

function foodLine(scenario: CostScenario, travelers: number, dogs: number, days: number, lc: LineContext): DraftLine {
  const { t } = lc;
  const people = amountOf(scenario.foodPerPersonPerDay, t.fields.foodPerson, lc);
  const dog = amountOf(scenario.dogFoodPerDogPerDay, t.fields.foodDog, lc);
  if (people === null && dog === null) return line('food', null, 'not-included', t.foodMissing, false);
  const parts: string[] = [];
  let amount = 0;
  if (people !== null) {
    amount += people * travelers * days;
    parts.push(t.foodPeople(travelers, days, lc.money(people)));
  }
  if (dog !== null) {
    amount += dog * dogs * days;
    parts.push(t.foodDog(dogs, days, lc.money(dog)));
  }
  const partial = people === null ? t.foodWithoutPeople : dog === null ? t.foodWithoutDog : '';
  return line('food', exact(amount), 'user', `${parts.join(' + ')}${partial}`, false);
}

function prepLine(shared: SharedCostSettings, context: CostContext, lc: LineContext): DraftLine {
  const { t } = lc;
  if (!context.prepItems.length) return line('vet-prep', exact(0), 'user', t.prepNone, false);
  const parts: string[] = [];
  const missing: string[] = [];
  const sourceIds: string[] = [];
  let amount = 0;
  let estimated = false;
  for (const item of context.prepItems) {
    const label = t.prepItems[item];
    const typed = amountOf(shared.vetPrep[item], label, lc);
    const fee = context.prices.prepFees[item];
    if (typed !== null) {
      amount += typed;
      parts.push(`${label}: ${lc.money(typed)}`);
      continue;
    }
    const converted = fee ? convert(fee.amount, fee.currency, lc.currency, lc.rates) : null;
    if (fee && converted !== null) {
      amount += converted;
      estimated = true;
      sourceIds.push(fee.sourceId);
      parts.push(`${label}: ${lc.money(converted)} (${fee.note[lc.lang]})`);
    } else {
      missing.push(label.toLowerCase());
    }
  }
  if (!parts.length) return line('vet-prep', null, 'unknown', t.prepAskVet(missing.join(', ')), true);
  const rest = missing.length ? t.prepMissing(missing.join(', ')) : '';
  return {
    ...line('vet-prep', exact(amount), estimated ? 'estimate' : 'user', `${parts.join('; ')}.${rest}`, true, sourceIds),
    partial: missing.length > 0,
  };
}

function optionalLine(category: 'activities' | 'other', value: number | null, lc: LineContext): DraftLine {
  return value === null
    ? line(category, null, 'not-included', lc.t.optionalMissing, false)
    : line(category, exact(value), 'user', lc.t.optionalTotal, false);
}

/** A scenario that starts from the trip: the base for A, and the template for B and C. */
export function defaultScenario(
  id: string,
  label: string,
  trip: { destination: CountryCode; transport: TransportMode; transitCountries: CountryCode[]; nights: number },
): CostScenario {
  return {
    id,
    label,
    destination: trip.destination,
    destinationCity: '',
    transport: trip.transport,
    transitCountries: [...trip.transitCountries],
    nights: trip.nights,
    distanceKm: null,
    distanceEstimateKm: null,
    extraKm: null,
    tolls: null,
    vignetteChoice: {},
    ticketPricePerPerson: null,
    ticketIsReturn: true,
    petTransportCarrier: 'custom',
    flightsPerDirection: 1,
    petTransportFee: null,
    petTransportFeeUnit: 'per-dog-per-direction',
    accommodationPerNight: null,
    stayPetFee: null,
    stayPetFeeUnit: 'per-dog-per-night',
    foodPerPersonPerDay: null,
    dogFoodPerDogPerDay: null,
    activities: null,
    other: null,
  };
}

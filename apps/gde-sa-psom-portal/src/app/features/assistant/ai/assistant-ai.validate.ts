import { isCountryCode } from '../../pet-trip/domain/countries';
import { isIsoDate, type IsoDate } from '../../pet-trip/domain/dates';
import { MAX_DOGS, TRANSPORT_MODES, type TransportMode } from '../../pet-trip/domain/trip.models';
import type { Gazetteer } from '../domain/gazetteer';
import { CATEGORY_IDS, type CategoryId, DOG_SIZES, type DogSize, EMPTY_PARSE, type ParsedMessage } from '../domain/query.models';
import type { AiIntent } from './assistant-ai.models';

const INTENTS: readonly AiIntent['intent'][] = ['places', 'trip', 'other'];
/** Letters, spaces, dots, apostrophes and hyphens: a place name, never a link or an instruction. */
const PLACE_NAME = /^[\p{L}][\p{L} .'-]{0,59}$/u;
const VENUE_NAME = /^[\p{L}\p{N}][\p{L}\p{N} .,'&-]{0,59}$/u;

function oneOf<T extends string>(value: unknown, list: readonly T[]): T | null {
  return typeof value === 'string' && (list as readonly string[]).includes(value) ? (value as T) : null;
}

function name(value: unknown, pattern: RegExp): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text && pattern.test(text) && !/https?:|www\./i.test(text) ? text : null;
}

function count(value: unknown, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max ? value : null;
}

/** A date the trip can still start or end on: today or later, within about a year and a half. */
function tripDate(value: unknown, today: IsoDate): IsoDate | null {
  if (!isIsoDate(value) || value < today) return null;
  const [year, month, day] = today.split('-').map(Number);
  const limit = new Date(Date.UTC(year + 1, month + 5, day)).toISOString().slice(0, 10);
  return value <= limit ? value : null;
}

/**
 * The server's `intent`, checked again: unknown fields and values are
 * dropped, so a changed or compromised handler cannot put anything else on
 * the page. Null when the shape is not an intent at all.
 */
export function validateAiIntent(raw: unknown, today: IsoDate): AiIntent | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const intent = oneOf(value['intent'], INTENTS);
  if (!intent) return null;

  const categories = Array.isArray(value['categories'])
    ? CATEGORY_IDS.filter((category) => (value['categories'] as unknown[]).includes(category)).slice(0, 3)
    : [];

  let trip: AiIntent['trip'] = null;
  const rawTrip = value['trip'];
  if (intent === 'trip' && rawTrip && typeof rawTrip === 'object') {
    const t = rawTrip as Record<string, unknown>;
    const destination = isCountryCode(t['destination']) && t['destination'] !== 'RS' ? t['destination'] : null;
    const departureDate = tripDate(t['departureDate'], today);
    const returnDate = tripDate(t['returnDate'], today);
    trip = {
      destination,
      transport: oneOf<TransportMode>(t['transport'], TRANSPORT_MODES),
      departureDate,
      returnDate: returnDate && (!departureDate || returnDate >= departureDate) ? returnDate : null,
      nights: count(t['nights'], 365),
      dogs: count(t['dogs'], MAX_DOGS),
    };
  }

  return {
    intent,
    categories: intent === 'places' ? categories : [],
    city: name(value['city'], PLACE_NAME),
    township: name(value['township'], PLACE_NAME),
    nearMe: value['nearMe'] === true,
    dogSize: oneOf<DogSize>(value['dogSize'], DOG_SIZES),
    garden: value['garden'] === true,
    venueName: name(value['venueName'], VENUE_NAME),
    trip,
  };
}

/**
 * The AI's reading as a parsed message, with its place names looked up in
 * our lists. A name we do not have stays `unknownPlace`: the reply then says
 * we have nothing there, instead of searching somewhere else.
 */
export function aiIntentToParsed(intent: AiIntent, gazetteer: Gazetteer): ParsedMessage {
  if (intent.intent === 'other') return EMPTY_PARSE;
  const place =
    (intent.township ? gazetteer.lookup(intent.township, intent.city) : null) ??
    (intent.city ? gazetteer.lookup(intent.city) : null);
  const named = intent.township ?? intent.city;

  if (intent.intent === 'trip') {
    return {
      ...EMPTY_PARSE,
      kind: 'trip',
      tripSignal: true,
      trip: intent.trip ?? { destination: null, transport: null, departureDate: null, returnDate: null, nights: null, dogs: null },
    };
  }

  const categories: CategoryId[] = intent.categories;
  return {
    ...EMPTY_PARSE,
    kind: 'places',
    categories,
    // "Pet friendly mesta u Nišu": the AI found a place but no category, which means every type.
    anyCategory: !categories.length && (place !== null || intent.nearMe),
    place,
    unknownPlace: place || intent.nearMe ? null : named,
    nearMe: intent.nearMe,
    dogSize: intent.dogSize,
    garden: intent.garden,
    name: intent.venueName,
  };
}

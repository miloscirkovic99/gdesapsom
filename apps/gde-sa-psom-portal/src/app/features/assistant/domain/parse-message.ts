import type { CountryCode } from '../../pet-trip/domain/countries';
import type { IsoDate } from '../../pet-trip/domain/dates';
import type { TransportMode } from '../../pet-trip/domain/trip.models';
import type { Gazetteer } from './gazetteer';
import { type CategoryId, CATEGORY_IDS, type DogSize, EMPTY_PARSE, type ParsedMessage, type TripQuery } from './query.models';
import { foldText, MAX_MESSAGE_LENGTH, numberOf, PLACE_PREPOSITIONS, words } from './text';
import { tripFacts } from './trip-text';
import {
  ANY_CATEGORY_KEYWORDS,
  CATEGORY_KEYWORDS,
  COUNTRY_KEYWORDS,
  DOG_NOUNS,
  GARDEN_KEYWORDS,
  GREETINGS,
  HELP,
  LARGE_BREEDS,
  LARGE_DOG_ADJECTIVE,
  matchesKeyword,
  matchesPhrase,
  NEAR_ME_PHRASES,
  NEAR_ME_PREFIXES,
  NOT_PLACES,
  PUPPY_PREFIXES,
  SEASIDE_PHRASES,
  SERBIA_WORDS,
  SMALL_BREEDS,
  SMALL_DOG_ADJECTIVE,
  THANKS,
  TRANSPORT_KEYWORDS,
  TRIP_KEYWORDS,
} from './vocabulary';

/** Most kilometres a near-me search goes out to. */
const MAX_RADIUS_KM = 100;

/** A word or phrase from `list`, as whole words of the padded folded message. */
function hasPhrase(padded: string, list: readonly string[]): boolean {
  return list.some((phrase) => padded.includes(` ${phrase} `));
}

function categoriesIn(tokens: readonly string[], padded: string, skip: ReadonlySet<number>): CategoryId[] {
  const found = new Set<CategoryId>();
  for (const set of CATEGORY_KEYWORDS) {
    const hit = matchesPhrase(set, padded) || tokens.some((token, index) => !skip.has(index) && matchesKeyword(set, token));
    if (hit) set.value.forEach((category) => found.add(category));
  }
  // "Hrana za pse" is a pet shop, not a restaurant; "doručak" alone is café or restaurant.
  if (found.has('petshop') && hasPhrase(padded, ['hrana za pse', 'hranu za pse', 'hranu za psa', 'hrana za psa'])) {
    found.delete('restaurant');
  }
  return CATEGORY_IDS.filter((category) => found.has(category));
}

/**
 * "mali pas", "velikim psom", "štene", "labrador", "pas od 30 kg". Medium dogs
 * count as large: only "Svi psi" admits them.
 */
function dogSizeIn(tokens: readonly string[], foldedText: string): DogSize | null {
  if (tokens.some((token) => PUPPY_PREFIXES.some((prefix) => token.startsWith(prefix)))) return 'puppy';
  for (let index = 0; index < tokens.length; index++) {
    const near = tokens.slice(index + 1, index + 3);
    if (!near.some((token) => DOG_NOUNS.has(token))) continue;
    if (SMALL_DOG_ADJECTIVE.test(tokens[index])) return 'small';
    if (LARGE_DOG_ADJECTIVE.test(tokens[index])) return 'large';
  }
  if (tokens.some((token) => SMALL_BREEDS.some((breed) => token.startsWith(breed)))) return 'small';
  if (tokens.some((token) => LARGE_BREEDS.some((breed) => token.startsWith(breed)))) return 'large';
  const weight = /(?<![\d.,])(\d{1,2}(?:[.,]\d)?)\s?(?:kg|kila|kilograma|kilo)\b/.exec(foldedText);
  if (weight) {
    const kg = Number(weight[1].replace(',', '.'));
    if (kg > 0 && kg <= 10) return 'small';
    if (kg > 15 && kg <= 120) return 'large';
  }
  return null;
}

function countryIn(tokens: readonly string[], padded: string): CountryCode | null {
  for (const set of COUNTRY_KEYWORDS) {
    if (matchesPhrase(set, padded) || tokens.some((token) => matchesKeyword(set, token))) return set.value;
  }
  return null;
}

function transportIn(tokens: readonly string[]): TransportMode | null {
  for (const set of TRANSPORT_KEYWORDS) {
    if (tokens.some((token) => matchesKeyword(set, token))) return set.value;
  }
  return null;
}

/** "u krugu od 5 km", "do 20km", "within 10 km". */
function radiusIn(foldedText: string): number | null {
  const match = /(?<![\d.,])(\d{1,3})\s?(?:km|kilometar\w*|kilometr\w*)\b/.exec(foldedText);
  if (!match) return null;
  const km = Number(match[1]);
  return km >= 1 && km <= MAX_RADIUS_KM ? km * 1000 : null;
}

/** Prepositions that put a place after them; "za", "od", "do" are left out ("za velikog psa"). */
const BEFORE_PLACE: ReadonlySet<string> = new Set(['u', 'na', 'kod', 'blizu', 'pored', 'oko', 'iz', 'in', 'near', 'around', 'at']);

/**
 * The first word after "u", "na", "kod" (and the like) that is no keyword
 * and no common word, as typed: "na Dorćolu" → "Dorćolu". The AI may know it;
 * without the AI the visitor is asked for a city instead.
 */
function unknownPlaceIn(raw: readonly string[], tokens: readonly string[], skip: ReadonlySet<number>): string | null {
  for (let index = 0; index < tokens.length - 1; index++) {
    if (!BEFORE_PLACE.has(tokens[index]) || !PLACE_PREPOSITIONS.has(tokens[index])) continue;
    const next = index + 1;
    const token = tokens[next];
    if (skip.has(next) || token.length < 3 || /\d/.test(token) || NOT_PLACES.has(token) || SERBIA_WORDS.has(token)) continue;
    if (isKeyword(token) || SMALL_DOG_ADJECTIVE.test(token) || LARGE_DOG_ADJECTIVE.test(token)) continue;
    // Two capitalised words ("na Zlatnom Brdu") stay together.
    const second = raw[next + 1];
    const both = second && /^\p{Lu}/u.test(raw[next]) && /^\p{Lu}/u.test(second) && !isKeyword(tokens[next + 1]);
    return both ? `${raw[next]} ${second}` : raw[next];
  }
  return null;
}

function isKeyword(token: string): boolean {
  return (
    CATEGORY_KEYWORDS.some((set) => matchesKeyword(set, token)) ||
    COUNTRY_KEYWORDS.some((set) => matchesKeyword(set, token)) ||
    TRANSPORT_KEYWORDS.some((set) => matchesKeyword(set, token)) ||
    matchesKeyword(TRIP_KEYWORDS, token) ||
    matchesKeyword(GARDEN_KEYWORDS, token) ||
    matchesKeyword(ANY_CATEGORY_KEYWORDS, token) ||
    NEAR_ME_PREFIXES.some((prefix) => token.startsWith(prefix)) ||
    DOG_NOUNS.has(token) ||
    numberOf(token) !== null
  );
}

function hasTripFacts(trip: TripQuery): boolean {
  return Object.values(trip).some((value) => value !== null);
}

/**
 * What one message asks for, read without AI: the place (from the
 * database's own city and township names), what kind of place, the dog,
 * a garden, "near me", or a trip abroad with its dates.
 *
 * Pure and synchronous, so the common questions ("kafići u Beogradu",
 * "veterinar Niš", "idem kolima u Grčku 20. jula") are answered at once
 * and cost nothing. `kind: 'unknown'` is the signal to ask the AI.
 */
export function parseMessage(text: string, gazetteer: Gazetteer, today: IsoDate): ParsedMessage {
  const clipped = text.slice(0, MAX_MESSAGE_LENGTH).trim();
  if (!clipped) return EMPTY_PARSE;

  const { raw, folded } = words(clipped);
  const padded = ` ${folded.join(' ')} `;
  const foldedText = foldText(clipped);

  // Places first, so their words are not read as anything else ("Novi Sad" is not "now").
  const hit = gazetteer.find(folded);
  const used = new Set<number>();
  if (hit) for (let index = hit.start; index < hit.end; index++) used.add(index);

  const country = countryIn(folded, padded);
  const seaside = hasPhrase(padded, SEASIDE_PHRASES);
  const tripWords = matchesPhrase(TRIP_KEYWORDS, padded) || folded.some((token) => matchesKeyword(TRIP_KEYWORDS, token));
  const facts = tripFacts(folded, foldedText, today);
  const trip: TripQuery = {
    destination: country,
    transport: transportIn(folded),
    departureDate: facts.departureDate,
    returnDate: facts.returnDate,
    nights: facts.nights,
    dogs: facts.dogs,
  };

  const categories = categoriesIn(folded, padded, used);
  const anyCategory =
    !categories.length &&
    (matchesPhrase(ANY_CATEGORY_KEYWORDS, padded) || folded.some((token, index) => !used.has(index) && matchesKeyword(ANY_CATEGORY_KEYWORDS, token)));
  const nearMe =
    hasPhrase(padded, NEAR_ME_PHRASES) || folded.some((token) => NEAR_ME_PREFIXES.some((prefix) => token.startsWith(prefix)));
  const dogSize = dogSizeIn(folded, foldedText);
  const garden = matchesPhrase(GARDEN_KEYWORDS, padded) || folded.some((token) => matchesKeyword(GARDEN_KEYWORDS, token));
  const unknownPlace = hit || nearMe ? null : unknownPlaceIn(raw, folded, used);

  const tripSignal = country !== null || seaside || tripWords;
  const placesSignal = categories.length > 0 || anyCategory || hit !== null || nearMe || dogSize !== null || garden || unknownPlace !== null;

  const parsed: ParsedMessage = {
    ...EMPTY_PARSE,
    categories,
    anyCategory,
    place: hit?.place ?? null,
    unknownPlace,
    nearMe,
    radius: radiusIn(foldedText),
    dogSize,
    garden,
    trip: hasTripFacts(trip) || tripSignal ? trip : null,
    tripSignal,
  };

  // A foreign country decides it; travel words do too, unless the trip is to a place in Serbia ("putujem u Novi Sad").
  if (country !== null || ((seaside || tripWords) && !hit)) return { ...parsed, kind: 'trip' };
  if (placesSignal) return { ...parsed, kind: 'places' };
  if (hasPhrase(padded, HELP)) return { ...parsed, kind: 'help' };
  if (hasPhrase(padded, GREETINGS)) return { ...parsed, kind: 'greeting' };
  if (folded.length <= 4 && hasPhrase(padded, THANKS)) return { ...parsed, kind: 'thanks' };
  return parsed;
}

import type { CountryCode } from '../../pet-trip/domain/countries';
import type { IsoDate } from '../../pet-trip/domain/dates';
import type { TransportMode } from '../../pet-trip/domain/trip.models';

/**
 * What the assistant can search for. The four venue categories are the hub
 * categories of pet-friendly-taxonomy.json (spots, `info_ug_obj`); parks,
 * vets and pet shops have tables of their own.
 */
export type CategoryId = 'cafe' | 'restaurant' | 'bar' | 'stay' | 'park' | 'vet' | 'petshop';

export const CATEGORY_IDS: readonly CategoryId[] = ['cafe', 'restaurant', 'bar', 'stay', 'park', 'vet', 'petshop'];

/** Venue categories and the hub slug that lists their venue types (`ugo_objekat`). */
export const SPOT_CATEGORY_SLUGS: Readonly<Partial<Record<CategoryId, string>>> = {
  cafe: 'kafici',
  restaurant: 'restorani',
  bar: 'barovi',
  stay: 'smestaj',
};

export function isSpotCategory(category: CategoryId): boolean {
  return SPOT_CATEGORY_SLUGS[category] !== undefined;
}

/**
 * The visitor's dog, in the terms of the venue rule (`starost`):
 * - `small`: a small dog; every rule admits it;
 * - `puppy`: a puppy of a larger breed, up to 5 months ("Mali pas i štenci
 *   većih rasa do 5 meseci starosti" or "Svi psi");
 * - `large`: a medium or large dog; only "Svi psi" admits it.
 */
export type DogSize = 'small' | 'puppy' | 'large';

export const DOG_SIZES: readonly DogSize[] = ['small', 'puppy', 'large'];

/**
 * A place in the database: a city (`grad`) with all of its townships, or a
 * township (`opstina`). Townships that share a name (Palilula in Belgrade and
 * in Niš) are one place with both ids.
 */
export interface PlaceRef {
  kind: 'city' | 'township';
  /** As the database writes it: "Novi Sad", "Vračar". */
  name: string;
  /** `grad.grd_id`. */
  cityIds: number[];
  /** `grad.grd_ime`: parks are matched by these. */
  cityNames: string[];
  /** `opstina.ops_id`: venues, shops and vets are filtered by these. */
  townshipIds: number[];
}

/** One search, as the assistant runs it. */
export interface PlacesQuery {
  /** Empty: every venue type ("pet friendly mesta u Nišu"). */
  categories: CategoryId[];
  place: PlaceRef | null;
  nearMe: boolean;
  /** Metres around the visitor; null for the default. */
  radius: number | null;
  dogSize: DogSize | null;
  garden: boolean;
  /** Part of a venue's name, for "gde je kafić Kod Žike". */
  name: string | null;
}

/** A trip abroad, as far as the message tells it. Every field may be missing. */
export interface TripQuery {
  destination: CountryCode | null;
  transport: TransportMode | null;
  departureDate: IsoDate | null;
  returnDate: IsoDate | null;
  /** Trip length when no return date was given ("nedelju dana"). */
  nights: number | null;
  dogs: number | null;
}

export const EMPTY_TRIP: TripQuery = {
  destination: null,
  transport: null,
  departureDate: null,
  returnDate: null,
  nights: null,
  dogs: null,
};

export type MessageKind = 'places' | 'trip' | 'greeting' | 'thanks' | 'help' | 'unknown';

/** What one message says, before the conversation so far is taken into account. */
export interface ParsedMessage {
  kind: MessageKind;
  categories: CategoryId[];
  /** "sve", "pet friendly mesta": every venue type, on purpose. */
  anyCategory: boolean;
  place: PlaceRef | null;
  /** Reads like a place ("na Dorćolu") but is no city or township in the database. */
  unknownPlace: string | null;
  nearMe: boolean;
  radius: number | null;
  dogSize: DogSize | null;
  garden: boolean;
  name: string | null;
  /** Trip facts, also when the message is not a trip question on its own ("20. decembra"). */
  trip: TripQuery | null;
  /** A trip word or a foreign country, so the message is about travelling abroad. */
  tripSignal: boolean;
}

export const EMPTY_PARSE: ParsedMessage = {
  kind: 'unknown',
  categories: [],
  anyCategory: false,
  place: null,
  unknownPlace: null,
  nearMe: false,
  radius: null,
  dogSize: null,
  garden: false,
  name: null,
  trip: null,
  tripSignal: false,
};

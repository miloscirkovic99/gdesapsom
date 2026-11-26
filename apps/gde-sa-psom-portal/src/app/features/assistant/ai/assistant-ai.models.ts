import type { CountryCode } from '../../pet-trip/domain/countries';
import type { IsoDate } from '../../pet-trip/domain/dates';
import type { Lang } from '../../pet-trip/domain/lang';
import type { TransportMode } from '../../pet-trip/domain/trip.models';
import type { CategoryId, DogSize } from '../domain/query.models';

/**
 * What the browser sends to POST assistant/parse (as the JSON string
 * `payload`): the visitor's message and the date relative dates count from.
 * Nothing else: no location, no earlier messages, no results.
 */
export interface AiParseRequest {
  v: 1;
  lang: Lang;
  today: IsoDate;
  message: string;
}

/**
 * The AI's reading of a message, as the server checked it
 * (apps/api/v2/assistant/parse.POST.js) and the browser checks it again.
 * Only enums, a few place and venue names, dates and counts: the AI never
 * names a result. Place names are looked up in our own city and township
 * lists, and the search runs over our database.
 */
export interface AiIntent {
  intent: 'places' | 'trip' | 'other';
  categories: CategoryId[];
  city: string | null;
  township: string | null;
  nearMe: boolean;
  dogSize: DogSize | null;
  garden: boolean;
  venueName: string | null;
  trip: {
    destination: CountryCode | null;
    transport: TransportMode | null;
    departureDate: IsoDate | null;
    returnDate: IsoDate | null;
    nights: number | null;
    dogs: number | null;
  } | null;
}

export type AiStatus = 'ok' | 'cached' | 'disabled' | 'quota' | 'busy' | 'unavailable' | 'invalid';
export type AiQuotaReason = 'device' | 'network' | 'global';

export interface AiParseResult {
  status: AiStatus;
  intent: AiIntent | null;
  /** Readings this device has left today; null without a limit (dev) or when unknown. */
  remaining: number | null;
  reason: AiQuotaReason | null;
}

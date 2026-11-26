import { addDays } from '../../pet-trip/domain/dates';
import type { ParsedMessage, PlacesQuery, TripQuery } from './query.models';
import { EMPTY_TRIP } from './query.models';

/** What the conversation has settled so far: follow-ups ("a u Nišu?", "sa baštom") build on it. */
export interface AssistantContext {
  last: 'places' | 'trip' | null;
  places: PlacesQuery | null;
  trip: TripQuery | null;
}

export const EMPTY_CONTEXT: AssistantContext = { last: null, places: null, trip: null };

export type ReplyKind = 'greeting' | 'thanks' | 'help';

/** What the assistant does with a message. */
export type Step =
  | { type: 'search'; query: PlacesQuery }
  /** Knows what, not where. `unknownPlace` is the place it could not find, as typed. */
  | { type: 'ask-place'; query: PlacesQuery; unknownPlace: string | null }
  /** Knows only a detail ("sa baštom"), nothing to search for yet. */
  | { type: 'ask-category'; query: PlacesQuery }
  | { type: 'trip'; query: TripQuery }
  | { type: 'ask-destination'; query: TripQuery }
  | { type: 'reply'; reply: ReplyKind }
  | { type: 'not-understood' };

const EMPTY_PLACES: PlacesQuery = {
  categories: [],
  place: null,
  nearMe: false,
  radius: null,
  dogSize: null,
  garden: false,
  name: null,
};

function hasTripFacts(trip: TripQuery | null): boolean {
  return !!trip && Object.values(trip).some((value) => value !== null);
}

/** The new trip facts over the ones already known; a return date follows from the length when it can. */
export function mergeTrip(previous: TripQuery | null, next: TripQuery | null): TripQuery {
  const merged: TripQuery = { ...EMPTY_TRIP };
  for (const key of Object.keys(EMPTY_TRIP) as (keyof TripQuery)[]) {
    const value = next?.[key] ?? previous?.[key] ?? null;
    (merged as unknown as Record<string, unknown>)[key] = value;
  }
  // A new departure date makes an old return date meaningless.
  if (next?.departureDate && !next.returnDate && previous?.returnDate && previous.returnDate < next.departureDate) {
    merged.returnDate = null;
  }
  if (!merged.returnDate && merged.departureDate && merged.nights) {
    merged.returnDate = addDays(merged.departureDate, merged.nights);
  }
  return merged;
}

/**
 * The next step for a message, given the conversation so far. What the
 * message leaves out is taken from the previous search ("a restorani?"
 * keeps the city, "sa baštom" keeps the city and the category), so short
 * follow-ups work; what it says replaces the old value.
 */
export function resolveStep(parsed: ParsedMessage, context: AssistantContext): Step {
  const tripFollowUp = parsed.kind === 'unknown' && context.last === 'trip' && hasTripFacts(parsed.trip);
  if (parsed.kind === 'trip' || tripFollowUp) {
    // A new country is a new trip: only the old dates and dogs carry over when it is the same one.
    const previous = context.trip;
    const sameTrip = !parsed.trip?.destination || !previous?.destination || parsed.trip.destination === previous.destination;
    const trip = mergeTrip(sameTrip ? previous : { ...EMPTY_TRIP, dogs: previous?.dogs ?? null }, parsed.trip);
    return trip.destination ? { type: 'trip', query: trip } : { type: 'ask-destination', query: trip };
  }

  if (parsed.kind === 'places') {
    const previous = context.places ?? EMPTY_PLACES;
    const placeGiven = parsed.place !== null || parsed.nearMe || parsed.unknownPlace !== null;
    const nearMe = parsed.nearMe || (!placeGiven && previous.nearMe);
    const query: PlacesQuery = {
      categories: parsed.categories.length ? parsed.categories : parsed.anyCategory ? [] : previous.categories,
      place: parsed.place ?? (placeGiven ? null : previous.place),
      nearMe,
      radius: parsed.radius ?? (nearMe && previous.nearMe ? previous.radius : null),
      dogSize: parsed.dogSize ?? previous.dogSize,
      garden: parsed.garden || previous.garden,
      name: parsed.name,
    };

    if (query.place || query.nearMe) return { type: 'search', query };
    if (parsed.unknownPlace) return { type: 'ask-place', query, unknownPlace: parsed.unknownPlace };
    // Stays and named venues make sense across Serbia; a café without a city does not.
    if (query.name || (query.categories.length && query.categories.every((category) => category === 'stay'))) {
      return { type: 'search', query };
    }
    if (query.categories.length || parsed.anyCategory) return { type: 'ask-place', query, unknownPlace: null };
    return { type: 'ask-category', query };
  }

  if (parsed.kind === 'greeting' || parsed.kind === 'thanks' || parsed.kind === 'help') {
    return { type: 'reply', reply: parsed.kind };
  }
  return { type: 'not-understood' };
}

/** The context after a step: a question keeps its half-built query, so the answer ("Beograd") completes it. */
export function nextContext(context: AssistantContext, step: Step): AssistantContext {
  switch (step.type) {
    case 'search':
    case 'ask-place':
    case 'ask-category':
      return { ...context, last: 'places', places: step.query };
    case 'trip':
    case 'ask-destination':
      return { ...context, last: 'trip', trip: step.query };
    default:
      return context;
  }
}

import { type CountryCode, isCountryCode } from './domain/countries';
import { isIsoDate, type IsoDate } from './domain/dates';
import { MAX_DOGS, TRANSPORT_MODES, type TransportMode } from './domain/trip.models';

/**
 * Trip facts handed to /putovanje-sa-psom in the URL, by the assistant's
 * "Otvori u planeru" link: `?destination=HR&transport=car&transit=HU,AT
 * &departure=2026-12-20&return=2026-12-27&dogs=1`. Every parameter is
 * optional and checked; the page applies them over the saved draft once
 * and then drops them from the address bar.
 */
export interface TripPrefill {
  destination: CountryCode | null;
  transport: TransportMode | null;
  /** Driving order; null leaves the draft's transit alone. */
  transit: CountryCode[] | null;
  departureDate: IsoDate | null;
  returnDate: IsoDate | null;
  dogs: number | null;
}

export const PREFILL_PARAMS = ['destination', 'transport', 'transit', 'departure', 'return', 'dogs'] as const;

export function prefillParams(prefill: TripPrefill): Record<string, string> {
  const params: Record<string, string> = {};
  if (prefill.destination) params['destination'] = prefill.destination;
  if (prefill.transport) params['transport'] = prefill.transport;
  if (prefill.transit?.length) params['transit'] = prefill.transit.join(',');
  if (prefill.departureDate) params['departure'] = prefill.departureDate;
  if (prefill.returnDate) params['return'] = prefill.returnDate;
  if (prefill.dogs) params['dogs'] = String(prefill.dogs);
  return params;
}

/** The prefill in a URL's query parameters, or null when it has none of them. */
export function readPrefill(get: (name: string) => string | null, today: IsoDate): TripPrefill | null {
  if (!PREFILL_PARAMS.some((name) => get(name) !== null)) return null;

  const destination = get('destination');
  const transport = get('transport');
  const departure = get('departure');
  const returning = get('return');
  const dogs = Number(get('dogs'));
  const transit = get('transit')
    ?.split(',')
    .map((code) => code.trim())
    .filter((code): code is CountryCode => isCountryCode(code) && code !== 'RS');

  const departureDate = isIsoDate(departure) && departure >= today ? departure : null;
  const returnDate = isIsoDate(returning) && returning >= (departureDate ?? today) ? returning : null;
  return {
    destination: isCountryCode(destination) && destination !== 'RS' ? destination : null,
    transport: TRANSPORT_MODES.includes(transport as TransportMode) ? (transport as TransportMode) : null,
    transit: transit ? [...new Set(transit)] : null,
    departureDate,
    returnDate,
    dogs: Number.isInteger(dogs) && dogs >= 1 && dogs <= MAX_DOGS ? dogs : null,
  };
}

/**
 * Address -> coordinates via OpenStreetMap Nominatim: the admin shop form, and
 * the trip planner's distance estimate (two lookups per click, on request only).
 *
 * Uses `fetch` on purpose: every HttpClient request goes through
 * ApiPrefixInterceptor, which would rewrite the URL onto our own API host.
 * Low volume and user-triggered, which is within Nominatim's usage policy.
 */
export interface GeocodeHit {
  lat: number;
  lon: number;
  label: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * The named areas around a point, most specific first, as OpenStreetMap
 * writes them. For Belgrade that is "Beograd (Vračar)" (suburb),
 * "Gradska opština Vračar" (city) and "Grad Beograd" (county), so callers
 * have to normalise the names before matching them.
 */
export interface ReverseGeocodeHit {
  names: string[];
}

/** Address fields from the most specific to the most general. */
const AREA_FIELDS = ['suburb', 'city_district', 'borough', 'quarter', 'municipality', 'city', 'town', 'village', 'county'];

/**
 * Coordinates -> the names of the areas they are in, in Serbian Latin
 * script where OpenStreetMap has it, for the assistant's "near me" with
 * places that have no coordinates (dog parks, vet clinics). One request, on
 * the visitor's tap.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeHit | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    zoom: '14',
    addressdetails: '1',
    'accept-language': 'sr-Latn,sr,en',
  });

  const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Nominatim responded with ${response.status}`);

  const body = (await response.json()) as { address?: Record<string, string | undefined> } | null;
  const address = body?.address;
  if (!address) return null;
  const names = AREA_FIELDS.map((key) => address[key]).filter((value): value is string => typeof value === 'string' && !!value.trim());
  return names.length ? { names } : null;
}

/** `countryCode` limits the search to one country (ISO 3166-1 alpha-2, lower case). */
export async function geocodeAddress(query: string, limit = 5, countryCode = 'rs'): Promise<GeocodeHit[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: String(limit),
    countrycodes: countryCode,
    'accept-language': 'sr-Latn,sr,en',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Nominatim responded with ${response.status}`);

  const rows = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return rows
    .map((row) => ({ lat: Number(row.lat), lon: Number(row.lon), label: row.display_name }))
    .filter((hit) => Number.isFinite(hit.lat) && Number.isFinite(hit.lon));
}

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

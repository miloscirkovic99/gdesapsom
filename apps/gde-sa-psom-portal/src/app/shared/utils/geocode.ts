/**
 * Address -> coordinates for the admin shop form, via OpenStreetMap Nominatim.
 *
 * Uses `fetch` on purpose: every HttpClient request goes through
 * ApiPrefixInterceptor, which would rewrite the URL onto our own API host.
 * Admin-only, low volume, which is within Nominatim's usage policy.
 */
export interface GeocodeHit {
  lat: number;
  lon: number;
  label: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress(query: string, limit = 5): Promise<GeocodeHit[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: String(limit),
    countrycodes: 'rs',
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

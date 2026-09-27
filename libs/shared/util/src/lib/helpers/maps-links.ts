export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Coordinates from API fields that are stored as text and are often empty.
 * Returns null for missing, unparsable or 0,0 values (never a real venue in Serbia).
 */
export function parseCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  if (latitude === null || latitude === undefined || latitude === '') return null;
  if (longitude === null || longitude === undefined || longitude === '') return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat === 0 && lon === 0) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { latitude: lat, longitude: lon };
}

const at = (c: Coordinates) => `${c.latitude},${c.longitude}`;

/** Turn-by-turn directions in Google Maps (app if installed, otherwise the browser). */
export const googleMapsDirectionsUrl = (c: Coordinates): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${at(c)}`;

export const wazeDirectionsUrl = (c: Coordinates): string => `https://waze.com/ul?ll=${at(c)}&navigate=yes`;

export const appleMapsDirectionsUrl = (c: Coordinates): string => `https://maps.apple.com/?daddr=${at(c)}`;

/** Google Maps search for places without coordinates (parks, vet clinics): name + address. */
export const googleMapsSearchUrl = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

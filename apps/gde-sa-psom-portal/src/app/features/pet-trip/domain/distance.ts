import type { MoneyRange } from './money';

/**
 * A rough road distance when the visitor has not typed one: the straight line
 * between the two cities times a detour factor. How much longer the road is
 * depends on mountains, borders and the motorway network: Belgrade to Vienna
 * is about 1.2 times the straight line, Novi Sad to Split well over 1.5. So
 * the factor is a wide range and the result is always labelled an estimate;
 * a route planner's number, typed into the form, replaces it.
 */
export const ROAD_FACTOR: MoneyRange = { min: 1.2, max: 1.9 };

export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in km (haversine). */
export function straightLineKm(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Estimated one-way road distance, whole kilometres. */
export function estimateRoadKm(a: LatLon, b: LatLon): MoneyRange {
  const line = straightLineKm(a, b);
  return { min: Math.round(line * ROAD_FACTOR.min), max: Math.round(line * ROAD_FACTOR.max) };
}

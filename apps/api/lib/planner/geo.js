/** Great-circle distance and ordering helpers. */

const EARTH_RADIUS_M = 6371000;
const rad = (deg) => (deg * Math.PI) / 180;
const isCoordinate = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

function hasCoordinates(point) {
  return !!point && isCoordinate(point.lat) && isCoordinate(point.lng);
}

/** Metres between two { lat, lng }; Infinity when either has no coordinates. */
function distanceM(a, b) {
  if (!hasCoordinates(a) || !hasCoordinates(b)) return Infinity;
  const [lat1, lng1, lat2, lng2] = [Number(a.lat), Number(a.lng), Number(b.lat), Number(b.lng)];
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The item of `items` closest to `from`; ties keep the earlier (better-ranked) item. */
function nearest(from, items) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of items) {
    const d = distanceM(from, item);
    if (best === null || d < bestDistance) {
      best = item;
      bestDistance = d;
    }
  }
  return best;
}

module.exports = { distanceM, nearest, hasCoordinates };

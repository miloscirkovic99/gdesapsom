/**
 * `params_hash`: SHA-256 of the normalized parameters plus the forecast
 * temperature rounded to 5 °C. Two requests for the same day and dog under
 * roughly the same weather share one plan for 24 hours.
 */

/** JSON with object keys sorted at every level, so key order never changes the hash. */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value === undefined ? null : value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

/** 23.4 → 25, -2.6 → -5, 12.5 → 15; null stays null (no forecast). */
function temperatureBucket(celsius) {
  if (celsius === null || celsius === undefined || !Number.isFinite(Number(celsius))) return null;
  const bucket = Math.round(Number(celsius) / 5) * 5;
  return bucket === 0 ? 0 : bucket; // no "-0" in the key
}

/**
 * @param {object} params output of validatePlannerInput
 * @param {number | null} temperature representative forecast temperature, °C
 * @param {(text: string) => string} sha256Hex
 */
function plannerCacheKey(params, temperature, sha256Hex) {
  return sha256Hex(canonicalJson({ v: 1, params, t: temperatureBucket(temperature) }));
}

module.exports = { canonicalJson, temperatureBucket, plannerCacheKey };

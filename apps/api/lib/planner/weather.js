/**
 * MET Norway Locationforecast 2.0 (compact): request, caching rule and the
 * daytime summary the planner uses.
 *
 * Terms (api.met.no/doc/TermsOfService): an identifying User-Agent
 * (MET_NO_USER_AGENT), coordinates with at most 4 decimals, no new request
 * before the `Expires` header, and credit "Data from MET Norway" (CC BY 4.0).
 */
const { LIMITS, WEATHER } = require('./config');
const { belgradeLocal } = require('./time');

const ENDPOINT = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';

/** At most 4 decimals, as the terms require; extra decimals are rounded off. */
function coordinate(value) {
  return Number(Number(value).toFixed(4));
}

function forecastRequest(lat, lng, userAgent) {
  if (!userAgent) throw new Error('MET_NO_USER_AGENT is not set');
  return {
    method: 'GET',
    url: `${ENDPOINT}?lat=${coordinate(lat)}&lon=${coordinate(lng)}`,
    headers: { 'User-Agent': userAgent, Accept: 'application/json' },
  };
}

/** Cache key for one point, at the same precision as the request. */
function forecastCacheKey(lat, lng) {
  return `met:${coordinate(lat)},${coordinate(lng)}`;
}

/** How long a response may be reused: until `Expires`, but never less than an hour. */
function cacheTtlMs(expiresHeader, nowMs) {
  const expires = Date.parse(expiresHeader || '');
  const untilExpires = Number.isFinite(expires) ? expires - nowMs : 0;
  return Math.max(LIMITS.weatherMinCacheMs, untilExpires);
}

const WET_SYMBOL = /rain|sleet|snow|showers/;

/**
 * Daytime (08–20 h Belgrade time) summary of `date` from a compact forecast,
 * or null when the forecast does not reach that day.
 *
 * @returns {{ date, tMin, tMax, tAvg, precipitationMm, rainy, cold, hot, symbols: string[] } | null}
 */
function summarizeDay(forecast, date) {
  const series = forecast && forecast.properties && forecast.properties.timeseries;
  if (!Array.isArray(series)) return null;

  const temps = [];
  const symbols = [];
  let precipitation = 0;

  for (const entry of series) {
    const ms = Date.parse(entry.time);
    if (!Number.isFinite(ms)) continue;
    const local = belgradeLocal(ms);
    if (local.date !== date || local.hour < WEATHER.dayStartHour || local.hour > WEATHER.dayEndHour) continue;

    const details = entry.data && entry.data.instant && entry.data.instant.details;
    if (details && Number.isFinite(details.air_temperature)) temps.push(details.air_temperature);

    // Hourly steps carry next_1_hours; further out the steps are 6 hours apart
    // and only next_6_hours exists, which then covers exactly one step.
    const period = (entry.data && (entry.data.next_1_hours || entry.data.next_6_hours)) || null;
    if (period) {
      if (period.summary && period.summary.symbol_code) symbols.push(period.summary.symbol_code);
      const amount = period.details && period.details.precipitation_amount;
      if (Number.isFinite(amount)) precipitation += amount;
    }
  }

  if (!temps.length) return null;

  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);
  const tAvg = temps.reduce((sum, t) => sum + t, 0) / temps.length;
  const precipitationMm = Math.round(precipitation * 10) / 10;

  return {
    date,
    tMin,
    tMax,
    tAvg: Math.round(tAvg * 10) / 10,
    precipitationMm,
    rainy: precipitationMm >= WEATHER.rainMm || symbols.some((s) => WET_SYMBOL.test(s)),
    cold: tMax <= WEATHER.coldMaxC,
    hot: tMax > WEATHER.hotC,
    symbols: [...new Set(symbols)],
  };
}

/** "PROGNOZA" block of the prompt. */
function describeForPrompt(summary) {
  if (!summary) return 'Prognoza nije dostupna.';
  const parts = [
    `${summary.date}: ${Math.round(summary.tMin)}–${Math.round(summary.tMax)} °C (prosek ${Math.round(summary.tAvg)} °C)`,
    `padavine ${summary.precipitationMm} mm`,
  ];
  if (summary.rainy) parts.push('kišovito ili sneg');
  if (summary.cold) parts.push('hladno');
  if (summary.hot) parts.push(`vrućina iznad ${WEATHER.hotC} °C`);
  return parts.join(', ');
}

module.exports = { forecastRequest, forecastCacheKey, cacheTtlMs, summarizeDay, describeForPrompt, coordinate };

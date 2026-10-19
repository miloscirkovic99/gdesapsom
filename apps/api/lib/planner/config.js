/**
 * Planner settings: limits, whitelists, models and prices.
 *
 * Secrets never live here; handlers read them from the environment
 * (GEMINI_API_KEY, CF_ACCOUNT_ID, CF_AI_API_TOKEN, ANTHROPIC_API_KEY,
 * TURNSTILE_SECRET_KEY, PLANNER_HMAC_SECRET, MET_NO_USER_AGENT,
 * PLANNER_DAILY_BUDGET_USD).
 */

const LIMITS = {
  /** Plans per device (gsp_device cookie) in the sliding window. */
  perDevice: 3,
  /** Plans per network (IPv4 address or IPv6 /64) in the sliding window. */
  perNetwork: 15,
  windowDays: 7,
  /** One planner request per network in this many seconds (in memory). */
  cooldownSeconds: 10,
  /** A stored plan with the same parameters younger than this is reused. */
  cacheHours: 24,
  /** The daily job deletes planner_quota rows older than this. */
  quotaRetentionDays: 8,
  providerTimeoutMs: 10000,
  /** MET Norway: never ask again before this, even if Expires is sooner. */
  weatherMinCacheMs: 60 * 60 * 1000,
};

const DEVICE_COOKIE = 'gsp_device';
const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/** Values the form may send. Anything else is a 400. */
const WHITELIST = {
  mode: ['dan', 'zimovanje'],
  velicina: ['mali', 'srednji', 'veliki'],
  energija: ['niska', 'srednja', 'visoka'],
  tip_dana: ['opusten', 'aktivan', 'mesovit'],
  dlaka: ['kratka', 'srednja', 'duga'],
};

/** How far ahead "dan" may be planned: MET Norway forecasts about 9 days. */
const MAX_DAYS_AHEAD = 9;
const NIGHTS = { min: 1, max: 7 };

/**
 * Cities and destinations the planner knows. The coordinates are only where
 * the forecast is asked for; they are never shown as a place.
 */
const CITIES = {
  beograd: { name: 'Beograd', lat: 44.8125, lng: 20.4612 },
  'novi-sad': { name: 'Novi Sad', lat: 45.2551, lng: 19.8452 },
};
const DESTINATIONS = {
  kopaonik: { name: 'Kopaonik', lat: 43.2857, lng: 20.8094 },
  zlatibor: { name: 'Zlatibor', lat: 43.7277, lng: 19.696 },
  tara: { name: 'Tara', lat: 43.8526, lng: 19.4278 },
};

/** Weather thresholds, °C and mm. */
const WEATHER = {
  /** Above this no walks between 11 and 17 h. */
  hotC: 28,
  /** A heat-sensitive dog is steered to shade and water from here. */
  warmC: 25,
  /** At or below this daytime maximum, cafés and restaurants must let dogs inside. */
  coldMaxC: 5,
  /** Daytime precipitation from which the day counts as rainy. */
  rainMm: 1,
  dayStartHour: 8,
  dayEndHour: 20,
};

/**
 * How many candidates go to the model, per category. Free slots up to `total`
 * go to the best of the rest, except for categories in `capped`.
 */
const CANDIDATES = {
  dan: { total: 20, quota: { park: 6, kafic: 6, restoran: 6, bar: 2 }, capped: [] },
  zimovanje: { total: 30, quota: { smestaj: 6, restoran: 10, staza: 8, veterinar: 2 }, capped: ['smestaj', 'veterinar'] },
};

/** A vet farther than this from the destination is not "the nearest vet" (planner and winter pages). */
const VET_MAX_DISTANCE_KM = 100;

const PLAN_RULES = {
  maxStopsPerDay: 5,
  danMinStops: 3,
  danMaxStops: 5,
  zimovanjeMaxStopsPerDay: 4,
  smestajMin: 2,
  smestajMax: 3,
  /** Walks are not allowed to start in [noWalkFrom, noWalkTo) when it is hot. */
  noWalkFrom: 11,
  noWalkTo: 17,
  maxTextLength: 300,
  maxNotes: 5,
};

const MODELS = {
  gemini: 'gemini-3.1-flash-lite',
  cloudflare: '@cf/google/gemma-4-26b-a4b-it',
  anthropic: 'claude-haiku-5-5',
};

/** USD per 1M tokens, input / output. */
const PRICES_PER_MTOK = {
  gemini: { input: 0.25, output: 1.5 },
  cloudflare: { input: 0.1, output: 0.3 },
  anthropic: { input: 0.1, output: 0.5 },
};

const MAX_OUTPUT_TOKENS = 2048;

const WEATHER_ATTRIBUTION = {
  text: 'Prognoza: MET Norway',
  source: 'Data from MET Norway',
  url: 'https://api.met.no/',
  license: 'CC BY 4.0',
  license_url: 'https://creativecommons.org/licenses/by/4.0/',
};

module.exports = {
  LIMITS,
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  WHITELIST,
  MAX_DAYS_AHEAD,
  NIGHTS,
  CITIES,
  DESTINATIONS,
  WEATHER,
  CANDIDATES,
  VET_MAX_DISTANCE_KM,
  PLAN_RULES,
  MODELS,
  PRICES_PER_MTOK,
  MAX_OUTPUT_TOKENS,
  WEATHER_ATTRIBUTION,
};

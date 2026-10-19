/**
 * The planner endpoints, without MARS. Each method takes a request and
 * returns { status, body, cookies }; lib/planner/runtime.js connects them to
 * MARS and the handlers in apps/api/handlers/ to routes.
 *
 * POST planner, in this order (the cheap checks first, money last):
 *   whitelist → cooldown (10 s per network) → Turnstile → device cookie →
 *   quota reservation → forecast → cache (24 h) → candidates → AI cascade or
 *   rules → saved plan.
 * Any failure after the reservation deletes it, so a plan that was never
 * delivered does not count.
 *
 * The visitor is known only as HMAC-SHA256(PLANNER_HMAC_SECRET) of the device
 * id and of the network (IPv4 address or IPv6 /64).
 *
 * @typedef {{
 *   input: Record<string, unknown>,
 *   cookie: (name: string) => string | null,
 *   header: (name: string) => string | null,
 *   remoteAddress: string | null,
 * }} PlannerRequest
 * @typedef {{ status: number, body: object, cookies?: { name: string, value: string, maxAge: number }[] }} PlannerResponse
 */
const {
  CITIES,
  DESTINATIONS,
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  LIMITS,
  MODELS,
  WEATHER_ATTRIBUTION,
} = require('./config');
const { plannerCacheKey } = require('./cache-key');
const { runCascade } = require('./cascade');
const { score, selectCandidates, exclusionReasons } = require('./candidates');
const { clientAddress, networkKey } = require('./ip');
const { belgradeDayRange, createCooldown, identityHashes, isUuidV4, parseBudget } = require('./limits');
const { validatePlannerInput, toInteger } = require('./params');
const { toCandidate, toPlace } = require('./places');
const { buildUserMessage, PLAN_SCHEMAS } = require('./prompt');
const providers = require('./providers');
const quota = require('./quota');
const { rulesPlan } = require('./rules-plan');
const store = require('./store');
const { idsInPlan, swapStop } = require('./swap');
const { belgradeLocal } = require('./time');
const { isTokenShaped, parseSiteverify, siteverifyRequest } = require('./turnstile');
const { validatePlan } = require('./validate');
const { cacheTtlMs, forecastCacheKey, forecastRequest, summarizeDay } = require('./weather');

const PLAN_ID = /^[0-9a-z]{16}$/;
const HOUR_MS = 60 * 60 * 1000;
const WEATHER_TIMEOUT_MS = 5000;
const TURNSTILE_TIMEOUT_MS = 5000;
/** At most this many thumbs and reports per plan; a shared link should not become a spam sink. */
const MAX_FEEDBACK_PER_PLAN = 50;
const MAX_COMMENT_LENGTH = 500;

const iso = (ms) => (ms === null || ms === undefined ? null : new Date(ms).toISOString());
const reply = (status, body, cookies) => (cookies && cookies.length ? { status, body, cookies } : { status, body });
const unavailable = (cookies) => reply(503, { reason: 'unavailable' }, cookies);

/** A header from an HTTP response's header map, whatever its letter case. */
function headerOf(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name) || null;
  const wanted = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === wanted) {
      const value = headers[key];
      return Array.isArray(value) ? String(value[0]) : value == null ? null : String(value);
    }
  }
  return null;
}

/** Cooldowns per network for each endpoint that writes. */
function createCooldowns() {
  return {
    create: createCooldown({ seconds: LIMITS.cooldownSeconds }),
    swap: createCooldown({ seconds: 2 }),
    feedback: createCooldown({ seconds: 2 }),
  };
}

/**
 * @param {{
 *   db: { query: (sql: string, ...args: unknown[]) => object[], commit?: () => void },
 *   env: (name: string) => string | null,
 *   http: (request: object, timeoutMs: number) => { status: number, body: string, headers?: object },
 *   now: () => number,
 *   randomId: () => string,
 *   uuidV4: () => string,
 *   sha256Hex: (text: string) => string,
 *   hmacSha256Hex: (key: string, message: string) => string,
 *   systemPrompt: string,
 *   cooldowns: ReturnType<typeof createCooldowns>,
 * }} deps
 */
function createPlannerService(deps) {
  const { db, env, now } = deps;

  /** HMAC under PLANNER_HMAC_SECRET, or null when the secret is missing or too short to protect anything. */
  function hmacFn() {
    const secret = env('PLANNER_HMAC_SECRET');
    return secret && String(secret).length >= 32 ? (message) => deps.hmacSha256Hex(String(secret), message) : null;
  }

  function networkOf(request) {
    const address = clientAddress(request.header, {
      header: env('PLANNER_CLIENT_IP_HEADER') || undefined,
      trustedHops: toInteger(env('PLANNER_TRUSTED_HOPS')) || 1,
      remoteAddress: request.remoteAddress,
    });
    return networkKey(address);
  }

  /** The device id from the cookie, or a new one (with its Set-Cookie) when `issue` is set. */
  function deviceOf(request, issue) {
    const current = request.cookie(DEVICE_COOKIE);
    if (isUuidV4(current)) return { deviceId: current.toLowerCase(), cookies: [] };
    if (!issue) return { deviceId: null, cookies: [] };
    const deviceId = deps.uuidV4();
    return { deviceId, cookies: [{ name: DEVICE_COOKIE, value: deviceId, maxAge: DEVICE_COOKIE_MAX_AGE }] };
  }

  // --- forecast ----------------------------------------------------------------

  /** MET Norway compact forecast for a point: cached until Expires, a stale copy if MET does not answer. */
  function forecastFor(point) {
    const key = forecastCacheKey(point.lat, point.lng);
    const t = now();
    const cached = store.weatherGet(db, key);
    const cachedBody = () => (cached ? store.parseJson(cached.body) : null);
    if (cached && cached.expiresAt > t) return cachedBody();

    const userAgent = env('MET_NO_USER_AGENT');
    if (!userAgent) return cachedBody();
    try {
      const request = forecastRequest(point.lat, point.lng, userAgent);
      if (cached && cached.lastModified) request.headers['If-Modified-Since'] = cached.lastModified;
      const response = deps.http(request, WEATHER_TIMEOUT_MS);
      const expiresAt = t + cacheTtlMs(headerOf(response.headers, 'expires'), t);
      if (response.status === 304 && cached) {
        store.weatherExtend(db, key, expiresAt, t);
        return cachedBody();
      }
      if (response.status === 200) {
        const forecast = JSON.parse(response.body);
        store.weatherPut(db, key, { body: response.body, lastModified: headerOf(response.headers, 'last-modified'), expiresAt, fetchedAt: t });
        return forecast;
      }
    } catch {
      // MET is down or slow: plan without a forecast rather than not at all.
    }
    return cachedBody();
  }

  function weatherFor(params) {
    if (params.mode !== 'dan') return null;
    const forecast = forecastFor(CITIES[params.grad]);
    return forecast ? summarizeDay(forecast, params.datum) : null;
  }

  // --- plans -------------------------------------------------------------------

  function contextFor(params, weather) {
    return {
      params,
      weather,
      date: params.mode === 'dan' ? params.datum : null,
      today: belgradeLocal(now()).date,
      center: params.mode === 'dan' ? CITIES[params.grad] : DESTINATIONS[params.destinacija],
    };
  }

  function allCandidates(params) {
    return store
      .loadCandidateRows(db, params)
      .map(toCandidate)
      .filter((candidate) => candidate.id !== null && candidate.naziv && candidate.kategorija);
  }

  /** Every place the plan mentions that is still in the database, keyed by lokacija_id. */
  function placesOf(plan) {
    const places = {};
    for (const row of store.loadPlaceRows(db, [...idsInPlan(plan)])) {
      const place = toPlace(row);
      if (place.id !== null && place.naziv) places[String(place.id)] = place;
    }
    return places;
  }

  function planBody(id, mode, result, extra) {
    return {
      plan_id: id,
      mode,
      plan: result.plan,
      places: placesOf(result.plan),
      source: result.source === 'ai' ? 'ai' : 'rules',
      weather_attribution: result.weather_attribution || null,
      ...extra,
    };
  }

  function cascadeSteps(params, user) {
    const system = deps.systemPrompt || '';
    const schema = PLAN_SCHEMAS[params.mode];
    const geminiKey = env('GEMINI_API_KEY');
    const cfAccount = env('CF_ACCOUNT_ID');
    const cfToken = env('CF_AI_API_TOKEN');
    const anthropicKey = env('ANTHROPIC_API_KEY');
    return [
      {
        name: 'gemini',
        model: MODELS.gemini,
        available: !!(system && geminiKey),
        request: () => providers.geminiRequest({ apiKey: geminiKey, model: MODELS.gemini, system, user, schema }),
        parse: providers.parseGemini,
      },
      {
        name: 'cloudflare',
        model: MODELS.cloudflare,
        available: !!(system && cfAccount && cfToken),
        request: () => providers.cloudflareRequest({ accountId: cfAccount, token: cfToken, model: MODELS.cloudflare, system, user, schema }),
        parse: providers.parseCloudflare,
      },
      {
        name: 'anthropic',
        model: MODELS.anthropic,
        needsBudget: true,
        available: !!(system && anthropicKey),
        request: () => providers.anthropicRequest({ apiKey: anthropicKey, model: MODELS.anthropic, system, user, schema }),
        parse: providers.parseAnthropic,
      },
    ];
  }

  /** @param {PlannerRequest} request @returns {PlannerResponse} */
  function create(request) {
    const t = now();
    const input = request.input || {};
    const checked = validatePlannerInput(input, { today: belgradeLocal(t).date });
    if (!checked.ok) return reply(400, { reason: 'invalid', fields: checked.errors });
    const { params } = checked;

    const hmac = hmacFn();
    const network = networkOf(request);
    if (!hmac || !network) return unavailable();
    const ipHash = hmac(`net:${network}`);

    // One request per network in 10 s: from the last reservation, in case
    // this process does not keep memory between requests, and in memory for
    // requests that never got as far as a reservation. A refused request
    // does not restart the wait.
    const last = store.lastNetworkRequestMs(db, ipHash);
    const dbWaitMs = last !== null ? LIMITS.cooldownSeconds * 1000 - (t - last) : 0;
    const hit = dbWaitMs > 0 ? null : deps.cooldowns.create.hit(ipHash, t);
    const waitMs = hit ? (hit.ok ? 0 : hit.retryAfterSeconds * 1000) : dbWaitMs;
    if (waitMs > 0) {
      const retryAfter = Math.ceil(waitMs / 1000);
      return reply(429, { reason: 'cooldown', next_at: iso(t + retryAfter * 1000), retry_after: retryAfter });
    }

    const turnstileSecret = env('TURNSTILE_SECRET_KEY');
    if (!turnstileSecret) return unavailable();
    if (!isTokenShaped(input.turnstile_token)) return reply(403, { reason: 'captcha' });
    try {
      const response = deps.http(siteverifyRequest(String(turnstileSecret), input.turnstile_token), TURNSTILE_TIMEOUT_MS);
      if (!parseSiteverify(response.status, response.body).ok) return reply(403, { reason: 'captcha' });
    } catch {
      return unavailable();
    }

    const { deviceId, cookies } = deviceOf(request, true);
    const { deviceHash } = identityHashes(hmac, { deviceId, networkKey: network });
    const quotaStore = store.quotaStore(db);
    const planId = deps.randomId();
    const reservation = quota.reserve(quotaStore, { deviceHash, ipHash, now: t, planId });
    if (!reservation.ok) return reply(429, { reason: reservation.reason, next_at: iso(reservation.nextAt) }, cookies);
    const limits = { remaining: reservation.remaining, next_at: iso(reservation.nextAt) };

    try {
      const weather = weatherFor(params);
      const paramsHash = plannerCacheKey(params, weather ? weather.tMax : null, deps.sha256Hex);

      const cached = store.findCachedPlan(db, paramsHash, t - LIMITS.cacheHours * HOUR_MS);
      if (cached && cached.result && cached.result.plan) {
        quota.confirm(quotaStore, planId, cached.id);
        return reply(200, planBody(cached.id, cached.mode, cached.result, limits), cookies);
      }

      const context = contextFor(params, weather);
      const candidates = selectCandidates(allCandidates(params), context);
      // The rules plan is the floor: when even it cannot be made from the
      // database, no provider is paid to try.
      const fallback = rulesPlan(candidates, context);
      if (!validatePlan(fallback, { ...context, candidates }).ok) {
        quota.release(quotaStore, planId);
        return reply(503, { reason: 'no_places' }, cookies);
      }

      const range = belgradeDayRange(t);
      const outcome = runCascade({
        steps: cascadeSteps(params, buildUserMessage({ params, weather, candidates, date: context.date })),
        send: (providerRequest, timeoutMs) => deps.http(providerRequest, timeoutMs),
        validate: (plan) => validatePlan(plan, { ...context, candidates }),
        fallback: () => fallback,
        spentTodayUsd: store.spentBetween(db, range.from, range.to),
        budgetUsd: parseBudget(env('PLANNER_DAILY_BUDGET_USD')),
      });

      const result = {
        plan: outcome.plan,
        source: outcome.source,
        weather,
        weather_attribution: weather ? WEATHER_ATTRIBUTION : null,
        attempts: outcome.attempts,
      };
      store.insertPlan(db, {
        id: planId,
        paramsHash,
        params,
        result,
        mode: params.mode,
        provider: outcome.provider,
        model: outcome.model,
        tokensIn: outcome.tokensIn,
        tokensOut: outcome.tokensOut,
        costUsd: outcome.costUsd,
        at: t,
      });
      quota.confirm(quotaStore, planId, planId);
      return reply(200, planBody(planId, params.mode, result, limits), cookies);
    } catch {
      try {
        quota.release(quotaStore, planId);
      } catch {
        // The daily job removes it with the rest after 8 days.
      }
      return unavailable(cookies);
    }
  }

  /** GET plan/:id — a saved plan, with its places as they are in the database now. */
  function get(request) {
    const id = String((request.input || {}).id || '');
    const stored = PLAN_ID.test(id) ? store.getPlan(db, id) : null;
    if (!stored || !stored.result || !stored.result.plan) return reply(404, { reason: 'not_found' });
    return reply(200, planBody(stored.id, stored.mode, stored.result));
  }

  /** Ids of places already swapped away, from a JSON array or "1,2,3". */
  function excludeList(value) {
    let list = [];
    if (typeof value === 'string') list = value.split(',');
    else if (value && typeof value === 'object' && typeof value.length === 'number') list = Array.from(value);
    return list
      .map((item) => toInteger(typeof item === 'string' ? item.trim() : item))
      .filter((id) => id !== null && id > 0)
      .slice(0, 50);
  }

  /** POST swap — one entry replaced by the next candidate; saved as a new plan, no AI and no quota. */
  function swap(request) {
    const input = request.input || {};
    const id = String(input.plan_id || '');
    const index = toInteger(input.index);
    const section = input.section === undefined || input.section === null || input.section === '' ? 'stanice' : input.section;
    const day = input.day === undefined || input.day === null || input.day === '' ? null : toInteger(input.day);
    if (!PLAN_ID.test(id) || index === null || index < 0 || index > 20 || !['stanice', 'smestaj'].includes(section) || (day !== null && (day < 1 || day > 8))) {
      return reply(400, { reason: 'invalid' });
    }

    const hmac = hmacFn();
    const network = networkOf(request);
    if (hmac && network) {
      const hit = deps.cooldowns.swap.hit(hmac(`net:${network}`), now());
      if (!hit.ok) return reply(429, { reason: 'cooldown', next_at: iso(now() + hit.retryAfterSeconds * 1000), retry_after: hit.retryAfterSeconds });
    }

    const stored = store.getPlan(db, id);
    if (!stored || !stored.result || !stored.result.plan || !stored.params) return reply(404, { reason: 'not_found' });

    const context = contextFor(stored.params, stored.result.weather || null);
    const ranked = allCandidates(stored.params)
      .filter((candidate) => exclusionReasons(candidate, context).length === 0)
      .map((candidate) => ({ candidate, points: score(candidate, context) }))
      .sort((a, b) => b.points - a.points || Number(b.candidate.premium) - Number(a.candidate.premium) || a.candidate.id - b.candidate.id)
      .map((item) => item.candidate);

    const swapped = swapStop(
      { plan: stored.result.plan, mode: stored.mode },
      { section, day, index, exclude: excludeList(input.exclude) },
      ranked,
      context,
    );
    if (!swapped.ok) return reply(swapped.reason === 'not_found' ? 400 : 409, { reason: swapped.reason });

    const newId = deps.randomId();
    const result = { ...stored.result, plan: swapped.plan, swapped_from: stored.id };
    store.insertPlan(db, {
      id: newId,
      // Never a cache hit for anyone else: the visitor chose this plan by hand.
      paramsHash: deps.sha256Hex(`swap:${newId}`),
      params: stored.params,
      result,
      mode: stored.mode,
      provider: 'swap',
      model: null,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      at: now(),
    });
    return reply(200, planBody(newId, stored.mode, result));
  }

  /** POST feedback — a thumb (1 / -1) and/or an error report about one place of the plan. */
  function feedback(request) {
    const input = request.input || {};
    const id = String(input.plan_id || '');
    const rating = input.rating === undefined || input.rating === null || input.rating === '' ? null : toInteger(input.rating);
    const venueId = input.venue_id === undefined || input.venue_id === null || input.venue_id === '' ? null : toInteger(input.venue_id);
    const comment = typeof input.comment === 'string' ? input.comment.replace(/\s+/g, ' ').trim() : '';
    if (
      !PLAN_ID.test(id) ||
      (rating !== null && rating !== 1 && rating !== -1) ||
      (input.venue_id !== undefined && input.venue_id !== null && input.venue_id !== '' && venueId === null) ||
      comment.length > MAX_COMMENT_LENGTH ||
      (rating === null && !comment)
    ) {
      return reply(400, { reason: 'invalid' });
    }

    const hmac = hmacFn();
    const network = networkOf(request);
    if (hmac && network) {
      const hit = deps.cooldowns.feedback.hit(hmac(`net:${network}`), now());
      if (!hit.ok) return reply(429, { reason: 'cooldown', next_at: iso(now() + hit.retryAfterSeconds * 1000), retry_after: hit.retryAfterSeconds });
    }

    const stored = store.getPlan(db, id);
    if (!stored || !stored.result || !stored.result.plan) return reply(404, { reason: 'not_found' });
    if (venueId !== null && !idsInPlan(stored.result.plan).has(venueId)) return reply(400, { reason: 'invalid' });
    if (store.countFeedback(db, id) >= MAX_FEEDBACK_PER_PLAN) return reply(429, { reason: 'cooldown', next_at: null });

    store.insertFeedback(db, { planId: id, rating, comment: comment || null, venueId, at: now() });
    return reply(201, { ok: true });
  }

  /** GET quota — what this device has left this week, without reserving anything or setting a cookie. */
  function quotaStatus(request) {
    const { deviceId } = deviceOf(request, false);
    if (!deviceId) return reply(200, { remaining: LIMITS.perDevice, next_at: null });
    const hmac = hmacFn();
    if (!hmac) return unavailable();
    const status = quota.status(store.quotaStore(db), { deviceHash: hmac(`device:${deviceId}`), now: now() });
    return reply(200, { remaining: status.remaining, next_at: iso(status.nextAt) });
  }

  return { create, get, swap, feedback, quota: quotaStatus };
}

module.exports = { createPlannerService, createCooldowns, headerOf, PLAN_ID };

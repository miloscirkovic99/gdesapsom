/**
 * Glue between MARS (lib/mars.js) and the planner service: dependencies,
 * request and response.
 *
 * Module-level state (the cooldowns, the request counter of the selftest)
 * lives as long as MARS keeps the handler module loaded. Whether that spans
 * requests is not documented; GET planner/selftest shows it, and the create
 * cooldown also checks the database so it holds either way.
 */
const { hmacSha256Hex, randomId, sha256Hex, uuidV4 } = require('../crypto');
const { allowSiteOrigin, dbOf, respond } = require('../http-helpers');
const { createCooldowns, createPlannerService } = require('./service');
const systemPrompt = require('./system-prompt');

const COOLDOWNS = createCooldowns();

function plannerDeps(mars) {
  return {
    db: dbOf(mars),
    env: mars.env,
    http: mars.http,
    now: () => Date.now(),
    randomId: () => randomId(),
    uuidV4: () => uuidV4(),
    sha256Hex,
    hmacSha256Hex,
    systemPrompt,
    cooldowns: COOLDOWNS,
  };
}

/** The named request parameters only: a field the endpoint does not know (the dog's name above all) is never read. */
function requestOf(mars, names) {
  const input = {};
  for (const name of names) {
    const value = mars.param(name, null);
    if (value !== null && value !== undefined) input[name] = value;
  }
  return {
    input,
    cookie: mars.cookie,
    header: mars.requestHeader,
    remoteAddress: mars.remoteAddress(),
  };
}

/**
 * Writes a service response. An error status ends the script with exit(),
 * which also rolls back whatever the request had not committed.
 */
function send(mars, response, { cacheControl = 'no-store' } = {}) {
  mars.header('Cache-Control', cacheControl);
  for (const cookie of response.cookies || []) mars.setCookie(cookie.name, cookie.value, { maxAge: cookie.maxAge });
  if (response.status !== 200) mars.status(response.status);
  respond(mars, response.body);
  if (response.status >= 400) mars.exit();
}

/**
 * Runs one planner endpoint: CORS for the site, the service call, and a 503
 * instead of an engine error page if anything throws.
 */
function runPlannerEndpoint(mars, { method, params, cacheControl }) {
  allowSiteOrigin(mars);
  let response;
  try {
    response = createPlannerService(plannerDeps(mars))[method](requestOf(mars, params));
  } catch {
    response = { status: 503, body: { reason: 'unavailable' } };
  }
  send(mars, response, { cacheControl: response.status === 200 ? cacheControl : 'no-store' });
}

module.exports = { runPlannerEndpoint, plannerDeps, requestOf, send };

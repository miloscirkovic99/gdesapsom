/**
 * GET /api/v2/planner/selftest (admin) — what the planner found on this MARS
 * host, before launch. Never shows a secret or an address: only whether each
 * one is there.
 *
 *   ?live=1  also asks MET Norway for one forecast (no AI provider is called).
 *
 * `module_requests` counts the calls this loaded module has served: if it
 * grows from one call to the next, the in-memory cooldown works; if it stays
 * at 1, only the database cooldown does.
 */
const { requireAdmin } = require('../lib/admin');
const { hmacSha256Hex, sha256Hex } = require('../lib/crypto');
const { createMars } = require('../lib/mars');
const { dbOf, respond } = require('../lib/http-helpers');
const { CITIES } = require('../lib/planner/config');
const { clientAddress, networkKey } = require('../lib/planner/ip');
const { parseBudget } = require('../lib/planner/limits');
const { tablesPresent } = require('../lib/planner/store');
const systemPrompt = require('../lib/planner/system-prompt');
const { forecastRequest } = require('../lib/planner/weather');

let moduleRequests = 0;

const SECRETS = ['GEMINI_API_KEY', 'CF_ACCOUNT_ID', 'CF_AI_API_TOKEN', 'ANTHROPIC_API_KEY', 'TURNSTILE_SECRET_KEY', 'PLANNER_HMAC_SECRET', 'MET_NO_USER_AGENT'];

module.exports = function handle(modules) {
  const mars = createMars(modules);
  if (!requireAdmin(mars)) return;
  moduleRequests += 1;

  const env = {};
  for (const name of SECRETS) env[name] = !!mars.env(name);
  env.PLANNER_HMAC_SECRET_LONG_ENOUGH = String(mars.env('PLANNER_HMAC_SECRET') || '').length >= 32;
  env.PLANNER_DAILY_BUDGET_USD = parseBudget(mars.env('PLANNER_DAILY_BUDGET_USD'));
  env.PLANNER_CLIENT_IP_HEADER = mars.env('PLANNER_CLIENT_IP_HEADER') || 'x-forwarded-for';
  env.PLANNER_TRUSTED_HOPS = Number(mars.env('PLANNER_TRUSTED_HOPS')) || 1;

  const headerName = env.PLANNER_CLIENT_IP_HEADER;
  const address = clientAddress(mars.requestHeader, { header: headerName, trustedHops: env.PLANNER_TRUSTED_HOPS, remoteAddress: mars.remoteAddress() });
  const network = {
    header_present: mars.requestHeader(headerName) !== null,
    header_entries: String(mars.requestHeader(headerName) || '').split(',').filter((entry) => entry.trim()).length,
    remote_address_present: mars.remoteAddress() !== null,
    detected: networkKey(address) !== null,
    kind: networkKey(address) === null ? null : networkKey(address).includes('::/64') ? 'ipv6/64' : 'ipv4',
  };

  const checks = {
    module_requests: moduleRequests,
    mars: mars.capabilities(),
    env,
    network,
    crypto: sha256Hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' && hmacSha256Hex('key', 'The quick brown fox jumps over the lazy dog') === 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    system_prompt_chars: systemPrompt.length,
    tables: tablesPresent(dbOf(mars)),
  };

  if (String(mars.param('live', '')) === '1') {
    try {
      const response = mars.http(forecastRequest(CITIES.beograd.lat, CITIES.beograd.lng, mars.env('MET_NO_USER_AGENT')), 5000);
      checks.met_status = response.status;
    } catch (error) {
      checks.met_error = String((error && error.message) || error).slice(0, 200);
    }
  }

  mars.header('Cache-Control', 'no-store');
  respond(mars, checks);
};

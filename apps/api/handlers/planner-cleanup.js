/**
 * The planner's daily job: deletes planner_quota rows older than 8 days and
 * weather answers that expired a day ago (lib/planner/store.js `cleanup`).
 *
 * Runs as a MARS scheduled event (events/planner-cleanup.js) and, for a host
 * without one, as POST /api/v2/planner/cleanup for an outside cron: that
 * call needs the X-Cleanup-Token header equal to PLANNER_CLEANUP_TOKEN, or an
 * admin session.
 */
const { createMars } = require('../lib/mars');
const { dbOf, respond } = require('../lib/http-helpers');
const { cleanup } = require('../lib/planner/store');
const { requireAdmin } = require('../lib/admin');

/** Constant-time comparison, so the token cannot be guessed a character at a time. */
function sameText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

module.exports = function handle(modules, { scheduled = false } = {}) {
  const mars = createMars(modules);
  if (!scheduled) {
    const token = mars.env('PLANNER_CLEANUP_TOKEN');
    const sent = mars.requestHeader('X-Cleanup-Token');
    if (!(token && String(token).length >= 32 && sameText(sent, String(token))) && !requireAdmin(mars)) return;
  }
  const deleted = cleanup(dbOf(mars), Date.now());
  respond(mars, { deleted });
};

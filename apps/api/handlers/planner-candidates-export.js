/**
 * GET /api/v2/planner/candidates-export (admin) — every city's and
 * destination's candidates, in the shape eval/build-scenarios.mjs reads:
 * { generatedAt, areas: { beograd: [...], kopaonik: [...], ... } }.
 * Save the response as a file and pass it with --candidates.
 */
const { requireAdmin } = require('../lib/admin');
const { createMars } = require('../lib/mars');
const { dbOf, respond } = require('../lib/http-helpers');
const { toExportCandidate } = require('../lib/planner/places');
const { loadAllCandidateRows } = require('../lib/planner/store');
const { belgradeLocal } = require('../lib/planner/time');

module.exports = function handle(modules) {
  const mars = createMars(modules);
  if (!requireAdmin(mars)) return;
  const areas = {};
  const rows = loadAllCandidateRows(dbOf(mars));
  for (const area of Object.keys(rows)) areas[area] = rows[area].map(toExportCandidate);
  mars.header('Cache-Control', 'no-store');
  respond(mars, { generatedAt: belgradeLocal(Date.now()).date, areas });
};

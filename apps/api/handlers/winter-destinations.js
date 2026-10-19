/**
 * GET /api/v2/winter/destinations — the data of the winter pages
 * (lib/winter/snapshot.js). Public and read-only: tools/fetch-winter-data.mjs
 * saves it before the build, and the pages refresh from it in the browser so
 * a removed place disappears before the next build.
 */
const { createMars } = require('../lib/mars');
const { respond, rowsOf } = require('../lib/http-helpers');
const { belgradeLocal } = require('../lib/planner/time');
const { buildWinterSnapshot, DESTINATIONS_SQL, PLACES_SQL } = require('../lib/winter/snapshot');

module.exports = function handle(modules) {
  const mars = createMars(modules);
  const snapshot = buildWinterSnapshot({
    destinations: rowsOf(mars.query(DESTINATIONS_SQL)),
    places: rowsOf(mars.query(PLACES_SQL)),
    today: belgradeLocal(Date.now()).date,
  });
  mars.header('Cache-Control', 'public, max-age=300');
  respond(mars, snapshot);
};

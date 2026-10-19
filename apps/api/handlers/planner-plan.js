/** GET /api/v2/planner/plan/:id — a saved plan, for the /plan/:id link. */
const { createMars } = require('../lib/mars');
const { runPlannerEndpoint } = require('../lib/planner/runtime');

module.exports = function handle(modules) {
  // A plan never changes after it is saved; its places are read fresh, so the cache stays short.
  runPlannerEndpoint(createMars(modules), { method: 'get', params: ['id'], cacheControl: 'public, max-age=300' });
};

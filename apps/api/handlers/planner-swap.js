/** POST /api/v2/planner/swap — "Zameni": one entry replaced, saved as a new plan. */
const { createMars } = require('../lib/mars');
const { runPlannerEndpoint } = require('../lib/planner/runtime');

module.exports = function handle(modules) {
  runPlannerEndpoint(createMars(modules), { method: 'swap', params: ['plan_id', 'section', 'day', 'index', 'exclude'] });
};

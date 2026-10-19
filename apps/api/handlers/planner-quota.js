/** GET /api/v2/planner/quota — plans this device has left this week, for the line under the form. */
const { createMars } = require('../lib/mars');
const { runPlannerEndpoint } = require('../lib/planner/runtime');

module.exports = function handle(modules) {
  runPlannerEndpoint(createMars(modules), { method: 'quota', params: [] });
};

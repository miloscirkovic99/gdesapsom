/** POST /api/v2/planner/feedback — thumbs up/down and "Prijavi grešku". */
const { createMars } = require('../lib/mars');
const { runPlannerEndpoint } = require('../lib/planner/runtime');

module.exports = function handle(modules) {
  runPlannerEndpoint(createMars(modules), { method: 'feedback', params: ['plan_id', 'rating', 'venue_id', 'comment'] });
};

/** MARS scheduled event: the planner's daily cleanup (see planner-cleanup.js). */
const runCleanup = require('./planner-cleanup');

module.exports = function handle(modules) {
  runCleanup(modules, { scheduled: true });
};

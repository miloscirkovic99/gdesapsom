/** POST /api/v2/planner — a new plan (lib/planner/service.js `create`). */
const { createMars } = require('../lib/mars');
const { runPlannerEndpoint } = require('../lib/planner/runtime');

/** The form fields; anything else in the body, the dog's name included, is never read. */
const FIELDS = [
  'mode', 'grad', 'datum', 'velicina', 'energija', 'osetljiv_na_vrucinu', 'tip_dana',
  'destinacija', 'broj_noci', 'dlaka', 'neko_skija', 'pas_sme_sam', 'turnstile_token',
];

module.exports = function handle(modules) {
  runPlannerEndpoint(createMars(modules), { method: 'create', params: FIELDS });
};

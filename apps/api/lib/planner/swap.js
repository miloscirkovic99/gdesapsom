/**
 * "Zameni": the next candidate of the same category that is not in the plan
 * yet, nearest to the neighbouring stops. No AI and no quota.
 */
const { distanceM } = require('./geo');
const { isOpenAt } = require('./hours');
const { exclusionReasons, WALKS } = require('./candidates');

const sameKind = (a, b) => a === b || (WALKS.includes(a) && WALKS.includes(b));

/** Every lokacija_id the plan uses, stays and vet included. */
function idsInPlan(plan) {
  const ids = new Set();
  (plan.stanice || []).forEach((stop) => ids.add(Number(stop.lokacija_id)));
  (plan.smestaj || []).forEach((stay) => ids.add(Number(stay.lokacija_id)));
  (plan.dani || []).forEach((day) => (day.stanice || []).forEach((stop) => ids.add(Number(stop.lokacija_id))));
  if (plan.veterinar_id != null) ids.add(Number(plan.veterinar_id));
  return ids;
}

/**
 * @param {{ plan: object, mode: string }} stored the saved plan
 * @param {{ day?: number|null, index: number, section?: 'stanice'|'smestaj', exclude?: number[] }} target
 *   which entry to replace; `exclude` lists places the visitor already swapped away, so "Zameni" moves on
 *   instead of offering them again
 * @param {object[]} candidates all candidates for the plan's parameters, best first
 * @param {{ params: object, weather: object|null, date: string|null, today: string }} context
 * @returns {{ ok: true, plan: object, replaced: number, by: number } | { ok: false, reason: string }}
 */
function swapStop(stored, target, candidates, context) {
  const plan = JSON.parse(JSON.stringify(stored.plan));
  const byId = new Map(candidates.map((candidate) => [Number(candidate.id), candidate]));

  let list;
  if (target.section === 'smestaj') list = plan.smestaj;
  else if (plan.dani) list = (plan.dani.find((day) => Number(day.dan) === Number(target.day)) || {}).stanice;
  else list = plan.stanice;

  const entry = list && list[target.index];
  const current = entry && byId.get(Number(entry.lokacija_id));
  if (!entry || !current) return { ok: false, reason: 'not_found' };

  const used = idsInPlan(plan);
  (target.exclude || []).forEach((id) => used.add(Number(id)));
  const neighbours = [list[target.index - 1], list[target.index + 1]]
    .filter(Boolean)
    .map((neighbour) => byId.get(Number(neighbour.lokacija_id)))
    .filter(Boolean);

  const options = candidates.filter(
    (candidate) =>
      !used.has(Number(candidate.id)) &&
      sameKind(candidate.kategorija, current.kategorija) &&
      exclusionReasons(candidate, context).length === 0 &&
      (!entry.vreme || !context.date || isOpenAt(candidate.radno_vreme, context.date, entry.vreme) !== false),
  );
  if (!options.length) return { ok: false, reason: 'no_alternative' };

  // Nearest to the neighbours; a stay has none, so the best-ranked one wins.
  const cost = (candidate) =>
    neighbours.length ? neighbours.reduce((sum, neighbour) => sum + distanceM(neighbour, candidate), 0) : 0;
  const pick = options.reduce((best, candidate) => (cost(candidate) < cost(best) ? candidate : best), options[0]);

  list[target.index] = {
    ...entry,
    lokacija_id: Number(pick.id),
    zasto: target.section === 'smestaj' ? 'Druga opcija smeštaja koji prima pse.' : 'Zamena u blizini ostalih stanica.',
    ...(entry.savet_za_psa !== undefined ? { savet_za_psa: pick.voda_za_pse === true ? 'Ovde ima vode za pse.' : 'Ponesi vodu za {{ime}}.' } : {}),
  };
  return { ok: true, plan, replaced: Number(current.id), by: Number(pick.id) };
}

module.exports = { swapStop, idsInPlan };
